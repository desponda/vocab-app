'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUpload: (file: File, onProgress: (p: number) => void) => Promise<void>;
  disabled?: boolean;
}

export function FileUpload({ onUpload, disabled = false }: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async (file: File) => {
    setSelectedFile(file);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      await onUpload(file, setUploadProgress);
      setUploadProgress(100);
      setUploadStatus('success');

      setTimeout(() => {
        setSelectedFile(null);
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Upload failed'
      );
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0 && !disabled) {
        handleUpload(acceptedFiles[0]);
      }
    },
    [disabled, onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: disabled || uploadStatus === 'uploading',
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          uploadStatus === 'uploading' && 'cursor-not-allowed opacity-50',
          'hover:border-primary hover:bg-primary/5'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-lg">Drop the file here...</p>
        ) : (
          <div>
            <p className="text-lg font-medium mb-2">
              Drag & drop a file, or click to select
            </p>
            <p className="text-sm text-muted-foreground">
              PDF or Image files only • Max 10 MB
            </p>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {uploadStatus === 'success' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {uploadStatus === 'error' && (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
          </div>

          {uploadStatus === 'uploading' && (
            <div className="mt-3">
              <Progress value={uploadProgress} />
              <p className="text-xs text-muted-foreground mt-1">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {uploadStatus === 'error' && errorMessage && (
            <p className="text-sm text-destructive mt-2">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
