'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { vocabularySheetsApi, VocabularySheetDetail } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, CheckCircle, AlertCircle, Clock, Loader2, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

const STATUS_CONFIG: Record<ProcessingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
  PROCESSING: { label: 'Processing', variant: 'default', icon: Loader2 },
  COMPLETED: { label: 'Completed', variant: 'outline', icon: CheckCircle },
  FAILED: { label: 'Failed', variant: 'destructive', icon: AlertCircle },
};

export default function VocabularySheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [sheet, setSheet] = useState<VocabularySheetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sheetId = params.id as string;

  useEffect(() => {
    if (!accessToken || !sheetId) return;

    const fetchSheet = async () => {
      try {
        setIsLoading(true);
        const data = await vocabularySheetsApi.get(sheetId, accessToken);
        setSheet(data.sheet);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch vocabulary sheet:', err);
        setError(err instanceof Error ? err.message : 'Failed to load vocabulary sheet');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSheet();
  }, [accessToken, sheetId]);

  const handleDelete = async () => {
    if (!accessToken || !sheet) return;
    if (!confirm('Are you sure you want to delete this vocabulary sheet?')) return;

    try {
      await vocabularySheetsApi.delete(sheet.id, accessToken);
      router.push('/vocabulary');
    } catch (error) {
      console.error('Failed to delete sheet:', error);
      alert('Failed to delete vocabulary sheet');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-3 text-muted-foreground">Loading vocabulary sheet...</p>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/vocabulary')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Vocabulary Sheets
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Error Loading Sheet</h3>
            <p className="text-sm text-muted-foreground">
              {error || 'Vocabulary sheet not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[sheet.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/vocabulary')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{sheet.originalName}</h2>
            <p className="text-muted-foreground">
              Uploaded {format(new Date(sheet.uploadedAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            asChild
          >
            <a
              href={vocabularySheetsApi.download(sheet.id, accessToken!)}
              download
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Sheet Info */}
      <Card>
        <CardHeader>
          <CardTitle>Sheet Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={statusConfig.variant} className="mt-1 flex items-center gap-1 w-fit">
                <StatusIcon className={`h-3 w-3 ${sheet.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                {statusConfig.label}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">File Size</p>
              <p className="mt-1">{formatFileSize(sheet.fileSize)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">File Type</p>
              <p className="mt-1">{sheet.mimeType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tests to Generate</p>
              <p className="mt-1">{sheet.testsToGenerate}</p>
            </div>
            {sheet.processedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processed At</p>
                <p className="mt-1">{format(new Date(sheet.processedAt), 'MMM d, yyyy h:mm a')}</p>
              </div>
            )}
          </div>

          {sheet.errorMessage && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">Error:</p>
              <p className="text-sm text-destructive mt-1">{sheet.errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vocabulary Words */}
      {sheet.words && sheet.words.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vocabulary Words ({sheet.words.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sheet.words.map((word) => (
                <div
                  key={word.id}
                  data-testid="vocabulary-word"
                  className="p-4 border rounded-lg"
                >
                  <h4 className="font-semibold text-lg">{word.word}</h4>
                  {word.definition && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">Definition:</span> {word.definition}
                    </p>
                  )}
                  {word.context && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">Context:</span> {word.context}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Tests */}
      {sheet.tests && sheet.tests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Tests ({sheet.tests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sheet.tests.map((test) => (
                <div
                  key={test.id}
                  data-testid="test"
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{test.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Variant: {test.variant}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {test._count?.questions || 0} questions
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(test.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Text (for debugging) */}
      {sheet.extractedText && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Text</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md overflow-auto max-h-96">
              {sheet.extractedText}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Empty States */}
      {sheet.status === 'COMPLETED' && (!sheet.words || sheet.words.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Vocabulary Words</h3>
            <p className="text-sm text-muted-foreground">
              No vocabulary words were extracted from this sheet.
            </p>
          </CardContent>
        </Card>
      )}

      {sheet.status === 'PENDING' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Processing Pending</h3>
            <p className="text-sm text-muted-foreground">
              This vocabulary sheet is queued for processing. Please check back soon.
            </p>
          </CardContent>
        </Card>
      )}

      {sheet.status === 'PROCESSING' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="mx-auto h-12 w-12 text-primary mb-4 animate-spin" />
            <h3 className="text-lg font-medium mb-2">Processing in Progress</h3>
            <p className="text-sm text-muted-foreground">
              Claude AI is extracting vocabulary words and generating tests. This may take a few minutes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
