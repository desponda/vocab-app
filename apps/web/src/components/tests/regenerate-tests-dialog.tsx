'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { vocabularySheetsApi, ApiError } from '@/lib/api';

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
  const [blockingDetails, setBlockingDetails] = useState<{
    studentAttempts: number;
    classroomAssignments: number;
    affectedTests: number;
  } | null>(null);

  const handleRegenerate = async () => {
    setError('');
    setBlockingDetails(null);
    setIsRegenerating(true);

    try {
      await vocabularySheetsApi.regenerateTests(sheetId, accessToken);

      onRegenerationStarted();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to regenerate tests:', err);

      // Check if this is a 409 conflict error with student data
      if (err instanceof ApiError && err.statusCode === 409 && err.details) {
        const details = err.details as {
          studentAttempts?: number;
          classroomAssignments?: number;
          affectedTests?: number;
        };
        setBlockingDetails({
          studentAttempts: details.studentAttempts || 0,
          classroomAssignments: details.classroomAssignments || 0,
          affectedTests: details.affectedTests || 0,
        });
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start regeneration. Please try again.');
      }
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
          {blockingDetails ? (
            // Show error state when students have taken tests
            <div className="flex items-start gap-3 p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Cannot regenerate: Student data would be lost
                  </p>
                  <p className="text-xs text-red-800 dark:text-red-200 mt-1">
                    {error}
                  </p>
                </div>

                <div className="space-y-1 text-xs text-red-900 dark:text-red-100">
                  <p className="font-medium">This would delete:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-1">
                    <li>{blockingDetails.studentAttempts} student test attempt{blockingDetails.studentAttempts === 1 ? '' : 's'} (scores & progress)</li>
                    <li>{blockingDetails.classroomAssignments} classroom assignment{blockingDetails.classroomAssignments === 1 ? '' : 's'}</li>
                    <li>{blockingDetails.affectedTests} test variant{blockingDetails.affectedTests === 1 ? '' : 's'}</li>
                  </ul>
                </div>

                <div className="text-xs text-red-800 dark:text-red-200 pt-2 border-t border-red-200 dark:border-red-800">
                  <p className="font-medium mb-1">To proceed safely:</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-1">
                    <li>Download student results for your records</li>
                    <li>Remove all test assignments from classrooms</li>
                    <li>Wait for students to finish in-progress attempts</li>
                    <li>Try regenerating again</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            // Show normal warning when no blocking issues
            <div className="flex items-start gap-3 p-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  This will delete all existing tests and create new ones
                </p>
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  Only proceed if no students have taken these tests yet.
                </p>
              </div>
            </div>
          )}

          {!blockingDetails && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{wordCount}</span> word{wordCount === 1 ? '' : 's'} will be used to generate{' '}
                <span className="font-medium">{testsToGenerate}</span> test variant{testsToGenerate === 1 ? '' : 's'}.
              </p>
              <p className="text-muted-foreground">
                The regeneration process runs in the background and may take a few minutes to complete.
              </p>
            </div>
          )}

          {error && !blockingDetails && (
            <div className="text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setBlockingDetails(null);
              setError('');
              onOpenChange(false);
            }}
            disabled={isRegenerating}
          >
            {blockingDetails ? 'Close' : 'Cancel'}
          </Button>
          {!blockingDetails && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Regenerate Tests
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
