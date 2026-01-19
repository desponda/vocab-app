'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeDate, getScoreBadgeVariant } from '@/lib/utils';
import { UserPlus, ClipboardCheck, FileCheck, Clock } from 'lucide-react';

interface Activity {
  type: 'enrollment' | 'test_completion' | 'test_assignment';
  studentName?: string;
  testName?: string;
  score?: number;
  timestamp: string | Date;
}

interface ActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
}

export function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'enrollment':
        return UserPlus;
      case 'test_completion':
        return ClipboardCheck;
      case 'test_assignment':
        return FileCheck;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'enrollment':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
      case 'test_completion':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
      case 'test_assignment':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'enrollment':
        return (
          <p className="text-sm">
            <span className="font-medium">{activity.studentName}</span> enrolled in the classroom
          </p>
        );
      case 'test_completion':
        return (
          <div className="flex items-center gap-2">
            <p className="text-sm flex-1">
              <span className="font-medium">{activity.studentName}</span> completed{' '}
              <span className="font-medium">{activity.testName}</span>
            </p>
            {activity.score !== undefined && (
              <Badge variant={getScoreBadgeVariant(activity.score)}>
                {activity.score}%
              </Badge>
            )}
          </div>
        );
      case 'test_assignment':
        return (
          <p className="text-sm">
            <span className="font-medium">{activity.testName}</span> assigned to classroom
          </p>
        );
      default:
        return null;
    }
  };

  if (displayedActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="mx-auto h-12 w-12 mb-2 text-muted-foreground/50" />
            <p>No activity yet</p>
            <p className="text-sm mt-1">Activity will appear here when students enroll or complete tests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedActivities.map((activity, index) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.type);

            return (
              <div key={index} className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  {getActivityText(activity)}
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeDate(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
