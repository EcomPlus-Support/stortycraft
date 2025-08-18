import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { registerSchema } from '@/lib/validation'
import { createErrorResponse, createSuccessResponse, generateJWT } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(firstError.message, 400)
    }
    
    const { email, password, name } = validationResult.data
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return createErrorResponse('Email already registered', 400)
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Create user with initial credits in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user with 50 free credits
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
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
      
      // Create credit transaction for signup bonus
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
    
    // Generate JWT token
    const token = await generateJWT(result)
    
    return createSuccessResponse({
      user: result,
      token
    }, 201)
    
  } catch (error) {
    console.error('Registration error:', error)
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