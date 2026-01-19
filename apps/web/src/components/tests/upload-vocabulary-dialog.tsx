'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, Plus } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { vocabularySheetsApi, VocabularySheet } from '@/lib/api';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface UploadVocabularyDialogProps {
  accessToken: string | null;
  onSheetUploaded: (sheet: VocabularySheet) => void;
}

export function UploadVocabularyDialog({ accessToken, onSheetUploaded }: UploadVocabularyDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vocabularyName, setVocabularyName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<string | undefined>(undefined);
  const [testType, setTestType] = useState<'VOCABULARY' | 'SPELLING'>('VOCABULARY');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const testsToGenerate = 3; // Default: 3 test variants

  const generateSmartName = (filename: string): string => {
    return filename
      .replace(/\.[^.]+$/, '') // Remove extension
      .replace(/[_-]/g, ' ')    // Replace underscores/dashes with spaces
      .replace(/\b\w/g, (c) => c.toUpperCase()); // Title case
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const handleUpload = async () => {
    if (!accessToken || !selectedFile || !vocabularyName.trim()) return;

    setUploadProgress(0);

    try {
      const { sheet } = await vocabularySheetsApi.upload(
        selectedFile,
        vocabularyName.trim(),
        testsToGenerate,
        gradeLevel && gradeLevel !== 'unspecified' ? parseInt(gradeLevel, 10) : undefined,
        testType,
        accessToken,
        false, // useAllWords - not used in old dialog
        (progress: number) => {
          setUploadProgress(progress);
        }
      );

      onSheetUploaded(sheet);

      // Close dialog and reset
      setOpen(false);
      setTimeout(() => {
        setSelectedFile(null);
        setVocabularyName('');
        setGradeLevel(undefined);
        setTestType('VOCABULARY');
        setUploadProgress(null);
      }, 200);
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(null);
    }
  };

  const handleClose = () => {
    if (uploadProgress === null) {
      setOpen(false);
      setTimeout(() => {
        setSelectedFile(null);
        setVocabularyName('');
        setGradeLevel(undefined);
        setTestType('VOCABULARY');
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Upload Vocabulary
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Vocabulary Sheet</DialogTitle>
          <DialogDescription>
            Upload a PDF or image file containing vocabulary words to generate spelling tests
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-muted-foreground/25'}
                ${uploadProgress !== null ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}
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
            <>
              <div className="flex items-center gap-2 text-sm p-4 bg-muted rounded-lg">
                <FileText className="h-4 w-4" />
                <span className="font-medium flex-1">{selectedFile.name}</span>
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
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  This name will help you identify the vocabulary set and its tests later.
                </p>
              </div>

              {/* Grade Level Selection */}
              <div className="space-y-2">
                <Label htmlFor="grade-level">
                  Grade Level <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Select
                  value={gradeLevel}
                  onValueChange={setGradeLevel}
                  disabled={uploadProgress !== null}
                >
                  <SelectTrigger id="grade-level" aria-label="Select target grade level for test difficulty">
                    <SelectValue placeholder="Not specified - general difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">Not Specified</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                      <SelectItem key={grade} value={grade.toString()}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  All words from your upload will be used. Grade level only affects how test questions are phrased and sentence complexity.
                </p>
              </div>

              {/* Test Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="test-type">
                  Test Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={testType}
                  onValueChange={(value) => setTestType(value as 'VOCABULARY' | 'SPELLING')}
                  disabled={uploadProgress !== null}
                >
                  <SelectTrigger id="test-type" aria-label="Select test type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VOCABULARY">
                      Vocabulary - Definition & Fill-in-Blank
                    </SelectItem>
                    <SelectItem value="SPELLING">
                      Spelling - Multiple Choice
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {testType === 'VOCABULARY'
                    ? 'Tests will ask for definitions and sentence completion.'
                    : 'Tests will ask students to identify correct spellings from multiple choices.'}
                </p>
              </div>

              {uploadProgress !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading {selectedFile.name}</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={uploadProgress !== null}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!vocabularyName.trim() || uploadProgress !== null}
                >
                  {uploadProgress !== null ? 'Uploading...' : 'Upload & Generate Tests'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
