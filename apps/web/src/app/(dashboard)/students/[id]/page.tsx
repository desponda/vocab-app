'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { studentsApi, documentsApi, Student, Document } from '@/lib/api';
import { FileUpload } from '@/components/documents/file-upload';
import { DocumentList } from '@/components/documents/document-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StudentDetailPage() {
  const params = useParams();
  const { accessToken } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const studentId = params.id as string;

  useEffect(() => {
    if (!accessToken) return;

    const fetchData = async () => {
      try {
        const [studentData, documentsData] = await Promise.all([
          studentsApi.get(studentId, accessToken),
          documentsApi.list(accessToken, studentId),
        ]);
        setStudent(studentData.student);
        setDocuments(documentsData.documents);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken, studentId]);

  const handleUpload = async (
    file: File,
    onProgress: (p: number) => void
  ) => {
    if (!accessToken) return;

    const { document } = await documentsApi.upload(
      file,
      studentId,
      accessToken,
      onProgress
    );
    setDocuments((prev) => [document, ...prev]);
  };

  const handleDelete = async (documentId: string) => {
    if (!accessToken) return;

    await documentsApi.delete(documentId, accessToken);
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  const handleDownload = (documentId: string) => {
    if (!accessToken) return;
    window.open(documentsApi.download(documentId, accessToken), '_blank');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!student) {
    return <div>Student not found</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/students">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </Link>

        <h2 className="text-3xl font-bold tracking-tight mt-4">
          {student.name}
        </h2>
        <p className="text-muted-foreground">Grade {student.gradeLevel}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Upload Vocabulary Sheet</h3>
        <FileUpload onUpload={handleUpload} />
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Uploaded Documents</h3>
        <DocumentList
          documents={documents}
          onDelete={handleDelete}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}
