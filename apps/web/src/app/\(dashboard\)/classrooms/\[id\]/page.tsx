'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { classroomsApi, vocabularySheetsApi, testsApi, ClassroomDetail, VocabularySheet, TestAssignment } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, BookOpen, Loader2, AlertCircle, Plus, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function ClassroomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [tests, setTests] = useState<TestAssignment[]>([]);
  const [sheets, setSheets] = useState<VocabularySheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);

  const classroomId = params.id as string;

  useEffect(() => {
    if (!accessToken || !classroomId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch classroom details
        const classroomData = await classroomsApi.get(classroomId, accessToken);
        setClassroom(classroomData.classroom);

        // Fetch assigned tests
        const testsData = await testsApi.listAssignedToClassroom(classroomId, accessToken);
        setTests(testsData.assignments);

        // Fetch vocabulary sheets for assigning new tests
        const sheetsData = await vocabularySheetsApi.list(accessToken);
        // Filter to sheets that have completed tests
        const completedSheets = sheetsData.sheets.filter(
          (sheet) => sheet.status === 'COMPLETED' && (sheet._count?.tests || 0) > 0
        );
        setSheets(completedSheets);

        setError(null);
      } catch (err) {
        console.error('Failed to fetch classroom:', err);
        setError(err instanceof Error ? err.message : 'Failed to load classroom');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken, classroomId]);

  const handleAssignTest = async (testId: string) => {
    if (!accessToken) return;

    try {
      await testsApi.assign(testId, classroomId, accessToken);

      // Refresh assigned tests
      const testsData = await testsApi.listAssignedToClassroom(classroomId, accessToken);
      setTests(testsData.assignments);

      setSelectedTestId(null);
      setShowAssignmentDialog(false);
    } catch (error) {
      console.error('Failed to assign test:', error);
      alert('Failed to assign test');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!accessToken) return;
    if (!confirm('Remove this test assignment?')) return;

    try {
      await testsApi.removeAssignment(assignmentId, accessToken);
      setTests((prev) => prev.filter((t) => t.id !== assignmentId));
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      alert('Failed to remove assignment');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-3 text-muted-foreground">Loading classroom...</p>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/classrooms')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classrooms
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Error Loading Classroom</h3>
            <p className="text-sm text-muted-foreground">
              {error || 'Classroom not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableTests = sheets.flatMap((sheet) =>
    (sheet.tests || []).filter(
      (test) => !tests.some((assignment) => assignment.test?.id === test.id)
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/classrooms')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{classroom.name}</h2>
            <p className="text-muted-foreground">Code: {classroom.code}</p>
          </div>
        </div>
      </div>

      {/* Enrolled Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enrolled Students ({classroom.enrollments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classroom.enrollments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No students enrolled yet. Share the classroom code {classroom.code} with students to enroll them.
            </p>
          ) : (
            <div className="space-y-2">
              {classroom.enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{enrollment.student?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Grade {enrollment.student?.gradeLevel}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enrolled {format(new Date(enrollment.enrolledAt), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Tests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Assigned Tests ({tests.length})
            </CardTitle>
            {availableTests.length > 0 && (
              <Button
                size="sm"
                onClick={() => setShowAssignmentDialog(!showAssignmentDialog)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign Test
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAssignmentDialog && availableTests.length > 0 && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2 mb-4">
              <h4 className="font-medium">Available Tests</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableTests.map((test) => (
                  <button
                    key={test.id}
                    onClick={() => handleAssignTest(test.id)}
                    className="w-full text-left p-2 border rounded hover:bg-background/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{test.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Variant {test.variant} ({test._count?.questions || 0} questions)
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tests.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {availableTests.length > 0
                ? 'No tests assigned yet. Click "Assign Test" to get started.'
                : 'No tests available. Generate and complete vocabulary sheets first.'}
            </p>
          ) : (
            <div className="space-y-3">
              {tests.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{assignment.test?.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Variant {assignment.test?.variant} ({assignment.test?._count?.questions || 0} questions)
                      </p>
                      {assignment.dueDate && (
                        <p className="text-sm text-muted-foreground">
                          Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Assigned {format(new Date(assignment.assignedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
