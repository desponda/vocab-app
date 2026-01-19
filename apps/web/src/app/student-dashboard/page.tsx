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
import { StatCard } from '@/components/dashboard/stat-card';
import { EmptyState } from '@/components/dashboard/empty-state';
import { TestAssignment, Student, TestAttempt } from '@/lib/api';
import { ClipboardCheck, Target, TrendingUp, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { formatRelativeDate, getScoreBadgeVariant } from '@/lib/utils';

interface StudentStats {
  testsAssigned: number;
  testsCompleted: number;
  avgScore: number;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [pastAttempts, setPastAttempts] = useState<TestAttempt[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoadingTests, setIsLoadingTests] = useState(true);

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load assigned tests and stats
  useEffect(() => {
    if (!accessToken || !user) return;

    const loadData = async () => {
      try {
        setIsLoadingTests(true);
        setError('');

        // Get the student record
        const { students } = await studentsApi.list(accessToken);

        if (students.length === 0) {
          setError('No student record found. Please contact your teacher.');
          setIsLoadingTests(false);
          return;
        }

        const userStudent = students[0];
        setStudent(userStudent);

        // Load assigned tests and past attempts in parallel
        const [assignmentsResponse, attemptsResponse] = await Promise.all([
          testsApi.listAssignedToStudent(userStudent.id, accessToken),
          testsApi.getAttemptHistory(userStudent.id, accessToken),
        ]);

        // Filter valid assignments (new format with questions)
        const newFormatCutoff = new Date('2026-01-18T00:00:00Z');
        const validAssignments = assignmentsResponse.assignments.filter((assignment) => {
          if (!assignment.test?.createdAt) return false;
          const testCreatedAt = new Date(assignment.test.createdAt);
          const hasQuestions = (assignment.test?._count?.questions || 0) > 0;
          return testCreatedAt >= newFormatCutoff && hasQuestions;
        });

        setAssignments(validAssignments);

        // Filter to completed attempts only
        const completedAttempts = attemptsResponse.attempts.filter(
          (attempt) => attempt.status === 'SUBMITTED'
        );

        setPastAttempts(completedAttempts);

        // Calculate stats
        const testsAssigned = validAssignments.length;
        const testsCompleted = completedAttempts.length;
        const avgScore = completedAttempts.length > 0
          ? Math.round(
              completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) /
                completedAttempts.length
            )
          : 0;

        setStats({ testsAssigned, testsCompleted, avgScore });
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

    loadData();
  }, [user, accessToken]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}!</h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your test progress
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      {stats && !isLoadingTests && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Tests Assigned"
            value={stats.testsAssigned}
            icon={ClipboardCheck}
            color="blue"
          />
          <StatCard
            title="Tests Completed"
            value={stats.testsCompleted}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            title="Average Score"
            value={stats.testsCompleted > 0 ? `${stats.avgScore}%` : '-'}
            icon={Target}
            color={stats.avgScore >= 80 ? 'green' : stats.avgScore >= 60 ? 'orange' : 'default'}
          />
        </div>
      )}

      {/* Available Tests Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Available Tests</h3>
          <p className="text-muted-foreground">
            Tests assigned by your teacher that you can take now
          </p>
        </div>

        {isLoadingTests ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No tests assigned yet"
            description="Your teacher hasn&apos;t assigned any tests to your classroom. Check back later!"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {assignment.test?.name}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {assignment.test?.sheet?.originalName || 'Vocabulary Test'}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      {assignment.test?.variant}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Questions</span>
                    <span className="font-medium">
                      {assignment.test?._count?.questions || 0}
                    </span>
                  </div>
                  {assignment.dueDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Due Date</span>
                      <span className="font-medium">
                        {formatRelativeDate(assignment.dueDate)}
                      </span>
                    </div>
                  )}
                  <Link href={`/student-dashboard/tests/${assignment.testId}`}>
                    <Button className="w-full gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Start Test
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Attempts Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Completed Tests</h3>
          <p className="text-muted-foreground">
            Review your completed tests and scores
          </p>
        </div>

        {isLoadingTests ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pastAttempts.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No completed tests yet"
            description="Complete your first test to see your results and track your progress"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pastAttempts.map((attempt) => (
              <Card key={attempt.id} className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {attempt.test?.name}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {attempt.test?.sheet?.originalName || 'Vocabulary Test'}
                      </CardDescription>
                    </div>
                    <Badge variant={getScoreBadgeVariant(attempt.score || 0)} className="flex-shrink-0">
                      {attempt.score ?? 0}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Correct Answers</span>
                    <span className="font-medium">
                      {attempt.correctAnswers ?? 0} / {attempt.totalQuestions}
                    </span>
                  </div>
                  {attempt.completedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium">
                        {formatRelativeDate(attempt.completedAt)}
                      </span>
                    </div>
                  )}
                  <Link href={`/student-dashboard/results/${attempt.id}`}>
                    <Button variant="outline" className="w-full gap-2">
                      <FileText className="h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
