'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { studentsApi, Student } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StudentDetailPage() {
  const params = useParams();
  const { accessToken } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const studentId = params.id as string;

  useEffect(() => {
    if (!accessToken) return;

    const fetchData = async () => {
      try {
        const studentData = await studentsApi.get(studentId, accessToken);
        setStudent(studentData.student);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken, studentId]);

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
        <h3 className="text-xl font-semibold">Student Information</h3>
        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <p className="text-muted-foreground">{student.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Grade Level</label>
            <p className="text-muted-foreground">{student.gradeLevel}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Next Steps</h3>
        <p className="text-muted-foreground">
          Vocabulary sheets and tests are managed globally. Go to{' '}
          <Link href="/vocabulary" className="text-primary hover:underline">
            Vocabulary Sheets
          </Link>{' '}
          to upload and manage vocabulary content for your classroom.
        </p>
      </div>
    </div>
  );
}
