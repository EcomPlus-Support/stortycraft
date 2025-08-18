import { describe, test, expect, beforeEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'

// We'll implement this handler later
import { POST as handler } from '../../../app/api/payments/create-checkout/route'

describe('/api/payments/create-checkout', () => {
  beforeEach(() => {
    global.resetMocks()
  })

  test('should create Stripe checkout session for credit pack', async () => {
    const mockUser = global.createTestUser({
      id: 'user-123',
      email: 'user@example.com',
      stripeCustomerId: 'cus_test123'
    })

    const checkoutData = {
      packageType: 'credits',
      packageId: '50-credits',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel'
    }

    const mockSession = {
      id: 'cs_test_session123',
      url: 'https://checkout.stripe.com/pay/cs_test_session123',
      payment_intent: 'pi_test_payment123'
    }

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testStripe.checkout.sessions.create.mockResolvedValue(mockSession)

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      body: checkoutData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(true)
    expect(responseData.sessionId).toBe(mockSession.id)
    expect(responseData.url).toBe(mockSession.url)

    expect(global.testStripe.checkout.sessions.create).toHaveBeenCalledWith({
      customer: mockUser.stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: '50 Credits Pack',
            description: '50 credits for StoryCraft operations'
          },
          unit_amount: 1999 // $19.99 in cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: checkoutData.successUrl,
      cancel_url: checkoutData.cancelUrl,
      metadata: {
        userId: mockUser.id,
        packageType: 'credits',
        packageId: '50-credits',
        creditsGranted: '50'
      }
    })
  })

  test('should create checkout for 100 credits pack', async () => {
    const mockUser = global.createTestUser({
      id: 'user-123',
      stripeCustomerId: 'cus_test123'
    })

    const checkoutData = {
      packageType: 'credits',
      packageId: '100-credits',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel'
    }

    const mockSession = {
      id: 'cs_test_session456',
      url: 'https://checkout.stripe.com/pay/cs_test_session456'
    }

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testStripe.checkout.sessions.create.mockResolvedValue(mockSession)

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      body: checkoutData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(true)

    expect(global.testStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: '100 Credits Pack',
              description: '100 credits for StoryCraft operations'
            },
            unit_amount: 3499 // $34.99 in cents
          },
          quantity: 1
        }],
        metadata: expect.objectContaining({
          packageId: '100-credits',
          creditsGranted: '100'
        })
      })
    )
  })

  test('should create checkout for 500 credits pack', async () => {
    const mockUser = global.createTestUser({
      id: 'user-123',
      stripeCustomerId: 'cus_test123'
    })

    const checkoutData = {
      packageType: 'credits',
      packageId: '500-credits',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel'
    }

    const mockSession = {
      id: 'cs_test_session789',
      url: 'https://checkout.stripe.com/pay/cs_test_session789'
    }

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testStripe.checkout.sessions.create.mockResolvedValue(mockSession)

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      body: checkoutData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)

    expect(global.testStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: '500 Credits Pack',
              description: '500 credits for StoryCraft operations'
            },
            unit_amount: 14999 // $149.99 in cents
          },
          quantity: 1
        }],
        metadata: expect.objectContaining({
          packageId: '500-credits',
          creditsGranted: '500'
        })
      })
    )
  })

  test('should create Stripe customer if user does not have one', async () => {
    const mockUser = global.createTestUser({
      id: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      stripeCustomerId: null // No Stripe customer
    })

    const mockCustomer = {
      id: 'cus_new_customer123'
    }

    const mockSession = {
      id: 'cs_test_session',
      url: 'https://checkout.stripe.com/pay/cs_test_session'
    }

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testStripe.customers.create.mockResolvedValue(mockCustomer)
    global.testDb.user.update.mockResolvedValue({
      ...mockUser,
      stripeCustomerId: mockCustomer.id
    })
    global.testStripe.checkout.sessions.create.mockResolvedValue(mockSession)

    const checkoutData = {
      packageType: 'credits',
      packageId: '50-credits',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel'
    }

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      body: checkoutData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)

    expect(global.testStripe.customers.create).toHaveBeenCalledWith({
      email: mockUser.email,
      name: mockUser.name,
      metadata: {
        userId: mockUser.id
      }
    })

    expect(global.testDb.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { stripeCustomerId: mockCustomer.id }
    })
  })

  test('should create checkout for subscription plans', async () => {
    const mockUser = global.createTestUser({
      id: 'user-123',
      stripeCustomerId: 'cus_test123'
    })

    const checkoutData = {
      packageType: 'subscription',
      packageId: 'basic',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel'
    }

    const mockSession = {
      id: 'cs_test_subscription',
      url: 'https://checkout.stripe.com/pay/cs_test_subscription'
    }

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testStripe.checkout.sessions.create.mockResolvedValue(mockSession)

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      body: checkoutData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)

    expect(global.testStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{
          price: 'price_basic_monthly' // Predefined price ID
        }],
        metadata: expect.objectContaining({
          packageType: 'subscription',
          packageId: 'basic'
        })
      })
    )
  })

  test('should validate required fields', async () => {
    const mockUser = global.createTestUser()
    global.testDb.user.findUnique.mockResolvedValue(mockUser)

    const checkoutData = {
      packageType: 'credits'
      // Missing packageId, successUrl, cancelUrl
    }

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      body: checkoutData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toContain('required')
  })

  test('should validate package type', async () => {
    const mockUser = global.createTestUser()
    global.testDb.user.findUnique.mockResolvedValue(mockUser)

    const checkoutData = {
      packageType: 'invalid',
      packageId: '50-credits',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel'
    }

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      body: checkoutData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toContain('Invalid package type')
  })

  test('should validate package ID', async () => {
    const mockUser = global.createTestUser()
    global.testDb.user.findUnique.mockResolvedValue(mockUser)

    const checkoutData = {
      packageType: 'credits',
      packageId: 'invalid-package',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel'
    }

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      body: checkoutData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toContain('Invalid package')
  })

  test('should validate URLs', async () => {
    const mockUser = global.createTestUser()
    global.testDb.user.findUnique.mockResolvedValue(mockUser)

    const checkoutData = {
      packageType: 'credits',
      packageId: '50-credits',
      successUrl: 'invalid-url',
      cancelUrl: 'invalid-url'
    }

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      body: checkoutData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toContain('valid URL')
  })

  test('should return 401 for unauthenticated request', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        packageType: 'credits',
        packageId: '50-credits',
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Unauthorized')
  })

  test('should handle Stripe errors gracefully', async () => {
    const mockUser = global.createTestUser({
      stripeCustomerId: 'cus_test123'
    })

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testStripe.checkout.sessions.create.mockRejectedValue(
      new Error('Your card was declined')
    )

    const checkoutData = {
      packageType: 'credits',
      packageId: '50-credits',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel'
    }

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      body: checkoutData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Payment processing error')
  })

  test('should only accept POST method', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Method not allowed')
  })
})