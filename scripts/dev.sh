#!/bin/bash
set -e

echo "🚀 Starting Vocab App Local Development Environment"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if .env files exist
check_env_files() {
    echo ""
    echo "📋 Checking environment files..."

    if [ ! -f "apps/api/.env" ]; then
        print_warning "apps/api/.env not found"
        if [ -f "apps/api/.env.example" ]; then
            echo "   Creating from .env.example..."
            cp apps/api/.env.example apps/api/.env
            print_warning "Please edit apps/api/.env with your credentials"
            print_warning "At minimum, set ANTHROPIC_API_KEY for AI features"
        else
            print_error "apps/api/.env.example not found. Cannot create .env"
            exit 1
        fi
    else
        print_success "apps/api/.env exists"
    fi

    if [ ! -f "apps/web/.env.local" ]; then
        print_warning "apps/web/.env.local not found"
        if [ -f "apps/web/.env.example" ]; then
            echo "   Creating from .env.example..."
            cp apps/web/.env.example apps/web/.env.local
        fi
    fi
    print_success "Environment files ready"
}

# Start Docker services
start_docker_services() {
    echo ""
    echo "🐳 Starting Docker services (Postgres, Redis, MinIO)..."

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi

    docker-compose up -d

    echo ""
    echo "⏳ Waiting for services to be healthy..."

    # Wait for PostgreSQL
    echo -n "   Postgres: "
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
            print_success "Ready"
            break
        fi
        echo -n "."
        sleep 1
    done

    # Wait for Redis
    echo -n "   Redis: "
    for i in {1..30}; do
        if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
            print_success "Ready"
            break
        fi
        echo -n "."
        sleep 1
    done

    # Wait for MinIO
    echo -n "   MinIO: "
    for i in {1..30}; do
        if curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
            print_success "Ready"
            break
        fi
        echo -n "."
        sleep 1
    done

    print_success "All services are healthy"
}

# Install dependencies
install_dependencies() {
    echo ""
    echo "📦 Installing dependencies..."

    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install pnpm first:"
        echo "   npm install -g pnpm"
        exit 1
    fi

    pnpm install
    print_success "Dependencies installed"
}

# Setup database
setup_database() {
    echo ""
    echo "🗄️  Setting up database..."

    cd apps/api

    # Generate Prisma client
    echo "   Generating Prisma client..."
    pnpm prisma generate

    # Run migrations
    echo "   Running database migrations..."
    pnpm prisma migrate dev

    cd ../..
    print_success "Database ready"
}

# Start development servers
start_dev_servers() {
    echo ""
    echo "🚀 Starting development servers..."
    echo ""
    print_success "Frontend: http://localhost:3000"
    print_success "Backend API: http://localhost:3001"
    print_success "MinIO Console: http://localhost:9001 (minioadmin / minioadmin)"
    echo ""
    print_warning "Press Ctrl+C to stop all servers"
    echo ""

    # Start all dev servers with pnpm
    pnpm dev
}

# Main execution
main() {
    # Parse command line args
    SKIP_DEPS=false
    SKIP_DB=false

    for arg in "$@"; do
        case $arg in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-deps    Skip dependency installation"
                echo "  --skip-db      Skip database setup"
                echo "  --help         Show this help message"
                echo ""
                echo "Services:"
                echo "  Frontend:      http://localhost:3000"
                echo "  Backend API:   http://localhost:3001"
                echo "  MinIO Console: http://localhost:9001"
                exit 0
                ;;
        esac
    done

    check_env_files
    start_docker_services

    if [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    fi

    if [ "$SKIP_DB" = false ]; then
        setup_database
    fi

    start_dev_servers
}

# Run main function
main "$@"
