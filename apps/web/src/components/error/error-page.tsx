'use client';

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ErrorPageProps {
  icon: LucideIcon;
  statusCode?: number;
  title: string;
  description: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    primary?: boolean;
  }>;
  preserveLayout?: boolean;
  className?: string;
}

export function ErrorPage({
  icon: Icon,
  statusCode,
  title,
  description,
  actions = [],
  preserveLayout = false,
  className,
}: ErrorPageProps) {
  const content = (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className={cn('max-w-md w-full', className)}>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 dark:bg-destructive/20 flex items-center justify-center">
            <Icon className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          {statusCode && (
            <p className="text-sm font-mono text-muted-foreground mb-2">
              Error {statusCode}
            </p>
          )}
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="mt-2">{description}</CardDescription>
        </CardHeader>
        {actions.length > 0 && (
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant || (action.primary ? 'default' : 'outline')}
                className="w-full sm:w-auto"
              >
                {action.label}
              </Button>
            ))}
          </CardFooter>
        )}
      </Card>
    </div>
  );

  if (preserveLayout) {
    return content;
  }

  // Full-page centered layout (for global errors)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {content}
    </div>
  );
}
