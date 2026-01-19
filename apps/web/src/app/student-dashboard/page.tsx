'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { ApiError, testsApi, studentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestAssignment, Student, TestAttempt } from '@/lib/api';

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [pastAttempts, setPastAttempts] = useState<TestAttempt[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoadingTests, setIsLoadingTests] = useState(true);

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load assigned tests
  useEffect(() => {
    if (!accessToken || !user) return;

    const loadAssignedTests = async () => {
      try {
        setIsLoadingTests(true);
        setError('');

        // First, get the student record (students are created for STUDENT users on signup)
        const { students } = await studentsApi.list(accessToken);

        if (students.length === 0) {
          setError('No student record found. Please contact your teacher.');
          setIsLoadingTests(false);
          return;
        }

        // STUDENT users should only have one student record
        const userStudent = students[0];

        setStudent(userStudent);

        // Now get the assigned tests for this student
        const response = await testsApi.listAssignedToStudent(
          userStudent.id,
          accessToken
        );

        // Filter out old-format tests (created before 2026-01-18)
        // Old tests don't have multiple choice options and will fail to start
        // Also filter out tests with 0 questions (failed processing)
        const newFormatCutoff = new Date('2026-01-18T00:00:00Z');
        const validAssignments = response.assignments.filter((assignment) => {
          if (!assignment.test?.createdAt) return false;
          const testCreatedAt = new Date(assignment.test.createdAt);
          const hasQuestions = (assignment.test?._count?.questions || 0) > 0;
          return testCreatedAt >= newFormatCutoff && hasQuestions;
        });

        setAssignments(validAssignments);

        // Also load past attempts
        const attemptsResponse = await testsApi.getAttemptHistory(
          userStudent.id,
          accessToken
        );

        // Filter to only show SUBMITTED attempts (completed tests)
        const completedAttempts = attemptsResponse.attempts.filter(
          (attempt) => attempt.status === 'SUBMITTED'
        );

        setPastAttempts(completedAttempts);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load assigned tests');
        }
        console.error('Error loading tests:', err);
      } finally {
        setIsLoadingTests(false);
      }
    };

    loadAssignedTests();
  }, [user, accessToken]);

  if (isLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Tests</h2>
        <p className="text-muted-foreground">
          Tests assigned to your classroom
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoadingTests ? (
        <div className="text-center text-muted-foreground">Loading tests...</div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No tests have been assigned to your classroom yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{assignment.test?.name}</CardTitle>
                    <CardDescription>
                      {assignment.test?.sheet?.originalName || 'Vocabulary Test'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {assignment.test?.variant}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="text-sm text-muted-foreground mb-4">
                  {assignment.test?._count?.questions || 0} questions
                </div>
                {assignment.dueDate && (
                  <div className="text-xs text-muted-foreground mb-4">
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </div>
                )}
                <Link href={`/student-dashboard/tests/${assignment.testId}`}>
                  <Button className="w-full">Start Test</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Past Attempts Section */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Past Attempts</h2>
          <p className="text-muted-foreground">
            Review your completed tests and scores
          </p>
        </div>

        {isLoadingTests ? (
          <div className="text-center text-muted-foreground">Loading...</div>
        ) : pastAttempts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No completed tests yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pastAttempts.map((attempt) => (
              <Card key={attempt.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{attempt.test?.name}</CardTitle>
                      <CardDescription>
                        {attempt.test?.sheet?.originalName || 'Vocabulary Test'}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        (attempt.score ?? 0) >= 80
                          ? "default"
                          : (attempt.score ?? 0) >= 60
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {attempt.score ?? 0}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="font-medium">{attempt.correctAnswers ?? 0}</span> out of{' '}
                      <span className="font-medium">{attempt.totalQuestions}</span> correct
                    </div>
                    {attempt.completedAt && (
                      <div className="text-xs text-muted-foreground">
                        Completed: {new Date(attempt.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // For now, just show an alert. In the future, we can add a detailed review page
                      alert(`Score: ${attempt.score}%\n${attempt.correctAnswers}/${attempt.totalQuestions} correct`);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
