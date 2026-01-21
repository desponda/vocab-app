'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { studentsApi, testsApi, type TestAttempt, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/dashboard/stat-card';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Error500 } from '@/components/error/http-errors';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { ArrowLeft, Loader2, ClipboardCheck, Target, Clock, FileText } from 'lucide-react';
import { formatRelativeDate, getScoreBadgeVariant } from '@/lib/utils';

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
  const { handleError } = useErrorHandler({ showToast: false });
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);

  const fetchStudentData = async () => {
    if (!accessToken) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get all students and find the specific one
      const { students } = await studentsApi.getAllEnriched(accessToken);
      const foundStudent = students.find((s) => s.id === studentId);

      if (!foundStudent) {
        setError('Student not found');
        return;
      }

      setStudent(foundStudent);

      // Fetch test attempts for this student
      setIsLoadingAttempts(true);
      try {
        const { attempts } = await testsApi.getAttemptHistory(studentId, accessToken);
        setTestAttempts(attempts.filter(a => a.status === 'SUBMITTED'));
      } catch (err) {
        console.error('Error loading test attempts:', err);
      } finally {
        setIsLoadingAttempts(false);
      }
    } catch (err) {
      handleError(err, 'Failed to load student data');
      setError(err instanceof ApiError ? err.message : 'Failed to load student data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, studentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !student) {
    return <Error500 preserveLayout={true} onRetry={fetchStudentData} />;
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

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>All test attempts for this student</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAttempts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : testAttempts.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No test results yet"
              description="This student hasn't completed any tests."
            />
          ) : (
            <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead className="hidden md:table-cell">Vocabulary</TableHead>
                    <TableHead className="hidden lg:table-cell">Variant</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="hidden lg:table-cell">Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testAttempts.map((attempt) => (
                    <TableRow key={attempt.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {attempt.test?.name || 'Unknown Test'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {attempt.test?.sheet?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline">{attempt.test?.variant || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        {attempt.score !== null && attempt.score !== undefined ? (
                          <Badge variant={getScoreBadgeVariant(attempt.score)}>
                            {attempt.score}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {attempt.completedAt ? (
                          <span className="text-muted-foreground">
                            {formatRelativeDate(attempt.completedAt)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">In Progress</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/student-dashboard/results/${attempt.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
