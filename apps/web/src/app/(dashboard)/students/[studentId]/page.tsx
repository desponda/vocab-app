'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { studentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/stat-card';
import { EmptyState } from '@/components/dashboard/empty-state';
import { ArrowLeft, Loader2, ClipboardCheck, Target, Clock, FileText } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';

interface EnrichedStudent {
  id: string;
  name: string;
  gradeLevel: number | null;
  classroomName: string;
  classroomId: string;
  testsAttempted: number;
  avgScore: number | null;
  lastActive: Date | null;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const { accessToken } = useAuth();

  const [student, setStudent] = useState<EnrichedStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!accessToken) return;

      try {
        setIsLoading(true);

        // Get all students and find the specific one
        const { students } = await studentsApi.getAllEnriched(accessToken);
        const foundStudent = students.find((s) => s.id === studentId);

        if (!foundStudent) {
          setError('Student not found');
          return;
        }

        setStudent(foundStudent);
      } catch (err) {
        console.error('Error loading student:', err);
        setError('Failed to load student data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, [accessToken, studentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error || 'Student not found'}
        </div>
        <Button onClick={() => router.push('/students')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Students
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Button
          onClick={() => router.push('/students')}
          variant="ghost"
          className="mb-2 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Button>

        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold tracking-tight">{student.name}</h2>
          {student.gradeLevel && (
            <Badge variant="secondary">Grade {student.gradeLevel}</Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          {student.classroomName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tests Assigned"
          value={student.testsAttempted.toString()}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Tests Completed"
          value={student.testsAttempted.toString()}
          icon={ClipboardCheck}
          color="blue"
        />
        <StatCard
          title="Average Score"
          value={student.avgScore !== null ? `${Math.round(student.avgScore)}%` : '-'}
          icon={Target}
          color={student.avgScore !== null && student.avgScore >= 80 ? 'green' : student.avgScore !== null && student.avgScore >= 60 ? 'orange' : 'default'}
        />
        <StatCard
          title="Last Active"
          value={student.lastActive ? formatRelativeDate(student.lastActive) : 'Never'}
          icon={Clock}
          color="default"
        />
      </div>

      {/* Test Results Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>All test attempts for this student</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ClipboardCheck}
            title="Test details coming soon"
            description="Individual test results will be displayed here. For now, you can view overall stats above."
          />
        </CardContent>
      </Card>
    </div>
  );
}
