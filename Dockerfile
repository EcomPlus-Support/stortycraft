# Build stage
FROM node:20-alpine AS builder

# Install system dependencies
RUN apk add --no-cache libc6-compat ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with clean slate
RUN npm ci --only=production --ignore-scripts

# Copy environment configuration for build
COPY .env.docker .env

# Copy source code
COPY . .

# Set environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Build the application with proper error handling
RUN npm run build

# Remove build-time env file
RUN rm -f .env

# Production stage
FROM node:20-alpine AS runner

# Install system dependencies
RUN apk add --no-cache libc6-compat ffmpeg

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/start.sh ./start.sh

# Make startup script executable
RUN chmod +x start.sh

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER nextjs

EXPOSE 3000

# Start the application using the startup script
CMD ["./start.sh"]
