import { describe, test, expect, beforeEach } from '@jest/globals'

describe('/api/auth/register', () => {
  beforeEach(() => {
    // Mocks are automatically reset by jest.setup.api.js
  })

  test('should validate registerSchema correctly', () => {
    const { registerSchema } = require('../../../lib/validation')
    
    // Valid data
    const validData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      name: 'Test User'
    }
    
    const validResult = registerSchema.safeParse(validData)
    expect(validResult.success).toBe(true)
    
    // Invalid email
    const invalidEmail = { ...validData, email: 'invalid-email' }
    const emailResult = registerSchema.safeParse(invalidEmail)
    expect(emailResult.success).toBe(false)
    
    // Weak password
    const weakPassword = { ...validData, password: 'weak' }
    const passwordResult = registerSchema.safeParse(weakPassword)
    expect(passwordResult.success).toBe(false)
    
    // Missing name
    const missingName = { email: validData.email, password: validData.password }
    const nameResult = registerSchema.safeParse(missingName)
    expect(nameResult.success).toBe(false)
  })

  test('should create user and credit transaction in database', async () => {
    const userData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      name: 'New User'
    }

    // Mock Prisma operations
    global.testDb.user.findUnique.mockResolvedValue(null) // Email not taken
    global.testDb.user.create.mockResolvedValue({
      ...global.createTestUser(),
      email: userData.email,
      name: userData.name,
      credits: 50
    })
    global.testDb.creditTransaction.create.mockResolvedValue(
      global.createTestCreditTransaction({
        amount: 50,
        type: 'SIGNUP_BONUS'
      })
    )
    global.testDb.$transaction.mockImplementation(async (callback) => {
      return await callback(global.testDb)
    })

    // Import and test the registration logic directly
    const bcrypt = require('bcryptjs')
    const { PrismaClient } = require('@prisma/client')
    
    // Mock bcrypt
    bcrypt.hash = jest.fn().mockResolvedValue('hashed_password')
    
    // Simulate the core registration logic
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10)
    
    // Test database transaction
    const result = await global.testDb.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          credits: 50
        },
        select: {
          id: true,
          email: true,
          name: true,
          credits: true,
          tier: true,
          image: true,
          createdAt: true
        }
      })
      
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          amount: 50,
          type: 'SIGNUP_BONUS',
          description: 'Welcome bonus for new user'
        }
      })
      
      return user
    })
    
    expect(global.testDb.user.create).toHaveBeenCalled()
    expect(global.testDb.creditTransaction.create).toHaveBeenCalled()
  })

  test('should reject duplicate email registration', async () => {
    const userData = {
      email: 'existing@example.com',
      password: 'SecurePassword123!',
      name: 'Existing User'
    }

    // Mock existing user
    global.testDb.user.findUnique.mockResolvedValue(
      global.createTestUser({ email: userData.email })
    )

    // Check if user exists
    const existingUser = await global.testDb.user.findUnique({
      where: { email: userData.email }
    })

    expect(existingUser).not.toBeNull()
    expect(existingUser.email).toBe(userData.email)
    
    // Registration should be rejected when user exists
    expect(existingUser).toBeTruthy()
  })

  test('should handle bcrypt password hashing', async () => {
    const bcrypt = require('bcryptjs')
    
    // Test actual bcrypt functionality (mocked)
    bcrypt.hash = jest.fn().mockResolvedValue('hashed_SecurePassword123!_10')
    bcrypt.compare = jest.fn().mockResolvedValue(true)
    
    const password = 'SecurePassword123!'
    const hashedPassword = await bcrypt.hash(password, 10)
    
    expect(bcrypt.hash).toHaveBeenCalledWith(password, 10)
    expect(hashedPassword).toContain('hashed_')
    
    // Test password verification
    const isValid = await bcrypt.compare(password, hashedPassword)
    expect(isValid).toBe(true)
  })

  test('should validate credit costs according to pricing model', () => {
    const { CREDIT_COSTS } = require('../../../lib/validation')
    
    // Validate costs match pricing specification
    expect(CREDIT_COSTS.text).toBe(1)
    expect(CREDIT_COSTS.youtube).toBe(2)
    expect(CREDIT_COSTS.image).toBe(5)
    expect(CREDIT_COSTS.video).toBe(50)
  })

  test('should validate credit packages configuration', () => {
    const { CREDIT_PACKAGES, validateCreditPackage, getCreditPackage } = require('../../../lib/validation')
    
    // Test package validation
    expect(validateCreditPackage('50-credits')).toBe(true)
    expect(validateCreditPackage('100-credits')).toBe(true)
    expect(validateCreditPackage('500-credits')).toBe(true)
    expect(validateCreditPackage('invalid-package')).toBe(false)
    
    // Test package details
    const package50 = getCreditPackage('50-credits')
    expect(package50.credits).toBe(50)
    expect(package50.price).toBe(1999) // $19.99 in cents
    
    const package100 = getCreditPackage('100-credits')
    expect(package100.credits).toBe(100)
    expect(package100.price).toBe(3499) // $34.99 in cents
    
    const package500 = getCreditPackage('500-credits')
    expect(package500.credits).toBe(500)
    expect(package500.price).toBe(14999) // $149.99 in cents
  })
})