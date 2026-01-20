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
    <div className="py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="space-y-1 sm:space-y-2">
        <h3 className="text-lg sm:text-xl font-semibold">Review & Confirm</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Please review your selections before creating the test
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Test Name</p>
                <p className="font-medium text-sm sm:text-base">{config.name || 'Not set'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Grade Level</p>
                <p className="font-medium text-sm sm:text-base">
                  {config.gradeLevel ? `Grade ${config.gradeLevel}` : 'Not specified'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Variants</p>
                <p className="font-medium text-sm sm:text-base">{config.variants} versions</p>
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

        {/* Processing Time Estimate - Compact */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Processing time</span>
          </div>
          <Badge variant="secondary" className="text-sm">
            {estimatedTime}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground text-center -mt-2">
          Background processing - you can continue working
        </p>
      </div>
    </div>
  );
}
