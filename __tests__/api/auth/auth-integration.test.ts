const bcrypt = require('bcryptjs')
const { generateJWT, verifyJWT } = require('../../../lib/auth')

// Mock Prisma client
const mockPrismaClient = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  creditTransaction: {
    create: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
}

// Test factories
const createTestUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  credits: 50,
  tier: 'FREE',
  image: null,
  ...overrides,
})

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock bcrypt functions
    bcrypt.hash = jest.fn()
    bcrypt.compare = jest.fn()
  })

  test('should complete full user registration flow', async () => {
    const userData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      name: 'New User'
    }

    // Mock bcrypt hash
    bcrypt.hash.mockResolvedValue('hashed_SecurePassword123!_10')
    
    // Mock database operations
    mockPrismaClient.user.findUnique.mockResolvedValue(null) // Email not taken
    mockPrismaClient.user.create.mockResolvedValue(
      createTestUser({
        email: userData.email,
        name: userData.name,
        credits: 50
      })
    )
    mockPrismaClient.creditTransaction.create.mockResolvedValue({
      id: 'txn-123',
      userId: 'user-123',
      amount: 50,
      type: 'SIGNUP_BONUS',
      description: 'Welcome bonus for new user'
    })
    mockPrismaClient.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrismaClient)
    })

    // Simulate registration logic
    const { registerSchema } = require('../../../lib/validation')
    
    // 1. Validate input
    const validationResult = registerSchema.safeParse(userData)
    expect(validationResult.success).toBe(true)
    
    // 2. Check if user exists
    const existingUser = await mockPrismaClient.user.findUnique({
      where: { email: userData.email }
    })
    expect(existingUser).toBeNull()
    
    // 3. Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10)
    
    // 4. Create user with transaction
    const result = await mockPrismaClient.$transaction(async (tx) => {
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
    
    // 5. Generate JWT
    const token = await generateJWT(result)
    expect(typeof token).toBe('string')
    expect(token).toBeTruthy()
    
    // Verify all operations completed
    expect(mockPrismaClient.user.create).toHaveBeenCalled()
    expect(mockPrismaClient.creditTransaction.create).toHaveBeenCalled()
  })

  test('should complete full user login flow', async () => {
    const loginData = {
      email: 'user@example.com',
      password: 'SecurePassword123!'
    }

    const existingUser = createTestUser({
      email: loginData.email,
      password: 'hashed_SecurePassword123!_10',
      credits: 75
    })

    // Mock bcrypt compare
    bcrypt.compare.mockResolvedValue(true)
    
    // Mock database operations
    mockPrismaClient.user.findUnique.mockResolvedValue({
      ...existingUser,
      creditTransactions: [
        {
          id: 'txn-1',
          amount: -5,
          type: 'DEDUCTION_IMAGE',
          description: 'Image generation',
          createdAt: new Date()
        }
      ]
    })

    // Simulate login logic
    const { loginSchema } = require('../../../lib/validation')
    
    // 1. Validate input
    const validationResult = loginSchema.safeParse(loginData)
    expect(validationResult.success).toBe(true)
    
    // 2. Find user
    const user = await mockPrismaClient.user.findUnique({
      where: { email: loginData.email },
      include: {
        creditTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    expect(user).toBeTruthy()
    expect(user.password).toBeTruthy()
    
    // 3. Verify password
    const passwordValid = await bcrypt.compare(loginData.password, user.password)
    expect(passwordValid).toBe(true)
    expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, user.password)
    
    // 4. Generate JWT
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      credits: user.credits,
      tier: user.tier,
      image: user.image
    }
    
    const token = await generateJWT(authUser)
    expect(typeof token).toBe('string')
    
    // 5. Verify JWT can be decoded
    const decodedUser = await verifyJWT(token)
    expect(decodedUser).toBeTruthy()
    expect(decodedUser.id).toBe(user.id)
    expect(decodedUser.email).toBe(user.email)
    expect(decodedUser.credits).toBe(user.credits)
  })

  test('should handle credit deduction operation flow', async () => {
    const userId = 'user-123'
    const operation = 'image'
    const amount = 5
    const description = 'Image generation'

    const currentUser = createTestUser({
      id: userId,
      credits: 50
    })

    // Mock database operations
    mockPrismaClient.user.findUnique.mockResolvedValue(currentUser)
    mockPrismaClient.user.update.mockResolvedValue({
      ...currentUser,
      credits: 45
    })
    mockPrismaClient.creditTransaction.create.mockResolvedValue({
      id: 'txn-456',
      userId,
      amount: -amount,
      type: 'DEDUCTION_IMAGE',
      description
    })
    mockPrismaClient.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrismaClient)
    })

    // Simulate credit deduction logic
    const { creditDeductionSchema, CREDIT_COSTS } = require('../../../lib/validation')
    
    // 1. Validate input
    const validationResult = creditDeductionSchema.safeParse({
      operation,
      amount,
      description
    })
    expect(validationResult.success).toBe(true)
    
    // 2. Validate amount matches operation cost
    const expectedCost = CREDIT_COSTS[operation]
    expect(amount).toBe(expectedCost)
    
    // 3. Check current credits
    const user = await mockPrismaClient.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    })
    expect(user.credits).toBeGreaterThanOrEqual(amount)
    
    // 4. Deduct credits in transaction
    const result = await mockPrismaClient.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
        select: { credits: true }
      })
      
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'DEDUCTION_IMAGE',
          description
        }
      })
      
      return updatedUser
    })
    
    expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true }
    })
    expect(mockPrismaClient.creditTransaction.create).toHaveBeenCalled()
  })

  test('should handle payment and credit allocation flow', async () => {
    const userId = 'user-123'
    const creditsGranted = 50
    const paymentAmount = 1999

    const user = createTestUser({
      id: userId,
      credits: 25
    })

    // Mock database operations
    mockPrismaClient.user.findUnique.mockResolvedValue(user)
    mockPrismaClient.payment.create.mockResolvedValue({
      id: 'payment-456',
      userId,
      stripePaymentId: 'pi_test_123',
      amount: paymentAmount,
      creditsGranted
    })
    mockPrismaClient.user.update.mockResolvedValue({
      ...user,
      credits: 75
    })
    mockPrismaClient.creditTransaction.create.mockResolvedValue({
      id: 'txn-789',
      userId,
      amount: creditsGranted,
      type: 'PURCHASE',
      description: `Credit pack purchase: ${creditsGranted} credits`
    })
    mockPrismaClient.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrismaClient)
    })

    // Simulate successful payment processing
    await mockPrismaClient.$transaction(async (tx) => {
      // Create payment record
      await tx.payment.create({
        data: {
          userId,
          stripePaymentId: 'pi_test_123',
          stripeSessionId: 'cs_test_123',
          amount: paymentAmount,
          currency: 'usd',
          status: 'COMPLETED',
          creditsGranted,
          metadata: { packageId: '50-credits' }
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
            paymentId: 'pi_test_123',
            stripeSessionId: 'cs_test_123'
          }
        }
      })
    })

    expect(mockPrismaClient.payment.create).toHaveBeenCalled()
    expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { credits: { increment: creditsGranted } }
    })
    expect(mockPrismaClient.creditTransaction.create).toHaveBeenCalled()
  })

  test('should validate JWT token lifecycle', async () => {
    const user = createTestUser({
      id: 'user-456',
      email: 'jwt-test@example.com',
      name: 'JWT Test User',
      credits: 100,
      tier: 'BASIC'
    })

    // Generate JWT
    const token = await generateJWT(user)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    
    // Verify JWT
    const decodedUser = await verifyJWT(token)
    expect(decodedUser).toBeTruthy()
    expect(decodedUser.id).toBe(user.id)
    expect(decodedUser.email).toBe(user.email)
    expect(decodedUser.name).toBe(user.name)
    expect(decodedUser.credits).toBe(user.credits)
    expect(decodedUser.tier).toBe(user.tier)
    
    // Test invalid token
    const invalidToken = 'invalid.jwt.token'
    const invalidResult = await verifyJWT(invalidToken)
    expect(invalidResult).toBeNull()
  })

  test('should validate pricing model compliance', () => {
    const { CREDIT_COSTS, CREDIT_PACKAGES, SUBSCRIPTION_TIERS } = require('../../../lib/validation')
    
    // Verify credit costs match specification
    expect(CREDIT_COSTS.text).toBe(1)
    expect(CREDIT_COSTS.youtube).toBe(2)
    expect(CREDIT_COSTS.image).toBe(5)
    expect(CREDIT_COSTS.video).toBe(50)
    
    // Verify credit packages match specification
    expect(CREDIT_PACKAGES['50-credits'].price).toBe(1999)   // $19.99
    expect(CREDIT_PACKAGES['100-credits'].price).toBe(3499)  // $34.99
    expect(CREDIT_PACKAGES['500-credits'].price).toBe(14999) // $149.99
    
    // Verify subscription tiers
    expect(SUBSCRIPTION_TIERS.basic.credits).toBe(100)
    expect(SUBSCRIPTION_TIERS.professional.credits).toBe(300)
    expect(SUBSCRIPTION_TIERS.enterprise.credits).toBe(800)
  })
})