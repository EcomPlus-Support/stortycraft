import { describe, test, expect, beforeEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'

// We'll implement this handler later
import { POST as handler } from '../../../app/api/payments/webhook/route'

describe('/api/payments/webhook', () => {
  beforeEach(() => {
    global.resetMocks()
  })

  test('should handle successful payment completion', async () => {
    const mockEvent = {
      id: 'evt_test_webhook',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session123',
          payment_intent: 'pi_test_payment123',
          customer: 'cus_test123',
          amount_total: 1999,
          currency: 'usd',
          payment_status: 'paid',
          metadata: {
            userId: 'user-123',
            packageType: 'credits',
            packageId: '50-credits',
            creditsGranted: '50'
          }
        }
      }
    }

    const mockUser = global.createTestUser({
      id: 'user-123',
      credits: 25
    })

    global.testStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testDb.payment.create.mockResolvedValue(
      global.createTestPayment({
        stripePaymentId: mockEvent.data.object.payment_intent,
        stripeSessionId: mockEvent.data.object.id,
        amount: 1999,
        creditsGranted: 50
      })
    )
    global.testDb.user.update.mockResolvedValue({
      ...mockUser,
      credits: 75
    })
    global.testDb.creditTransaction.create.mockResolvedValue(
      global.createTestCreditTransaction({
        amount: 50,
        type: 'PURCHASE',
        description: 'Credit pack purchase: 50 credits'
      })
    )

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify(mockEvent)
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.received).toBe(true)

    // Verify payment record creation
    expect(global.testDb.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        stripePaymentId: mockEvent.data.object.payment_intent,
        stripeSessionId: mockEvent.data.object.id,
        amount: 1999,
        currency: 'usd',
        status: 'COMPLETED',
        creditsGranted: 50,
        metadata: mockEvent.data.object.metadata
      }
    })

    // Verify credit update
    expect(global.testDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { credits: 75 }
    })

    // Verify credit transaction
    expect(global.testDb.creditTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        amount: 50,
        type: 'PURCHASE',
        description: 'Credit pack purchase: 50 credits',
        metadata: {
          paymentId: expect.any(String),
          stripeSessionId: mockEvent.data.object.id
        }
      }
    })
  })

  test('should handle subscription creation', async () => {
    const mockEvent = {
      id: 'evt_subscription_created',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'active',
          current_period_start: 1640995200, // Jan 1, 2022
          current_period_end: 1643673600,   // Feb 1, 2022
          metadata: {
            userId: 'user-123',
            tier: 'BASIC'
          },
          items: {
            data: [{
              price: {
                id: 'price_basic_monthly'
              }
            }]
          }
        }
      }
    }

    const mockUser = global.createTestUser({
      id: 'user-123',
      tier: 'FREE',
      credits: 25
    })

    global.testStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testDb.subscription.create.mockResolvedValue({
      id: 'subscription-123',
      userId: 'user-123',
      stripeSubscriptionId: 'sub_test123',
      tier: 'BASIC',
      status: 'ACTIVE'
    })
    global.testDb.user.update.mockResolvedValue({
      ...mockUser,
      tier: 'BASIC',
      credits: 125 // 25 + 100 monthly credits
    })

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify(mockEvent)
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)

    // Verify subscription creation
    expect(global.testDb.subscription.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        stripeSubscriptionId: 'sub_test123',
        tier: 'BASIC',
        status: 'ACTIVE',
        currentPeriodStart: new Date('2022-01-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2022-02-01T00:00:00.000Z'),
        metadata: mockEvent.data.object.metadata
      }
    })

    // Verify user tier and credits update
    expect(global.testDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {
        tier: 'BASIC',
        credits: 125
      }
    })
  })

  test('should handle failed payments', async () => {
    const mockEvent = {
      id: 'evt_payment_failed',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_test_failed',
          customer: 'cus_test123',
          amount: 1999,
          currency: 'usd',
          status: 'requires_payment_method',
          last_payment_error: {
            message: 'Your card was declined.'
          },
          metadata: {
            userId: 'user-123',
            packageType: 'credits',
            packageId: '50-credits'
          }
        }
      }
    }

    global.testStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    global.testDb.payment.create.mockResolvedValue(
      global.createTestPayment({
        stripePaymentId: mockEvent.data.object.id,
        status: 'FAILED'
      })
    )

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify(mockEvent)
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)

    // Verify failed payment record
    expect(global.testDb.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        stripePaymentId: mockEvent.data.object.id,
        amount: 1999,
        currency: 'usd',
        status: 'FAILED',
        creditsGranted: 0,
        metadata: {
          ...mockEvent.data.object.metadata,
          error: 'Your card was declined.'
        }
      }
    })

    // Should not update user credits
    expect(global.testDb.user.update).not.toHaveBeenCalled()
    expect(global.testDb.creditTransaction.create).not.toHaveBeenCalled()
  })

  test('should handle subscription cancellation', async () => {
    const mockEvent = {
      id: 'evt_subscription_deleted',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'canceled',
          metadata: {
            userId: 'user-123'
          }
        }
      }
    }

    const mockSubscription = {
      id: 'subscription-123',
      userId: 'user-123',
      stripeSubscriptionId: 'sub_test123',
      status: 'ACTIVE'
    }

    global.testStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    global.testDb.subscription.findUnique.mockResolvedValue(mockSubscription)
    global.testDb.subscription.update.mockResolvedValue({
      ...mockSubscription,
      status: 'CANCELED'
    })
    global.testDb.user.update.mockResolvedValue(
      global.createTestUser({ tier: 'FREE' })
    )

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify(mockEvent)
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)

    // Verify subscription cancellation
    expect(global.testDb.subscription.update).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_test123' },
      data: { status: 'CANCELED' }
    })

    // Verify user tier downgrade
    expect(global.testDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { tier: 'FREE' }
    })
  })

  test('should handle duplicate events (idempotency)', async () => {
    const mockEvent = {
      id: 'evt_test_duplicate',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session123',
          payment_intent: 'pi_test_payment123',
          metadata: {
            userId: 'user-123',
            creditsGranted: '50'
          }
        }
      }
    }

    // Mock existing payment record
    global.testStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    global.testDb.payment.findUnique.mockResolvedValue(
      global.createTestPayment({
        stripePaymentId: 'pi_test_payment123'
      })
    )

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify(mockEvent)
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.received).toBe(true)
    expect(responseData.message).toContain('already processed')

    // Should not create duplicate records
    expect(global.testDb.payment.create).not.toHaveBeenCalled()
    expect(global.testDb.user.update).not.toHaveBeenCalled()
  })

  test('should validate webhook signature', async () => {
    global.testStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'invalid-signature'
      },
      body: JSON.stringify({ type: 'test.event' })
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.error).toContain('Invalid signature')
  })

  test('should handle unknown event types gracefully', async () => {
    const mockEvent = {
      id: 'evt_unknown',
      type: 'unknown.event.type',
      data: {
        object: {}
      }
    }

    global.testStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify(mockEvent)
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.received).toBe(true)
    expect(responseData.message).toContain('Unhandled event')
  })

  test('should handle missing user in metadata', async () => {
    const mockEvent = {
      id: 'evt_no_user',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session123',
          payment_intent: 'pi_test_payment123',
          metadata: {
            // Missing userId
            packageType: 'credits'
          }
        }
      }
    }

    global.testStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify(mockEvent)
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.error).toContain('Missing userId')
  })

  test('should handle database transaction errors', async () => {
    const mockEvent = {
      id: 'evt_db_error',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session123',
          payment_intent: 'pi_test_payment123',
          metadata: {
            userId: 'user-123',
            creditsGranted: '50'
          }
        }
      }
    }

    global.testStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    global.testDb.user.findUnique.mockResolvedValue(global.createTestUser())
    global.testDb.payment.create.mockRejectedValue(new Error('Database error'))

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify(mockEvent)
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.error).toBe('Webhook processing failed')
  })

  test('should only accept POST method', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.error).toBe('Method not allowed')
  })
})