import { NextRequest } from 'next/server'
import { createErrorResponse, createSuccessResponse, getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return createErrorResponse('Invalid or expired token', 401)
    }
    
    return createSuccessResponse({ user })
  } catch (error) {
    console.error('Token verification error:', error)
    return createErrorResponse('Invalid or expired token', 401)
  }
}

export async function POST() {
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