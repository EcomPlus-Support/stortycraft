import NextAuth, { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user || !user.password) {
          return null
        }
        
        const passwordValid = await bcrypt.compare(credentials.password, user.password)
        if (!passwordValid) {
          return null
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error'
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      // Handle social auth sign-in
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        if (!profile?.email) {
          return false
        }
        
        // Check if user exists
        let existingUser = await prisma.user.findUnique({
          where: { email: profile.email }
        })
        
        if (!existingUser) {
          // Create new user for social auth with initial credits
          await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
              data: {
                email: profile.email,
                name: profile.name || '',
                image: profile.picture || profile.image,
                credits: 50,
                ...(account.provider === 'google' && { googleId: account.providerAccountId }),
                ...(account.provider === 'facebook' && { facebookId: account.providerAccountId })
              }
            })
            
            // Create signup bonus transaction
            await tx.creditTransaction.create({
              data: {
                userId: newUser.id,
                amount: 50,
                type: 'SIGNUP_BONUS',
                description: 'Welcome bonus for new user'
              }
            })
          })
        }
      }
      
      // Check if user account is disabled
      if (user && 'disabled' in user && user.disabled) {
        return false
      }
      
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Initial sign in
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id }
        })
        
        if (dbUser) {
          token.userId = dbUser.id
          token.credits = dbUser.credits
          token.tier = dbUser.tier
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.user.credits = token.credits as number
        session.user.tier = token.tier as string
      }
      
      return session
    }
  },
  events: {
    async createUser({ user }) {
      // Log user creation
      console.log('New user created:', user.email)
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }