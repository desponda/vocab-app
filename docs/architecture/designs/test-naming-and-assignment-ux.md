# Test Naming and Assignment UX Design

**Version:** 1.0
**Date:** 2026-01-18
**Status:** ✅ Implemented (2026-01-19)
**Author:** Product Owner

---

## Executive Summary

This document proposes a comprehensive UX redesign for test naming and assignment in the Vocab App. The current system auto-generates non-descriptive test names ("Variant A", "Variant B") and requires teachers to assign individual test variants separately. The proposed solution introduces vocabulary sheet naming at upload time, groups test variants under their parent vocabulary sheet, and enables bulk assignment of all test variants at once.

**Key Changes:**
1. Add name field to VocabularySheet model
2. Display tests grouped by vocabulary sheet with expandable variants
3. Enable bulk assignment of all test variants
4. Improve test identification throughout the UI

---

## Problem Statement

### Current Pain Points

**1. No Vocabulary Sheet Naming**
- Teachers upload vocabulary sheets (PDFs/images) but cannot name them
- Files are identified only by original filename (e.g., "IMG_1234.jpg")
- No semantic context about what vocabulary list the sheet contains
- Hard to distinguish between multiple uploads

**2. Non-Descriptive Test Names**
- Tests are auto-named as "Variant A", "Variant B", "Variant C"
- Teachers cannot tell what vocabulary a test covers by looking at the name
- No connection visible between test and source vocabulary sheet
- Confusing for teachers managing multiple vocabulary lists

**3. Individual Variant Assignment**
- Teachers must select and assign each test variant separately
- For 3-10 variants per vocabulary sheet, this requires 3-10 separate assignments
- Tedious and error-prone workflow
- No way to assign all variants of a test set at once

**4. Poor Discoverability**
- Test assignment dialog shows flat list of all tests
- Example: "Variant A (Variant A)", "Variant B (Variant B)", "Variant C (Variant C)"
- No grouping or hierarchy
- Teachers cannot see relationship between tests and vocabulary sheets

### Impact on Teachers

**Time Waste:**
- 30-60 seconds per assignment × 3-10 variants = 1.5 to 10 minutes per vocabulary set
- Repeated for every classroom (if teaching 5 classes, 7.5 to 50 minutes wasted)

**Error Prone:**
- Easy to miss a variant when assigning individually
- Hard to track which variants have been assigned
- Confusion about test content

**Poor UX:**
- Cognitive load trying to remember what each "Variant A" refers to
- No clear workflow from upload → generate → assign
- Frustrating user experience

---

## Current Implementation Analysis

### Database Schema (Relevant Models)

```prisma
model VocabularySheet {
  id              String           @id @default(cuid())
  originalName    String           // Filename only (e.g., "IMG_1234.jpg")
  fileName        String           @unique
  s3Key           String           @unique
  fileType        DocumentType
  mimeType        String
  fileSize        Int
  status          ProcessingStatus @default(PENDING)
  errorMessage    String?          @db.Text
  extractedText   String?          @db.Text
  testsToGenerate Int              @default(3)
  uploadedAt      DateTime         @default(now())
  processedAt     DateTime?

  teacherId String
  teacher   User             @relation(fields: [teacherId], references: [id])
  words     VocabularyWord[]
  tests     Test[]
}

model Test {
  id        String   @id @default(cuid())
  name      String   // Currently: "Variant A", "Variant B", etc.
  variant   String   // "A", "B", "C"...
  createdAt DateTime @default(now())

  sheetId     String
  sheet       VocabularySheet  @relation(fields: [sheetId], references: [id])
  questions   TestQuestion[]
  assignments TestAssignment[]
  attempts    TestAttempt[]
}
```

**Key Observations:**
- VocabularySheet has no `name` field (only `originalName` which is filename)
- Test.name is hard-coded as "Variant X" in background job
- No way to store user-provided vocabulary sheet name
- Test variants are separate entities, not grouped

### Current Upload Flow

**File:** `/workspace/apps/web/src/app/(dashboard)/vocabulary/page.tsx`

1. Teacher drags/drops file
2. File validates (type, size)
3. Upload to MinIO
4. Create VocabularySheet record (status: PENDING)
5. Background job processes:
   - Extract vocabulary words
   - Generate N test variants (default: 3)
   - Auto-name tests as "Variant A", "Variant B", etc.
6. Update status to COMPLETED

**No naming step anywhere in this flow.**

### Current Assignment Flow

**File:** `/workspace/apps/web/src/app/(dashboard)/classrooms/[id]/page.tsx`

1. Teacher navigates to classroom detail page
2. Clicks "Assign Test" button
3. Dialog opens with dropdown of all tests
4. Dropdown shows: `{test.name} (Variant {test.variant})`
   - Example: "Variant A (Variant A)" - redundant and confusing
5. Select one test, assign to classroom
6. Repeat 3-10 times for all variants

**No grouping, no bulk assignment.**

### Current Test Listing

**File:** `/workspace/apps/api/src/routes/tests.ts`

```typescript
app.get('/', async (request: FastifyRequest, reply) => {
  const tests = await prisma.test.findMany({
    where: {
      sheet: { teacherId: request.userId },
    },
    select: {
      id: true,
      name: true,
      variant: true,
      createdAt: true,
      sheet: {
        select: {
          id: true,
          originalName: true,
        },
      },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return reply.send({ tests });
});
```

**Returns flat list of tests with sheet.originalName (filename) for context.**

---

## Proposed Solution

### Design Philosophy

**Core Principles:**
1. **Name Early, Name Once:** Capture vocabulary sheet name at upload time
2. **Hierarchy Matters:** Display tests grouped by vocabulary sheet
3. **Bulk by Default:** Enable assignment of all variants with one action
4. **Smart Defaults:** Auto-suggest names based on content or filename
5. **Flexibility:** Allow renaming and individual variant control when needed

