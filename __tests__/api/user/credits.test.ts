import { describe, test, expect, beforeEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'

// We'll implement this handler later
import { GET as getHandler, POST as postHandler } from '../../../app/api/user/credits/route'

const handler = (req: any, res: any) => {
  if (req.method === 'GET') return getHandler(req, res)
  if (req.method === 'POST') return postHandler(req, res)
  throw new Error('Method not supported')
}

describe('/api/user/credits', () => {
  beforeEach(() => {
    global.resetMocks()
  })

  describe('GET /api/user/credits', () => {
    test('should return user credit balance', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123',
        credits: 85,
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
      expect(responseData.credits).toBe(85)
      expect(responseData.tier).toBe('BASIC')
    })

    test('should return 401 for unauthenticated request', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(401)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/user/credits (deduct credits)', () => {
    test('should deduct credits for text processing', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123',
        credits: 50
      })

      const deductionData = {
        operation: 'text',
        amount: 1,
        description: 'Text processing operation'
      }

      const updatedUser = { ...mockUser, credits: 49 }

      global.testDb.user.findUnique.mockResolvedValue(mockUser)
      global.testDb.user.update.mockResolvedValue(updatedUser)
      global.testDb.creditTransaction.create.mockResolvedValue(
        global.createTestCreditTransaction({
          amount: -1,
          type: 'DEDUCTION_TEXT',
          description: deductionData.description
        })
      )

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: deductionData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(true)
      expect(responseData.creditsRemaining).toBe(49)

      expect(global.testDb.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { credits: 49 }
      })

      expect(global.testDb.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          amount: -1,
          type: 'DEDUCTION_TEXT',
          description: deductionData.description
        }
      })
    })

    test('should deduct credits for YouTube analysis', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123',
        credits: 50
      })

      const deductionData = {
        operation: 'youtube',
        amount: 2,
        description: 'YouTube video analysis'
      }

      const updatedUser = { ...mockUser, credits: 48 }

      global.testDb.user.findUnique.mockResolvedValue(mockUser)
      global.testDb.user.update.mockResolvedValue(updatedUser)
      global.testDb.creditTransaction.create.mockResolvedValue(
        global.createTestCreditTransaction({
          amount: -2,
          type: 'DEDUCTION_YOUTUBE',
          description: deductionData.description
        })
      )

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: deductionData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(true)
      expect(responseData.creditsRemaining).toBe(48)
    })

    test('should deduct credits for image generation', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123',
        credits: 50
      })

      const deductionData = {
        operation: 'image',
        amount: 5,
        description: 'Image generation'
      }

      const updatedUser = { ...mockUser, credits: 45 }

      global.testDb.user.findUnique.mockResolvedValue(mockUser)
      global.testDb.user.update.mockResolvedValue(updatedUser)
      global.testDb.creditTransaction.create.mockResolvedValue(
        global.createTestCreditTransaction({
          amount: -5,
          type: 'DEDUCTION_IMAGE',
          description: deductionData.description
        })
      )

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: deductionData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(true)
      expect(responseData.creditsRemaining).toBe(45)
    })

    test('should deduct credits for video generation', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123',
        credits: 100
      })

      const deductionData = {
        operation: 'video',
        amount: 50,
        description: 'Video generation'
      }

      const updatedUser = { ...mockUser, credits: 50 }

      global.testDb.user.findUnique.mockResolvedValue(mockUser)
      global.testDb.user.update.mockResolvedValue(updatedUser)
      global.testDb.creditTransaction.create.mockResolvedValue(
        global.createTestCreditTransaction({
          amount: -50,
          type: 'DEDUCTION_VIDEO',
          description: deductionData.description
        })
      )

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: deductionData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(true)
      expect(responseData.creditsRemaining).toBe(50)
    })

    test('should reject operation when insufficient credits', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123',
        credits: 3
      })

      const deductionData = {
        operation: 'image',
        amount: 5,
        description: 'Image generation'
      }

      global.testDb.user.findUnique.mockResolvedValue(mockUser)

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: deductionData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Insufficient credits')
      expect(responseData.required).toBe(5)
      expect(responseData.available).toBe(3)

      // Should not update database
      expect(global.testDb.user.update).not.toHaveBeenCalled()
      expect(global.testDb.creditTransaction.create).not.toHaveBeenCalled()
    })

    test('should validate operation type', async () => {
      const mockUser = global.createTestUser()
      global.testDb.user.findUnique.mockResolvedValue(mockUser)

      const deductionData = {
        operation: 'invalid',
        amount: 1,
        description: 'Invalid operation'
      }

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: deductionData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('operation')
    })

    test('should validate amount', async () => {
      const mockUser = global.createTestUser()
      global.testDb.user.findUnique.mockResolvedValue(mockUser)

      const deductionData = {
        operation: 'text',
        amount: -1, // Invalid negative amount
        description: 'Text processing'
      }

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: deductionData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('amount')
    })

    test('should handle concurrent credit deductions safely', async () => {
      const mockUser = global.createTestUser({
        id: 'user-123',
        credits: 5
      })

      global.testDb.user.findUnique.mockResolvedValue(mockUser)
      
      // Simulate concurrent modification
      global.testDb.user.update.mockRejectedValue(new Error('Record updated by another process'))

      const deductionData = {
        operation: 'image',
        amount: 5,
        description: 'Image generation'
      }

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token'
        },
        body: deductionData
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(409)
      const responseData = JSON.parse(res._getData())
      
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Credit update conflict - please retry')
    })
  })

  test('should reject unsupported methods', async () => {
    const { req, res } = createMocks({
      method: 'DELETE',
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