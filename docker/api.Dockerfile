# Dependencies stage
FROM node:20-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.1 --activate

WORKDIR /app

# Copy package files for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY turbo.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# Builder stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.1 --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY turbo.json ./

# Copy source code and Prisma schema
COPY apps/api ./apps/api

# Generate Prisma client (no cache - output must persist)
RUN cd apps/api && pnpm prisma generate

# Build application
RUN pnpm --filter=@vocab-app/api build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm (needed for Prisma)
RUN corepack enable && corepack prepare pnpm@8.15.1 --activate

# Install image processing libraries for HEIC/HEIF support (iPhone photos)
# libheif: Core HEIC/HEIF format support
# libde265: H.265 decoder (required by libheif)
# vips: Image processing library (ensures HEIC loader is available to sharp)
RUN apk add --no-cache \
    vips \
    libheif \
    libde265

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY turbo.json ./

# Install all dependencies with cache mount (simpler, includes Prisma CLI)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# Copy Prisma schema and generate client
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && pnpm prisma generate

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "apps/api/dist/index.js"]
