import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { createCheckoutSchema, validateCreditPackage, validateSubscriptionPlan, getCreditPackage, getSubscriptionTier } from '@/lib/validation'
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/auth'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    
    // Validate input
    const validationResult = createCheckoutSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(firstError.message, 400)
    }
    
    const { packageType, packageId, successUrl, cancelUrl } = validationResult.data
    
    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id
        }
      })
      
      stripeCustomerId = customer.id
      
      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId }
      })
    }
    
    let sessionConfig: Stripe.Checkout.SessionCreateParams
    
    if (packageType === 'credits') {
      // Validate credit package
      if (!validateCreditPackage(packageId)) {
        return createErrorResponse('Invalid package ID for credits', 400)
      }
      
      const creditPackage = getCreditPackage(packageId)
      
      sessionConfig = {
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: creditPackage.name,
              description: creditPackage.description
            },
            unit_amount: creditPackage.price
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: user.id,
          packageType,
          packageId,
          creditsGranted: creditPackage.credits.toString()
        }
      }
      
    } else if (packageType === 'subscription') {
      // Validate subscription plan
      if (!validateSubscriptionPlan(packageId)) {
        return createErrorResponse('Invalid package ID for subscription', 400)
      }
      
      const subscriptionTier = getSubscriptionTier(packageId)
      
      sessionConfig = {
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price: subscriptionTier.priceId
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: user.id,
          packageType,
          packageId,
          tier: subscriptionTier.tier
        }
      }
      
    } else {
      return createErrorResponse('Invalid package type', 400)
    }
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig)
    
    return createSuccessResponse({
      sessionId: session.id,
      url: session.url
    })
    
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401)
    }
    
    console.error('Stripe checkout creation error:', error)
    
    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      return createErrorResponse('Payment processing error', 500)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}

export async function GET() {
  return createErrorResponse('Method not allowed', 405)
}

export async function PUT() {
  return createErrorResponse('Method not allowed', 405)
}

export async function DELETE() {
  return createErrorResponse('Method not allowed', 405)
}

export async function PATCH() {
  return createErrorResponse('Method not allowed', 405)
}