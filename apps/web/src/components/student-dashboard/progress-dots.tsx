interface ProgressDotsProps {
  completed: number;
  total: number;
  maxDots?: number;
}

export function ProgressDots({ completed, total, maxDots = 5 }: ProgressDotsProps) {
  const ariaLabel = `${completed} of ${total} tests completed`;

  // For more than maxDots tests, show text instead of dots
  if (total > maxDots) {
    return (
      <span
        className="text-sm font-medium text-muted-foreground"
        aria-label={ariaLabel}
      >
        {completed}/{total}
      </span>
    );
  }

  // Show visual dots for <= maxDots tests
  return (
    <div className="flex items-center gap-1" aria-label={ariaLabel} role="status">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`h-2 w-2 rounded-full ${
            index < completed
              ? 'bg-green-500 dark:bg-green-600'
              : 'bg-muted dark:bg-muted/60'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
