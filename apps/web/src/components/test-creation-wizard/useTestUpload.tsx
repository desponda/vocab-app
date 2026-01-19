import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { vocabularySheetsApi, VocabularySheet, ProcessingStatus } from '@/lib/api';
import { toast } from '@/lib/toast';
import { TestType, ProcessingStage } from './types';

interface UploadOptions {
  file: File;
  name: string;
  testType: TestType;
  variants: number;
  gradeLevel?: number;
  useAllWords?: boolean;
  generatePreview?: boolean;
}

interface UseTestUploadReturn {
  upload: (options: UploadOptions) => Promise<string | null>;
  progress: number;
  stage: ProcessingStage;
  message: string;
  sheetId: string | null;
  error: string | null;
  reset: () => void;
}

const STAGE_MESSAGES: Record<ProcessingStage, string> = {
  idle: 'Ready to upload',
  uploading: 'Uploading file...',
  extracting: 'AI is analyzing your content...',
  generating: 'Creating test variants...',
  finalizing: 'Almost done...',
  complete: 'Tests created successfully!',
  error: 'Something went wrong',
};

const PROCESSING_STATUS_TO_STAGE: Record<ProcessingStatus, ProcessingStage> = {
  PENDING: 'extracting',
  PROCESSING: 'generating',
  COMPLETED: 'complete',
  FAILED: 'error',
};

export function useTestUpload(): UseTestUploadReturn {
  const { accessToken } = useAuth();
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [message, setMessage] = useState('');
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollProcessingStatus = useCallback(async (id: string): Promise<void> => {
    if (!accessToken) return;

    const pollInterval = 2000; // Poll every 2 seconds
    const maxAttempts = 150; // 5 minutes maximum (150 * 2s = 300s)
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;

          // Get sheet status
          const { sheet } = await vocabularySheetsApi.get(id, accessToken);
          const status = sheet.status;

          // Update stage based on status
          const newStage = PROCESSING_STATUS_TO_STAGE[status];
          setStage(newStage);
          setMessage(STAGE_MESSAGES[newStage]);

          // Update progress (upload was 0-20%, processing is 20-95%, complete is 100%)
          if (status === 'PENDING') {
            setProgress(40);
          } else if (status === 'PROCESSING') {
            // Gradually increase from 40% to 95% based on time
            const processingProgress = Math.min(95, 40 + Math.floor(attempts * 2));
            setProgress(processingProgress);
          } else if (status === 'COMPLETED') {
            setProgress(100);
            setStage('complete');
            setMessage(STAGE_MESSAGES.complete);
            resolve();
            return;
          } else if (status === 'FAILED') {
            setStage('error');
            setError(sheet.errorMessage || 'Processing failed');
            setMessage(sheet.errorMessage || 'Processing failed');
            reject(new Error(sheet.errorMessage || 'Processing failed'));
            return;
          }

          // Continue polling if not complete and haven't exceeded max attempts
          if (attempts < maxAttempts) {
            setTimeout(poll, pollInterval);
          } else {
            setStage('error');
            setError('Processing timeout - taking longer than expected');
            setMessage('Processing timeout - taking longer than expected');
            reject(new Error('Processing timeout'));
          }
        } catch (err) {
          // Network error or API error
          console.error('Polling error:', err);

          // Don't fail immediately on network errors, retry
          if (attempts < maxAttempts) {
            setTimeout(poll, pollInterval);
          } else {
            setStage('error');
            setError('Failed to check processing status');
            setMessage('Failed to check processing status');
            reject(err);
          }
        }
      };

      poll();
    });
  }, [accessToken]);

  const upload = useCallback(async (options: UploadOptions): Promise<string | null> => {
    if (!accessToken) {
      toast.error('Not authenticated', 'Please log in to upload files');
      return null;
    }

    try {
      // Reset state
      setProgress(0);
      setError(null);
      setSheetId(null);
      setStage('uploading');
      setMessage(STAGE_MESSAGES.uploading);

      // Upload file with progress tracking
      const { sheet } = await vocabularySheetsApi.upload(
        options.file,
        options.name,
        options.variants,
        options.gradeLevel,
        options.testType,
        accessToken,
        (uploadProgress) => {
          // Upload is 0-20% of total progress
          const scaledProgress = Math.floor(uploadProgress * 0.2);
          setProgress(scaledProgress);
        }
      );

      // Upload complete, now processing
      setSheetId(sheet.id);
      setProgress(20);
      setStage('extracting');
      setMessage(STAGE_MESSAGES.extracting);

      // Start polling for processing status
      await pollProcessingStatus(sheet.id);

      toast.success('Tests created!', `${options.variants} test variants are ready to assign`);
      return sheet.id;
    } catch (err) {
      console.error('Upload error:', err);

      setStage('error');
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setMessage(errorMessage);

      toast.error('Upload failed', errorMessage);
      return null;
    }
  }, [accessToken, pollProcessingStatus]);

  const reset = useCallback(() => {
    setProgress(0);
    setStage('idle');
    setMessage('');
    setSheetId(null);
    setError(null);
  }, []);

  return {
    upload,
    progress,
    stage,
    message,
    sheetId,
    error,
    reset,
  };
}
