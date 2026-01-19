'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Users, Eye, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ClassroomListItemProps {
  id: string;
  name: string;
  gradeLevel: number;
  code: string;
  studentCount: number;
}

export function ClassroomListItem({ id, name, gradeLevel, code, studentCount }: ClassroomListItemProps) {
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClick = () => {
    router.push(`/classrooms/${id}`);
  };

  return (
    <Card
      className="hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">{name}</h3>
                <Badge variant="secondary">Grade {gradeLevel}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {studentCount} {studentCount === 1 ? 'student' : 'students'}
                </span>
                <span className="flex items-center gap-1">
                  Code: <span className="font-mono font-semibold">{code}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopyCode}
                  >
                    {copiedCode ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
