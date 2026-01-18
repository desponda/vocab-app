'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { vocabularySheetsApi, VocabularySheet, ProcessingStatus } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, Download, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<ProcessingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
  PROCESSING: { label: 'Processing', variant: 'default', icon: Loader2 },
  COMPLETED: { label: 'Completed', variant: 'outline', icon: CheckCircle },
  FAILED: { label: 'Failed', variant: 'destructive', icon: AlertCircle },
};

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function VocabularyPage() {
  const { accessToken } = useAuth();
  const [sheets, setSheets] = useState<VocabularySheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [testsToGenerate] = useState(3); // Default: 3 test variants
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vocabularyName, setVocabularyName] = useState('');

  useEffect(() => {
    if (!accessToken) return;

    const fetchSheets = async () => {
      try {
        const data = await vocabularySheetsApi.list(accessToken);
        setSheets(data.sheets);
      } catch (error) {
        console.error('Failed to fetch vocabulary sheets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSheets();
  }, [accessToken]);

  const generateSmartName = (filename: string): string => {
    return filename
      .replace(/\.[^.]+$/, '') // Remove extension
      .replace(/[_-]/g, ' ')    // Replace underscores/dashes with spaces
      .replace(/\b\w/g, (c) => c.toUpperCase()); // Title case
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB`);
        return;
      }

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert('Invalid file type. Please upload a PDF or image file (JPEG, PNG, GIF, WebP)');
        return;
      }

      setSelectedFile(file);
      setVocabularyName(generateSmartName(file.name));
    },
    []
  );

  const handleUpload = async () => {
    if (!accessToken || !selectedFile || !vocabularyName.trim()) return;

    setUploadingFileName(selectedFile.name);
    setUploadProgress(0);

    try {
      const { sheet } = await vocabularySheetsApi.upload(
        selectedFile,
        vocabularyName.trim(),
        testsToGenerate,
        accessToken,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Add new sheet to the list
      setSheets((prev) => [sheet, ...prev]);
      setUploadProgress(null);
      setUploadingFileName(null);
      setSelectedFile(null);
      setVocabularyName('');
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(null);
      setUploadingFileName(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    disabled: uploadProgress !== null,
  });

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    if (!confirm('Are you sure you want to delete this vocabulary sheet?')) return;

    try {
      await vocabularySheetsApi.delete(id, accessToken);
      setSheets((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete sheet:', error);
      alert('Failed to delete vocabulary sheet');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading vocabulary sheets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Vocabulary Sheets</h2>
        <p className="text-muted-foreground">
          Upload vocabulary sheets to generate spelling and vocabulary tests
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Vocabulary Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${uploadProgress !== null ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-lg font-medium">Drop the file here</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Drag and drop a file here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Accepts PDF, JPEG, PNG, GIF, WebP (max 10 MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm p-4 bg-muted rounded-lg">
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
                  disabled={uploadProgress !== null}
                />
                <p className="text-sm text-muted-foreground">
                  This name will help you identify the vocabulary set and its tests later.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!vocabularyName.trim() || uploadProgress !== null}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Generate Tests
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setVocabularyName('');
                  }}
                  disabled={uploadProgress !== null}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {uploadProgress !== null && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading {uploadingFileName}</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheets List */}
      {sheets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No vocabulary sheets yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload your first vocabulary sheet to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Vocabulary Sheets</h3>
          <div className="grid gap-4">
            {sheets.map((sheet) => {
              const statusConfig = STATUS_CONFIG[sheet.status];
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={sheet.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <h4 className="font-medium">{sheet.name || sheet.originalName}</h4>
                          <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                            <StatusIcon className={`h-3 w-3 ${sheet.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span>{formatFileSize(sheet.fileSize)}</span>
                          <span>{format(new Date(sheet.uploadedAt), 'MMM d, yyyy')}</span>
                          <span>{sheet.fileType}</span>
                          {sheet._count && (
                            <>
                              {sheet._count.words > 0 && (
                                <span>{sheet._count.words} words</span>
                              )}
                              {sheet._count.tests > 0 && (
                                <span>{sheet._count.tests} tests</span>
                              )}
                            </>
                          )}
                        </div>

                        {sheet.errorMessage && (
                          <p className="text-sm text-destructive">{sheet.errorMessage}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={vocabularySheetsApi.download(sheet.id, accessToken!)}
                            download
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(sheet.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
