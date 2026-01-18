'use client';

import { Document } from '@/lib/api';
import { FileText, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistance } from 'date-fns';

interface DocumentListProps {
  documents: Document[];
  onDelete: (documentId: string) => void;
  onDownload: (documentId: string) => void;
}

export function DocumentList({
  documents,
  onDelete,
  onDownload,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No documents uploaded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{doc.originalName}</p>
                  <p className="text-sm text-muted-foreground">
                    {(doc.fileSize / 1024 / 1024).toFixed(2)} MB • {doc.fileType} •{' '}
                    {formatDistance(new Date(doc.uploadedAt), new Date(), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDownload(doc.id)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDelete(doc.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
