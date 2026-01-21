import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProgressDots } from './progress-dots';
import { getScoreBadgeVariant } from '@/lib/utils';
import { TestAssignment, TestAttempt } from '@/lib/api';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';

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
}

interface TestListItemProps {
  group: VocabularyGroup;
}

export function TestListItem({ group }: TestListItemProps) {
  const nextTest = group.assignments.find((assignment) =>
    !group.attempts.some((attempt) => attempt.testId === assignment.testId)
  );

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold truncate">
              {group.sheetName}
            </h3>
          </div>
          <Badge variant="outline" className="flex-shrink-0 text-xs">
            {group.total}
          </Badge>
        </div>

        {/* Progress and Stats Row */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2">
            <ProgressDots completed={group.completed} total={group.total} />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {group.completed}/{group.total} completed
            </span>
          </div>
          {group.bestScore !== null && (
            <div className="text-xs sm:text-sm text-muted-foreground">
              Best: <Badge variant={getScoreBadgeVariant(group.bestScore)} className="text-xs ml-1">
                {group.bestScore}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Variant List - All variants shown inline */}
        {group.assignments.map((assignment) => {
          const attempt = group.attempts.find((a) => a.testId === assignment.testId);
          const isNextTest = nextTest?.testId === assignment.testId;

          return (
            <div
              key={assignment.id}
              className="flex items-center justify-between gap-3 py-2 px-3 rounded-md border bg-card hover:bg-muted/30 transition-colors min-h-[40px]"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium">{assignment.test?.variant}</span>
                {attempt && (
                  <Badge variant={getScoreBadgeVariant(attempt.score || 0)} className="text-xs">
                    {attempt.score}%
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {attempt ? (
                  <>
                    <Link href={`/student-dashboard/results/${attempt.id}`}>
                      <Button size="sm" variant="ghost" className="h-8 text-xs">
                        View
                      </Button>
                    </Link>
                    <Link href={`/student-dashboard/tests/${assignment.testId}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs">
                        Retake
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link href={`/student-dashboard/tests/${assignment.testId}`} className="flex-1">
                    <Button
                      size="sm"
                      variant={isNextTest ? "default" : "outline"}
                      className={`h-8 text-xs w-full ${isNextTest ? 'gap-1' : ''}`}
                    >
                      {isNextTest && <ClipboardCheck className="h-3 w-3" />}
                      {isNextTest ? 'Start Test →' : 'Start'}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {/* Show completion message if all variants done */}
        {!nextTest && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            All variants completed
          </div>
        )}
      </CardContent>
    </Card>
  );
}