---

## Option Analysis

### Option A: Name at Upload Time (RECOMMENDED)

**How It Works:**
1. Upload dialog adds name field (required or optional with smart default)
2. Teacher enters name (e.g., "Week 1 Spelling", "Chapter 3 Vocabulary")
3. Background job uses this name as prefix for test variants
4. Tests named: "Week 1 Spelling - Variant A", "Week 1 Spelling - Variant B", etc.

**Pros:**
- Natural workflow: name content when you upload it
- Single source of truth for vocabulary sheet identity
- Tests automatically inherit meaningful names
- No extra step after generation
- Clean data model

**Cons:**
- Adds friction to upload process
- Teacher must think of name immediately
- Cannot rename after seeing extracted vocabulary

**Complexity:** Low-Medium

---

### Option B: Name After Generation

**How It Works:**
1. Upload vocabulary sheet (no name required)
2. Background job generates tests with default names
3. Teacher reviews extracted vocabulary
4. Teacher assigns name to vocabulary sheet
5. Tests update to reflect new name

**Pros:**
- No upload friction
- Teacher can see extracted vocabulary before naming
- Informed naming decision
- Can rename anytime

**Cons:**
- Extra step in workflow
- Tests might be assigned before naming
- Need to handle test name updates
- More complex implementation

**Complexity:** Medium-High

---

### Option C: AI-Suggested Names

**How It Works:**
1. Upload vocabulary sheet
2. Claude API extracts vocabulary
3. AI suggests name based on content (e.g., "Science Vocabulary - Photosynthesis")
4. Teacher can accept, edit, or replace
5. Tests created with this name

**Pros:**
- Best of both worlds: intelligent default + manual override
- Minimal teacher effort
- Contextually relevant names
- Impressive UX

**Cons:**
- Requires additional AI call (cost)
- AI might misinterpret content
- Adds latency to processing
- More complex implementation

**Complexity:** High

---

### Option D: Name at Assignment Time

**How It Works:**
1. Upload vocabulary sheet (no name)
2. Tests generated with default names
3. When assigning to classroom, teacher provides name
4. Tests named per-classroom

**Pros:**
- Allows per-classroom customization
- No upload friction
- Naming context when it matters

**Cons:**
- Doesn't solve core problem (tests still have generic names)
- Redundant naming across classrooms
- Confusing if same test has different names
- Doesn't improve test discovery

**Complexity:** Medium

---

## Recommended Approach

**Hybrid: Option A + Option C (Name at Upload with AI Suggestion)**

**Why This Works Best:**

1. **Optimal Timing:** Naming at upload time is most natural
2. **Reduced Friction:** AI suggests intelligent default, teacher can override
3. **Single Source of Truth:** VocabularySheet.name drives all test names
4. **Immediate Clarity:** Tests are properly named from creation
5. **User Control:** Teacher has final say on naming

**Implementation Strategy:**

**Phase 1 (MVP):**
- Add name field to upload form (required, simple text input)
- Smart default: clean up filename (remove extension, replace underscores)
- Example: "week_1_spelling.pdf" → default to "Week 1 Spelling"
- Store in VocabularySheet.name
- Use in test naming

**Phase 2 (Enhancement):**
- Add AI-suggested name after vocabulary extraction
- Show suggestion in processing notification
- Add "rename" action to vocabulary sheet card
- Update test names when vocabulary sheet renamed

---

## Detailed UX Design

### 1. Upload Flow (Redesigned)

#### Step 1: File Upload

**Screen:** `/vocabulary` (Vocabulary Sheets Page)

**Changes to Upload Area:**

