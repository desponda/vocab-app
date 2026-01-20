import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { uploadFile, downloadFile, deleteFile } from '../lib/minio';
import { config } from '../lib/config';
import { getVocabularyQueue } from '../lib/queue';

const sheetIdSchema = z.object({
  id: z.string().cuid(),
});

const uploadQuerySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  testsToGenerate: z.coerce.number().min(3).max(10).default(3),
  gradeLevel: z.coerce.number().int().min(1).max(12).optional(),
  testType: z.enum(['VOCABULARY', 'SPELLING', 'GENERAL_KNOWLEDGE']).default('VOCABULARY'),
  useAllWords: z.coerce.boolean().optional().default(false),
});

const assignBulkSchema = z.object({
  classroomId: z.string().cuid(),
  dueDate: z.string().datetime().optional(),
});

const wordIdSchema = z.object({
  id: z.string().cuid(),
  wordId: z.string().cuid(),
});

const updateWordSchema = z.object({
  word: z.string().min(1).max(100).optional(),
  definition: z.string().max(500).optional(),
  context: z.string().max(500).optional(),
});

// File type signatures (magic bytes)
interface FileSignature {
  mimeType: string;
  signature: number[];
  offset?: number; // Some signatures start at offset other than 0
}

const FILE_SIGNATURES: FileSignature[] = [
  { mimeType: 'application/pdf', signature: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mimeType: 'image/jpeg', signature: [0xff, 0xd8, 0xff] },
  { mimeType: 'image/png', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: 'image/gif', signature: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { mimeType: 'image/webp', signature: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF (WebP has more bytes after)
  { mimeType: 'image/heic', signature: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], offset: 4 }, // ftypheic at offset 4
  { mimeType: 'image/heif', signature: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x66], offset: 4 }, // ftypheif at offset 4
];

/**
 * Check if buffer starts with given signature
 */
