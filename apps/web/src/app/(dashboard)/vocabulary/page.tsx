'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { vocabularySheetsApi, VocabularySheet, ProcessingStatus } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VocabularySheetListItem } from '@/components/vocabulary/vocabulary-sheet-list-item';
import { UploadVocabularyDialog } from '@/components/vocabulary/upload-vocabulary-dialog';
import { EmptyState } from '@/components/dashboard/empty-state';
import { FileText, Loader2 } from 'lucide-react';

export default function VocabularyPage() {
  const { accessToken } = useAuth();
  const [sheets, setSheets] = useState<VocabularySheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus | 'ALL'>('ALL');

  useEffect(() => {
    if (!accessToken) return;

    const fetchSheets = async () => {
      try {
        const data = await vocabularySheetsApi.list(accessToken);
        setSheets(data.sheets);
      } catch (error) {
        console.error('Failed to fetch vocabulary sheets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSheets();
  }, [accessToken]);

  const handleSheetUploaded = (sheet: VocabularySheet) => {
    setSheets((prev) => [sheet, ...prev]);
  };

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

  // Filter sheets based on status
  const filteredSheets = useMemo(() => {
    if (statusFilter === 'ALL') return sheets;
    return sheets.filter((sheet) => sheet.status === statusFilter);
  }, [sheets, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vocabulary Library</h2>
          <p className="text-muted-foreground">
            Upload vocabulary sheets to generate spelling and vocabulary tests
          </p>
        </div>
        <UploadVocabularyDialog
          accessToken={accessToken}
          onSheetUploaded={handleSheetUploaded}
        />
      </div>

      {sheets.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No vocabulary sheets yet"
          description="Upload your first vocabulary sheet to generate spelling tests for your students"
        />
      ) : (
        <>
          {/* Filter Dropdown */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Filter by status:</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProcessingStatus | 'ALL')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All sheets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sheets</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
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
                  errorMessage={sheet.errorMessage || undefined}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
