import { describe, test, expect, beforeEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'

// We'll implement this handler later
import { GET as handler } from '../../../app/api/user/credits/history/route'

describe('/api/user/credits/history', () => {
  beforeEach(() => {
    global.resetMocks()
  })

  test('should return paginated credit transaction history', async () => {
    const mockUser = global.createTestUser({ id: 'user-123' })
    
    const mockTransactions = [
      global.createTestCreditTransaction({
        id: 'txn-1',
        amount: 50,
        type: 'PURCHASE',
        description: 'Credit pack purchase',
        createdAt: new Date('2024-01-15T10:00:00Z')
      }),
      global.createTestCreditTransaction({
        id: 'txn-2',
        amount: -5,
        type: 'DEDUCTION_IMAGE',
        description: 'Image generation',
        createdAt: new Date('2024-01-14T15:30:00Z')
      }),
      global.createTestCreditTransaction({
        id: 'txn-3',
        amount: 50,
        type: 'SIGNUP_BONUS',
        description: 'Welcome bonus',
        createdAt: new Date('2024-01-01T08:00:00Z')
      })
    ]

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testDb.creditTransaction.findMany.mockResolvedValue(mockTransactions)
    global.testDb.creditTransaction.count.mockResolvedValue(3)

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      query: {
        page: '1',
        limit: '10'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(true)
    expect(responseData.transactions).toHaveLength(3)
    expect(responseData.pagination.total).toBe(3)
    expect(responseData.pagination.page).toBe(1)
    expect(responseData.pagination.limit).toBe(10)
    expect(responseData.pagination.totalPages).toBe(1)

    // Verify transactions are ordered by most recent first
    expect(responseData.transactions[0].id).toBe('txn-1')
    expect(responseData.transactions[1].id).toBe('txn-2')
    expect(responseData.transactions[2].id).toBe('txn-3')

    expect(global.testDb.creditTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10
    })
  })

  test('should handle pagination correctly', async () => {
    const mockUser = global.createTestUser({ id: 'user-123' })
    
    const mockTransactions = [
      global.createTestCreditTransaction({ id: 'txn-11' }),
      global.createTestCreditTransaction({ id: 'txn-12' }),
      global.createTestCreditTransaction({ id: 'txn-13' }),
      global.createTestCreditTransaction({ id: 'txn-14' }),
      global.createTestCreditTransaction({ id: 'txn-15' })
    ]

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testDb.creditTransaction.findMany.mockResolvedValue(mockTransactions)
    global.testDb.creditTransaction.count.mockResolvedValue(25)

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      query: {
        page: '3',
        limit: '5'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(true)
    expect(responseData.transactions).toHaveLength(5)
    expect(responseData.pagination.total).toBe(25)
    expect(responseData.pagination.page).toBe(3)
    expect(responseData.pagination.limit).toBe(5)
    expect(responseData.pagination.totalPages).toBe(5)

    expect(global.testDb.creditTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { createdAt: 'desc' },
      skip: 10, // (page - 1) * limit = (3 - 1) * 5
      take: 5
    })
  })

  test('should filter by transaction type', async () => {
    const mockUser = global.createTestUser({ id: 'user-123' })
    
    const mockTransactions = [
      global.createTestCreditTransaction({
        type: 'DEDUCTION_IMAGE',
        description: 'Image generation 1'
      }),
      global.createTestCreditTransaction({
        type: 'DEDUCTION_IMAGE',
        description: 'Image generation 2'
      })
    ]

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testDb.creditTransaction.findMany.mockResolvedValue(mockTransactions)
    global.testDb.creditTransaction.count.mockResolvedValue(2)

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      query: {
        type: 'DEDUCTION_IMAGE',
        page: '1',
        limit: '10'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(true)
    expect(responseData.transactions).toHaveLength(2)

    expect(global.testDb.creditTransaction.findMany).toHaveBeenCalledWith({
      where: { 
        userId: 'user-123',
        type: 'DEDUCTION_IMAGE'
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10
    })
  })

  test('should filter by date range', async () => {
    const mockUser = global.createTestUser({ id: 'user-123' })
    
    const mockTransactions = [
      global.createTestCreditTransaction({
        createdAt: new Date('2024-01-15T10:00:00Z')
      })
    ]

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testDb.creditTransaction.findMany.mockResolvedValue(mockTransactions)
    global.testDb.creditTransaction.count.mockResolvedValue(1)

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      query: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        page: '1',
        limit: '10'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(true)

    expect(global.testDb.creditTransaction.findMany).toHaveBeenCalledWith({
      where: { 
        userId: 'user-123',
        createdAt: {
          gte: new Date('2024-01-01T00:00:00.000Z'),
          lte: new Date('2024-01-31T23:59:59.999Z')
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10
    })
  })

  test('should return summary statistics', async () => {
    const mockUser = global.createTestUser({ id: 'user-123' })
    
    const mockTransactions = [
      global.createTestCreditTransaction({
        amount: 50,
        type: 'PURCHASE'
      }),
      global.createTestCreditTransaction({
        amount: -5,
        type: 'DEDUCTION_IMAGE'
      }),
      global.createTestCreditTransaction({
        amount: -2,
        type: 'DEDUCTION_YOUTUBE'
      })
    ]

    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testDb.creditTransaction.findMany.mockResolvedValue(mockTransactions)
    global.testDb.creditTransaction.count.mockResolvedValue(3)

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      query: {
        includeSummary: 'true'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(true)
    expect(responseData.summary).toBeDefined()
    expect(responseData.summary.totalCreditsEarned).toBe(50)
    expect(responseData.summary.totalCreditsSpent).toBe(7)
    expect(responseData.summary.netCredits).toBe(43)
  })

  test('should use default pagination values', async () => {
    const mockUser = global.createTestUser({ id: 'user-123' })
    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testDb.creditTransaction.findMany.mockResolvedValue([])
    global.testDb.creditTransaction.count.mockResolvedValue(0)

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      }
      // No query parameters
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.pagination.page).toBe(1)
    expect(responseData.pagination.limit).toBe(20)

    expect(global.testDb.creditTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20
    })
  })

  test('should validate pagination parameters', async () => {
    const mockUser = global.createTestUser({ id: 'user-123' })
    global.testDb.user.findUnique.mockResolvedValue(mockUser)

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer mock-jwt-token'
      },
      query: {
        page: '0', // Invalid page
        limit: '101' // Exceeds max limit
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toContain('validation')
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

  test('should return empty array for user with no transactions', async () => {
    const mockUser = global.createTestUser({ id: 'user-123' })
    
    global.testDb.user.findUnique.mockResolvedValue(mockUser)
    global.testDb.creditTransaction.findMany.mockResolvedValue([])
    global.testDb.creditTransaction.count.mockResolvedValue(0)

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
    expect(responseData.transactions).toEqual([])
    expect(responseData.pagination.total).toBe(0)
  })

  test('should only accept GET method', async () => {
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
})