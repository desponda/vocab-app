'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface StudySummaryDialogProps {
  open: boolean;
  stats: {
    total: number;
    mastered: number;
    notYet: number;
    notSeen: number;
  };
  sheetId?: string; // Optional, reserved for future use (e.g., linking to specific test)
  onStudyAgain: () => void;
  onDone: () => void;
}

function getEncouragementMessage(masteryPercent: number): string {
  if (masteryPercent >= 80) {
    return "Excellent work! You're ready for the test!";
  }
  if (masteryPercent >= 60) {
    return 'Great progress! Keep it up!';
  }
  if (masteryPercent >= 40) {
    return 'Good start! Review again for better retention.';
  }
  return 'Keep practicing! Study these words again.';
}

export function StudySummaryDialog({
  open,
  stats,
  sheetId,
  onStudyAgain,
  onDone,
}: StudySummaryDialogProps) {
  const router = useRouter();
  const masteryPercent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
  const encouragement = getEncouragementMessage(masteryPercent);

  // Reserved for future use (e.g., linking to specific test variant for this sheet)
  void sheetId;

  const handleTakeTest = () => {
    // Navigate to student dashboard where they can select a test variant
    router.push('/student-dashboard');
  };

  return (
    <Dialog open={open} onOpenChange={onDone}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <span className="text-4xl">✓</span>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Great Progress!</DialogTitle>
          <DialogDescription className="text-center text-base">
            {encouragement}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                You&apos;ve mastered {stats.mastered}/{stats.total} words
              </span>
              <span className="text-muted-foreground">{masteryPercent}%</span>
            </div>
            <Progress value={masteryPercent} className="h-2" />
          </div>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {stats.mastered}
              </div>
              <div className="text-xs text-muted-foreground">Mastered</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {stats.notYet}
              </div>
              <div className="text-xs text-muted-foreground">Review</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {stats.notSeen}
              </div>
              <div className="text-xs text-muted-foreground">Not Seen</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {masteryPercent >= 50 && (
              <Button
                size="lg"
                onClick={handleTakeTest}
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
              >
                📝 Take Practice Test
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={onStudyAgain}
              className="w-full h-12 text-base"
            >
              🔄 Study Again
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={onDone}
              className="w-full h-12 text-base"
            >
              ✓ Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
