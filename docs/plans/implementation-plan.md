# AI-Powered Vocabulary & Spelling App - Implementation Plan

## Overview

Build a production-ready educational app where parents can upload their child's weekly vocabulary/spelling sheets, and AI generates personalized practice tests with progress tracking.

**Tech Stack (2026 Best Practices):**
- **Frontend:** Next.js 14+ (App Router), TypeScript, shadcn/ui, Tailwind CSS, React Hook Form + Zod, TanStack Query
- **Backend:** Fastify + TypeScript, PostgreSQL + Prisma ORM, JWT auth (access + refresh tokens)
- **AI:** Claude API with streaming for parsing and test generation
- **PDF Generation:** Puppeteer (background jobs)
- **Background Jobs:** BullMQ + Redis
- **Storage:** Local filesystem on Kubernetes PersistentVolume (no cloud services)
- **Deployment:** Docker containers → Kubernetes (existing cluster) → Helm + ArgoCD
- **Architecture:** Monorepo with pnpm workspaces + Turborepo

**Timeline:** 12 weeks (8 phases)

---

## Phase 1: Foundation & Authentication (Week 1-2)

### Goals
- Set up monorepo infrastructure
- Implement secure JWT authentication
- Create user and student management
- Establish K8s deployment pipeline

### Database Schema (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  role          UserRole  @default(PARENT)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  refreshTokens RefreshToken[]
  students      Student[]

  @@index([email])
}

