import { describe, test, expect, beforeEach } from '@jest/globals'

// We'll implement this handler later
import { POST, GET } from '../../../app/api/auth/register/route'

// Helper to create mock Request
function createMockRequest(method: string, body?: any, headers?: any) {
  const url = 'http://localhost:3000/api/auth/register'
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }
  
  if (body) {
    init.body = JSON.stringify(body)
  }
  
  return new Request(url, init)
}

// Helper to parse Response
async function parseResponse(response: Response) {
  const text = await response.text()
  return {
    status: response.status,
    data: text ? JSON.parse(text) : null
  }
}

describe('/api/auth/register', () => {
  beforeEach(() => {
    // Mocks are automatically reset by jest.setup.api.js
  })

  test('should register a new user successfully', async () => {
    const userData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      name: 'New User'
    }

    const createdUser = {
      ...global.createTestUser(),
      email: userData.email,
      name: userData.name,
      credits: 50
    }

    // Mock Prisma user creation
    global.testDb.user.findUnique.mockResolvedValue(null) // Email not taken
    
    // Mock the transaction to return the created user
    global.testDb.$transaction.mockImplementation(async (callback) => {
      // Mock the transaction context
      const txContext = {
        user: {
          create: jest.fn().mockResolvedValue(createdUser)
        },
        creditTransaction: {
          create: jest.fn().mockResolvedValue(global.createTestCreditTransaction({
            amount: 50,
            type: 'SIGNUP_BONUS',
            description: 'Welcome bonus for new user'
          }))
        }
      }
      return await callback(txContext)
    })

    const request = createMockRequest('POST', userData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(201)
    
    expect(responseData.success).toBe(true)
    expect(responseData.user.email).toBe(userData.email)
    expect(responseData.user.name).toBe(userData.name)
    expect(responseData.user.credits).toBe(50)
    expect(responseData.user.password).toBeFalsy() // Password should not be returned
    expect(responseData.token).toBeDefined() // JWT token should be present

    // Verify database calls
    expect(global.testDb.user.findUnique).toHaveBeenCalledWith({
      where: { email: userData.email }
    })
    expect(global.testDb.$transaction).toHaveBeenCalled()
  })

  test('should reject registration with existing email', async () => {
    const userData = {
      email: 'existing@example.com',
      password: 'SecurePassword123!',
      name: 'Existing User'
    }

    // Mock existing user
    global.testDb.user.findUnique.mockResolvedValue(
      global.createTestUser({ email: userData.email })
    )

    const request = createMockRequest('POST', userData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(400)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Email already registered')
    
    // Should not create user
    expect(global.testDb.user.create).not.toHaveBeenCalled()
  })

  test('should validate email format', async () => {
    const userData = {
      email: 'invalid-email',
      password: 'SecurePassword123!',
      name: 'Test User'
    }

    const request = createMockRequest('POST', userData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(400)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toContain('email')
  })

  test('should validate password strength', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'weak',
      name: 'Test User'
    }

    const request = createMockRequest('POST', userData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(400)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toContain('Password must be at least 8 characters')
  })

  test('should require all fields', async () => {
    const userData = {
      email: 'test@example.com'
      // Missing password and name
    }

    const request = createMockRequest('POST', userData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(400)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toContain('Required')
  })

  test('should handle database errors gracefully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      name: 'Test User'
    }

    // Mock database error
    global.testDb.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

    const request = createMockRequest('POST', userData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(500)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Internal server error')
  })

  test('should only accept POST method', async () => {
    const request = createMockRequest('GET')
    const response = await GET()
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(405)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Method not allowed')
  })
})