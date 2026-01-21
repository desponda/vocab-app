'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { vocabularySheetsApi, classroomsApi, VocabularySheet, Classroom, ProcessingStatus, ApiError } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VocabularySheetListItem } from '@/components/tests/vocabulary-sheet-list-item';
import { TestCreationWizard } from '@/components/test-creation-wizard';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Error500 } from '@/components/error/http-errors';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Plus } from 'lucide-react';

export default function VocabularyPage() {
  const { accessToken } = useAuth();
  const [sheets, setSheets] = useState<VocabularySheet[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus | 'ALL'>('ALL');
  const [testTypeFilter, setTestTypeFilter] = useState<'ALL' | 'VOCABULARY' | 'SPELLING' | 'GENERAL_KNOWLEDGE'>('ALL');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler({ showToast: false });

  const fetchData = async () => {
    if (!accessToken) return;

    try {
      setError(null);
      const [sheetsData, classroomsData] = await Promise.all([
        vocabularySheetsApi.list(accessToken),
        classroomsApi.list(accessToken),
      ]);
      setSheets(sheetsData.sheets);
      setClassrooms(classroomsData.classrooms);
    } catch (err) {
      handleError(err, 'Failed to load tests');
      setError(err instanceof ApiError ? err.message : 'Failed to load tests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);


  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    if (!confirm('Are you sure you want to delete this vocabulary sheet?')) return;

    try {
      await vocabularySheetsApi.delete(id, accessToken);
      setSheets((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete sheet:', error);
      alert('Failed to delete vocabulary sheet');
    }
  };

  const handleDownload = (id: string) => {
    if (!accessToken) return;
    const url = vocabularySheetsApi.download(id, accessToken);
    window.open(url, '_blank');
  };

  const handleDownloadProcessed = (id: string) => {
    if (!accessToken) return;
    const url = vocabularySheetsApi.downloadProcessed(id, accessToken);
    window.open(url, '_blank');
  };

  const handleWordUpdated = async (sheetId: string) => {
    if (!accessToken) return;
    // Refresh the sheet to get updated word count
    try {
      const { sheet } = await vocabularySheetsApi.get(sheetId, accessToken);
      setSheets((prev) =>
        prev.map((s) =>
          s.id === sheetId
            ? {
                ...s,
                _count: {
                  words: sheet.words?.length || 0,
                  tests: s._count?.tests || 0
                }
              }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to refresh sheet after word update:', error);
    }
  };

  const handleTestsRegenerated = async (sheetId: string) => {
    if (!accessToken) return;
    // Update status to PROCESSING immediately
    setSheets((prev) =>
      prev.map((s) => (s.id === sheetId ? { ...s, status: 'PROCESSING' as ProcessingStatus } : s))
    );

    // Optionally refresh after a delay to check if processing is complete
    setTimeout(async () => {
      try {
        const data = await vocabularySheetsApi.list(accessToken);
        setSheets(data.sheets);
      } catch (error) {
        console.error('Failed to refresh sheets after regeneration:', error);
      }
    }, 3000);
  };

  const handleAssigned = () => {
    // Assignment doesn't change sheet data, just show success feedback
    // The toast in AssignSheetDialog already handles user feedback
  };

  // Memoized callback for when test is created to prevent infinite loop
  const handleTestCreated = useCallback(() => {
    // Refresh sheets list after test is created
    if (accessToken) {
      vocabularySheetsApi.list(accessToken).then((data) => {
        setSheets(data.sheets);
      });
    }
    setIsWizardOpen(false);
  }, [accessToken]);

  // Filter sheets based on status and test type
  const filteredSheets = useMemo(() => {
    let filtered = sheets;

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((sheet) => sheet.status === statusFilter);
    }

    // Filter by test type
    if (testTypeFilter !== 'ALL') {
      filtered = filtered.filter((sheet) => sheet.testType === testTypeFilter);
    }

    return filtered;
  }, [sheets, statusFilter, testTypeFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <Error500 preserveLayout={true} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Content Library</h2>
          <p className="text-muted-foreground">
            Upload worksheets or study guides to generate practice tests
          </p>
        </div>
        {/* Desktop: Header button */}
        <Button onClick={() => setIsWizardOpen(true)} className="gap-2 hidden sm:flex">
          <Plus className="h-4 w-4" />
          Create Test
        </Button>
      </div>

      {/* Mobile: Floating Action Button (FAB) */}
      <Button
        onClick={() => setIsWizardOpen(true)}
        size="lg"
        className="sm:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow p-0"
        aria-label="Create Test"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Test Creation Wizard */}
      <TestCreationWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onTestCreated={handleTestCreated}
      />

      {sheets.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No tests yet"
          description="Upload your first worksheet or study guide to generate practice tests for your students"
        />
      ) : (
        <>
          {/* Filter Dropdowns */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProcessingStatus | 'ALL')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Test Type:</label>
              <Select value={testTypeFilter} onValueChange={(value) => setTestTypeFilter(value as 'ALL' | 'VOCABULARY' | 'SPELLING' | 'GENERAL_KNOWLEDGE')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="VOCABULARY">📚 Vocabulary</SelectItem>
                  <SelectItem value="SPELLING">✏️ Spelling</SelectItem>
                  <SelectItem value="GENERAL_KNOWLEDGE">🧠 General Knowledge</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="text-sm text-muted-foreground">
              {filteredSheets.length} {filteredSheets.length === 1 ? 'sheet' : 'sheets'}
            </span>
          </div>

          {/* Sheets List */}
          {filteredSheets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No vocabulary sheets with status: {statusFilter}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSheets.map((sheet) => (
                <VocabularySheetListItem
                  key={sheet.id}
                  id={sheet.id}
                  name={sheet.name}
                  originalName={sheet.originalName}
                  status={sheet.status}
                  uploadedAt={sheet.uploadedAt}
                  fileSize={sheet.fileSize}
                  fileType={sheet.fileType}
                  wordCount={sheet._count?.words}
                  testCount={sheet._count?.tests}
                  testsToGenerate={sheet.testsToGenerate}
                  gradeLevel={sheet.gradeLevel}
                  testType={sheet.testType}
                  errorMessage={sheet.errorMessage || undefined}
                  tests={sheet.tests}
                  accessToken={accessToken || undefined}
                  classrooms={classrooms}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  onDownloadProcessed={handleDownloadProcessed}
                  onWordUpdated={handleWordUpdated}
                  onTestsRegenerated={handleTestsRegenerated}
                  onAssigned={handleAssigned}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
