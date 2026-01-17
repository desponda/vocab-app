# Build stage
FROM node:20-alpine AS builder

# Build arguments for Next.js public env vars
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.1 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY turbo.json ./

# Install dependencies (temporarily allow lockfile update)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY apps/web ./apps/web

# Set environment variable for Next.js build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js application
RUN pnpm --filter=@vocab-app/web build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Start application
CMD ["node", "apps/web/server.js"]
