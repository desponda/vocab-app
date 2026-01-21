'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Download, Trash2, Loader2, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronRight, RefreshCw, UserPlus, Eye, EyeOff, MoreHorizontal } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { ProcessingStatus, VocabularyWord, Classroom, vocabularySheetsApi } from '@/lib/api';
import { TestPreviewDialog } from '@/components/classroom/test-preview-dialog';
import { ViewWordsSection } from './view-words-section';
import { EditWordDialog } from './edit-word-dialog';
import { RegenerateTestsDialog } from './regenerate-tests-dialog';
import { AssignSheetDialog } from './assign-sheet-dialog';

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
  testsToGenerate?: number;
  gradeLevel?: number | null;
  testType?: 'VOCABULARY' | 'SPELLING' | 'GENERAL_KNOWLEDGE';
  errorMessage?: string;
  tests?: Array<{
    id: string;
    name: string;
    variant: string;
    createdAt: string;
    _count: { questions: number };
  }>;
  accessToken?: string;
  classrooms?: Classroom[];
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onDownloadProcessed?: (id: string) => void;
  onWordUpdated?: (sheetId: string) => void;
  onTestsRegenerated?: (sheetId: string) => void;
  onAssigned?: (sheetId: string) => void;
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
  testsToGenerate = 5,
  gradeLevel,
  testType = 'VOCABULARY',
  errorMessage,
  tests,
  accessToken,
  classrooms = [],
  onDelete,
  onDownload,
  onDownloadProcessed,
  onWordUpdated,
  onTestsRegenerated,
  onAssigned,
}: VocabularySheetListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isWordsExpanded, setIsWordsExpanded] = useState(false);
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasTests = tests && tests.length > 0;

  const handleToggleWords = async () => {
    if (!isWordsExpanded && !words.length && accessToken) {
      // First time expanding - fetch words
      setIsLoadingWords(true);
      try {
        const { sheet } = await vocabularySheetsApi.get(id, accessToken);
        setWords(sheet.words || []);
      } catch (error) {
        console.error('Failed to load words:', error);
      } finally {
        setIsLoadingWords(false);
      }
    }
    setIsWordsExpanded(!isWordsExpanded);
  };

  const handleWordUpdated = (wordId: string, updatedWord: VocabularyWord) => {
    setWords((prevWords) =>
      prevWords.map((w) => (w.id === wordId ? updatedWord : w))
    );
    if (onWordUpdated) {
      onWordUpdated(id);
    }
  };

  const handleRegenerationStarted = () => {
    if (onTestsRegenerated) {
      onTestsRegenerated(id);
    }
  };

  const handleAssigned = () => {
    if (onAssigned) {
      onAssigned(id);
    }
  };

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {/* Icon - smaller on mobile for less visual weight */}
            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${statusConfig.color}`}>
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>

            <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
              {/* Title - smaller on mobile, single line to reduce height */}
              <h3 className="font-semibold text-sm sm:text-lg leading-tight line-clamp-1 sm:line-clamp-2">
                {name || originalName}
              </h3>

              {/* Primary badges - status and test type only, hide grade on mobile */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusConfig.variant} className="flex items-center gap-1 text-xs">
                  <StatusIcon className={`h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                  {statusConfig.label}
                </Badge>
                <Badge
                  variant={testType === 'SPELLING' ? 'secondary' : testType === 'GENERAL_KNOWLEDGE' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {testType === 'VOCABULARY' ? '📚 Vocab' : testType === 'SPELLING' ? '✏️ Spelling' : '🧠 Knowledge'}
                </Badge>
              </div>

              {/* Mobile: Only essential metadata (date + test count) */}
              <div className="sm:hidden flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatRelativeDate(uploadedAt)}</span>
                {testCount && testCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{testCount} test{testCount === 1 ? '' : 's'}</span>
                  </>
                )}
              </div>

              {/* Desktop: Full metadata */}
              <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span>{formatFileSize(fileSize)}</span>
                <span>•</span>
                <span>{formatRelativeDate(uploadedAt)}</span>
                {gradeLevel && (
                  <>
                    <span>•</span>
                    <span>Grade {gradeLevel}</span>
                  </>
                )}
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
                <p className="text-xs sm:text-sm text-destructive">{errorMessage}</p>
              )}
            </div>
          </div>

          {/* Desktop: Show all buttons inline */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {/* View Words Button */}
            {status === 'COMPLETED' && wordCount && wordCount > 0 && accessToken && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleWords}
                className="gap-2"
                aria-label="View extracted vocabulary words"
              >
                {isWordsExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isWordsExpanded ? 'Hide' : 'View'} Words
              </Button>
            )}

            {/* Assign to Classroom Button */}
            {status === 'COMPLETED' && testCount && testCount > 0 && accessToken && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAssignDialog(true)}
                className="gap-2"
                aria-label="Assign all test variants to classroom"
              >
                <UserPlus className="h-4 w-4" />
                Assign
              </Button>
            )}

            {/* Regenerate Tests Button */}
            {status === 'COMPLETED' && wordCount && wordCount > 0 && accessToken && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRegenerateDialog(true)}
                className="gap-2"
                aria-label="Regenerate tests from current words"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            )}

            {/* Show Tests Button */}
            {hasTests && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="gap-2"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {isExpanded ? 'Hide' : 'Show'} Tests
              </Button>
            )}

            {/* Download Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(id)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            {status === 'COMPLETED' && onDownloadProcessed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownloadProcessed(id)}
                className="gap-2"
                title="Download the compressed/processed image sent to AI"
              >
                <Download className="h-4 w-4" />
                AI Image
              </Button>
            )}
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

          {/* Mobile: Show dropdown menu */}
          <div className="sm:hidden flex items-center gap-2">
            {/* Show Tests Button - Always visible on mobile for quick access */}
            {hasTests && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="gap-2 min-h-[44px]"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {isExpanded ? 'Hide' : 'Show'}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] px-2">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* View Words */}
                {status === 'COMPLETED' && wordCount && wordCount > 0 && accessToken && (
                  <DropdownMenuItem onClick={handleToggleWords}>
                    {isWordsExpanded ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {isWordsExpanded ? 'Hide' : 'View'} Words
                  </DropdownMenuItem>
                )}

                {/* Assign */}
                {status === 'COMPLETED' && testCount && testCount > 0 && accessToken && (
                  <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign to Classroom
                  </DropdownMenuItem>
                )}

                {/* Regenerate */}
                {status === 'COMPLETED' && wordCount && wordCount > 0 && accessToken && (
                  <DropdownMenuItem onClick={() => setShowRegenerateDialog(true)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Tests
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Download */}
                <DropdownMenuItem onClick={() => onDownload(id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Original
                </DropdownMenuItem>

                {/* AI Image */}
                {status === 'COMPLETED' && onDownloadProcessed && (
                  <DropdownMenuItem onClick={() => onDownloadProcessed(id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download AI Image
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Delete */}
                <DropdownMenuItem onClick={() => onDelete(id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Words Section */}
        {isWordsExpanded && (
          <div className="mt-4 pt-4 border-t">
            <ViewWordsSection
              words={words}
              isLoading={isLoadingWords}
              onEditWord={(word) => setEditingWord(word)}
            />
          </div>
        )}

        {/* Tests List */}
        {isExpanded && hasTests && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Generated Tests ({tests.length})</h4>
            <div className="grid gap-2">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge variant="secondary" className="flex-shrink-0">
                      {test.variant}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{test.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {test._count.questions} {test._count.questions === 1 ? 'question' : 'questions'}
                      </p>
                    </div>
                  </div>
                  {accessToken && (
                    <TestPreviewDialog
                      testId={test.id}
                      testName={test.name}
                      variant={test.variant}
                      accessToken={accessToken}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dialogs */}
        {editingWord && accessToken && (
          <EditWordDialog
            open={!!editingWord}
            onOpenChange={(open) => !open && setEditingWord(null)}
            word={editingWord}
            sheetId={id}
            accessToken={accessToken}
            onWordUpdated={handleWordUpdated}
          />
        )}

        {accessToken && (
          <>
            <RegenerateTestsDialog
              open={showRegenerateDialog}
              onOpenChange={setShowRegenerateDialog}
              sheetId={id}
              sheetName={name || originalName || 'Vocabulary Sheet'}
              wordCount={wordCount || 0}
              testsToGenerate={testsToGenerate}
              accessToken={accessToken}
              onRegenerationStarted={handleRegenerationStarted}
            />

            <AssignSheetDialog
              open={showAssignDialog}
              onOpenChange={setShowAssignDialog}
              sheetId={id}
              sheetName={name || originalName || 'Vocabulary Sheet'}
              testCount={testCount || 0}
              classrooms={classrooms}
              accessToken={accessToken}
              onAssigned={handleAssigned}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
