import { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { PrismaClient } from '@prisma/client'
import { AuthenticationError } from './errors'

const prisma = new PrismaClient()

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development'
)

export interface AuthUser {
  id: string
  email: string
  name?: string | null
  credits: number
  tier: string
  image?: string | null
}

export async function generateJWT(user: AuthUser): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    credits: user.credits,
    tier: user.tier
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
  
  return token
}

export async function verifyJWT(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    return {
      id: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string | null,
      credits: payload.credits as number,
      tier: payload.tier as string,
      image: payload.image as string | null
    }
  } catch (error) {
    return null
  }
}

export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const authorization = request.headers.get('authorization')
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null
  }
  
  const token = authorization.substring(7)
  const payload = await verifyJWT(token)
  
  if (!payload) {
    return null
  }
  
  // Verify user still exists and get fresh data
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      name: true,
      credits: true,
      tier: true,
      image: true
    }
  })
  
  return user as AuthUser
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getUserFromRequest(request)
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export function createErrorResponse(message: string, status: number = 400, additionalData?: any) {
  return new Response(
    JSON.stringify({ success: false, error: message, ...additionalData }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

export function createSuccessResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// Re-export AuthenticationError for backward compatibility
export { AuthenticationError }

// Mock auth manager for services that expect it
export function getAuthManager() {
  return {
    getApiKey: () => process.env.GOOGLE_API_KEY || '',
    getProjectId: () => process.env.GOOGLE_CLOUD_PROJECT_ID || 'fechen-aifactory',
    getServiceAccountKey: () => process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
    authenticate: async () => {
      // Mock authentication for now
      return true
    }
  }
}