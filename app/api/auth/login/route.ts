import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { loginSchema } from '@/lib/validation'
import { createErrorResponse, createSuccessResponse, generateJWT } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(firstError.message, 400)
    }
    
    const { email, password } = validationResult.data
    
    // Find user with recent credit transactions
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        creditTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!user) {
      return createErrorResponse('Invalid credentials', 401)
    }
    
    // Check if user has a password (not social auth only)
    if (!user.password) {
      return createErrorResponse('Please use social login', 401)
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password)
    if (!passwordValid) {
      return createErrorResponse('Invalid credentials', 401)
    }
    
    // Generate JWT token
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      credits: user.credits,
      tier: user.tier,
      image: user.image
    }
    
    const token = await generateJWT(authUser)
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user
    
    return createSuccessResponse({
      user: userWithoutPassword,
      token
    })
    
  } catch (error) {
    console.error('Login error:', error)
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