'use client';

import { useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useWizard } from './WizardContext';
import { TestType } from './types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, FileImage, FileText, HelpCircle, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ACCEPTED_FILE_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
  'application/pdf': ['.pdf'],
};

const TEST_TYPE_GUIDANCE: Record<TestType, {
  title: string;
  description: string;
  examples: string[];
  tips: string[];
}> = {
  VOCABULARY: {
    title: 'Upload Vocabulary Content',
    description: 'Upload an image or PDF containing vocabulary words with their definitions',
    examples: [
      'Vocabulary lists with terms and definitions',
      'Study guides with explanations',
      'Textbook glossaries',
      'Flash cards (photo of multiple cards)',
    ],
    tips: [
      'Include both words AND definitions for best results',
      'Use clear, well-lit photos',
      'Ensure text is readable and not blurry',
      'PDFs and high-resolution images work best',
    ],
  },
  SPELLING: {
    title: 'Upload Spelling Words',
    description: 'Upload an image or PDF containing a list of words for spelling practice',
    examples: [
      'Spelling word lists',
      'Vocabulary lists (words will be extracted)',
      'Word banks from worksheets',
      'Lists of terms without definitions',
    ],
    tips: [
      'Definitions are optional - we only need the words',
      'One word per line works best',
      'Clear handwriting or printed text preferred',
      'Use the "Use all words" option if you have a simple list',
    ],
  },
  GENERAL_KNOWLEDGE: {
    title: 'Upload Study Material',
    description: 'Upload content for comprehension and knowledge-based questions',
    examples: [
      'Study guides',
      'Textbook chapters',
      'Articles and passages',
      'Lecture notes',
    ],
    tips: [
      'Longer content produces better questions',
      'Include key concepts and facts',
      'Charts and diagrams can be included',
      'PDFs work great for multi-page content',
    ],
  },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function Step2FileUpload() {
  const { state, updateState } = useWizard();
  const { testType, file } = state;

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        toast.error('File too large', `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}`);
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        toast.error('Invalid file type', 'Please upload an image (PNG, JPG, WEBP) or PDF file');
      } else {
        toast.error('Upload failed', 'Please try a different file');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      updateState({ file: uploadedFile });
      toast.success('File selected', `${uploadedFile.name} is ready to upload`);
    }
  }, [updateState]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleRemoveFile = () => {
    updateState({ file: null });
  };

  const guidance = testType ? TEST_TYPE_GUIDANCE[testType] : null;

  if (!testType) {
    return (
      <div className="py-8 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please select a test type first</p>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{guidance?.title}</h3>
        <p className="text-sm text-muted-foreground">{guidance?.description}</p>
      </div>

      {!file ? (
        <Card
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed cursor-pointer transition-colors hover:bg-muted/50',
            isDragActive && 'border-primary bg-primary/5'
          )}
        >
          <input {...getInputProps()} />
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className={cn(
              'p-4 rounded-full',
              isDragActive ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Upload className={cn(
                'h-8 w-8',
                isDragActive ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileImage className="h-4 w-4" />
              <span>PNG, JPG, WEBP</span>
              <span>•</span>
              <FileText className="h-4 w-4" />
              <span>PDF</span>
              <span>•</span>
              <span>Max {formatFileSize(MAX_FILE_SIZE)}</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              {file.type.startsWith('image/') ? (
                <FileImage className="h-6 w-6 text-primary" />
              ) : (
                <FileText className="h-6 w-6 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>File ready to upload</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3 rounded-lg bg-muted/50 p-4">
        <p className="text-sm font-medium">What to upload:</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          {guidance?.examples.map((example, index) => (
            <li key={index}>{example}</li>
          ))}
        </ul>
      </div>

      <div className="flex justify-center pt-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-4 w-4" />
              What should I upload?
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Guidelines for {testType === 'VOCABULARY' ? 'Vocabulary' : testType === 'SPELLING' ? 'Spelling' : 'General Knowledge'} Tests</DialogTitle>
              <DialogDescription>
                Follow these tips for the best AI extraction results
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              <div>
                <h4 className="font-semibold mb-2">Good examples:</h4>
                <ul className="space-y-1 list-disc list-inside text-sm text-muted-foreground">
                  {guidance?.examples.map((example, index) => (
                    <li key={index}>{example}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Tips for best results:</h4>
                <ul className="space-y-1 list-disc list-inside text-sm text-muted-foreground">
                  {guidance?.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">Image Quality Tips:</h4>
                <ul className="space-y-1 list-disc list-inside text-sm text-amber-800 dark:text-amber-200">
                  <li>Use good lighting - avoid shadows and glare</li>
                  <li>Keep camera steady - avoid blurry photos</li>
                  <li>Fill the frame - get close to the content</li>
                  <li>Straighten the image - avoid tilted angles</li>
                  <li>Higher resolution is better (but under {formatFileSize(MAX_FILE_SIZE)})</li>
                </ul>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">File Size Limit:</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Maximum file size is {formatFileSize(MAX_FILE_SIZE)}. Files are automatically compressed before processing, so don&apos;t worry about exact size - just keep it under the limit.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
