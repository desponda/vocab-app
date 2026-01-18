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
  testsToGenerate: z.coerce.number().min(3).max(10).default(3),
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
  app.post('/', async (request: FastifyRequest, reply) => {
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
        error: `Invalid file type. Allowed types: PDF, JPEG, PNG, GIF, WebP`,
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
        originalName: data.filename,
        fileName,
        s3Key,
        fileType: getDocumentType(mimeType),
        mimeType,
        fileSize: buffer.length,
        status: 'PENDING',
        testsToGenerate: query.testsToGenerate,
        teacherId: request.userId,
      },
      select: {
        id: true,
        originalName: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        fileSize: true,
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
        console.log(`Queued vocabulary processing job for sheet: ${sheet.id}`);
      }
    } else {
      console.warn('ANTHROPIC_API_KEY or REDIS_URL not configured, skipping vocabulary processing');
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
        originalName: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        fileSize: true,
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
        originalName: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        fileSize: true,
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
};