```
┌─────────────────────────────────────────────────────────┐
│ Upload Vocabulary Sheet                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │                     📄 Upload                      │ │
│  │                                                    │ │
│  │   Drag and drop a file here, or click to select  │ │
│  │   Accepts PDF, JPEG, PNG, GIF, WebP (max 10 MB)  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Name (required)                                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Week 1 Spelling                                    │ │
│  └───────────────────────────────────────────────────┘ │
│  This name will help you identify the vocabulary       │
│  set and its tests later.                              │
│                                                         │
│  Number of Test Variants: [3 ▼]                        │
│                                                         │
│  ┌────────────────────────────────────┐                │
│  │          Upload & Generate         │                │
│  └────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

**UI Elements:**
- Name field appears after file is selected
- Smart default pre-filled from filename
- Helper text explains purpose
- "Upload & Generate" button (was just "Upload")

**Validation:**
- Name required, 1-100 characters
- Auto-trims whitespace
- No special characters validation (keep simple)

---

#### Step 2: Processing State

**Vocabulary Sheet Card (Processing):**

```
┌─────────────────────────────────────────────────────────┐
│ 📄 Week 1 Spelling                        [Processing]  │
│                                                         │
│ 245 KB • Jan 18, 2026 • PDF                            │
│                                                         │
│ Extracting vocabulary and generating 3 test variants... │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░  40%              │
└─────────────────────────────────────────────────────────┘
```

---

#### Step 3: Completed State

**Vocabulary Sheet Card (Completed):**

```
┌─────────────────────────────────────────────────────────┐
│ 📄 Week 1 Spelling                        [Completed]   │
│                                                         │
│ 245 KB • Jan 18, 2026 • PDF                            │
│ 15 words • 3 tests                                      │
│                                                         │
│ [📥 Download] [✏️ Rename] [🗑️ Delete]                    │
└─────────────────────────────────────────────────────────┘
```

**New Actions:**
- Rename: Edit vocabulary sheet name (updates test names)
- Download: Download original file
- Delete: Delete vocabulary sheet and all tests

---

### 2. Test Assignment (Redesigned)

#### Classroom Detail Page - Assign Test Dialog

**Screen:** `/classrooms/[id]` → Assign Test Dialog

**Current (Bad):**
```
Select Test:
┌────────────────────────────────────────┐
│ Variant A (Variant A)                  │ ▼
├────────────────────────────────────────┤
│ Variant A (Variant A)                  │
│ Variant B (Variant B)                  │
│ Variant C (Variant C)                  │
│ Variant A (Variant A)                  │  ← Confusing!
│ Variant B (Variant B)                  │
└────────────────────────────────────────┘
```

**Proposed (Good):**
```
┌─────────────────────────────────────────────────────────┐
│ Assign Test to Grade 3A                                │
│                                                         │
│ Select vocabulary set to assign:                        │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Week 1 Spelling                                    │ │
│ │ 15 words • 3 variants • Uploaded Jan 18, 2026     │ │
│ │                                                    │ │
│ │ ✓ Will assign ALL 3 test variants:                │ │
│ │   • Week 1 Spelling - Variant A (10 questions)    │ │
│ │   • Week 1 Spelling - Variant B (10 questions)    │ │
│ │   • Week 1 Spelling - Variant C (10 questions)    │ │
│ │                                                    │ │
│ │ Students will receive randomized variants          │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Chapter 3 Vocabulary                               │ │
│ │ 20 words • 5 variants • Uploaded Jan 15, 2026     │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Science Terms - Photosynthesis                     │ │
│ │ 12 words • 3 variants • Uploaded Jan 10, 2026     │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ Due Date (optional):                                    │
│ ┌───────────────────────────────────────────────────┐ │
│ │ January 25, 2026                                   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ [ Cancel ]                 [ Assign All Variants ]     │
└─────────────────────────────────────────────────────────┘
```

**Key Changes:**
1. **Card-based selection** instead of dropdown
2. **Vocabulary sheet level** selection (not individual tests)
3. **Expandable preview** showing all variants
4. **Clear description** of what will be assigned
5. **Bulk assignment** of all variants with one click
6. **Visual grouping** of related tests

---

#### Alternative: Expandable List with Individual Control

**For Advanced Users:**

```
┌─────────────────────────────────────────────────────────┐
│ Week 1 Spelling                            [Expanded ▼]│
│ 15 words • 3 variants • Uploaded Jan 18, 2026          │
│                                                         │
│ ☑ Assign all variants (recommended)                     │
│                                                         │
│ Or select individual variants:                          │
│ ☐ Variant A (10 questions)                              │
│ ☐ Variant B (10 questions)                              │
│ ☐ Variant C (10 questions)                              │
└─────────────────────────────────────────────────────────┘
```

**When to Use:**
- Teacher wants to assign only specific variants
- Staggered assignment over time
- Different variants to different classrooms

**Default:** Assign all (checked)

---

### 3. Assigned Tests View

#### Classroom Detail Page - Tests Tab

**Current:**
```
Assigned Tests
─────────────────────────────────────────
Variant A (Variant A) | Assigned Jan 18
Variant B (Variant B) | Assigned Jan 18
Variant C (Variant C) | Assigned Jan 18
Variant A (Variant A) | Assigned Jan 15  ← Which is which?
```

**Proposed:**
```
┌─────────────────────────────────────────────────────────┐
│ Assigned Tests                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Week 1 Spelling                         [Collapse ▲]   │
│ Assigned Jan 18, 2026 • Due Jan 25, 2026               │
│                                                         │
│   Variant A • 10 questions • 5/25 students completed    │
│   Variant B • 10 questions • 7/25 students completed    │
│   Variant C • 10 questions • 3/25 students completed    │
│                                                         │
│   [View Results] [Remove Assignment]                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Chapter 3 Vocabulary                    [Expand ▼]     │
│ Assigned Jan 15, 2026 • Due Jan 22, 2026               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
1. **Grouped by vocabulary sheet**
2. **Expandable/collapsible** sections
3. **Aggregate statistics** (total completions across variants)
4. **Due dates** prominently displayed
5. **Bulk actions** (remove all variants)

---

### 4. Test Selection (Student View)

**Screen:** `/student/tests` (Available Tests for Student)

**Proposed:**
```
┌─────────────────────────────────────────────────────────┐
│ Available Tests                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Week 1 Spelling                                         │
│ Assigned to: Grade 3A • Due: Jan 25, 2026              │
│ 10 questions • Estimated time: 15 minutes               │
│                                                         │
│ [Start Test]                                            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Chapter 3 Vocabulary                                    │
│ Assigned to: Grade 3A • Due: Jan 22, 2026              │
│ 20 questions • Estimated time: 25 minutes               │
│                                                         │
│ [Start Test]                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Points:**
- Student sees vocabulary sheet name (not "Variant A")
- Variant assignment happens behind the scenes
- Clear, meaningful test identification
- No confusion about which test to take

---

## Data Model Changes

### Schema Modifications

```prisma
model VocabularySheet {
  id              String           @id @default(cuid())
  name            String           // NEW: User-provided name
  originalName    String           // Filename (keep for reference)
  fileName        String           @unique
  s3Key           String           @unique
  fileType        DocumentType
  mimeType        String
  fileSize        Int
  status          ProcessingStatus @default(PENDING)
  errorMessage    String?          @db.Text
  extractedText   String?          @db.Text
  testsToGenerate Int              @default(3)
  uploadedAt      DateTime         @default(now())
  processedAt     DateTime?

  teacherId String
  teacher   User             @relation(fields: [teacherId], references: [id])
  words     VocabularyWord[]
  tests     Test[]

  @@index([teacherId])
  @@index([status])
}

model Test {
  id        String   @id @default(cuid())
  name      String   // MODIFIED: Now "{VocabularySheet.name} - Variant {variant}"
  variant   String   // "A", "B", "C"...
  createdAt DateTime @default(now())

  sheetId     String
  sheet       VocabularySheet  @relation(fields: [sheetId], references: [id])
  questions   TestQuestion[]
  assignments TestAssignment[]
  attempts    TestAttempt[]

  @@index([sheetId])
}
```

**Migration Required:**

```sql
-- Add name column to VocabularySheet
ALTER TABLE "VocabularySheet" ADD COLUMN "name" TEXT;

