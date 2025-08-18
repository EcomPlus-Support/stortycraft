import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { creditDeductionSchema, CREDIT_COSTS } from '@/lib/validation'
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        credits: true,
        tier: true
      }
    })
    
    if (!userData) {
      return createErrorResponse('User not found', 404)
    }
    
    return createSuccessResponse({
      credits: userData.credits,
      tier: userData.tier
    })
    
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401)
    }
    console.error('Credits fetch error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    
    // Validate input
    const validationResult = creditDeductionSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(firstError.message, 400)
    }
    
    const { operation, amount, description } = validationResult.data
    
    // Validate amount matches operation cost
    const expectedCost = CREDIT_COSTS[operation as keyof typeof CREDIT_COSTS]
    if (amount !== expectedCost) {
      return createErrorResponse(`Invalid amount for ${operation} operation. Expected ${expectedCost} credits.`, 400)
    }
    
    // Get current user credits
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true }
    })
    
    if (!currentUser) {
      return createErrorResponse('User not found', 404)
    }
    
    // Check if user has enough credits
    if (currentUser.credits < amount) {
      return createErrorResponse('Insufficient credits', 400, {
        required: amount,
        available: currentUser.credits
      })
    }
    
    // Deduct credits in a transaction
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Update user credits
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { credits: { decrement: amount } },
          select: { credits: true }
        })
        
        // Create credit transaction record
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: -amount,
            type: `DEDUCTION_${operation.toUpperCase()}` as any,
            description
          }
        })
        
        return updatedUser
      })
      
      return createSuccessResponse({
        creditsRemaining: result.credits,
        message: `Successfully deducted ${amount} credits`
      })
      
    } catch (error) {
      // Handle concurrent update conflicts
      console.error('Credit deduction transaction error:', error)
      return createErrorResponse('Credit update conflict - please retry', 409)
    }
    
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401)
    }
    console.error('Credit deduction error:', error)
    return createErrorResponse('Internal server error', 500)
  }
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