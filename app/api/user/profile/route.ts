import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { updateProfileSchema } from '@/lib/validation'
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        credits: true,
        tier: true,
        createdAt: true,
        updatedAt: true,
        apiCallsThisHour: true,
        storageUsed: true
      }
    })
    
    if (!userData) {
      return createErrorResponse('User not found', 404)
    }
    
    return createSuccessResponse({ user: userData })
    
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401)
    }
    console.error('Profile fetch error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    
    // Validate input
    const validationResult = updateProfileSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(firstError.message, 400)
    }
    
    const updateData = validationResult.data
    
    // Prevent updating sensitive fields
    const restrictedFields = ['email', 'credits', 'tier', 'stripeCustomerId', 'password']
    const hasRestrictedFields = Object.keys(body).some(key => restrictedFields.includes(key))
    
    if (hasRestrictedFields) {
      return createErrorResponse('Some fields are not allowed to be updated', 400)
    }
    
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        credits: true,
        tier: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    return createSuccessResponse({ user: updatedUser })
    
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401)
    }
    console.error('Profile update error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check for active subscriptions
    const userWithSubscriptions = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' }
        }
      }
    })
    
    if (userWithSubscriptions?.subscriptions?.length > 0) {
      return createErrorResponse('Cannot delete account with active subscriptions. Please cancel your subscription first.', 400)
    }
    
    // Delete user account (cascade will handle related records)
    await prisma.user.delete({
      where: { id: user.id }
    })
    
    return createSuccessResponse({ message: 'Account deleted successfully' })
    
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401)
    }
    console.error('Account deletion error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST() {
  return createErrorResponse('Method not allowed', 405)
}

export async function PUT() {
  return createErrorResponse('Method not allowed', 405)
}