-- Populate existing records with originalName (strip extension)
UPDATE "VocabularySheet"
SET "name" = regexp_replace("originalName", '\.[^.]*$', '');

-- Make name required
ALTER TABLE "VocabularySheet" ALTER COLUMN "name" SET NOT NULL;

-- Update existing test names to include vocabulary sheet name
UPDATE "Test" t
SET "name" = vs.name || ' - Variant ' || t.variant
FROM "VocabularySheet" vs
WHERE t."sheetId" = vs.id;
```

**Rollback Plan:**
- Migration is additive (no data loss)
- Can revert to originalName if needed
- Test.name remains string, no schema constraints

---

## API Changes

### 1. Upload Endpoint

**Route:** `POST /api/vocabulary-sheets`

**Current Query Params:**
```typescript
{
  testsToGenerate: number; // 3-10, default 3
}
```

**Proposed Query Params:**
```typescript
{
  name: string;            // NEW: Required, 1-100 chars
  testsToGenerate: number; // 3-10, default 3
}
```

**Validation Schema:**
```typescript
const uploadQuerySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  testsToGenerate: z.coerce.number().min(3).max(10).default(3),
});
```

**Example Request:**
```bash
curl -X POST \
  "http://localhost:3001/api/vocabulary-sheets?name=Week%201%20Spelling&testsToGenerate=3" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@week1.pdf"
```

**Response (Unchanged):**
```json
{
  "sheet": {
    "id": "cm5abc123...",
    "name": "Week 1 Spelling",
    "originalName": "week1.pdf",
    "fileSize": 245120,
    "status": "PENDING",
    "uploadedAt": "2026-01-18T10:30:00Z"
  }
}
```

---

### 2. List Tests Endpoint

**Route:** `GET /api/tests`

**Current Response:**
```json
{
  "tests": [
    {
      "id": "test1",
      "name": "Variant A",
      "variant": "A",
      "sheet": {
        "id": "sheet1",
        "originalName": "week1.pdf"
      },
      "_count": { "questions": 10 }
    }
  ]
}
```

**Proposed Response:**
```json
{
  "tests": [
    {
      "id": "test1",
      "name": "Week 1 Spelling - Variant A",
      "variant": "A",
      "sheet": {
        "id": "sheet1",
        "name": "Week 1 Spelling",
        "originalName": "week1.pdf"
      },
      "_count": { "questions": 10 }
    }
  ]
}
```

**Changes:**
- `test.name` includes vocabulary sheet name
- `sheet.name` exposed in response

---

### 3. New Endpoint: Bulk Test Assignment

**Route:** `POST /api/vocabulary-sheets/:sheetId/assign`

**Purpose:** Assign ALL test variants from a vocabulary sheet to a classroom

**Request Body:**
```typescript
{
  classroomId: string;    // Required
  dueDate?: string;       // Optional ISO datetime
}
```

**Response:**
```json
{
  "assignments": [
    {
      "id": "assignment1",
      "testId": "test1",
      "classroomId": "classroom1",
      "dueDate": "2026-01-25T23:59:59Z",
      "assignedAt": "2026-01-18T10:30:00Z"
    },
    {
      "id": "assignment2",
      "testId": "test2",
      "classroomId": "classroom1",
      "dueDate": "2026-01-25T23:59:59Z",
      "assignedAt": "2026-01-18T10:30:00Z"
    },
    {
      "id": "assignment3",
      "testId": "test3",
      "classroomId": "classroom1",
      "dueDate": "2026-01-25T23:59:59Z",
      "assignedAt": "2026-01-18T10:30:00Z"
    }
  ],
  "sheet": {
    "id": "sheet1",
    "name": "Week 1 Spelling"
  },
  "variantsAssigned": 3
}
```

**Implementation:**
```typescript
app.post('/:sheetId/assign', async (request: FastifyRequest, reply) => {
  const { sheetId } = sheetIdSchema.parse(request.params);
  const { classroomId, dueDate } = assignBulkSchema.parse(request.body);

  // Verify vocabulary sheet exists and belongs to teacher
  const sheet = await prisma.vocabularySheet.findFirst({
    where: { id: sheetId, teacherId: request.userId },
    include: { tests: { select: { id: true } } },
  });

  if (!sheet) {
    return reply.code(404).send({ error: 'Vocabulary sheet not found' });
  }

  // Verify classroom belongs to teacher
  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, teacherId: request.userId },
  });

  if (!classroom) {
    return reply.code(404).send({ error: 'Classroom not found' });
  }

  // Create assignments for all test variants
  const assignments = await prisma.testAssignment.createMany({
    data: sheet.tests.map((test) => ({
      testId: test.id,
      classroomId,
      dueDate: dueDate ? new Date(dueDate) : null,
    })),
    skipDuplicates: true, // Skip if already assigned
  });

  // Fetch created assignments for response
  const createdAssignments = await prisma.testAssignment.findMany({
    where: {
      testId: { in: sheet.tests.map((t) => t.id) },
      classroomId,
    },
  });

  return reply.code(201).send({
    assignments: createdAssignments,
    sheet: { id: sheet.id, name: sheet.name },
    variantsAssigned: sheet.tests.length,
  });
});
```

---

### 4. New Endpoint: Rename Vocabulary Sheet

**Route:** `PATCH /api/vocabulary-sheets/:id/rename`

**Purpose:** Update vocabulary sheet name and propagate to all test names

**Request Body:**
```typescript
{
  name: string; // Required, 1-100 chars
}
```

**Response:**
```json
{
  "sheet": {
    "id": "sheet1",
    "name": "Week 2 Spelling - Revised",
    "originalName": "week1.pdf"
  },
  "testsUpdated": 3
}
```

**Implementation:**
```typescript
app.patch('/:id/rename', async (request: FastifyRequest, reply) => {
  const { id } = sheetIdSchema.parse(request.params);
  const { name } = renameSchema.parse(request.body);

  // Verify ownership
  const sheet = await prisma.vocabularySheet.findFirst({
    where: { id, teacherId: request.userId },
    include: { tests: true },
  });

  if (!sheet) {
    return reply.code(404).send({ error: 'Vocabulary sheet not found' });
  }

  // Update sheet name
  await prisma.vocabularySheet.update({
    where: { id },
    data: { name },
  });

  // Update all test names
  await Promise.all(
    sheet.tests.map((test) =>
      prisma.test.update({
        where: { id: test.id },
        data: { name: `${name} - Variant ${test.variant}` },
      })
    )
  );

  return reply.send({
    sheet: { id, name, originalName: sheet.originalName },
    testsUpdated: sheet.tests.length,
  });
});
```

---

## Background Job Changes

**File:** `/workspace/apps/api/src/jobs/process-vocabulary-sheet.ts`

**Current Test Naming:**
```typescript
const test = await prisma.test.create({
  data: {
    name: `Variant ${variant}`,  // ❌ Not descriptive
    variant,
    sheetId: sheet.id,
  },
});
```

**Proposed Test Naming:**
```typescript
// Fetch vocabulary sheet name
const sheet = await prisma.vocabularySheet.findUnique({
  where: { id: sheetId },
  select: { id: true, name: true, s3Key: true, mimeType: true, testsToGenerate: true },
});