enum UserRole {
  PARENT
  TEACHER
  ADMIN
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

model Student {
  id        String   @id @default(cuid())
  name      String
  gradeLevel Int     // 1-12 for age-appropriate difficulty
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### API Endpoints

**Auth Routes (`/api/auth`)**
- `POST /api/auth/register` - Register with email/password (bcrypt hash)
- `POST /api/auth/login` - Login (returns access token + refresh token in HttpOnly cookie)
- `POST /api/auth/refresh` - Refresh access token using refresh token from cookie
- `POST /api/auth/logout` - Invalidate refresh token
- `GET /api/auth/me` - Get current user (requires auth)

**Student Routes (`/api/students`)**
- `GET /api/students` - List user's students
- `POST /api/students` - Create student (name, gradeLevel)
- `PATCH /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Frontend Pages

- `/` - Landing page
- `/login` - Login form (React Hook Form + Zod)
- `/register` - Registration form
- `/dashboard` - Main dashboard (protected route)
- `/students` - Manage students (protected route)

### Key Components

- `AuthForm` - Login/register with validation
- `ProtectedRoute` - Auth guard HOC
- `StudentCard` - Display student info
- `StudentForm` - Create/edit modal

### Implementation Details

**Monorepo Structure:**
```
vocab-app/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Fastify backend
├── packages/
│   ├── ui/               # Shared shadcn/ui components
│   ├── typescript-config/
│   └── eslint-config/
├── docker/
│   ├── web.Dockerfile
│   └── api.Dockerfile
├── k8s/
│   └── helm/
│       └── vocab-app/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

**Security:**
- Passwords: bcrypt with cost factor 12
- Access tokens: JWT, 15min expiry, signed with secret
- Refresh tokens: JWT, 7 days expiry, stored in DB + HttpOnly cookie
- Rate limiting: 5 attempts/15min on auth endpoints
- Environment variables via Kubernetes Secrets

**Environment Variables:**
```bash
# Backend
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
CORS_ORIGIN=https://vocab.yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Kubernetes Resources

- PostgreSQL StatefulSet with 50Gi PV
- Redis StatefulSet with 10Gi PV
- API Deployment (3 replicas, HPA 3-10)
- Web Deployment (2 replicas, HPA 2-5)
- Ingress with TLS (cert-manager)
- Secrets for DB credentials, JWT secrets

### Testing

- Unit: Vitest for auth logic, password hashing
- Integration: Supertest for API endpoints
- E2E: Playwright for auth flows

### Validation Criteria

- ✓ User can register, login, logout
- ✓ JWT tokens refresh properly
- ✓ Students can be CRUD managed
- ✓ All secrets in Kubernetes Secrets (not committed)
- ✓ Docker images build and push
- ✓ Helm chart deploys to K8s cluster

### Critical Files

- `/apps/api/prisma/schema.prisma`
- `/apps/api/src/routes/auth.ts`
- `/apps/api/src/middleware/auth.ts`
- `/apps/web/app/(auth)/login/page.tsx`
- `/k8s/helm/vocab-app/values.yaml`

---

## Phase 2: File Upload & Storage (Week 3)

### Goals

- Enable secure file uploads (images/PDFs)
- Store files on Kubernetes PersistentVolume
- Track uploaded sheets in database
- Validate file types and sizes

### Database Schema Additions

```prisma
model UploadedSheet {
  id          String       @id @default(cuid())
  studentId   String
  fileName    String
  filePath    String       // Path in PV: /app/storage/uploads/{studentId}/{timestamp}-{filename}
  fileType    FileType
  fileSize    Int          // Bytes
  weekOf      DateTime     // Week this vocabulary is for
  status      SheetStatus  @default(PENDING)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  vocabularyList VocabularyList?

  @@index([studentId])
  @@index([status])
}

enum FileType {
  IMAGE_PNG
  IMAGE_JPEG
  IMAGE_WEBP
  PDF
}

enum SheetStatus {
  PENDING       // Uploaded, not processed
  PROCESSING    // AI parsing in progress
  COMPLETED     // Successfully parsed
  FAILED        // Parsing failed
}
```

### API Endpoints

**Upload Routes (`/api/uploads`)**
- `POST /api/uploads` - Upload sheet (multipart/form-data)
  - Body: `file` (multipart), `studentId`, `weekOf`
  - Validates: MIME type (image/pdf), size (<10MB), magic bytes
  - Returns: upload record with ID
- `GET /api/uploads?studentId=xxx` - List sheets for student
- `GET /api/uploads/:id` - Get sheet details
- `DELETE /api/uploads/:id` - Delete sheet and file from PV
- `GET /api/uploads/:id/download` - Download original file (authenticated)

### Frontend Pages/Components

**Pages:**
- `/students/:id/upload` - Upload sheet for student

**Components:**
- `FileDropzone` - Drag-and-drop upload (react-dropzone)
- `UploadProgress` - Progress bar during upload
- `SheetList` - List uploaded sheets with status badges
- `SheetPreview` - Preview image/PDF in modal

### Implementation Details

**File Storage on PersistentVolume:**
- Mount PV at `/app/storage/uploads` in API pods
- File naming: `{studentId}/{timestamp}-{sanitized-filename}`
- Max size: 10MB
- Allowed types: PNG, JPEG, WebP, PDF (validate magic bytes, not just extension)

**File Upload Flow:**
1. Frontend: User selects file → validate client-side (type, size) → upload to `/api/uploads`
2. Backend (Fastify + @fastify/multipart):
   - Validate MIME type and magic bytes
   - Sanitize filename (remove special chars)
   - Save to PV
   - Create UploadedSheet record in DB
3. Frontend: Poll for status → show preview

**Security:**
- Validate file magic bytes (prevent extension spoofing)
- Sanitize filenames (prevent path traversal: `../../etc/passwd`)
- Verify user owns student before upload/download
- Rate limiting: Max 20 uploads/hour per user

**Kubernetes PersistentVolumeClaim:**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: vocab-app-storage
spec:
  accessModes:
    - ReadWriteMany  # Multiple API pods can write
  resources:
    requests:
      storage: 20Gi
```

### Testing

- Unit: File validation logic (magic bytes, size)
- Integration: Upload endpoint with mock multipart files
- E2E: Full upload flow in browser

### Validation Criteria

- ✓ Files upload successfully to PersistentVolume
- ✓ File metadata stored in DB
- ✓ User can view/download uploaded sheets
- ✓ Invalid files rejected with clear error messages
- ✓ PV mounted correctly in API pods

### Critical Files

- `/apps/api/src/routes/uploads.ts`
- `/apps/api/src/middleware/file-validation.ts`
- `/apps/web/components/students/FileDropzone.tsx`
- `/k8s/helm/vocab-app/templates/pvc.yaml`

---

## Phase 3: AI Parsing & Vocabulary Extraction (Week 4-5)

### Goals

- Integrate Claude API for sheet parsing with vision
- Extract vocabulary words (with definitions) and spelling words
- Handle parsing errors gracefully (retry logic)
- Store extracted words in database

### Database Schema Additions

```prisma
model VocabularyList {
  id              String   @id @default(cuid())
  uploadedSheetId String   @unique
  studentId       String
  gradeLevel      Int      // Copied from student for AI context
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  uploadedSheet   UploadedSheet @relation(fields: [uploadedSheetId], references: [id], onDelete: Cascade)
  student         Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  vocabularyWords VocabularyWord[]
  spellingWords   SpellingWord[]

  @@index([studentId])
}

model VocabularyWord {
  id               String   @id @default(cuid())
  vocabularyListId String
  word             String
  definition       String   @db.Text
  exampleSentence  String?  @db.Text
  sortOrder        Int      // Original order in sheet
  createdAt        DateTime @default(now())

  vocabularyList VocabularyList @relation(fields: [vocabularyListId], references: [id], onDelete: Cascade)

  @@index([vocabularyListId])
}

model SpellingWord {
  id               String   @id @default(cuid())
  vocabularyListId String
  word             String
  sortOrder        Int
  createdAt        DateTime @default(now())

  vocabularyList VocabularyList @relation(fields: [vocabularyListId], references: [id], onDelete: Cascade)

  @@index([vocabularyListId])
}
```

### API Endpoints

**Parsing Routes (`/api/parsing`)**
- `POST /api/parsing/:uploadId/parse` - Trigger AI parsing (async, queues BullMQ job)
  - Returns: `{ jobId: string }`
- `GET /api/parsing/jobs/:jobId` - Get job status (PENDING, PROCESSING, COMPLETED, FAILED)
- `GET /api/vocabulary-lists?studentId=xxx` - List vocabulary lists
- `GET /api/vocabulary-lists/:id` - Get list with words

### Frontend Pages/Components

**Pages:**
- `/students/:id/vocabulary` - View vocabulary lists

**Components:**
- `ParsingStatus` - Show progress (polling jobId every 2s)
- `VocabularyListView` - Display extracted words in cards
- `WordCard` - Individual word with definition
- `ParsingError` - User-friendly error messages

### Implementation Details

**AI Parsing with Claude API (Vision):**

**Prompt Template:**
```typescript
const parseVocabularyPrompt = (gradeLevel: number) => `
You are parsing a vocabulary/spelling worksheet for a grade ${gradeLevel} student.

Extract two lists from this image:
1. VOCABULARY WORDS: Words with definitions
2. SPELLING WORDS: Words for spelling practice

Return ONLY valid JSON:
{
  "vocabularyWords": [
    {
      "word": "string",
      "definition": "string",
      "exampleSentence": "string or null"
    }
  ],
  "spellingWords": [
    { "word": "string" }
  ]
}

Rules:
- Extract in original order
- Definitions should be age-appropriate for grade ${gradeLevel}
- If a word appears in both lists, include in both
- Ignore headers/instructions
- Return empty arrays if no words found
`;
```

**Parsing Flow:**
1. User clicks "Parse" → API creates BullMQ job → returns jobId
2. Worker picks up job:
   - Read file from PV
   - For images: Send to Claude API with vision directly
   - For PDFs: Convert to images with Puppeteer → send to Claude
3. Parse JSON response → validate with Zod schema
4. Save words to DB → update UploadedSheet.status = COMPLETED
5. On error: Retry 3 times with exponential backoff → mark FAILED

**BullMQ Configuration:**
```typescript
interface ParseSheetJob {
  uploadId: string;
  studentId: string;
  filePath: string;
  gradeLevel: number;
  fileType: FileType;
}

const parseQueue = new Queue<ParseSheetJob>('parse-sheets', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
```

**Error Handling:**
- Invalid JSON → retry
- Claude API rate limit (429) → exponential backoff
- No words found → mark FAILED with message "No words detected"
- Timeout (>60s) → cancel and retry

**Security:**
- Claude API key in Kubernetes Secret
- Rate limiting: Max 10 parse requests/hour per user
- Verify user owns upload before parsing

### Testing

- Unit: Prompt generation, JSON parsing
- Integration: Mock Claude API responses
- E2E: Full parsing flow with sample sheets
- Manual: Real vocabulary sheets from grades 1-12

### Validation Criteria

- ✓ Successfully parses vocabulary sheets (images and PDFs)
- ✓ Extracts words and definitions accurately
- ✓ Handles unclear/malformed sheets gracefully
- ✓ BullMQ queue processes jobs reliably
- ✓ User sees real-time status updates

### Critical Files

- `/apps/api/src/services/claude.service.ts`
- `/apps/api/src/workers/parse-sheet.worker.ts`
- `/apps/api/src/lib/prompts.ts`
- `/apps/web/components/parsing/ParsingStatus.tsx`

---

## Phase 4: Vocabulary Practice Tests (Week 6-7)

### Goals

- Generate 3 practice tests per vocabulary list
- Each test has 2 questions per vocabulary word:
  1. Fill-in-blank (multiple choice)
  2. Definition (multiple choice)
- Store questions for reuse
- Track student attempts and scores

### Database Schema Additions

```prisma
model PracticeTest {
  id               String     @id @default(cuid())
  vocabularyListId String
  testNumber       Int        // 1, 2, or 3
  generatedAt      DateTime   @default(now())

  vocabularyList VocabularyList @relation(fields: [vocabularyListId], references: [id], onDelete: Cascade)
  questions      Question[]
  attempts       TestAttempt[]

  @@unique([vocabularyListId, testNumber])
  @@index([vocabularyListId])
}

model Question {
  id             String       @id @default(cuid())
  practiceTestId String
  vocabularyWordId String
  questionType   QuestionType
  questionText   String       @db.Text
  correctAnswer  String
  distractors    String[]     // Array of 3 wrong answers
  sortOrder      Int
  createdAt      DateTime     @default(now())

  practiceTest   PracticeTest   @relation(fields: [practiceTestId], references: [id], onDelete: Cascade)
  vocabularyWord VocabularyWord @relation(fields: [vocabularyWordId], references: [id], onDelete: Cascade)
  answers        Answer[]

  @@index([practiceTestId])
}

enum QuestionType {
  FILL_IN_BLANK   // "Which word fits in the sentence?"
  DEFINITION      // "What is the definition of X?"
}

model TestAttempt {
  id             String   @id @default(cuid())
  practiceTestId String
  studentId      String
  startedAt      DateTime @default(now())
  completedAt    DateTime?
  score          Int?     // Number of correct answers
  totalQuestions Int

  practiceTest PracticeTest @relation(fields: [practiceTestId], references: [id], onDelete: Cascade)
  student      Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  answers      Answer[]

  @@index([practiceTestId])
  @@index([studentId])
}

model Answer {
  id            String   @id @default(cuid())
  testAttemptId String
  questionId    String
  selectedAnswer String
  isCorrect     Boolean
  answeredAt    DateTime @default(now())

  testAttempt TestAttempt @relation(fields: [testAttemptId], references: [id], onDelete: Cascade)
  question    Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([testAttemptId])
}
```

### API Endpoints

**Test Generation Routes (`/api/practice-tests`)**
- `POST /api/practice-tests/generate` - Generate 3 tests (queues 3 BullMQ jobs)
  - Body: `{ vocabularyListId: string }`
  - Returns: `{ jobIds: string[] }`
- `GET /api/practice-tests?vocabularyListId=xxx` - List tests for vocabulary list
- `GET /api/practice-tests/:id` - Get test with questions

**Test Taking Routes (`/api/attempts`)**
- `POST /api/attempts` - Start new attempt
  - Body: `{ practiceTestId: string, studentId: string }`
  - Returns: attempt ID
- `POST /api/attempts/:id/answer` - Submit answer
  - Body: `{ questionId: string, selectedAnswer: string }`
  - Returns: `{ isCorrect: boolean }`
- `POST /api/attempts/:id/complete` - Complete attempt
  - Returns: `{ score: number, totalQuestions: number, percentage: number }`
- `GET /api/attempts/:id` - Get attempt details with answers

### Frontend Pages/Components

**Pages:**
- `/students/:id/tests` - List practice tests
- `/tests/:id/take` - Take practice test
- `/attempts/:id/review` - Review completed attempt

**Components:**
- `TestGenerator` - Button to generate tests with progress indicator
- `TestList` - Grid of available tests
- `QuestionCard` - Display question with shuffled multiple choice options
- `TestResults` - Show score, percentage, review wrong answers
- `ProgressBar` - Show "Question 5 of 20"

### Implementation Details

**AI Test Generation with Claude:**

**Prompt for Fill-in-Blank:**
```typescript
const generateFillInBlankPrompt = (
  word: string,
  definition: string,
  gradeLevel: number,
  allWords: string[]
) => `
Generate a fill-in-the-blank question for grade ${gradeLevel}.

Target word: "${word}"
Definition: "${definition}"

Create a sentence where "${word}" fits naturally. Provide 3 incorrect alternatives from: ${allWords.join(', ')}

Return ONLY valid JSON:
{
  "questionText": "Which word fits? The ____ was very large.",
  "correctAnswer": "${word}",
  "distractors": ["word1", "word2", "word3"]
}

Rules:
- Age-appropriate for grade ${gradeLevel}
- Sentence demonstrates word meaning
- Distractors are plausible (similar length/theme)
- Distractors from provided word list
`;
```

**Prompt for Definition:**
```typescript
const generateDefinitionPrompt = (
  word: string,
  definition: string,
  gradeLevel: number,
  allWords: string[]
) => `
Generate a definition question for grade ${gradeLevel}.

Target word: "${word}"
Correct definition: "${definition}"

Provide 3 plausible but incorrect definitions.

Return ONLY valid JSON:
{
  "questionText": "What is the definition of '${word}'?",
  "correctAnswer": "${definition}",
  "distractors": ["incorrect def 1", "incorrect def 2", "incorrect def 3"]
}

Rules:
- Use definitions of other words: ${allWords.join(', ')}
- Age-appropriate language
- Clearly wrong but plausible
`;
```

**Test Generation Flow:**
1. User clicks "Generate Tests" → API queues 3 jobs (testNumber 1, 2, 3)
2. Each worker job:
   - Generate 2 questions per vocabulary word (fill-in-blank + definition)
   - Randomize question order
   - Save to DB with PracticeTest + Question records
3. Frontend polls job status → shows "Test 1: Complete, Test 2: Generating..."

**Test Taking Flow:**
1. Student starts test → create TestAttempt record
2. Display questions with shuffled answer options
3. Student submits answer → save Answer record → return isCorrect immediately
4. Complete test → calculate score → mark completedAt

**Security:**
- Verify student belongs to user
- Rate limit test generation: Max 5 generations/hour per user

### Testing

- Unit: Question generation logic, scoring
- Integration: Mock Claude API responses
- E2E: Full test-taking flow
- Manual: Review question quality for different grades

### Validation Criteria

- ✓ 3 practice tests generated per vocabulary list
- ✓ Each test has 2 questions per word
- ✓ Questions are age-appropriate and well-formed
- ✓ Students can take tests with immediate feedback
- ✓ Scores calculated correctly

### Critical Files

- `/apps/api/src/workers/generate-test.worker.ts`
- `/apps/web/app/(dashboard)/tests/[id]/take/page.tsx`
- `/apps/api/src/routes/attempts.ts`

---

## Phase 5: Spelling Practice & Retry Logic (Week 8)

### Goals

- Generate spelling tests with all words
- Track incorrect words per attempt
- Allow retry of missed words until 100% correct
- Support multiple practice sessions

### Database Schema Additions

```prisma
model SpellingTest {
  id               String   @id @default(cuid())
  vocabularyListId String   @unique
  generatedAt      DateTime @default(now())

  vocabularyList VocabularyList @relation(fields: [vocabularyListId], references: [id], onDelete: Cascade)
  attempts       SpellingAttempt[]

  @@index([vocabularyListId])
}

model SpellingAttempt {
  id             String   @id @default(cuid())
  spellingTestId String
  studentId      String
  attemptNumber  Int      // 1, 2, 3... for retry tracking
  startedAt      DateTime @default(now())
  completedAt    DateTime?
  score          Int?
  totalWords     Int
  isPerfect      Boolean  @default(false) // True if 100%

  spellingTest   SpellingTest @relation(fields: [spellingTestId], references: [id], onDelete: Cascade)
  student        Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  responses      SpellingResponse[]

  @@index([spellingTestId])
  @@index([studentId])
}

model SpellingResponse {
  id                String   @id @default(cuid())
  spellingAttemptId String
  spellingWordId    String
  spokenWord        String   // The word (for TTS playback)
  studentSpelling   String   // What student typed
  isCorrect         Boolean
  respondedAt       DateTime @default(now())

  spellingAttempt SpellingAttempt @relation(fields: [spellingAttemptId], references: [id], onDelete: Cascade)
  spellingWord    SpellingWord    @relation(fields: [spellingWordId], references: [id], onDelete: Cascade)

  @@index([spellingAttemptId])
}
```

### API Endpoints

**Spelling Test Routes (`/api/spelling-tests`)**
- `POST /api/spelling-tests/generate` - Generate spelling test
  - Body: `{ vocabularyListId: string }`
  - Returns: spelling test ID
- `GET /api/spelling-tests?vocabularyListId=xxx` - Get spelling test

**Spelling Attempt Routes (`/api/spelling-attempts`)**
- `POST /api/spelling-attempts` - Start new attempt
  - Body: `{ spellingTestId: string, studentId: string }`
  - Returns: attempt ID + words to spell (all words on first attempt, only missed words on retry)
- `POST /api/spelling-attempts/:id/spell` - Submit spelling
  - Body: `{ spellingWordId: string, studentSpelling: string }`
  - Returns: `{ isCorrect: boolean, correctSpelling: string }`
- `POST /api/spelling-attempts/:id/complete` - Complete attempt
  - Returns: `{ score: number, totalWords: number, isPerfect: boolean, missedWords: string[] }`
- `GET /api/spelling-attempts/:id` - Get attempt details

### Frontend Pages/Components

**Pages:**
- `/students/:id/spelling` - Spelling practice dashboard
- `/spelling-tests/:id/practice` - Take spelling test

**Components:**
- `SpellingInterface` - Input field + "Hear Word" button (TTS)
- `SpellingProgress` - "Word 5 of 10"
- `SpellingResults` - Score + missed words list
- `RetryPrompt` - "You missed 3 words. Retry them now?"
- `AudioPlayer` - Play word pronunciation (Web Speech API)

### Implementation Details

**Spelling Test Flow:**
1. Generate test → store all spelling words
2. Student starts attempt:
   - **First attempt (attemptNumber = 1):** All words
   - **Retry (attemptNumber > 1):** Only missed words from previous attempt
3. For each word:
   - Play TTS pronunciation
   - Student types spelling
   - Submit → check correctness (case-insensitive, trimmed)
4. Complete attempt:
   - Calculate score
   - If 100%: Mark isPerfect = true
   - If <100%: Show retry button

**Retry Logic:**
```typescript
const getWordsForAttempt = async (spellingTestId: string, studentId: string) => {
  const previousAttempts = await prisma.spellingAttempt.findMany({
    where: { spellingTestId, studentId },
    include: { responses: true },
    orderBy: { attemptNumber: 'desc' },
  });

  if (previousAttempts.length === 0) {
    // First attempt: all words
    return await getAllSpellingWords(spellingTestId);
  }

  const lastAttempt = previousAttempts[0];

  if (lastAttempt.isPerfect) {
    // Can practice all words again in new session
    return await getAllSpellingWords(spellingTestId);
  }

  // Retry: only missed words
  const missedWordIds = lastAttempt.responses
    .filter(r => !r.isCorrect)
    .map(r => r.spellingWordId);

  return await prisma.spellingWord.findMany({
    where: { id: { in: missedWordIds } },
  });
};
```

**Text-to-Speech:**
- Frontend: Use Web Speech API (`window.speechSynthesis.speak()`)
- Fallback for unsupported browsers: Pre-recorded audio or third-party TTS API
- "Hear Again" button to replay word

**Spelling Validation:**
- Case-insensitive: `studentSpelling.toLowerCase() === correctWord.toLowerCase()`
- Trim whitespace: `studentSpelling.trim()`
- Optionally: Allow 1-character typos (Levenshtein distance)

**Security:**
- Verify student belongs to user

### Testing

- Unit: Spelling validation, retry logic
- Integration: Full attempt flow
- E2E: Complete test + retry
- Manual: TTS across browsers (Chrome, Firefox, Safari)

### Validation Criteria

- ✓ Spelling tests generated successfully
- ✓ Students can spell words with TTS playback
- ✓ Retry logic shows only missed words
- ✓ 100% completion marks isPerfect
- ✓ New sessions allow practicing all words

### Critical Files

- `/apps/api/src/services/spelling.service.ts`
- `/apps/web/components/spelling/SpellingInterface.tsx`
- `/apps/api/src/routes/spelling-attempts.ts`

---

## Phase 6: Progress Tracking & Analytics (Week 9-10)

### Goals

- Track student performance over time
- Display progress dashboards with charts
- Identify weak words (frequently missed)
- Enable parent/teacher monitoring

### Database Schema Additions

```prisma
model ProgressSnapshot {
  id                   String   @id @default(cuid())
  studentId            String
  vocabularyListId     String
  snapshotDate         DateTime @default(now())

  // Vocabulary metrics
  vocabularyTestsTaken Int
  vocabularyAvgScore   Float
  vocabularyBestScore  Int

  // Spelling metrics
  spellingAttempts     Int
  spellingAvgScore     Float
  spellingPerfectCount Int      // Number of 100% attempts

  // Overall
  totalWordsLearned    Int
  weakWords            String[] // Words missed >50% of time

  student          Student        @relation(fields: [studentId], references: [id], onDelete: Cascade)
  vocabularyList   VocabularyList @relation(fields: [vocabularyListId], references: [id], onDelete: Cascade)

  @@index([studentId])
  @@index([vocabularyListId])
}
```

### API Endpoints

**Analytics Routes (`/api/analytics`)**
- `GET /api/analytics/students/:id/overview` - Student overview (total tests, avg scores, weak words)
- `GET /api/analytics/students/:id/vocabulary-lists/:listId` - List-specific analytics
- `GET /api/analytics/students/:id/trends` - Time series data for charts
- `GET /api/analytics/students/:id/weak-words` - Most frequently missed words

### Frontend Pages/Components

**Pages:**
- `/students/:id/progress` - Student progress dashboard
- `/students/:id/analytics` - Detailed analytics with charts

**Components:**
- `ProgressDashboard` - Overview cards (tests taken, avg score, weak words count)
- `PerformanceChart` - Line chart of score trends over time (recharts library)
- `WeakWordsList` - List of words to focus on
- `VocabularyListProgress` - Per-list breakdown
- `MilestoneBadges` - Achievements ("5 Perfect Scores!", "10 Tests Completed")

### Implementation Details

**Metrics Calculation:**
```typescript
const calculateProgress = async (studentId: string, vocabularyListId: string) => {
  // Vocabulary metrics
  const vocabAttempts = await prisma.testAttempt.findMany({
    where: {
      studentId,
      practiceTest: { vocabularyListId },
      completedAt: { not: null },
    },
    select: { score: true, totalQuestions: true },
  });

  const vocabularyAvgScore = vocabAttempts.length > 0
    ? vocabAttempts.reduce((sum, a) => sum + (a.score / a.totalQuestions), 0) / vocabAttempts.length
    : 0;

  // Weak words (missed in >50% of attempts)
  const allAnswers = await prisma.answer.findMany({
    where: {
      testAttempt: { studentId },
      question: { practiceTest: { vocabularyListId } },
    },
    include: { question: { include: { vocabularyWord: true } } },
  });

  const wordStats = allAnswers.reduce((acc, answer) => {
    const word = answer.question.vocabularyWord.word;
    if (!acc[word]) acc[word] = { correct: 0, total: 0 };
    acc[word].total++;
    if (answer.isCorrect) acc[word].correct++;
    return acc;
  }, {} as Record<string, { correct: number; total: number }>);

  const weakWords = Object.entries(wordStats)
    .filter(([_, stats]) => stats.correct / stats.total < 0.5)
    .map(([word]) => word);

  return {
    vocabularyTestsTaken: vocabAttempts.length,
    vocabularyAvgScore,
    weakWords,
    // ... similar for spelling
  };
};
```

**Dashboard Visualizations (recharts):**
- **Score Trends:** Line chart of avg score over time (X: date, Y: percentage)
- **Test Completion:** Bar chart of tests taken per week
- **Word Mastery:** Progress bars for each vocabulary list
- **Weak Words Cloud:** Tag cloud sized by miss frequency

**Background Job for Snapshots:**
- Daily cron job (BullMQ repeatable job) to calculate and store ProgressSnapshot
- Reduces real-time computation on dashboard load

### Testing

- Unit: Metrics calculation logic
- Integration: Analytics endpoints
- E2E: Dashboard displays correctly
- Performance: Load time with large datasets (<1s)

### Validation Criteria

- ✓ Accurate metrics displayed
- ✓ Charts render correctly with real data
- ✓ Weak words identified properly
- ✓ Dashboard loads quickly

### Critical Files

- `/apps/api/src/services/analytics.service.ts`
- `/apps/web/app/(dashboard)/students/[id]/progress/page.tsx`
- `/apps/web/components/analytics/PerformanceChart.tsx`

---

## Phase 7: PDF Generation & Downloads (Week 11)

### Goals

- Generate printable practice test PDFs
- Support offline practice
- Queue PDF generation as background job (Puppeteer)
- Store PDFs on PersistentVolume

### Database Schema Additions

```prisma
model GeneratedPdf {
  id             String      @id @default(cuid())
  type           PdfType
  referenceId    String      // practiceTestId or spellingTestId
  studentId      String
  filePath       String      // Path in PV: /app/storage/pdfs/{pdfId}.pdf
  fileSize       Int
  status         PdfStatus   @default(PENDING)
  generatedAt    DateTime?
  createdAt      DateTime    @default(now())

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@index([studentId])
  @@index([referenceId])
  @@index([status])
}

enum PdfType {
  PRACTICE_TEST
  SPELLING_TEST
  PROGRESS_REPORT
}

enum PdfStatus {
  PENDING
  GENERATING
  COMPLETED
  FAILED
}
```

### API Endpoints

**PDF Routes (`/api/pdfs`)**
- `POST /api/pdfs/generate` - Queue PDF generation
  - Body: `{ type: PdfType, referenceId: string, studentId: string }`
  - Returns: `{ pdfId: string, jobId: string }`
- `GET /api/pdfs/:id/status` - Get generation status
- `GET /api/pdfs/:id/download` - Download PDF (authenticated)
- `GET /api/pdfs?studentId=xxx` - List generated PDFs

### Frontend Pages/Components

**Components:**
- `PdfDownloadButton` - Button with loading state (polls status)
- `PdfList` - List of generated PDFs with download links
- `PdfPreview` - Inline preview (iframe or PDF.js)

### Implementation Details

**PDF Generation with Puppeteer:**

**Practice Test PDF Template:**
```typescript
const generatePracticeTestPdf = async (testId: string) => {
  const test = await prisma.practiceTest.findUnique({
    where: { id: testId },
    include: {
      questions: { include: { vocabularyWord: true } },
      vocabularyList: { include: { student: true } },
    },
  });

  const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { text-align: center; }
    .question { margin: 20px 0; page-break-inside: avoid; }
    .options { margin-left: 20px; }
  </style>
</head>
<body>
  <h1>Vocabulary Practice Test ${test.testNumber}</h1>
  <p><strong>Student:</strong> ${test.vocabularyList.student.name}</p>
  <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
  <hr>

  ${test.questions.map((q, i) => `
    <div class="question">
      <p><strong>${i + 1}. ${q.questionText}</strong></p>
      <div class="options">
        ${shuffleAnswers(q).map((answer, j) => `
          <div>${String.fromCharCode(65 + j)}. ${answer}</div>
        `).join('')}
      </div>
    </div>
  `).join('')}

  <div style="page-break-before: always;"></div>

  <h2>Answer Key</h2>
  ${test.questions.map((q, i) => `
    <p>${i + 1}. ${q.correctAnswer}</p>
  `).join('')}
</body>
</html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlTemplate);
  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '20px', bottom: '20px' },
  });
  await browser.close();

  return pdfBuffer;
};
```

**BullMQ PDF Queue:**
```typescript
interface GeneratePdfJob {
  pdfId: string;
  type: PdfType;
  referenceId: string;
}

const pdfQueue = new Queue<GeneratePdfJob>('generate-pdfs', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

const pdfWorker = new Worker<GeneratePdfJob>('generate-pdfs', async (job) => {
  const { pdfId, type, referenceId } = job.data;

  await prisma.generatedPdf.update({
    where: { id: pdfId },
    data: { status: 'GENERATING' },
  });

  let pdfBuffer: Buffer;
  if (type === 'PRACTICE_TEST') {
    pdfBuffer = await generatePracticeTestPdf(referenceId);
  } else if (type === 'SPELLING_TEST') {
    pdfBuffer = await generateSpellingTestPdf(referenceId);
  }

  const filePath = `/app/storage/pdfs/${pdfId}.pdf`;
  await fs.writeFile(filePath, pdfBuffer);

  await prisma.generatedPdf.update({
    where: { id: pdfId },
    data: {
      status: 'COMPLETED',
      filePath,
      fileSize: pdfBuffer.length,
      generatedAt: new Date(),
    },
  });
}, { connection: redis });
```

**PDF Download Flow:**
1. User clicks "Download PDF" → API creates GeneratedPdf record + queues job
2. Frontend polls `/api/pdfs/:id/status` every 2s
3. When status = COMPLETED → enable download button
4. Download endpoint streams PDF from PV with proper headers

**Security:**
- Verify user owns student before generating/downloading
- PDFs stored with random IDs (not guessable)
- Set `Content-Disposition: attachment; filename="test.pdf"`

**Storage Management:**
- Auto-delete PDFs older than 30 days (cron job)
- Max 100MB total PDFs per user

### Testing

- Unit: PDF template generation
- Integration: Full PDF generation flow
- E2E: Download PDF in browser
- Visual: Review PDF layout manually

### Validation Criteria

- ✓ PDFs generate correctly with all content
- ✓ Downloads work across browsers
- ✓ PDFs are printable and readable
- ✓ Background jobs complete successfully

### Critical Files

- `/apps/api/src/services/pdf.service.ts`
- `/apps/api/src/workers/generate-pdf.worker.ts`
- `/apps/api/src/templates/practice-test.html.ts`

---

## Phase 8: Production Hardening & Polish (Week 12)

### Goals

- Comprehensive error handling
- Monitoring and logging
- Performance optimization
- Security hardening
- Documentation

### Implementation Details

**Error Handling:**
- Global error handlers in Fastify (`app.setErrorHandler()`)
- User-friendly error messages in frontend (toast notifications)
- Sentry integration for error tracking
- Graceful degradation for AI failures (retry or manual fallback)

**Logging (Pino):**
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

app.log = logger;
```

- Structured logging with correlation IDs
- Log levels: DEBUG, INFO, WARN, ERROR
- Log aggregation with Grafana Loki

**Monitoring (Prometheus):**
- Metrics endpoint: `/metrics`
- Key metrics:
  - API response times (histogram)
  - Queue job completion rates
  - Claude API usage/costs
  - Database query performance
- Grafana dashboards
- Alerting for failures (PagerDuty/Slack)

**Performance Optimization:**
- Database indexes on all foreign keys (already in schema)
- Query optimization: Use `select` in Prisma queries (only fetch needed fields)
- Frontend code splitting (Next.js automatic)
- Image optimization (`next/image`)
- API response caching (Redis) for analytics endpoints
- CDN for static assets

**Security Hardening:**
- OWASP top 10 mitigations
- SQL injection: Prevented by Prisma
- XSS: Prevented by React auto-escaping
- CSRF tokens for state-changing requests
- Rate limiting on all endpoints (fastify-rate-limit)
- Security headers (Helmet.js)
- Regular dependency updates (Renovate bot)
- Security scan (npm audit, Snyk)

**Documentation:**
- API documentation: Swagger/OpenAPI (fastify-swagger)
- Setup guide: README.md with developer onboarding
- Deployment runbook: Kubernetes deployment steps
- Architecture Decision Records (ADRs) in `/docs/adr/`

**Testing:**
- Increase coverage to >85%
- Load testing: k6 or Artillery (simulate 100 concurrent users)
- Security testing: OWASP ZAP scan
- Accessibility testing: axe-core (WCAG 2.1 AA)

### Validation Criteria

- ✓ All endpoints have proper error handling
- ✓ Monitoring dashboards operational
- ✓ Security scan passes (no critical issues)
- ✓ Load tests show acceptable performance (<500ms p95)
- ✓ Documentation complete and accurate

### Critical Files

- `/apps/api/src/middleware/error-handler.ts`
- `/apps/api/src/lib/logger.ts`
- `/k8s/helm/vocab-app/templates/monitoring.yaml`

---

## Deployment Strategy

### Kubernetes Architecture

**Namespaces:**
- `vocab-app-prod` - Production
- `vocab-app-staging` - Staging

**Deployments:**

1. **Frontend (Next.js):**
   - Replicas: 2 (HPA: 2-5)
   - Resources: 256Mi memory / 100m CPU (requests), 512Mi / 500m CPU (limits)

2. **Backend (Fastify):**
   - Replicas: 3 (HPA: 3-10)
   - Resources: 512Mi / 250m CPU (requests), 1Gi / 1000m CPU (limits)

3. **Background Workers:**
   - Parse Worker: 2 replicas
   - PDF Worker: 1 replica
   - Test Generation Worker: 2 replicas
   - Resources: 512Mi / 250m CPU (requests)

4. **PostgreSQL:**
   - StatefulSet, 1 replica
   - PersistentVolume: 50Gi
   - Resources: 2Gi / 1000m CPU (requests)

5. **Redis:**
   - StatefulSet, 1 replica
   - PersistentVolume: 10Gi
   - Resources: 256Mi / 100m CPU (requests)

**ConfigMaps:**
- App configuration (non-sensitive): API URL, log level, feature flags

**Secrets (Sealed Secrets):**
- Database credentials (DATABASE_URL)
- JWT secrets (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)
- Claude API key (ANTHROPIC_API_KEY)

**Services:**
- Frontend: ClusterIP (behind Ingress)
- Backend: ClusterIP (behind Ingress)
- PostgreSQL: ClusterIP (internal only)
- Redis: ClusterIP (internal only)

**Ingress (with Cloudflare Tunnel):**
- TLS termination (cert-manager or Cloudflare)
- Routes:
  - `vocab.yourdomain.com` → Frontend service
  - `api.yourdomain.com` → Backend service

**PersistentVolumeClaims:**
- `vocab-app-storage`: 20Gi (ReadWriteMany for uploads/PDFs)
- `postgres-data`: 50Gi (ReadWriteOnce)
- `redis-data`: 10Gi (ReadWriteOnce)

### CI/CD Pipeline (GitHub Actions)

**Build and Push:**
```yaml
name: Build and Deploy

on:
  push:
    branches: [main, staging]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2

      - name: Build frontend
        run: docker build -f docker/web.Dockerfile -t ghcr.io/yourusername/vocab-app-web:${{ github.sha }} .

      - name: Build backend
        run: docker build -f docker/api.Dockerfile -t ghcr.io/yourusername/vocab-app-api:${{ github.sha }} .

      - name: Push images
        run: |
          docker push ghcr.io/yourusername/vocab-app-web:${{ github.sha }}
          docker push ghcr.io/yourusername/vocab-app-api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Update Helm values
        run: |
          sed -i "s|image:.*|image: ghcr.io/yourusername/vocab-app-web:${{ github.sha }}|" k8s/helm/vocab-app/values.yaml

      - name: Commit to GitOps repo
        # ArgoCD watches GitOps repo and auto-syncs
```

**Database Migrations:**
- Run Prisma migrations as Kubernetes Job (init container) before deployment
- `prisma migrate deploy` in pre-deployment hook

### Environment Variables

**Development (.env.local):**
```bash
DATABASE_URL=postgresql://localhost:5432/vocab_app_dev
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=dev_secret
JWT_REFRESH_SECRET=dev_secret
ANTHROPIC_API_KEY=sk-... # Test key
```

**Staging/Production (Kubernetes Secrets):**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vocab-app-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql://...
  JWT_ACCESS_SECRET: <generated>
  JWT_REFRESH_SECRET: <generated>
  ANTHROPIC_API_KEY: sk-ant-...
```

---

## Risk Mitigation

### Technical Risks

**Risk: Claude API rate limits or downtime**
- Mitigation: Exponential backoff, queue system with retries, cache parsed results
- Fallback: Allow manual entry of vocabulary words

**Risk: PDF generation memory issues (Puppeteer heavy)**
- Mitigation: Dedicated worker pods with memory limits, queue concurrency limits (max 2 concurrent)
- Fallback: Generate on-demand vs batch

**Risk: Large file uploads (DoS)**
- Mitigation: File size limits (10MB), rate limiting, virus scanning (ClamAV)

**Risk: Database performance degradation**
- Mitigation: Proper indexing, query optimization, connection pooling
- Scaling: Read replicas if needed

### Operational Risks

**Risk: Kubernetes cluster failure**
- Mitigation: Multi-node cluster, database backups (daily), infrastructure as code (Helm)

**Risk: Data loss**
- Mitigation: Daily PostgreSQL backups (pg_dump), PV snapshots, WAL archiving

**Risk: Security breach**
- Mitigation: Regular security audits, dependency updates (Renovate), secrets management (Sealed Secrets)

---

## Success Metrics

### Phase Completion Criteria (Each Phase)
- All endpoints tested (unit + integration)
- >80% test coverage
- Security scan passes (npm audit)
- Performance benchmarks met
- User acceptance testing complete

### Production Metrics
- **Availability:** >99.5% uptime
- **Performance:** <500ms API response time (p95)
- **Error Rate:** <1% failed requests
- **User Engagement:** Track daily active users
- **AI Accuracy:** >90% successful parsing rate

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1:** Foundation & Auth | Week 1-2 | User auth, student management, K8s deployment |
| **Phase 2:** File Upload | Week 3 | File upload/storage on PV |
| **Phase 3:** AI Parsing | Week 4-5 | Claude integration, vocabulary extraction |
| **Phase 4:** Vocabulary Tests | Week 6-7 | Practice test generation, test taking |
| **Phase 5:** Spelling Practice | Week 8 | Spelling tests, retry logic |
| **Phase 6:** Progress Tracking | Week 9-10 | Analytics dashboards, weak word detection |
| **Phase 7:** PDF Generation | Week 11 | Printable PDFs, background jobs |
| **Phase 8:** Production Hardening | Week 12 | Monitoring, security, performance |

**Total Duration:** 12 weeks (~3 months)

---

## Development Workflow with Claude Code

### Recommended Approach Per Phase

1. **Schema First:** Define Prisma models → Run migration
2. **Backend First:** Build API endpoints with tests
3. **Frontend Second:** Build UI consuming APIs
4. **Integration Testing:** E2E tests for critical flows
5. **Deploy to Staging:** Test in K8s environment
6. **Iterate:** Refine based on feedback

### Best Practices

- **Incremental Commits:** Commit after each feature/fix
- **Clear Commit Messages:** "feat(auth): add JWT refresh token logic"
- **Test First:** Write tests before implementation (TDD)
- **Use TypeScript:** Leverage type safety throughout
- **Code Reviews:** Review generated code before committing
- **Documentation:** Update README with each phase

---

## Verification & Testing

### End-to-End Verification (After Each Phase)

**Phase 1:**
- [ ] User can register with email/password
- [ ] User can login and receive access token
- [ ] Access token expires after 15 minutes
- [ ] Refresh token refreshes access token
- [ ] User can create/edit/delete students
- [ ] Helm chart deploys successfully to K8s

**Phase 2:**
- [ ] User can upload images (PNG, JPEG, WebP) and PDFs
- [ ] Files stored in PersistentVolume at correct path
- [ ] File metadata in database
- [ ] Invalid files (wrong type, too large) rejected
- [ ] User can download uploaded files

**Phase 3:**
- [ ] User can trigger parsing of uploaded sheet
- [ ] Job status updates correctly (PENDING → PROCESSING → COMPLETED)
- [ ] Vocabulary words extracted with definitions
- [ ] Spelling words extracted
- [ ] Failed parses show clear error messages

**Phase 4:**
- [ ] 3 practice tests generated per vocabulary list
- [ ] Each test has 2 questions per vocabulary word
- [ ] Questions are age-appropriate
- [ ] Student can take test and submit answers
- [ ] Score calculated correctly

**Phase 5:**
- [ ] Spelling test generated with all words
- [ ] TTS plays word pronunciation
- [ ] Student can submit spelling
- [ ] Retry shows only missed words
- [ ] 100% completion marks isPerfect

**Phase 6:**
- [ ] Progress dashboard shows accurate metrics
- [ ] Charts render correctly
- [ ] Weak words identified
- [ ] Dashboard loads in <1s

**Phase 7:**
- [ ] PDF generated for practice test
- [ ] PDF downloads successfully
- [ ] PDF is printable and readable
- [ ] Background job completes

**Phase 8:**
- [ ] Error handling catches all edge cases
- [ ] Prometheus metrics endpoint active
- [ ] Security scan passes
- [ ] Load test shows <500ms p95 response time
- [ ] Documentation complete

---

## Next Steps

1. **Create GitHub Repository:**
   ```bash
   gh repo create vocab-app --private
   ```

2. **Initialize Monorepo:**
   ```bash
   mkdir vocab-app && cd vocab-app
   pnpm init
   mkdir -p apps/{web,api} packages/{ui,typescript-config,eslint-config}
   ```

3. **Set up Secrets:**
   - Create Kubernetes Secrets for DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ANTHROPIC_API_KEY
   - Store in sealed-secrets or external secrets operator
   - **Never commit secrets to GitHub**

4. **Start with Phase 1:**
   - Set up Prisma schema
   - Implement authentication endpoints
   - Create login/register UI
   - Deploy to staging K8s cluster

5. **Iterate:**
   - Complete each phase incrementally
   - Test thoroughly before moving to next phase
   - Get user feedback (test with your son!)

---

## Summary

This plan provides a comprehensive roadmap to build a production-ready, AI-powered vocabulary/spelling app using modern 2026 best practices. Each phase builds incrementally on the previous, delivering testable value at every step. The architecture is self-hosted (no cloud dependencies), secure, maintainable, and designed for iterative development with Claude Code.

**Key Principles:**
- ✓ Modern tech stack (Next.js, Fastify, Prisma, Claude API)
- ✓ Self-hosted on existing K8s cluster
- ✓ No secrets in GitHub (Kubernetes Secrets)
- ✓ Professional, maintainable code
- ✓ Reuses proven libraries/frameworks
- ✓ Incremental delivery (8 phases, 12 weeks)
- ✓ Comprehensive testing and monitoring
