const { 
  registerSchema, 
  loginSchema, 
  CREDIT_COSTS, 
  CREDIT_PACKAGES,
  validateCreditPackage,
  getCreditPackage 
} = require('../../../lib/validation')

describe('Authentication Validation', () => {
  test('should validate user registration data correctly', () => {
    // Valid registration data
    const validData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      name: 'Test User'
    }
    
    const validResult = registerSchema.safeParse(validData)
    expect(validResult.success).toBe(true)
    expect(validResult.data).toEqual(validData)
  })

  test('should reject invalid email formats', () => {
    const invalidEmails = [
      'invalid-email',
      'missing@domain',
      '@missing-local.com',
      'spaces in@email.com'
    ]
    
    invalidEmails.forEach(email => {
      const result = registerSchema.safeParse({
        email,
        password: 'SecurePassword123!',
        name: 'Test User'
      })
      expect(result.success).toBe(false)
    })
  })

  test('should enforce password strength requirements', () => {
    const weakPasswords = [
      'short', // Too short
      'nouppercase123!', // No uppercase
      'NOLOWERCASE123!', // No lowercase
      'NoNumbers!', // No numbers
      'NoSpecialChars123' // No special characters
    ]
    
    weakPasswords.forEach(password => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password,
        name: 'Test User'
      })
      expect(result.success).toBe(false)
    })
  })

  test('should validate login data', () => {
    const validLogin = {
      email: 'test@example.com',
      password: 'any-password'
    }
    
    const result = loginSchema.safeParse(validLogin)
    expect(result.success).toBe(true)
    
    // Missing password
    const missingPassword = {
      email: 'test@example.com'
    }
    
    const invalidResult = loginSchema.safeParse(missingPassword)
    expect(invalidResult.success).toBe(false)
  })

  test('should have correct credit costs per operation', () => {
    expect(CREDIT_COSTS.text).toBe(1)
    expect(CREDIT_COSTS.youtube).toBe(2)
    expect(CREDIT_COSTS.image).toBe(5)
    expect(CREDIT_COSTS.video).toBe(50)
  })

  test('should validate credit packages according to pricing model', () => {
    // Validate 50 credits package
    expect(validateCreditPackage('50-credits')).toBe(true)
    const package50 = getCreditPackage('50-credits')
    expect(package50.credits).toBe(50)
    expect(package50.price).toBe(1999) // $19.99 in cents
    expect(package50.name).toBe('50 Credits Pack')
    
    // Validate 100 credits package
    expect(validateCreditPackage('100-credits')).toBe(true)
    const package100 = getCreditPackage('100-credits')
    expect(package100.credits).toBe(100)
    expect(package100.price).toBe(3499) // $34.99 in cents
    
    // Validate 500 credits package
    expect(validateCreditPackage('500-credits')).toBe(true)
    const package500 = getCreditPackage('500-credits')
    expect(package500.credits).toBe(500)
    expect(package500.price).toBe(14999) // $149.99 in cents
    
    // Invalid package
    expect(validateCreditPackage('invalid-package')).toBe(false)
  })

  test('should provide subscription tier configuration', () => {
    const { SUBSCRIPTION_TIERS, validateSubscriptionPlan, getSubscriptionTier } = require('../../../lib/validation')
    
    // Basic tier
    expect(validateSubscriptionPlan('basic')).toBe(true)
    const basicTier = getSubscriptionTier('basic')
    expect(basicTier.credits).toBe(100)
    expect(basicTier.tier).toBe('BASIC')
    expect(basicTier.priceId).toBe('price_basic_monthly')
    
    // Professional tier
    expect(validateSubscriptionPlan('professional')).toBe(true)
    const proTier = getSubscriptionTier('professional')
    expect(proTier.credits).toBe(300)
    expect(proTier.tier).toBe('PROFESSIONAL')
    
    // Enterprise tier
    expect(validateSubscriptionPlan('enterprise')).toBe(true)
    const entTier = getSubscriptionTier('enterprise')
    expect(entTier.credits).toBe(800)
    expect(entTier.tier).toBe('ENTERPRISE')
    
    // Invalid plan
    expect(validateSubscriptionPlan('invalid-plan')).toBe(false)
  })
})

describe('Credit Operation Validation', () => {
  const { creditDeductionSchema } = require('../../../lib/validation')
  
  test('should validate credit deduction operations', () => {
    const validOperations = [
      {
        operation: 'text',
        amount: 1,
        description: 'Text processing operation'
      },
      {
        operation: 'youtube',
        amount: 2,
        description: 'YouTube video analysis'
      },
      {
        operation: 'image',
        amount: 5,
        description: 'Image generation'
      },
      {
        operation: 'video',
        amount: 50,
        description: 'Video generation'
      }
    ]
    
    validOperations.forEach(op => {
      const result = creditDeductionSchema.safeParse(op)
      expect(result.success).toBe(true)
    })
  })
  
  test('should reject invalid operations', () => {
    const invalidOperations = [
      {
        operation: 'invalid',
        amount: 1,
        description: 'Invalid operation'
      },
      {
        operation: 'text',
        amount: -1, // Negative amount
        description: 'Text processing'
      },
      {
        operation: 'text',
        amount: 1
        // Missing description
      }
    ]
    
    invalidOperations.forEach(op => {
      const result = creditDeductionSchema.safeParse(op)
      expect(result.success).toBe(false)
    })
  })
})

describe('Payment Validation', () => {
  const { createCheckoutSchema } = require('../../../lib/validation')
  
  test('should validate checkout session creation', () => {
    const validCheckout = {
      packageType: 'credits',
      packageId: '50-credits',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel'
    }
    
    const result = createCheckoutSchema.safeParse(validCheckout)
    expect(result.success).toBe(true)
  })
  
  test('should reject invalid checkout data', () => {
    const invalidCheckouts = [
      {
        packageType: 'invalid',
        packageId: '50-credits',
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel'
      },
      {
        packageType: 'credits',
        packageId: '50-credits',
        successUrl: 'invalid-url',
        cancelUrl: 'https://app.com/cancel'
      },
      {
        packageType: 'credits'
        // Missing required fields
      }
    ]
    
    invalidCheckouts.forEach(checkout => {
      const result = createCheckoutSchema.safeParse(checkout)
      expect(result.success).toBe(false)
    })
  })
})