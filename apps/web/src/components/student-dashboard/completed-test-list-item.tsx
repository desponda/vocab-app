import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TestAttempt } from '@/lib/api';
import { formatRelativeDate, getScoreBadgeVariant } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface CompletedTestListItemProps {
  attempt: TestAttempt;
  onClick: () => void;
}

export function CompletedTestListItem({ attempt, onClick }: CompletedTestListItemProps) {
  return (
    <Card
      className="hover:bg-muted/50 transition-colors duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View results for ${attempt.test?.name || 'test'}, scored ${attempt.score || 0}%`}
    >
      <div className="flex items-center gap-3 p-4 min-h-[56px] sm:min-h-[64px]">
        {/* Score Badge */}
        <Badge
          variant={getScoreBadgeVariant(attempt.score || 0)}
          className="flex-shrink-0 text-sm font-semibold min-w-[48px] justify-center"
        >
          {attempt.score ?? 0}%
        </Badge>

        {/* Test Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-base font-medium truncate">
            {attempt.test?.name || 'Vocabulary Test'}
          </h4>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5">
            <span className="truncate">{attempt.test?.sheet?.name || 'Practice Test'}</span>
            {attempt.completedAt && (
              <>
                <span>•</span>
                <span className="whitespace-nowrap">{formatRelativeDate(attempt.completedAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Chevron Icon */}
        <ChevronRight
          className="h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </div>
    </Card>
  );
}
