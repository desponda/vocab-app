'use client';

import { useEffect, useState } from 'react';
import { useWizard } from './WizardContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, AlertCircle, Eye, Send, Plus, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Step5Processing() {
  const { state, resetWizard } = useWizard();
  const { processing } = state;
  const [autoCloseSeconds, setAutoCloseSeconds] = useState<number | null>(null);

  // Start auto-close countdown when complete
  useEffect(() => {
    if (processing.stage === 'complete') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoCloseSeconds(10);

      const interval = setInterval(() => {
        setAutoCloseSeconds((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setAutoCloseSeconds(null);
    }
  }, [processing.stage]);

  const getStageDisplay = () => {
    switch (processing.stage) {
      case 'uploading':
        return {
          title: 'Uploading File',
          description: 'Uploading your file to the server...',
          icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
        };
      case 'extracting':
        return {
          title: 'Extracting Content',
          description: 'AI is analyzing your content and extracting key information...',
          icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
        };
      case 'generating':
        return {
          title: 'Generating Tests',
          description: `Creating ${state.config.variants} unique test variants...`,
          icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
        };
      case 'finalizing':
        return {
          title: 'Finalizing',
          description: 'Almost done! Saving your tests...',
          icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
        };
      case 'complete':
        return {
          title: 'Tests Created Successfully!',
          description: 'Your tests are ready to assign to students',
          icon: <CheckCircle2 className="h-8 w-8 text-green-500" />,
        };
      case 'error':
        return {
          title: 'Processing Failed',
          description: processing.error || 'An error occurred during processing',
          icon: <AlertCircle className="h-8 w-8 text-destructive" />,
        };
      default:
        return {
          title: 'Processing',
          description: 'Please wait...',
          icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
        };
    }
  };

  const stageDisplay = getStageDisplay();
  const isProcessing = ['uploading', 'extracting', 'generating', 'finalizing'].includes(processing.stage);
  const isComplete = processing.stage === 'complete';
  const isError = processing.stage === 'error';

  return (
    <div className="py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="space-y-1 sm:space-y-2">
        <h3 className="text-lg sm:text-xl font-semibold">{stageDisplay.title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">{stageDisplay.description}</p>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-6">
            {/* Icon */}
            <div
              className={cn(
                'p-4 rounded-full',
                isComplete && 'bg-green-500/10',
                isError && 'bg-destructive/10',
                isProcessing && 'bg-primary/10'
              )}
            >
              {stageDisplay.icon}
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <Progress value={processing.progress} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{processing.message || stageDisplay.description}</span>
                <span>{processing.progress}%</span>
              </div>
            </div>

            {/* Estimated Time (only show during processing) */}
            {isProcessing && processing.estimatedTime && (
              <p className="text-sm text-muted-foreground">
                Estimated time remaining: {processing.estimatedTime}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Success Actions */}
      {isComplete && processing.sheetId && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">What would you like to do next?</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Quick actions for your new tests</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
            <Button className="gap-2 w-full min-h-[44px]" variant="default">
              <Send className="h-4 w-4" />
              Assign to Classroom
            </Button>
            <Button className="gap-2 w-full min-h-[44px]" variant="outline">
              <Eye className="h-4 w-4" />
              Preview Tests
            </Button>
            <Button className="gap-2 w-full min-h-[44px]" variant="outline" onClick={resetWizard}>
              <Plus className="h-4 w-4" />
              Create Another Test
            </Button>
            <Button className="gap-2 w-full min-h-[44px]" variant="outline">
              <Home className="h-4 w-4" />
              Back to Test Library
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Actions */}
      {isError && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-destructive">What went wrong?</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{processing.error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs sm:text-sm text-muted-foreground">
              <p className="font-medium mb-2">Possible solutions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Ensure image is clear with readable text</li>
                <li>Try a different file format or reduce file size</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="w-full sm:w-auto min-h-[44px]" variant="default" onClick={() => window.location.reload()}>
                Try Again
              </Button>
              <Button className="w-full sm:w-auto min-h-[44px]" variant="outline" onClick={resetWizard}>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-close countdown */}
      {isComplete && autoCloseSeconds !== null && autoCloseSeconds > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            This wizard will close automatically in <strong>{autoCloseSeconds}</strong> seconds
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoCloseSeconds(null)}
            className="mt-2"
          >
            Cancel auto-close
          </Button>
        </div>
      )}

      {/* Processing info */}
    </div>
  );
}
