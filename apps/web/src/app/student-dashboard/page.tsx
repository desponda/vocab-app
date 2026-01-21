'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { Error500 } from '@/components/error/http-errors';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { TestAssignment, Student, TestAttempt } from '@/lib/api';
import { ClipboardCheck, Target, TrendingUp, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { TestListItem } from '@/components/student-dashboard/test-list-item';
import { CompletedTestListItem } from '@/components/student-dashboard/completed-test-list-item';

interface StudentStats {
  testsAssigned: number;
  testsCompleted: number;
  avgScore: number;
}

interface VocabularyGroup {
  sheetId: string;
  sheetName: string;
  originalName: string;
  assignments: TestAssignment[];
  completed: number;
  total: number;
  bestScore: number | null;
  avgScore: number | null;
  attempts: TestAttempt[];
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [pastAttempts, setPastAttempts] = useState<TestAttempt[]>([]);
  const [inProgressAttempts, setInProgressAttempts] = useState<TestAttempt[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [error, setError] = useState<string>('');
  const { handleError } = useErrorHandler({ showToast: false });
  const [isLoadingTests, setIsLoadingTests] = useState(true);

  // Group assignments by vocabulary sheet
  const vocabularyGroups = useMemo(() => {
    const groupsMap = new Map<string, VocabularyGroup>();

    assignments.forEach((assignment) => {
      const sheetId = assignment.test?.sheet?.id;
      if (!sheetId) return;

      if (!groupsMap.has(sheetId)) {
        groupsMap.set(sheetId, {
          sheetId,
          sheetName: assignment.test?.sheet?.name || 'Unknown',
          originalName: assignment.test?.sheet?.originalName || 'Unknown',
          assignments: [],
          completed: 0,
          total: 0,
          bestScore: null,
          avgScore: null,
          attempts: [],
        });
      }

      const group = groupsMap.get(sheetId)!;
      group.assignments.push(assignment);
      group.total++;
    });

    // Add attempt statistics to each group
    pastAttempts.forEach((attempt) => {
      const sheetId = attempt.test?.sheet?.id;
      if (!sheetId || !groupsMap.has(sheetId)) return;

      const group = groupsMap.get(sheetId)!;
      group.attempts.push(attempt);
    });

    // Calculate statistics for each group
    groupsMap.forEach((group) => {
      const scores = group.attempts.map((a) => a.score || 0);
      if (scores.length > 0) {
        group.bestScore = Math.max(...scores);
        group.avgScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
        // Count unique test variants completed
        const uniqueTests = new Set(group.attempts.map((a) => a.testId));
        group.completed = uniqueTests.size;
      }
    });

    return Array.from(groupsMap.values()).sort((a, b) =>
      a.sheetName.localeCompare(b.sheetName)
    );
  }, [assignments, pastAttempts]);

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load assigned tests and stats
  const loadData = async () => {
    if (!accessToken || !user) return;

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

      // Separate in-progress and completed attempts
      const completedAttempts = attemptsResponse.attempts.filter(
        (attempt) => attempt.status === 'SUBMITTED'
      );
      const inProgress = attemptsResponse.attempts.filter(
        (attempt) => attempt.status === 'IN_PROGRESS'
      );

      setPastAttempts(completedAttempts);
      setInProgressAttempts(inProgress);

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
      handleError(err, 'Failed to load assigned tests');
      setError(err instanceof ApiError ? err.message : 'Failed to load assigned tests');
    } finally {
      setIsLoadingTests(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <Error500 preserveLayout={true} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}!</h2>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your test progress
        </p>
      </div>

      {/* Stats Overview */}
      {stats && !isLoadingTests && (
        <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-3">
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

      {/* In Progress Tests Section */}
      {!isLoadingTests && inProgressAttempts.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight">Continue Tests</h3>
            <p className="text-muted-foreground mt-1">
              Resume tests you started earlier
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {inProgressAttempts.map((attempt) => {
              const currentQuestion = (attempt.currentQuestionIndex ?? 0) + 1;
              const totalQuestions = attempt.totalQuestions;
              const progressPercent = (currentQuestion / totalQuestions) * 100;

              return (
                <Card key={attempt.id} className="hover:bg-muted/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {attempt.test?.name || 'Vocabulary Test'}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {attempt.test?.sheet?.name || 'Practice Test'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">
                        In Progress
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          Question {currentQuestion} of {totalQuestions}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Last Activity */}
                    {attempt.lastActivityAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last Active</span>
                        <span className="font-medium">
                          {formatRelativeDate(attempt.lastActivityAt)}
                        </span>
                      </div>
                    )}

                    {/* Resume Button */}
                    <Link href={`/student-dashboard/tests/${attempt.testId}`}>
                      <Button className="w-full gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Resume Test
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Tests Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold tracking-tight">Available Tests</h3>
          <p className="text-muted-foreground mt-1">
            Tests assigned by your teacher that you can take now
          </p>
        </div>

        {isLoadingTests ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : vocabularyGroups.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No tests assigned yet"
            description="Your teacher hasn&apos;t assigned any tests to your classroom. Check back later!"
          />
        ) : (
          <div className="space-y-3 sm:space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {vocabularyGroups.map((group) => (
              <TestListItem key={group.sheetId} group={group} />
            ))}
          </div>
        )}
      </div>

      {/* Past Attempts Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold tracking-tight">Completed Tests</h3>
          <p className="text-muted-foreground mt-1">
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
          <div className="space-y-2 sm:space-y-3">
            {pastAttempts.map((attempt) => (
              <CompletedTestListItem
                key={attempt.id}
                attempt={attempt}
                onClick={() => router.push(`/student-dashboard/results/${attempt.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
