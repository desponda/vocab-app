import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: 'green' | 'purple' | 'blue' | 'orange' | 'default';
  onClick?: () => void;
  className?: string;
}

const colorVariants = {
  green: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30',
  purple: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/30',
  blue: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30',
  orange: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30',
  default: 'text-primary bg-primary/10 dark:bg-primary/20',
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'default',
  onClick,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'transition-all',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={onClick ? `${title}: ${value}. Click to view details.` : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-bold">{value}</h3>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                  )}
                  aria-label={`${trend.direction === 'up' ? 'Increased' : 'Decreased'} by ${Math.abs(trend.value)} percent`}
                >
                  {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
          </div>
          <div
            className={cn(
              'h-12 w-12 rounded-lg flex items-center justify-center',
              colorVariants[color]
            )}
            aria-hidden="true"
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
