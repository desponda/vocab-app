'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Trash2, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { ProcessingStatus } from '@/lib/api';

const STATUS_CONFIG: Record<ProcessingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType; color: string }> = {
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock, color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20' },
  PROCESSING: { label: 'Processing', variant: 'default', icon: Loader2, color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20' },
  COMPLETED: { label: 'Completed', variant: 'outline', icon: CheckCircle, color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' },
  FAILED: { label: 'Failed', variant: 'destructive', icon: AlertCircle, color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20' },
};

interface VocabularySheetListItemProps {
  id: string;
  name: string;
  originalName?: string;
  status: ProcessingStatus;
  uploadedAt: string | Date;
  fileSize: number;
  fileType: string;
  wordCount?: number;
  testCount?: number;
  errorMessage?: string;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}

export function VocabularySheetListItem({
  id,
  name,
  originalName,
  status,
  uploadedAt,
  fileSize,
  fileType,
  wordCount,
  testCount,
  errorMessage,
  onDelete,
  onDownload,
}: VocabularySheetListItemProps) {
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${statusConfig.color}`}>
              <FileText className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg truncate">{name || originalName}</h3>
                <Badge variant={statusConfig.variant} className="flex items-center gap-1 flex-shrink-0">
                  <StatusIcon className={`h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                  {statusConfig.label}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span>{formatFileSize(fileSize)}</span>
                <span>•</span>
                <span>{formatRelativeDate(uploadedAt)}</span>
                <span>•</span>
                <span className="uppercase">{fileType.replace('application/', '').replace('image/', '')}</span>
                {wordCount && wordCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{wordCount} words</span>
                  </>
                )}
                {testCount && testCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{testCount} test{testCount === 1 ? '' : 's'}</span>
                  </>
                )}
              </div>

              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(id)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(id)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
