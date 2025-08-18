import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { creditHistorySchema } from '@/lib/validation'
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const queryParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      includeSummary: searchParams.get('includeSummary')
    }
    
    const validationResult = creditHistorySchema.safeParse(queryParams)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(`Validation error: ${firstError.message}`, 400)
    }
    
    const { page, limit, type, startDate, endDate, includeSummary } = validationResult.data
    
    // Build where clause
    const where: any = { userId: user.id }
    
    if (type) {
      where.type = type
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        // Handle both datetime and date formats
        const start = startDate.includes('T') 
          ? new Date(startDate)
          : new Date(`${startDate}T00:00:00.000Z`)
        where.createdAt.gte = start
      }
      if (endDate) {
        // Handle both datetime and date formats
        const end = endDate.includes('T')
          ? new Date(endDate)
          : new Date(`${endDate}T23:59:59.999Z`)
        where.createdAt.lte = end
      }
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit
    
    // Get transactions and total count
    const [transactions, totalCount] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          type: true,
          description: true,
          metadata: true,
          createdAt: true
        }
      }),
      prisma.creditTransaction.count({ where })
    ])
    
    const response: any = {
      transactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }
    
    // Include summary if requested
    if (includeSummary) {
      const allTransactions = await prisma.creditTransaction.findMany({
        where: { userId: user.id },
        select: { amount: true, type: true }
      })
      
      const summary = {
        totalCreditsEarned: allTransactions
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0),
        totalCreditsSpent: Math.abs(allTransactions
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + t.amount, 0)),
        netCredits: allTransactions.reduce((sum, t) => sum + t.amount, 0)
      }
      
      response.summary = summary
    }
    
    return createSuccessResponse(response)
    
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401)
    }
    console.error('Credit history fetch error:', error)
    return createErrorResponse('Internal server error', 500)
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