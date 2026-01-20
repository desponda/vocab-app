# Local UI Testing Guide

This guide explains how to test the UI locally to catch bugs before they reach production.

## Quick Start

```bash
# One command to start everything
./scripts/dev.sh
```

This will:
1. Start Docker services (Postgres, Redis, MinIO)
2. Install dependencies
3. Run database migrations
4. Start development servers

**Access points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MinIO Console: http://localhost:9001 (minioadmin / minioadmin)

## Prerequisites

Before you start, make sure you have:

- **Node.js v20.20.0+** (`node --version`)
- **pnpm v8.15.1+** (`pnpm --version`)
- **Docker Desktop** (running)

## Manual Setup (if not using dev.sh)

### 1. Environment Files

```bash
# Backend
cp apps/api/.env.example apps/api/.env
# Edit with your credentials

# Frontend (optional)
cp apps/web/.env.example apps/web/.env.local
```

**Required in `apps/api/.env`:**
- `ANTHROPIC_API_KEY` - For AI vocabulary extraction (get from https://console.anthropic.com)
- Other values can use defaults for local dev

### 2. Start Services

```bash
# Start Postgres, Redis, MinIO
docker-compose up -d

# Wait for services to be healthy
docker-compose ps
```

### 3. Setup Database

```bash
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev
cd ../..
```

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Start Dev Servers

```bash
# Start both frontend and backend
pnpm dev

# Or start individually:
pnpm dev --filter=web  # Frontend only
pnpm dev --filter=api  # Backend only
```

## Testing Workflow

### 1. Hot Reload Testing

Next.js and Fastify both support hot reload. When you make changes:

- **Frontend changes** (React components, pages):
  - Save file → Browser auto-refreshes
  - See changes instantly at http://localhost:3000

- **Backend changes** (API routes, business logic):
  - Save file → Server auto-restarts
  - API clients will reconnect automatically

### 2. Testing User Flows

**Create a test user:**

```bash
# Open Prisma Studio to create users manually
cd apps/api
pnpm prisma studio
```

Or use the registration flow at http://localhost:3000/register

**Common flows to test:**

1. **Authentication**
   - Register new account
   - Login
   - Logout
   - Token refresh

2. **Teacher Dashboard**
   - Create classroom
   - Upload vocabulary sheet
   - Create tests
   - Assign tests to students

3. **Student Dashboard**
   - Join classroom with code
   - Take tests
   - View results

### 3. Catching React Errors

**Enable React DevTools:**

1. Install [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) browser extension
2. Open DevTools (F12) → React tab
3. Enable "Highlight updates when components render"

**Common issues to look for:**

- **Infinite loops** (like the wizard bug we just fixed):
  - Component repeatedly flashing/updating
  - Browser tab freezing
  - Console error: "Maximum update depth exceeded"
  - Fix: Check useEffect dependencies, memoize callbacks

- **Missing dependencies** in useEffect:
  - ESLint warning in VS Code
  - Unexpected behavior when values change
  - Fix: Add all dependencies to dependency array

- **Re-render performance issues**:
  - Slow UI interactions
  - Components re-rendering unnecessarily
  - Fix: Use React.memo(), useMemo(), useCallback()

### 4. Browser Console Monitoring

**Watch for errors while testing:**

```bash
# Open DevTools (F12) → Console tab
# Filter by "Errors" (red X icon)
```

**Common error patterns:**

1. **Network errors** (4xx/5xx responses):
   - Check API route implementation
   - Verify authentication tokens
   - Check request payload

2. **React errors** (component crashes):
   - Check for null/undefined values
   - Verify prop types
   - Check conditional rendering logic

3. **State management errors**:
   - Infinite loops (useEffect firing repeatedly)
   - Stale closures (callback using old state)
   - Context value changes too frequently

### 5. Testing Forms and Dialogs

**Test Creation Wizard** (the one we just fixed):

1. Open http://localhost:3000/tests
2. Click "Create Test"
3. **Watch for:**
   - Dialog opens without errors
   - Steps navigate correctly
   - Form validation works
   - File upload shows progress
   - No infinite loops (browser doesn't freeze)

**Testing checklist for modals/wizards:**

- [ ] Opens without errors
- [ ] Closes cleanly
- [ ] Navigation works (Next/Back buttons)
- [ ] Form validation works
- [ ] Submit button enables/disables correctly
- [ ] Loading states work
- [ ] Error states work
- [ ] Success states work
- [ ] No console errors
- [ ] No infinite re-renders

### 6. Testing API Changes

When modifying API endpoints:

```bash
# Use curl or httpie to test directly
curl http://localhost:3001/api/health

# Or use Postman/Insomnia
# Or use Thunder Client VS Code extension
```

**Test API endpoints before testing UI:**

1. Test endpoint in isolation (curl/Postman)
2. Verify response structure matches frontend expectations
3. Then test through UI

### 7. Database State Testing

**Use Prisma Studio to inspect database:**

```bash
cd apps/api
pnpm prisma studio
```

**Access at:** http://localhost:5555

**Use for:**
- Viewing data after operations
- Creating test data
- Debugging data relationships
- Verifying database constraints

## Debugging Common Issues

### Browser Tab Freezing / Infinite Loop

**Symptoms:**
- Browser tab becomes unresponsive
- Console shows "Maximum update depth exceeded"
- React DevTools shows components flashing rapidly

**How to debug:**

1. **Check useEffect dependencies:**
   ```tsx
   // BAD: Function in dependency array not memoized
   useEffect(() => {
     doSomething();
   }, [doSomething]); // Creates new function each render → infinite loop

   // GOOD: Memoize the function
   const doSomething = useCallback(() => {
     // ...
   }, []);

   useEffect(() => {
     doSomething();
   }, [doSomething]);
   ```

2. **Check context value memoization:**
   ```tsx
   // BAD: Context value recreated every render
   const value = {
     state,
     someFunction,
   };

   // GOOD: Memoize context value
   const value = useMemo(
     () => ({
       state,
       someFunction,
     }),
     [state, someFunction]
   );
   ```

3. **Check for state updates in render:**
   ```tsx
   // BAD: State update during render
   function Component() {
     setState(value); // Never do this!
     return <div>...</div>;
   }

   // GOOD: State update in effect or event handler
   function Component() {
     useEffect(() => {
       setState(value);
     }, []);
     return <div>...</div>;
   }
   ```

### Hot Reload Not Working

**Frontend not updating:**

```bash
# Check if dev server is running
# Look for "compiled successfully" message

# Restart dev server
pnpm dev --filter=web
```

**Backend not updating:**

```bash
# Check if API server is running
# Look for "Server listening on port 3001" message

# Restart API server
pnpm dev --filter=api
```

### Database Connection Errors

```bash
# Check if Postgres is running
docker-compose ps

# Check Postgres logs
docker-compose logs postgres

# Restart Postgres
docker-compose restart postgres

# Verify DATABASE_URL in apps/api/.env
# Should be: postgresql://postgres:postgres@localhost:5432/vocab_app_dev
```

### MinIO Connection Errors

```bash
# Check if MinIO is running
docker-compose ps

# Test MinIO health
curl http://localhost:9000/minio/health/live

# Access MinIO console
open http://localhost:9001

# Restart MinIO
docker-compose restart minio
```

## Testing Before Committing

**Always run pre-push validation:**

```bash
pnpm pre-push
```

This runs:
- ESLint (catches common React issues)
- TypeScript type checking (catches type errors)
- Unit tests (catches logic bugs)

**If you're adding new features, test:**

1. **Happy path** - Everything works as expected
2. **Error cases** - API errors, validation errors, network issues
3. **Edge cases** - Empty states, maximum values, special characters
4. **Browser compatibility** - Test in Chrome, Firefox, Safari
5. **Mobile responsiveness** - Test on mobile viewport

## Performance Testing

### Check for Re-render Issues

**Install React DevTools Profiler:**

1. Open DevTools → Profiler tab
2. Click "Record"
3. Interact with UI
4. Click "Stop"
5. Review flamegraph for expensive re-renders

**Look for:**
- Components re-rendering unnecessarily
- Large render times (>16ms causes jank)
- Cascading re-renders (one component triggering many others)

**Fix by:**
- Using React.memo() for expensive components
- Memoizing values with useMemo()
- Memoizing callbacks with useCallback()
- Splitting large components into smaller ones

### Network Performance

**Monitor network requests:**

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Check request/response times
4. Look for slow API calls (>1s)

**Optimize:**
- Add loading states for slow operations
- Implement pagination for large lists
- Cache frequently accessed data
- Use optimistic updates for better UX

## CI/CD Preview

Before pushing, you can simulate CI checks locally:

```bash
# Lint
pnpm lint

# Type check
pnpm typecheck

# Unit tests
pnpm test

# Build (simulates production build)
pnpm build

# All together (same as CI)
pnpm pre-push
```

**If any check fails:**
1. Read error message carefully
2. Fix the issue
3. Re-run the check
4. Repeat until all pass

## Useful Commands

```bash
# Start everything
./scripts/dev.sh

# Start dev (skip dependency install)
./scripts/dev.sh --skip-deps

# Start dev (skip database setup)
./scripts/dev.sh --skip-db

# Stop all Docker services
docker-compose down

# Reset database (WARNING: deletes all data)
cd apps/api && pnpm prisma migrate reset && cd ../..

# View logs
docker-compose logs -f postgres  # Postgres logs
docker-compose logs -f redis     # Redis logs
docker-compose logs -f minio     # MinIO logs

# Open Prisma Studio
cd apps/api && pnpm prisma studio

# Generate Prisma client after schema changes
cd apps/api && pnpm prisma generate && cd ../..

# Create new migration
cd apps/api && pnpm prisma migrate dev --name your_migration_name
```

## Troubleshooting Tips

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
lsof -ti:3000 | xargs kill

# Or use different port
PORT=3001 pnpm dev --filter=web
```

### Docker Out of Space

```bash
# Clean up unused Docker resources
docker system prune -a

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Node Modules Out of Sync

```bash
# Remove all node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma client
cd apps/api
pnpm prisma generate
cd ../..
```

## Best Practices

1. **Test locally before committing** - Catch bugs early
2. **Use React DevTools** - Monitor component behavior
3. **Watch the console** - Catch errors and warnings
4. **Test all user flows** - Don't just test happy path
5. **Run pre-push checks** - Ensure CI will pass
6. **Test on multiple browsers** - Catch browser-specific issues
7. **Test mobile viewport** - Ensure responsive design works
8. **Monitor performance** - Use Profiler to catch re-render issues
9. **Keep dev environment clean** - Restart services if things get weird
10. **Document weird bugs** - Help future developers (and yourself)

## Getting Help

If you encounter issues:

1. Check this guide first
2. Check error messages in console
3. Check Docker logs: `docker-compose logs`
4. Check API logs in terminal
5. Search for error message online
6. Ask in team chat
7. Create GitHub issue if it's a bug

## Additional Resources

- [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Next.js Docs](https://nextjs.org/docs)
- [Fastify Docs](https://fastify.dev/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Project README](/workspace/CLAUDE.md)

---

**Last Updated:** 2026-01-20