function matchesSignature(buffer: Buffer, signature: number[], offset: number = 0): boolean {
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Validate file type using magic bytes (not just extension)
 */
function validateFileType(buffer: Buffer): { mimeType: string; isValid: boolean } {
  // Check for WebP (needs special handling - RIFF at start, WEBP at offset 8)
  if (matchesSignature(buffer, [0x52, 0x49, 0x46, 0x46], 0) &&
      matchesSignature(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mimeType: 'image/webp', isValid: true };
  }

  // Check other file signatures
  for (const sig of FILE_SIGNATURES) {
    if (sig.mimeType === 'image/webp') continue; // Already checked above

    if (matchesSignature(buffer, sig.signature, sig.offset || 0)) {
      return { mimeType: sig.mimeType, isValid: true };
    }
  }

  return { mimeType: '', isValid: false };
}

/**
 * Determine DocumentType enum from MIME type
 */
function getDocumentType(mimeType: string): 'PDF' | 'IMAGE' {
  return mimeType === 'application/pdf' ? 'PDF' : 'IMAGE';
}

export const vocabularySheetRoutes = async (app: FastifyInstance) => {
  // All routes require authentication
  app.addHook('onRequest', requireAuth);

  /**
   * POST /api/vocabulary-sheets
   * Upload a new vocabulary sheet
   */
  app.post('/', {
    config: {
      rateLimit: {
        max: 10, // Maximum 10 uploads
        timeWindow: '1 hour', // Per hour (AI processing is expensive)
      },
    },
  }, async (request: FastifyRequest, reply) => {
    // Parse query params
    const query = uploadQuerySchema.parse(request.query);

    // Get uploaded file
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    // Read file buffer
    const buffer = await data.toBuffer();

    // Validate file size
    if (buffer.length > config.upload.maxFileSize) {
      return reply.code(400).send({
        error: `File too large. Maximum size is ${config.upload.maxFileSize / 1024 / 1024} MB`,
      });
    }

    // Validate file type using magic bytes
    const { mimeType, isValid } = validateFileType(buffer);

    if (!isValid) {
      return reply.code(400).send({
        error: `Invalid file type. Allowed: PDF, JPEG, PNG, GIF, WebP, HEIC`,
      });
    }

    // Generate unique filename: {userId}/{timestamp}-{originalFilename}
    const timestamp = Date.now();
    const sanitizedFilename = data.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedFilename}`;
    const s3Key = `${request.userId}/${fileName}`;

    // Upload to MinIO
    await uploadFile(s3Key, buffer, {
      'Content-Type': mimeType,
      'Original-Filename': data.filename,
    });

    // Create database record
    const sheet = await prisma.vocabularySheet.create({
      data: {
        name: query.name,
        originalName: data.filename,
        fileName,
        s3Key,
        fileType: getDocumentType(mimeType),
        mimeType,
        fileSize: buffer.length,
        gradeLevel: query.gradeLevel,
        testType: query.testType,
        useAllWords: query.useAllWords,
        status: 'PENDING',
        testsToGenerate: query.testsToGenerate,
        teacherId: request.userId,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        fileSize: true,
        gradeLevel: true,
        testType: true,
        useAllWords: true,
        status: true,
        testsToGenerate: true,
        uploadedAt: true,
      },
    });

    // Trigger background job to process vocabulary sheet
    if (config.anthropicApiKey && config.redisUrl) {
      const queue = getVocabularyQueue();
      if (queue) {
        await queue.add('process-sheet', { sheetId: sheet.id });
        app.log.info({ sheetId: sheet.id }, 'Queued vocabulary processing job');
      }
    } else {
      app.log.warn('ANTHROPIC_API_KEY or REDIS_URL not configured, skipping vocabulary processing');
    }

    return reply.code(201).send({ sheet });
  });

  /**
   * GET /api/vocabulary-sheets
   * List teacher's vocabulary sheets
   */
  app.get('/', async (request: FastifyRequest, reply) => {
    const sheets = await prisma.vocabularySheet.findMany({
      where: { teacherId: request.userId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        name: true,
        originalName: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        fileSize: true,
        gradeLevel: true,
        testType: true,
        status: true,
        errorMessage: true,
        testsToGenerate: true,
        uploadedAt: true,
        processedAt: true,
        _count: {
          select: {
            words: true,
            tests: true,
          },
        },
        tests: {
          select: {
            id: true,
            name: true,
            variant: true,
            createdAt: true,
            _count: {
              select: {
                questions: true,
              },
            },
          },
          orderBy: { variant: 'asc' },
        },
      },
    });

    return reply.send({ sheets });
  });

  /**
   * GET /api/vocabulary-sheets/:id
   * Get vocabulary sheet details
   */
  app.get('/:id', async (request: FastifyRequest, reply) => {
    const params = sheetIdSchema.parse(request.params);

    const sheet = await prisma.vocabularySheet.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId, // Verify ownership
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        fileSize: true,
        gradeLevel: true,
        testType: true,
        status: true,
        errorMessage: true,
        extractedText: true,
        testsToGenerate: true,
        uploadedAt: true,
        processedAt: true,
        words: {
          select: {
            id: true,
            word: true,
            definition: true,
            context: true,
          },
        },
        tests: {
          select: {
            id: true,
            name: true,
            variant: true,
            createdAt: true,
            _count: {
              select: { questions: true },
            },
          },
        },
      },
    });

    if (!sheet) {
      return reply.code(404).send({ error: 'Vocabulary sheet not found' });
    }

    return reply.send({ sheet });
  });

  /**
   * GET /api/vocabulary-sheets/:id/download
   * Download original vocabulary sheet file
   */
  app.get('/:id/download', async (request: FastifyRequest, reply) => {
    const params = sheetIdSchema.parse(request.params);

    const sheet = await prisma.vocabularySheet.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId, // Verify ownership
      },
      select: {
        s3Key: true,
        originalName: true,
        mimeType: true,
      },
    });

    if (!sheet) {
      return reply.code(404).send({ error: 'Vocabulary sheet not found' });
    }

    // Download from MinIO
    const buffer = await downloadFile(sheet.s3Key);

    // Send file to client
    return reply
      .header('Content-Type', sheet.mimeType)
      .header('Content-Disposition', `attachment; filename="${sheet.originalName}"`)
      .send(buffer);
  });

  /**
   * GET /api/vocabulary-sheets/:id/download-processed
   * Download compressed/processed image that was sent to Claude AI
   */
  app.get('/:id/download-processed', async (request: FastifyRequest, reply) => {
    const params = sheetIdSchema.parse(request.params);

    const sheet = await prisma.vocabularySheet.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId, // Verify ownership
      },
      select: {
        processedS3Key: true,
        originalName: true,
      },
    });

    if (!sheet) {
      return reply.code(404).send({ error: 'Vocabulary sheet not found' });
    }

    if (!sheet.processedS3Key) {
      return reply.code(404).send({ error: 'Processed image not available' });
    }

    // Download from MinIO
    const buffer = await downloadFile(sheet.processedS3Key);

    // Determine file extension from processed S3 key
    const extension = sheet.processedS3Key.split('.').pop() || 'png';
    const processedFileName = sheet.originalName.replace(/\.[^.]+$/, `_processed.${extension}`);

    // Send file to client
    return reply
      .header('Content-Type', extension === 'png' ? 'image/png' : 'image/jpeg')
      .header('Content-Disposition', `attachment; filename="${processedFileName}"`)
      .send(buffer);
  });

  /**
   * DELETE /api/vocabulary-sheets/:id
   * Delete vocabulary sheet
   */
  app.delete('/:id', async (request: FastifyRequest, reply) => {
    const params = sheetIdSchema.parse(request.params);

    const sheet = await prisma.vocabularySheet.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId, // Verify ownership
      },
      select: {
        s3Key: true,
      },
    });

    if (!sheet) {
      return reply.code(404).send({ error: 'Vocabulary sheet not found' });
    }

    // Delete from MinIO
    await deleteFile(sheet.s3Key);

    // Delete from database (cascade will delete related records)
    await prisma.vocabularySheet.delete({
      where: { id: params.id },
    });

    return reply.code(204).send();
  });

  /**
   * POST /api/vocabulary-sheets/:id/assign
   * Bulk assign all test variants from a vocabulary sheet to a classroom
   */
  app.post('/:id/assign', async (request: FastifyRequest, reply) => {
    const params = sheetIdSchema.parse(request.params);
    const body = assignBulkSchema.parse(request.body);

    // Verify vocabulary sheet exists and belongs to teacher
    const sheet = await prisma.vocabularySheet.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId,
      },
      include: {
        tests: {
          select: {
            id: true,
            name: true,
            variant: true,
          },
        },
      },
    });

    if (!sheet) {
      return reply.code(404).send({ error: 'Vocabulary sheet not found' });
    }

    if (sheet.tests.length === 0) {
      return reply.code(400).send({ error: 'No tests generated for this vocabulary sheet yet' });
    }

    // Verify classroom belongs to teacher
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: body.classroomId,
        teacherId: request.userId,
      },
    });

    if (!classroom) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    // Create assignments for all test variants
    const assignmentsData = sheet.tests.map((test) => ({
      testId: test.id,
      classroomId: body.classroomId,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    }));

    // Use createMany with skipDuplicates to handle already-assigned tests
    await prisma.testAssignment.createMany({
      data: assignmentsData,
      skipDuplicates: true,
    });

    // Fetch created/existing assignments for response
    const assignments = await prisma.testAssignment.findMany({
      where: {
        testId: { in: sheet.tests.map((t) => t.id) },
        classroomId: body.classroomId,
      },
      select: {
        id: true,
        testId: true,
        classroomId: true,
        dueDate: true,
        assignedAt: true,
      },
    });

    return reply.code(201).send({
      assignments,
      sheet: {
        id: sheet.id,
        name: sheet.name,
      },
      variantsAssigned: sheet.tests.length,
    });
  });

  /**
   * PATCH /api/vocabulary-sheets/:id/words/:wordId
   * Update a vocabulary word (for fixing AI extraction errors)
   */
  app.patch('/:id/words/:wordId', async (request: FastifyRequest, reply) => {
    const params = wordIdSchema.parse(request.params);
    const body = updateWordSchema.parse(request.body);

    // Verify vocabulary sheet exists and belongs to teacher
    const sheet = await prisma.vocabularySheet.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId,
      },
    });

    if (!sheet) {
      return reply.code(404).send({ error: 'Vocabulary sheet not found' });
    }

    // Update the word
    const word = await prisma.vocabularyWord.update({
      where: {
        id: params.wordId,
        sheetId: params.id, // Ensure word belongs to this sheet
      },
      data: {
        word: body.word,
        definition: body.definition,
        context: body.context,
      },
      select: {
        id: true,
        word: true,
        definition: true,
        context: true,
      },
    });

    return reply.send({ word });
  });

  /**
   * POST /api/vocabulary-sheets/:id/regenerate-tests
   * Delete existing tests and regenerate them from current vocabulary words
   * Query params: ?force=true to bypass safety checks
   */
  app.post('/:id/regenerate-tests', async (request: FastifyRequest, reply) => {
    const params = sheetIdSchema.parse(request.params);
    const query = request.query as { force?: string };
    const forceRegenerate = query.force === 'true';

    // Verify vocabulary sheet exists and belongs to teacher
    const sheet = await prisma.vocabularySheet.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        testsToGenerate: true,
        gradeLevel: true,
        testType: true,
        words: {
          select: {
            id: true,
            word: true,
            definition: true,
            context: true,
          },
        },
        tests: {
          select: {
            id: true,
            _count: {
              select: {
                attempts: true,
                assignments: true,
              },
            },
          },
        },
      },
    });

    if (!sheet) {
      return reply.code(404).send({ error: 'Vocabulary sheet not found' });
    }

    if (sheet.status !== 'COMPLETED') {
      return reply.code(400).send({ error: 'Vocabulary sheet must be completed before regenerating tests' });
    }

    // Safety check: Prevent data loss if students have taken tests or tests are assigned
    if (!forceRegenerate && sheet.tests.length > 0) {
      const totalAttempts = sheet.tests.reduce((sum, test) => sum + test._count.attempts, 0);
      const totalAssignments = sheet.tests.reduce((sum, test) => sum + test._count.assignments, 0);

      if (totalAttempts > 0 || totalAssignments > 0) {
        return reply.code(409).send({
          error: 'Cannot regenerate tests with existing student data',
          message: `This action would delete ${totalAttempts} student test attempt(s) and ${totalAssignments} classroom assignment(s). Students would lose their scores and progress.`,
          details: {
            studentAttempts: totalAttempts,
            classroomAssignments: totalAssignments,
            affectedTests: sheet.tests.length,
          },
          action: 'To proceed, you must first manually delete all test assignments and wait for students to finish in-progress attempts, or contact support for data archival options.',
        });
      }
    }

    // Validate words based on test type
    let wordsForValidation;
    if (sheet.testType === 'SPELLING') {
      // For spelling tests, all words are valid (don't require definitions)
      wordsForValidation = sheet.words;
    } else {
      // For vocabulary tests, only words with definitions
      wordsForValidation = sheet.words.filter(w => w.definition);
    }

    if (wordsForValidation.length === 0) {
      const errorMessage = sheet.testType === 'SPELLING'
        ? 'No words found for spelling test generation'
        : 'No vocabulary words with definitions found';
      return reply.code(400).send({ error: errorMessage });
    }

    // Delete existing tests and their questions (cascade will handle attempts/assignments if force=true)
    await prisma.test.deleteMany({
      where: { sheetId: params.id },
    });

    // Queue regeneration job (reuses existing test generation logic)
    const queue = await getVocabularyQueue();
    if (!queue) {
      return reply.code(503).send({ error: 'Background job queue not available' });
    }

    await queue.add('regenerate-tests', {
      sheetId: params.id,
      action: 'regenerate',
    });

    return reply.send({
      message: 'Test regeneration started',
      vocabularyCount: wordsForValidation.length,
      testsToGenerate: sheet.testsToGenerate,
    });
  });
};
