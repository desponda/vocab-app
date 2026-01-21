import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getScoreBadgeVariant } from '@/lib/utils';
import { TestAssignment, TestAttempt } from '@/lib/api';
import { ClipboardCheck, ChevronRight } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';

interface VocabularyGroup {
  sheetId: string;
  sheetName: string;
  originalName: string;
  assignments: TestAssignment[];
  completed: number;
  total: number;
  bestScore: number | null;
  avgScore: number | null;
  attempts: TestAttempt[];
  mostRecentAssignedAt: string;
}

interface CompactTestListProps {
  group: VocabularyGroup;
}

export function CompactTestList({ group }: CompactTestListProps) {
  const nextTest = group.assignments.find((assignment) =>
    !group.attempts.some((attempt) => attempt.testId === assignment.testId)
  );

  const progressPercent = group.total > 0 ? (group.completed / group.total) * 100 : 0;
  const isComplete = group.completed === group.total;

  return (
    <div className="border rounded-lg hover:bg-muted/30 transition-colors">
      {/* Header - Compact with key info */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Name, Progress, Date */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-semibold truncate">
                {group.sheetName}
              </h3>
              {!isComplete && (
                <Badge variant="secondary" className="flex-shrink-0 text-xs">
                  {group.total} tests
                </Badge>
              )}
            </div>

            {/* Progress bar (compact) */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className={`rounded-full h-1.5 transition-all ${
                      isComplete ? 'bg-green-500' : 'bg-primary'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {group.completed}/{group.total}
              </span>
            </div>

            {/* Assignment date */}
            <div className="text-xs text-muted-foreground">
              Assigned {formatRelativeDate(group.mostRecentAssignedAt)}
            </div>
          </div>

          {/* Right: Stats & Action */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {group.bestScore !== null && (
              <Badge variant={getScoreBadgeVariant(group.bestScore)} className="text-xs">
                Best: {group.bestScore}%
              </Badge>
            )}

            {nextTest ? (
              <Link href={`/student-dashboard/tests/${nextTest.testId}`}>
                <Button size="sm" className="h-8 text-xs gap-1">
                  <ClipboardCheck className="h-3 w-3" />
                  Start Test
                </Button>
              </Link>
            ) : (
              <Button size="sm" variant="outline" disabled className="h-8 text-xs gap-1">
                <ChevronRight className="h-3 w-3" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Variants List (collapsed by default) */}
      <details className="group">
        <summary className="cursor-pointer px-3 sm:px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t flex items-center justify-between">
          <span>View all {group.total} test variants</span>
          <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
        </summary>

        <div className="px-3 sm:px-4 pb-3 space-y-1.5 border-t bg-muted/20">
          {group.assignments.map((assignment) => {
            const attempt = group.attempts.find((a) => a.testId === assignment.testId);
            const isNextTest = nextTest?.testId === assignment.testId;

            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-md hover:bg-background transition-colors text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium">{assignment.test?.variant}</span>
                  {attempt && (
                    <Badge variant={getScoreBadgeVariant(attempt.score || 0)} className="text-xs">
                      {attempt.score}%
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {attempt ? (
                    <>
                      <Link href={`/student-dashboard/results/${attempt.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                          View
                        </Button>
                      </Link>
                      <Link href={`/student-dashboard/tests/${assignment.testId}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                          Retake
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link href={`/student-dashboard/tests/${assignment.testId}`}>
                      <Button
                        size="sm"
                        variant={isNextTest ? 'default' : 'outline'}
                        className="h-7 text-xs px-2"
                      >
                        {isNextTest ? 'Start →' : 'Start'}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
