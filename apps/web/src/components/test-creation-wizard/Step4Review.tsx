'use client';

import { useWizard } from './WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Pencil, Brain, FileImage, FileText, Edit2, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function estimateProcessingTime(variants: number, generatePreview: boolean): string {
  // Base time: ~30 seconds per variant
  const baseTime = variants * 30;

  // Add preview time if enabled
  const previewTime = generatePreview ? 60 : 0;

  // Total in seconds
  const totalSeconds = baseTime + previewTime;

  // Convert to minutes
  const minutes = Math.ceil(totalSeconds / 60);

  if (minutes < 2) {
    return 'Less than 2 minutes';
  } else if (minutes === 2) {
    return 'About 2 minutes';
  } else {
    return `About ${minutes} minutes`;
  }
}

export function Step4Review() {
  const { state, goToStep } = useWizard();
  const { testType, file, config } = state;

  const testTypeInfo = {
    VOCABULARY: { icon: BookOpen, label: 'Vocabulary Test', color: 'bg-blue-500' },
    SPELLING: { icon: Pencil, label: 'Spelling Test', color: 'bg-green-500' },
    GENERAL_KNOWLEDGE: { icon: Brain, label: 'General Knowledge', color: 'bg-purple-500' },
  }[testType || 'VOCABULARY'];

  const TestTypeIcon = testTypeInfo.icon;
  const estimatedTime = estimateProcessingTime(config.variants, config.generatePreview);

  return (
    <div className="py-8 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Review & Confirm</h3>
        <p className="text-sm text-muted-foreground">
          Please review your selections before creating the test
        </p>
      </div>

      <div className="space-y-4">
        {/* Test Type */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Test Type</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => goToStep(1)} className="gap-2">
                <Edit2 className="h-3 w-3" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', testTypeInfo.color)}>
                <TestTypeIcon className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium">{testTypeInfo.label}</span>
            </div>
          </CardContent>
        </Card>

        {/* File */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upload File</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => goToStep(2)} className="gap-2">
                <Edit2 className="h-3 w-3" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {file && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  {file.type.startsWith('image/') ? (
                    <FileImage className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Configuration</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => goToStep(3)} className="gap-2">
                <Edit2 className="h-3 w-3" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Test Name</p>
                <p className="font-medium">{config.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grade Level</p>
                <p className="font-medium">
                  {config.gradeLevel ? `Grade ${config.gradeLevel}` : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Variants</p>
                <p className="font-medium">{config.variants} versions</p>
              </div>
            </div>

            {(config.useAllWords || config.generatePreview) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Advanced Options:</p>
                  <div className="flex flex-wrap gap-2">
                    {config.useAllWords && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Use all words
                      </Badge>
                    )}
                    {config.generatePreview && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Generate preview
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Processing Time Estimate */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Estimated Processing Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{estimatedTime}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Processing happens in the background - you can continue working
            </p>
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Your file will be uploaded and processed by AI</li>
              <li>
                {testType === 'VOCABULARY'
                  ? 'Vocabulary words and definitions will be extracted'
                  : testType === 'SPELLING'
                  ? 'Spelling words will be extracted from your content'
                  : 'Key concepts and facts will be extracted'}
              </li>
              <li>{config.variants} unique test variants will be generated</li>
              {config.generatePreview && <li>A preview will be generated for your review</li>}
              <li>Tests will be ready to assign to your classrooms</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-center text-muted-foreground">
          Ready to create your test? Click <strong>&quot;Create Test&quot;</strong> below to begin processing.
        </p>
      </div>
    </div>
  );
}
