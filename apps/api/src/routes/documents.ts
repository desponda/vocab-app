import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { minioClient } from '../lib/minio';
import { config } from '../lib/config';
import { requireAuth } from '../middleware/auth';
import {
  sanitizeFilename,
  generateUniqueFilename,
  validateFileType,
  mimeTypeToDocumentType,
} from '../lib/file-upload';

// Validation schemas
const uploadDocumentSchema = z.object({
  studentId: z.string().cuid(),
});

const documentIdSchema = z.object({
  id: z.string().cuid(),
});

const listDocumentsQuerySchema = z.object({
  studentId: z.string().cuid().optional(),
});

export const documentRoutes = async (app: FastifyInstance) => {
  // All routes require authentication
  app.addHook('onRequest', requireAuth);

  /**
   * POST /api/documents
   * Upload a document for a student
   */
  app.post('/', async (request: FastifyRequest, reply) => {
    try {
      // Get multipart data
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No file uploaded',
        });
      }

      // Get studentId from fields
      const fields = data.fields as any;
      const studentId = fields.studentId?.value;

      if (!studentId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'studentId is required',
        });
      }

      // Validate studentId and ownership
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          userId: request.userId,
        },
      });

      if (!student) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Student not found',
        });
      }

      // Read file buffer
      const buffer = await data.toBuffer();

      // Validate file size
      if (buffer.length > config.upload.maxFileSize) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `File too large. Maximum size: ${config.upload.maxFileSize / 1024 / 1024} MB`,
        });
      }

      // Validate file type using magic bytes
      const validation = await validateFileType(buffer, data.filename);
      if (!validation.valid) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: validation.error || 'Invalid file type',
        });
      }

      // Generate unique filename and S3 key
      const uniqueFilename = generateUniqueFilename(data.filename);
      const s3Key = `${request.userId}/${uniqueFilename}`;

      // Upload to MinIO
      await minioClient.putObject(
        config.minio!.bucket,
        s3Key,
        buffer,
        buffer.length,
        {
          'Content-Type': validation.mimeType,
          'X-Original-Name': data.filename,
        }
      );

      // Save to database
      const document = await prisma.document.create({
        data: {
          originalName: data.filename,
          fileName: uniqueFilename,
          s3Key,
          fileType: mimeTypeToDocumentType(validation.mimeType!),
          mimeType: validation.mimeType!,
          fileSize: buffer.length,
          studentId: student.id,
          userId: request.userId,
          status: 'PENDING',
        },
        select: {
          id: true,
          originalName: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          status: true,
          uploadedAt: true,
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      request.log.info(
        `Document uploaded: ${document.id} for student ${student.name}`
      );

      return reply.code(201).send({ document });
    } catch (error) {
      request.log.error(error);
      throw error;
    }
  });

  /**
   * GET /api/documents
   * List documents (optionally filtered by studentId)
   */
  app.get('/', async (request: FastifyRequest, reply) => {
    try {
      const query = listDocumentsQuerySchema.parse(request.query);

      const documents = await prisma.document.findMany({
        where: {
          userId: request.userId,
          ...(query.studentId && { studentId: query.studentId }),
        },
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          originalName: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          status: true,
          uploadedAt: true,
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return reply.send({ documents });
    } catch (error) {
      request.log.error(error);
      throw error;
    }
  });

  /**
   * GET /api/documents/:id
   * Get document details
   */
  app.get('/:id', async (request: FastifyRequest, reply) => {
    try {
      const params = documentIdSchema.parse(request.params);

      const document = await prisma.document.findFirst({
        where: {
          id: params.id,
          userId: request.userId,
        },
        select: {
          id: true,
          originalName: true,
          fileName: true,
          fileType: true,
          mimeType: true,
          fileSize: true,
          status: true,
          uploadedAt: true,
          processedAt: true,
          student: {
            select: {
              id: true,
              name: true,
              gradeLevel: true,
            },
          },
        },
      });

      if (!document) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Document not found',
        });
      }

      return reply.send({ document });
    } catch (error) {
      request.log.error(error);
      throw error;
    }
  });

  /**
   * GET /api/documents/:id/download
   * Download document
   */
  app.get('/:id/download', async (request: FastifyRequest, reply) => {
    try {
      const params = documentIdSchema.parse(request.params);

      const document = await prisma.document.findFirst({
        where: {
          id: params.id,
          userId: request.userId,
        },
      });

      if (!document) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Document not found',
        });
      }

      // Get file from MinIO
      const stream = await minioClient.getObject(
        config.minio!.bucket,
        document.s3Key
      );

      return reply
        .type(document.mimeType)
        .header(
          'Content-Disposition',
          `attachment; filename="${document.originalName}"`
        )
        .send(stream);
    } catch (error) {
      request.log.error(error);
      throw error;
    }
  });

  /**
   * DELETE /api/documents/:id
   * Delete document
   */
  app.delete('/:id', async (request: FastifyRequest, reply) => {
    try {
      const params = documentIdSchema.parse(request.params);

      const document = await prisma.document.findFirst({
        where: {
          id: params.id,
          userId: request.userId,
        },
      });

      if (!document) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Document not found',
        });
      }

      // Delete from MinIO
      try {
        await minioClient.removeObject(config.minio!.bucket, document.s3Key);
        request.log.info(`Deleted file from MinIO: ${document.s3Key}`);
      } catch (error) {
        request.log.warn({ error, s3Key: document.s3Key }, 'Failed to delete from MinIO');
        // Continue to delete from DB even if MinIO deletion fails
      }

      // Delete from database
      await prisma.document.delete({
        where: { id: params.id },
      });

      request.log.info(`Document deleted: ${params.id}`);

      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      throw error;
    }
  });
};
