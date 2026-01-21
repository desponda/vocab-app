#!/bin/bash

# Local E2E Testing Setup Script
# This script sets up a complete local environment for running Playwright e2e tests

set -e  # Exit on error

echo "🚀 Setting up local e2e testing environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if Docker is running
echo -e "${BLUE}📦 Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Step 2: Start Docker services
echo -e "${BLUE}🐳 Starting Docker services (Postgres, Redis, MinIO)...${NC}"
docker-compose up -d postgres redis minio

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Check Postgres
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo "  Waiting for Postgres..."
  sleep 2
done
echo -e "${GREEN}✓ Postgres is ready${NC}"

# Check Redis
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
  echo "  Waiting for Redis..."
  sleep 2
done
echo -e "${GREEN}✓ Redis is ready${NC}"

echo -e "${GREEN}✓ MinIO is ready${NC}"

# Step 3: Run database migrations
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
cd apps/api
pnpm prisma migrate deploy
echo -e "${GREEN}✓ Migrations complete${NC}"

# Step 4: Seed database with test data
echo -e "${BLUE}🌱 Seeding database with test data...${NC}"
pnpm prisma:seed
echo -e "${GREEN}✓ Database seeded${NC}"

cd ../..

# Step 5: Install Playwright browsers if needed
echo -e "${BLUE}🎭 Checking Playwright browsers...${NC}"
cd apps/web
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "  Installing Playwright browsers..."
  npx playwright install chromium
else
  echo -e "${GREEN}✓ Playwright browsers already installed${NC}"
fi
cd ../..

echo ""
echo -e "${GREEN}✅ Local e2e environment is ready!${NC}"
echo ""
echo "📝 Quick Reference:"
echo "  - Teacher login: teacher@test.com (password: Test1234!)"
echo "  - Student logins: student1@test.com, student2@test.com, student3@test.com"
echo "  - Classroom code: TEST01"
echo ""
echo "🧪 To run e2e tests:"
echo "  pnpm test:e2e:local        # Run all e2e tests locally"
echo "  pnpm test:e2e:local:ui     # Run with Playwright UI"
echo "  pnpm test:e2e:local:headed # Run in headed mode (see browser)"
echo ""
echo "🎯 To run the new teacher test results test:"
echo "  cd apps/web"
echo "  pnpm test:e2e tests/e2e/teacher-view-test-results.spec.ts"
echo ""
echo "💡 Services running:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:3001"
echo "  - Postgres: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - MinIO Console: http://localhost:9001"
echo ""