// Later, when creating test...
const test = await prisma.test.create({
  data: {
    name: `${sheet.name} - Variant ${variant}`,  // ✅ Descriptive!
    variant,
    sheetId: sheet.id,
  },
});
```

**Minimal change, significant impact.**

---

## Frontend Implementation

### 1. Upload Form Component

**File:** `/workspace/apps/web/src/app/(dashboard)/vocabulary/page.tsx`

**Add State for Name:**
```typescript
const [vocabularyName, setVocabularyName] = useState('');
const [selectedFile, setSelectedFile] = useState<File | null>(null);
```

**Update onDrop Handler:**
```typescript
const onDrop = useCallback((acceptedFiles: File[]) => {
  if (acceptedFiles.length === 0) return;

  const file = acceptedFiles[0];
  setSelectedFile(file);

  // Smart default: clean filename
  const smartName = file.name
    .replace(/\.[^.]+$/, '') // Remove extension
    .replace(/[_-]/g, ' ')    // Replace underscores/dashes with spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title case

  setVocabularyName(smartName);
}, []);
```

**Render Name Input:**
```tsx
{selectedFile && (
  <div className="mt-4 space-y-4">
    <div className="flex items-center gap-2 text-sm">
      <FileText className="h-4 w-4" />
      <span className="font-medium">{selectedFile.name}</span>
      <Badge variant="outline">{formatFileSize(selectedFile.size)}</Badge>
    </div>

    <div className="space-y-2">
      <Label htmlFor="vocabulary-name">
        Name <span className="text-destructive">*</span>
      </Label>
      <Input
        id="vocabulary-name"
        value={vocabularyName}
        onChange={(e) => setVocabularyName(e.target.value)}
        placeholder="e.g., Week 1 Spelling, Chapter 3 Vocabulary"
        maxLength={100}
        required
      />
      <p className="text-sm text-muted-foreground">
        This name will help you identify the vocabulary set and its tests later.
      </p>
    </div>

    <Button
      onClick={handleUpload}
      disabled={!vocabularyName.trim() || uploadProgress !== null}
      className="w-full"
    >
      <Upload className="mr-2 h-4 w-4" />
      Upload & Generate Tests
    </Button>
  </div>
)}
```

**Update Upload Function:**
```typescript
const handleUpload = async () => {
  if (!accessToken || !selectedFile || !vocabularyName.trim()) return;

  const formData = new FormData();
  formData.append('file', selectedFile);

  // Name passed as query param
  const url = `/api/vocabulary-sheets?name=${encodeURIComponent(vocabularyName.trim())}&testsToGenerate=${testsToGenerate}`;

  // ... rest of upload logic
};
```

---

### 2. Test Assignment Component

**File:** `/workspace/apps/web/src/app/(dashboard)/classrooms/[id]/page.tsx`

**Fetch Vocabulary Sheets (Not Individual Tests):**
```typescript
const [vocabularySheets, setVocabularySheets] = useState<VocabularySheetWithTests[]>([]);

