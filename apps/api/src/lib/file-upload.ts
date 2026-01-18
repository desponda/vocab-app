import path from 'path';
import crypto from 'crypto';
import fileType from 'file-type';
import { config } from './config';

/**
 * Sanitize filename to prevent directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = path.basename(filename);

  // Remove special characters, keep alphanumeric, dash, underscore, dot
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

  return sanitized.toLowerCase();
}

/**
 * Generate unique filename with timestamp and random suffix
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const sanitized = sanitizeFilename(nameWithoutExt);
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(4).toString('hex');

  return `${timestamp}_${sanitized}_${randomId}${ext}`;
}

/**
 * Validate file type using magic bytes (not just extension)
 */
export async function validateFileType(
  buffer: Buffer,
  filename: string
): Promise<{ valid: boolean; mimeType?: string; error?: string }> {
  const result = await fileType.fromBuffer(buffer);

  if (!result) {
    return { valid: false, error: 'Could not determine file type' };
  }

  const allowedTypes = config.upload.allowedMimeTypes;
  if (!allowedTypes.includes(result.mime)) {
    return {
      valid: false,
      error: `File type ${result.mime} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true, mimeType: result.mime };
}

/**
 * Map MIME type to DocumentType enum
 */
export function mimeTypeToDocumentType(mimeType: string): 'PDF' | 'IMAGE' {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'IMAGE';

  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
