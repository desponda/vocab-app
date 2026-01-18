'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { studentsApi, testsApi, TestAssignment, Student } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2, AlertCircle, Play, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function TestsPage() {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !user) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get all students for this user and fetch tests for each
        const studentsData = await studentsApi.list(accessToken);

        if (studentsData.students.length === 0) {
          setError('No students found. Please create a student first.');
          setIsLoading(false);
          return;
        }

        // Use first student for now (can be extended to show all)
        const primaryStudent = studentsData.students[0];
        setStudent(primaryStudent);

        // Fetch assigned tests for the student
        const testsData = await testsApi.listAssignedToStudent(primaryStudent.id, accessToken);
        setAssignments(testsData.assignments);

        setError(null);
      } catch (err) {
        console.error('Failed to fetch tests:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assigned tests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-3 text-muted-foreground">Loading assigned tests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const getDueStatus = (dueDate: string | null | undefined): 'overdue' | 'due-soon' | 'not-due' => {
    if (!dueDate) return 'not-due';
    const due = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 3) return 'due-soon';
    return 'not-due';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Assigned Tests</h2>
        <p className="text-muted-foreground">
          {student && `Tests for ${student.name}`}
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Assigned Tests</h3>
            <div className="text-sm text-muted-foreground space-y-3 max-w-sm mx-auto">
              <p>
                {student
                  ? 'Your teacher hasn\'t assigned any tests yet. Check back soon!'
                  : 'Create a student profile first to view assigned tests.'}
              </p>
              <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700">
                <p className="font-medium mb-1">💡 Tip:</p>
                <p>Tests will appear here once your teacher:</p>
                <ul className="mt-2 text-left list-disc list-inside space-y-1">
                  <li>Uploads vocabulary sheets (image or PDF)</li>
                  <li>Generates tests from the vocabulary</li>
                  <li>Assigns those tests to your classroom</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => {
            const dueStatus = getDueStatus(assignment.dueDate);

            return (
              <Card key={assignment.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">{assignment.test?.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Variant {assignment.test?.variant}
                  </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {assignment.test?._count?.questions || 0} questions
                    </p>
                    {assignment.test?.sheet && (
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {assignment.test.sheet.title}
                      </p>
                    )}
                  </div>

                  {assignment.dueDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={`text-xs ${
                          dueStatus === 'overdue'
                            ? 'text-destructive font-medium'
                            : dueStatus === 'due-soon'
                            ? 'text-yellow-600 font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        Due {format(new Date(assignment.dueDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}

                  <Button asChild className="w-full">
                    <Link href={`/tests/${assignment.test?.id}/take?studentId=${student?.id}`}>
                      <Play className="h-4 w-4 mr-2" />
                      Take Test
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