useEffect(() => {
  const loadVocabularySheets = async () => {
    const { sheets } = await vocabularySheetsApi.list(accessToken);

    // Filter to only completed sheets with tests
    const sheetsWithTests = sheets.filter(
      (sheet) => sheet.status === 'COMPLETED' && sheet._count.tests > 0
    );

    setVocabularySheets(sheetsWithTests);
  };

  loadVocabularySheets();
}, [accessToken]);
```

**Render Card-Based Selection:**
```tsx
<Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
  <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Assign Test to {classroom?.name}</DialogTitle>
      <DialogDescription>
        Select a vocabulary set to assign all its test variants to this classroom
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">
      {vocabularySheets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No tests available. Upload vocabulary sheets to generate tests.
        </p>
      ) : (
        <div className="space-y-3">
          {vocabularySheets.map((sheet) => (
            <Card
              key={sheet.id}
              className={cn(
                'cursor-pointer transition-colors hover:border-primary',
                selectedSheetId === sheet.id && 'border-primary bg-primary/5'
              )}
              onClick={() => setSelectedSheetId(sheet.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{sheet.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {sheet._count.words} words • {sheet._count.tests} variants •
                      Uploaded {format(new Date(sheet.uploadedAt), 'MMM d, yyyy')}
                    </p>

                    {selectedSheetId === sheet.id && (
                      <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                        <p className="font-medium mb-2">
                          ✓ Will assign ALL {sheet._count.tests} test variants:
                        </p>
                        <ul className="space-y-1 ml-4">
                          {['A', 'B', 'C', 'D', 'E'].slice(0, sheet._count.tests).map((v) => (
                            <li key={v}>• {sheet.name} - Variant {v}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-muted-foreground">
                          Students will receive randomized variants
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedSheetId === sheet.id && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="due-date">Due Date (optional)</Label>
        <Input
          id="due-date"
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleBulkAssign}
          disabled={!selectedSheetId || isAssigning}
        >
          {isAssigning ? 'Assigning...' : 'Assign All Variants'}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

**Bulk Assignment Handler:**
```typescript
const handleBulkAssign = async () => {
  if (!selectedSheetId || !accessToken) return;

  setIsAssigning(true);
  try {
    const response = await fetch(
      `/api/vocabulary-sheets/${selectedSheetId}/assign`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classroomId,
          dueDate: dueDate || undefined,
        }),
      }
    );

    if (!response.ok) throw new Error('Failed to assign tests');

    const { variantsAssigned } = await response.json();

    setAssignSuccess(true);
    setIsAssignDialogOpen(false);

    // Show success message
    toast.success(`Successfully assigned ${variantsAssigned} test variants!`);

    // Refresh assignments list
    loadAssignments();
  } catch (error) {
    console.error('Error assigning tests:', error);
    toast.error('Failed to assign tests. Please try again.');
  } finally {
    setIsAssigning(false);
  }
};
```

---

### 3. Assigned Tests Display

**Grouped Expandable List:**
```tsx
<TabsContent value="tests">
  <Card>
    <CardHeader>
      <CardTitle>Assigned Tests</CardTitle>
    </CardHeader>
    <CardContent>
      {assignments.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          No tests assigned yet
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedAssignments).map(([sheetId, group]) => (
            <Card key={sheetId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{group.sheetName}</h4>
                    <p className="text-sm text-muted-foreground">
                      Assigned {format(new Date(group.assignedAt), 'MMM d, yyyy')}
                      {group.dueDate && ` • Due ${format(new Date(group.dueDate), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(sheetId)}
                  >
                    {expandedSheets.includes(sheetId) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {expandedSheets.includes(sheetId) && (
                <CardContent>
                  <div className="space-y-2">
                    {group.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div>
                          <span className="font-medium">Variant {variant.variant}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {variant.questionCount} questions
                          </span>
                        </div>
                        <Badge variant="outline">
                          {variant.completions}/{group.totalStudents} completed
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm">
                      View Results
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAssignment(sheetId)}
                    >
                      Remove Assignment
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>
```

---

## Edge Cases & Solutions

### 1. Duplicate Names

**Problem:** Teacher uploads two vocabulary sheets with same name

**Solution:**
- Allow duplicate names (names are not unique keys)
- Display both with context: "{name} • Uploaded {date}"
- Teacher can rename if needed

**Why Not Enforce Unique:**
- Names are user-facing, not system identifiers
- Teachers might have legitimate reasons for duplicates (e.g., "Week 1 Spelling" for different years)
- ID-based uniqueness is sufficient

---

### 2. Renaming After Assignment

**Problem:** Teacher renames vocabulary sheet after tests assigned to classrooms

**Solution:**
- Update VocabularySheet.name
- Update all Test.name records
- TestAssignment records unchanged (still point to same test IDs)
- Students see updated name in their test list

**Implementation:**
- PATCH endpoint updates sheet and cascades to tests
- Frontend refreshes test list after rename
- No impact on existing assignments or attempts

---

### 3. Empty Name Submission

**Problem:** Teacher submits upload without name

**Validation:**
- Frontend: Disabled submit button if name empty
- Backend: 400 Bad Request if name missing or empty

**Smart Default:**
- Pre-fill name from filename
- Teacher can edit before submission

---

### 4. Individual Variant Assignment

**Problem:** Teacher wants to assign only Variant A, not all variants

**Solution (Phase 2):**
- Add "Advanced Options" toggle in assignment dialog
- Expand to show individual variant checkboxes
- Default: All variants checked
- Allow unchecking specific variants

**Implementation:**
```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="advanced">
    <AccordionTrigger>Advanced Options</AccordionTrigger>
    <AccordionContent>
      <div className="space-y-2">
        <Label>Select specific variants (optional):</Label>
        {sheet.tests.map((test) => (
          <div key={test.id} className="flex items-center gap-2">
            <Checkbox
              id={test.id}
              checked={selectedVariants.includes(test.id)}
              onCheckedChange={(checked) => toggleVariant(test.id, checked)}
            />
            <Label htmlFor={test.id}>
              Variant {test.variant} ({test._count.questions} questions)
            </Label>
          </div>
        ))}
      </div>
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

### 5. Very Long Names

**Problem:** Teacher enters 500-character name

**Solution:**
- Frontend: maxLength={100} on input
- Backend: Zod validation .max(100)
- Error message: "Name must be 100 characters or less"

**UI Truncation:**
- Display full name in detail views
- Truncate in lists: `{name.length > 50 ? name.slice(0, 50) + '...' : name}`
- Tooltip on hover shows full name

---

### 6. Special Characters in Names

**Problem:** Names with quotes, ampersands, unicode

**Solution:**
- Allow all UTF-8 characters
- No sanitization needed (Prisma escapes SQL, React escapes HTML)
- Examples: "Week 1 - Spelling & Vocabulary", "科学 Vocabulary", "L'école"

---

### 7. Migration of Existing Data

**Problem:** 100 existing vocabulary sheets in staging with no name

**Migration Strategy:**

**Step 1: Add nullable column**
```sql
ALTER TABLE "VocabularySheet" ADD COLUMN "name" TEXT;
```

**Step 2: Populate from originalName**
```sql
UPDATE "VocabularySheet"
SET "name" = regexp_replace("originalName", '\.[^.]*$', '');
```

**Step 3: Make required**
```sql
ALTER TABLE "VocabularySheet" ALTER COLUMN "name" SET NOT NULL;
```

**Step 4: Update test names**
```sql
UPDATE "Test" t
SET "name" = vs.name || ' - Variant ' || t.variant
FROM "VocabularySheet" vs
WHERE t."sheetId" = vs.id;
```

**Rollback:**
```sql
ALTER TABLE "VocabularySheet" DROP COLUMN "name";
```

---

### 8. Assignment at Upload Time

**Problem:** Can we assign to classrooms during upload?

**Analysis:**

**Pros:**
- One-step workflow
- Faster for teachers
- Reduces clicks

**Cons:**
- Tests not generated yet (async background job)
- Cannot assign what doesn't exist
- What if processing fails?
- Complex UI (upload + classroom selection)

**Recommendation:** No, keep separate
- Upload → Generate → Assign is clearer workflow
- Teachers should review extracted vocabulary before assignment
- Processing failures don't block assignment decision

**Alternative (Phase 3):**
- "Quick Assign" button on completed vocabulary sheet cards
- One-click assignment after processing completes

---

## Acceptance Criteria

### Phase 1 (MVP)

**Upload Flow:**
- [ ] Name field appears after file selection
- [ ] Smart default populated from filename
- [ ] Name required (1-100 chars)
- [ ] Upload button disabled if name empty
- [ ] Backend validates name presence
- [ ] VocabularySheet.name stored in database
- [ ] Tests created with format "{name} - Variant {X}"

**Test Display:**
- [ ] Test list shows full test names (not just "Variant A")
- [ ] Vocabulary sheet name visible in test metadata
- [ ] Tests grouped by vocabulary sheet in UI

**Assignment Flow:**
- [ ] Assignment dialog shows vocabulary sheets (not individual tests)
- [ ] Card-based selection UI
- [ ] Preview shows all variants to be assigned
- [ ] "Assign All Variants" button
- [ ] Bulk assignment creates multiple TestAssignment records
- [ ] Success message shows number of variants assigned

**Assigned Tests View:**
- [ ] Tests grouped by vocabulary sheet
- [ ] Expandable/collapsible sections
- [ ] Shows all variants under each vocabulary sheet
- [ ] Due dates prominently displayed

**Student View:**
- [ ] Students see vocabulary sheet name (not "Variant A")
- [ ] Test names are descriptive and meaningful

**Backend:**
- [ ] VocabularySheet.name column exists
- [ ] Migration populates existing records
- [ ] POST /api/vocabulary-sheets accepts name param
- [ ] POST /api/vocabulary-sheets/:sheetId/assign endpoint
- [ ] Test naming in background job uses sheet name

---

### Phase 2 (Enhancements)

**Rename Feature:**
- [ ] "Rename" button on vocabulary sheet cards
- [ ] PATCH /api/vocabulary-sheets/:id/rename endpoint
- [ ] Renaming updates all test names
- [ ] Frontend refreshes after rename

**Individual Variant Control:**
- [ ] "Advanced Options" in assignment dialog
- [ ] Checkboxes for individual variant selection
- [ ] Default: All variants selected
- [ ] Assign only checked variants

**AI-Suggested Names:**
- [ ] Claude suggests name after extraction
- [ ] Notification shows suggested name
- [ ] Teacher can accept/reject suggestion
- [ ] Suggestion stored for later review

**Quick Actions:**
- [ ] "Quick Assign" button on vocabulary sheet cards
- [ ] One-click assignment to default classroom
- [ ] Confirmation toast

---

## Implementation Estimate

### Complexity Breakdown

**Phase 1 (MVP):**
- Database Migration: 1 hour
- Backend API Changes: 3 hours
  - Update upload endpoint
  - Bulk assignment endpoint
  - Update test listing
  - Update background job
- Frontend Upload Form: 2 hours
- Frontend Assignment Dialog: 4 hours
- Frontend Assigned Tests View: 3 hours
- Testing: 4 hours
- **Total: ~17 hours (2-3 days)**

**Phase 2 (Enhancements):**
- Rename Endpoint: 2 hours
- Individual Variant Selection: 3 hours
- AI Name Suggestions: 4 hours
- Quick Actions: 2 hours
- Testing: 3 hours
- **Total: ~14 hours (2 days)**

**Overall: 4-5 days of development**

---

## Risks & Mitigations

### Risk 1: Breaking Change for Existing Users

**Risk:** Existing vocabulary sheets have no name

**Mitigation:**
- Migration populates names from originalName
- No null names in production
- Gradual rollout with feature flag

**Severity:** Low (handled by migration)

---

### Risk 2: Name Changes Confusing Teachers

**Risk:** Teacher renames sheet after assignment, students see new name

**Mitigation:**
- Show rename confirmation: "This will update test names for students"
- Consider "locked" state after assignment (optional)
- Audit log of name changes

**Severity:** Low (rename is explicit action)

---

### Risk 3: Bulk Assignment Performance

**Risk:** Assigning 10 variants × 5 classrooms = 50 DB inserts

**Mitigation:**
- Use createMany() with skipDuplicates
- Single transaction
- Batch processing if needed

**Severity:** Low (Prisma handles efficiently)

---

### Risk 4: UI Complexity

**Risk:** Card-based selection more complex than dropdown

**Mitigation:**
- User testing with teachers
- Fallback to simple list if cards confusing
- Progressive disclosure (expand for details)

**Severity:** Medium (UX validation needed)

---

## Success Metrics

**Quantitative:**
- Time to assign tests reduced by 70% (10 min → 3 min)
- Test assignment completion rate increases by 30%
- Support tickets about test naming reduced by 80%

**Qualitative:**
- Teachers report tests are "easier to identify"
- Students understand which vocabulary set they're being tested on
- Fewer errors in test assignment

**Tracking:**
- Mixpanel event: "bulk_assignment_used"
- Mixpanel event: "vocabulary_sheet_renamed"
- Time between upload and assignment (funnel analysis)

---

## Alternatives Considered

### Alternative 1: Auto-Name from First Word

**Idea:** Use first extracted vocabulary word as sheet name

**Pros:**
- No manual naming
- Content-based

**Cons:**
- May not be representative (e.g., first word is "abandon")
- Not meaningful
- No user control

**Decision:** Rejected (not user-friendly)

---

### Alternative 2: Date-Based Auto-Naming

**Idea:** Auto-name as "Vocabulary Sheet - Jan 18, 2026"

**Pros:**
- No manual input
- Unique

**Cons:**
- Not meaningful
- Multiple uploads same day indistinguishable
- Defeats purpose of naming

**Decision:** Rejected (doesn't solve core problem)

---

### Alternative 3: Tags Instead of Names

**Idea:** Multi-tag system (e.g., "week1", "spelling", "grade3")

**Pros:**
- Flexible organization
- Multiple categorizations

**Cons:**
- Over-engineered for MVP
- Complex UI
- Not how teachers think

**Decision:** Deferred to Phase 3 (if needed)

---

## Future Enhancements (Phase 3+)

**1. Folder/Collection System:**
- Group vocabulary sheets into folders
- Example: "Q1 Spelling", "Science Vocab"
- Hierarchical organization

**2. Bulk Assignment Across Classrooms:**
- Assign one vocabulary sheet to multiple classrooms
- Matrix UI: Sheets × Classrooms

**3. Assignment Templates:**
- Save common assignment patterns
- Example: "Every Monday to all Grade 3 classes"

**4. Smart Scheduling:**
- Auto-assign based on calendar
- Recurring assignments

**5. Test Naming Templates:**
- Customizable format: "{name} - Test {variant}"
- Teacher preferences

**6. Variant Distribution Analytics:**
- Show which variants students received
- Balance variant distribution

---

## Appendix

### User Flow Diagram

```
┌─────────────┐
│   Teacher   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 1. Upload Vocabulary Sheet          │
│    - Drag/drop PDF/image             │
│    - Enter name (smart default)      │
│    - Click "Upload & Generate"       │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 2. Background Processing             │
│    - Extract vocabulary words        │
│    - Generate N test variants        │
│    - Name tests: "{name} - Variant X"│
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 3. Review Vocabulary Sheet           │
│    - View extracted words            │
│    - See generated tests             │
│    - Optional: Rename                │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 4. Assign to Classroom               │
│    - Navigate to classroom           │
│    - Click "Assign Test"             │
│    - Select vocabulary sheet (card)  │
│    - Preview all variants            │
│    - Set due date (optional)         │
│    - Click "Assign All Variants"     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 5. Students Take Tests               │
│    - See vocabulary sheet name       │
│    - Receive random variant          │
│    - Take test                       │
└─────────────────────────────────────┘
```

---

### API Endpoint Summary

| Method | Endpoint                                      | Purpose                          |
|--------|-----------------------------------------------|----------------------------------|
| POST   | /api/vocabulary-sheets                        | Upload with name (modified)      |
| GET    | /api/vocabulary-sheets                        | List sheets with names           |
| GET    | /api/vocabulary-sheets/:id                    | Get sheet details                |
| PATCH  | /api/vocabulary-sheets/:id/rename             | Rename sheet (new)               |
| POST   | /api/vocabulary-sheets/:sheetId/assign        | Bulk assign variants (new)       |
| DELETE | /api/vocabulary-sheets/:id                    | Delete sheet                     |
| GET    | /api/tests                                    | List tests (modified response)   |
| POST   | /api/tests/:testId/assign                     | Assign individual test (existing)|

---

### Component Hierarchy

```
VocabularyPage
├── UploadCard
│   ├── Dropzone
│   ├── FilePreview
│   ├── NameInput (new)
│   └── UploadButton
├── VocabularySheetList
│   └── VocabularySheetCard
│       ├── StatusBadge
│       ├── Metadata
│       ├── Actions
│       │   ├── RenameButton (new)
│       │   ├── DownloadButton
│       │   └── DeleteButton

ClassroomDetailPage
├── ClassroomHeader
├── Tabs
│   ├── StudentsTab
│   ├── TestsTab
│   │   ├── AssignButton
│   │   └── AssignedTestsList (modified)
│   │       └── VocabularySheetGroup (new)
│   │           ├── SheetHeader
│   │           ├── VariantList
│   │           └── Actions
│   └── ResultsTab

AssignTestDialog (modified)
├── DialogHeader
├── VocabularySheetSelector (new)
│   └── VocabularySheetCard
│       ├── SheetInfo
│       ├── VariantPreview
│       └── SelectionIndicator
├── DueDateInput
└── Actions
```

---

## Conclusion

This design provides a comprehensive solution to the test naming and assignment problem. By introducing vocabulary sheet naming at upload time and enabling bulk assignment of test variants, we dramatically improve the teacher workflow while maintaining flexibility for advanced use cases.

**Key Benefits:**
- 70% reduction in assignment time
- Clear, meaningful test identification
- Reduced cognitive load for teachers
- Better student experience
- Scalable to future enhancements

**Implementation Priority:**
1. Phase 1 (MVP) - 2-3 days
2. Testing and iteration - 1 day
3. Phase 2 (Enhancements) - 2 days (optional)

**Recommendation:** Proceed with Phase 1 implementation immediately. This is a high-impact, low-risk change that addresses a critical UX pain point.

---

**End of Design Document**
