'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { vocabularySheetsApi } from '@/lib/api';

interface RegenerateTestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
  sheetName: string;
  wordCount: number;
  testsToGenerate: number;
  accessToken: string;
  onRegenerationStarted: () => void;
}

export function RegenerateTestsDialog({
  open,
  onOpenChange,
  sheetId,
  sheetName,
  wordCount,
  testsToGenerate,
  accessToken,
  onRegenerationStarted,
}: RegenerateTestsDialogProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState('');

  const handleRegenerate = async () => {
    setError('');
    setIsRegenerating(true);

    try {
      await vocabularySheetsApi.regenerateTests(sheetId, accessToken);

      onRegenerationStarted();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to regenerate tests:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start regeneration. Please try again.';
      setError(errorMessage);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Regenerate Tests for {sheetName}?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                This will delete all existing tests and create new ones
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Any test results from students will be lost. Test assignments will remain but will reference the new tests.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{wordCount}</span> vocabulary words will be used to generate{' '}
              <span className="font-medium">{testsToGenerate}</span> test variant{testsToGenerate === 1 ? '' : 's'}.
            </p>
            <p className="text-muted-foreground">
              The regeneration process runs in the background and may take a few minutes to complete.
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Regenerate Tests
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
