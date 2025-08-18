import { describe, test, expect, beforeEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'

// We'll implement this handler later
import { GET as getHandler, PATCH as patchHandler, DELETE as deleteHandler } from '../../../app/api/user/profile/route'

const handler = (req: any, res: any) => {
  if (req.method === 'GET') return getHandler(req, res)
  if (req.method === 'PATCH') return patchHandler(req, res)
  if (req.method === 'DELETE') return deleteHandler(req, res)
  throw new Error('Method not supported')
}

describe('/api/user/profile', () => {
  beforeEach(() => {
    global.resetMocks()
  })

  describe('GET /api/user/profile', () => {
    test('should return user profile for authenticated user', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        credits: 75,
        tier: 'BASIC'
      })

      global.testDb.user.findUnique.mockResolvedValue(mockUser)

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(true)
      expect(responseData.user.id).toBe(mockUser.id)
      expect(responseData.user.email).toBe(mockUser.email)
      expect(responseData.user.name).toBe(mockUser.name)
      expect(responseData.user.credits).toBe(mockUser.credits)
      expect(responseData.user.tier).toBe(mockUser.tier)
      expect(responseData.user.password).toBeUndefined()
    })

    test('should return 401 for unauthenticated request', async () => {
      const { req, res } = createMocks({
        method: 'GET'
        // No authorization header
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(401)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Unauthorized')
    })

    test('should return 404 if user not found', async () => {
      global.testDb.user.findUnique.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('User not found')
    })
  })

  describe('PATCH /api/user/profile', () => {
    test('should update user profile successfully', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Old Name'
      })

      const updateData = {
        name: 'New Name',
        image: 'https://example.com/newavatar.jpg'
      }

      const updatedUser = {
        ...mockUser,
        ...updateData
      }

      global.testDb.user.findUnique.mockResolvedValue(mockUser)
      global.testDb.user.update.mockResolvedValue(updatedUser)

      const { req, res } = createMocks({
        method: 'PATCH',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: updateData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(true)
      expect(responseData.user.name).toBe(updateData.name)
      expect(responseData.user.image).toBe(updateData.image)

      expect(global.testDb.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: updateData
      })
    })

    test('should not allow email update', async () => {
      const mockUser = global.createTestUser()
      global.testDb.user.findUnique.mockResolvedValue(mockUser)

      const updateData = {
        email: 'newemail@example.com',
        name: 'New Name'
      }

      const { req, res } = createMocks({
        method: 'PATCH',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: updateData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('email')
    })

    test('should not allow sensitive field updates', async () => {
      const mockUser = global.createTestUser()
      global.testDb.user.findUnique.mockResolvedValue(mockUser)

      const updateData = {
        credits: 1000,
        tier: 'ENTERPRISE',
        stripeCustomerId: 'cus_fake'
      }

      const { req, res } = createMocks({
        method: 'PATCH',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: updateData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('not allowed')
    })

    test('should validate profile data', async () => {
      const mockUser = global.createTestUser()
      global.testDb.user.findUnique.mockResolvedValue(mockUser)

      const updateData = {
        name: '', // Invalid empty name
        image: 'invalid-url'
      }

      const { req, res } = createMocks({
        method: 'PATCH',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: updateData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('validation')
    })
  })

  describe('DELETE /api/user/profile', () => {
    test('should delete user account successfully', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123'
      })

      global.testDb.user.findUnique.mockResolvedValue(mockUser)
      global.testDb.user.delete.mockResolvedValue(mockUser)

      const { req, res } = createMocks({
        method: 'DELETE',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Account deleted successfully')

      expect(global.testDb.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id }
      })
    })

    test('should handle active subscription during deletion', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123',
        tier: 'BASIC'
      })

      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'ACTIVE',
        stripeSubscriptionId: 'sub_stripe_123'
      }

      global.testDb.user.findUnique.mockResolvedValue({
        ...mockUser,
        subscriptions: [mockSubscription]
      })

      const { req, res } = createMocks({
        method: 'DELETE',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('subscription')
    })
  })

  test('should reject unsupported methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
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

  test('should handle database errors gracefully', async () => {
    global.testDb.user.findUnique.mockRejectedValue(new Error('Database error'))

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Internal server error')
  })
})