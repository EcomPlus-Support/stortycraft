import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { headers } from 'next/headers'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')
    
    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 })
    }
    
    let event: Stripe.Event
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return new Response('Invalid signature', { status: 400 })
    }
    
    console.log('Processing webhook event:', event.type)
    
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
        return new Response(JSON.stringify({ 
          received: true, 
          message: `Unhandled event type: ${event.type}` 
        }), { status: 200 })
    }
    
    return new Response(JSON.stringify({ received: true }), { status: 200 })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { metadata } = session
  
  if (!metadata?.userId) {
    throw new Error('Missing userId in session metadata')
  }
  
  // Check if payment already processed (idempotency)
  if (session.payment_intent) {
    const existingPayment = await prisma.payment.findUnique({
      where: { stripePaymentId: session.payment_intent as string }
    })
    
    if (existingPayment) {
      console.log('Payment already processed:', session.payment_intent)
      return { received: true, message: 'Payment already processed' }
    }
  }
  
  const userId = metadata.userId
  const packageType = metadata.packageType
  
  if (packageType === 'credits') {
    await handleCreditPurchase(session, userId)
  } else if (packageType === 'subscription') {
    // Subscription is handled by subscription.created event
    console.log('Subscription checkout completed, waiting for subscription.created event')
  }
}

async function handleCreditPurchase(session: Stripe.Checkout.Session, userId: string) {
  const creditsGranted = parseInt(session.metadata?.creditsGranted || '0')
  
  if (creditsGranted <= 0) {
    throw new Error('Invalid credits amount in metadata')
  }
  
  await prisma.$transaction(async (tx) => {
    // Create payment record
    await tx.payment.create({
      data: {
        userId,
        stripePaymentId: session.payment_intent as string,
        stripeSessionId: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || 'usd',
        status: 'COMPLETED',
        creditsGranted,
        metadata: session.metadata
      }
    })
    
    // Add credits to user
    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: creditsGranted } }
    })
    
    // Create credit transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: creditsGranted,
        type: 'PURCHASE',
        description: `Credit pack purchase: ${creditsGranted} credits`,
        metadata: {
          paymentId: session.payment_intent,
          stripeSessionId: session.id
        }
      }
    })
  })
  
  console.log(`Granted ${creditsGranted} credits to user ${userId}`)
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent
  
  if (!metadata?.userId) {
    return
  }
  
  // Record failed payment
  await prisma.payment.create({
    data: {
      userId: metadata.userId,
      stripePaymentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'FAILED',
      creditsGranted: 0,
      metadata: {
        ...metadata,
        error: paymentIntent.last_payment_error?.message || 'Payment failed'
      }
    }
  })
  
  console.log('Payment failed:', paymentIntent.id)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { metadata } = subscription
  
  if (!metadata?.userId) {
    throw new Error('Missing userId in subscription metadata')
  }
  
  const userId = metadata.userId
  const tier = metadata.tier as 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
  
  // Get tier credits
  const tierCredits = {
    'BASIC': 100,
    'PROFESSIONAL': 300,
    'ENTERPRISE': 800
  }
  
  const monthlyCredits = tierCredits[tier] || 0
  
  await prisma.$transaction(async (tx) => {
    // Create subscription record
    await tx.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: subscription.id,
        tier,
        status: 'ACTIVE',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        metadata: subscription.metadata
      }
    })
    
    // Update user tier and add monthly credits
    await tx.user.update({
      where: { id: userId },
      data: {
        tier,
        credits: { increment: monthlyCredits }
      }
    })
    
    // Create credit transaction for monthly allocation
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: monthlyCredits,
        type: 'PURCHASE',
        description: `Monthly credit allocation: ${tier} plan`,
        metadata: {
          subscriptionId: subscription.id,
          billingPeriod: 'monthly'
        }
      }
    })
  })
  
  console.log(`Created ${tier} subscription for user ${userId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Handle subscription changes (tier upgrades, etc.)
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status.toUpperCase() as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    }
  })
  
  console.log('Updated subscription:', subscription.id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { metadata } = subscription
  
  if (!metadata?.userId) {
    return
  }
  
  await prisma.$transaction(async (tx) => {
    // Update subscription status
    await tx.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: 'CANCELED' }
    })
    
    // Downgrade user to FREE tier
    await tx.user.update({
      where: { id: metadata.userId },
      data: { tier: 'FREE' }
    })
  })
  
  console.log('Canceled subscription for user:', metadata.userId)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Handle recurring subscription payments
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    
    if (subscription.metadata?.userId) {
      console.log('Monthly payment succeeded for user:', subscription.metadata.userId)
      // Monthly credits are already allocated, no additional action needed
    }
  }
}

export async function GET() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
}