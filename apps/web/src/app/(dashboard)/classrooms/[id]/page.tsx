'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { classroomsApi, testsApi, type Classroom, type Student, type Test } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Copy, Check, Plus } from 'lucide-react';

export default function ClassroomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const { user, accessToken, isLoading: isAuthLoading } = useAuth();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Redirect if not authenticated or not a teacher
  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== 'TEACHER')) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Load classroom details
  useEffect(() => {
    if (!accessToken || !user) return;

    const loadClassroom = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Get classroom details
        const classroomData = await classroomsApi.get(classroomId, accessToken);
        setClassroom(classroomData.classroom);

        // Get all students and filter by classroom enrollment
        const { students: allStudents } = await classroomsApi.listStudents(accessToken);

        // Filter students enrolled in this classroom
        const enrolledStudents = allStudents.filter((student) =>
          student.enrollments?.some((enrollment) => enrollment.classroomId === classroomId)
        );

        setStudents(enrolledStudents);
      } catch (err) {
        console.error('Error loading classroom:', err);
        setError('Failed to load classroom details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadClassroom();
  }, [classroomId, accessToken, user]);

  // Load available tests for assignment
  useEffect(() => {
    if (!accessToken) return;

    const loadTests = async () => {
      try {
        const { tests: teacherTests } = await testsApi.list(accessToken);
        setTests(teacherTests);
      } catch (err) {
        console.error('Error loading tests:', err);
      }
    };

    loadTests();
  }, [accessToken]);

  const handleCopyCode = () => {
    if (classroom?.code) {
      navigator.clipboard.writeText(classroom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleAssignTest = async () => {
    if (!selectedTestId || !accessToken) return;

    setIsAssigning(true);
    try {
      await testsApi.assign(selectedTestId, classroomId, accessToken);
      setAssignSuccess(true);
      setIsAssignDialogOpen(false);
      setSelectedTestId('');

      // Show success message briefly
      setTimeout(() => setAssignSuccess(false), 3000);
    } catch (err) {
      console.error('Error assigning test:', err);
      setError('Failed to assign test. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error || 'Classroom not found'}
        </div>
        <Button onClick={() => router.push('/dashboard/classrooms')} variant="outline">
          Back to Classrooms
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Classroom Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{classroom.name}</h2>
          <p className="text-muted-foreground">
            Grade Level {classroom.gradeLevel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {classroom.code}
          </Badge>
          <Button
            onClick={handleCopyCode}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {copiedCode ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Code
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">
            Students ({students.length})
          </TabsTrigger>
          <TabsTrigger value="tests">Assigned Tests</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>
                Students who have signed up with classroom code {classroom.code}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">No students enrolled yet</p>
                  <p className="text-sm">
                    Share the classroom code <strong>{classroom.code}</strong> with your students
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Grade Level</TableHead>
                      <TableHead>Enrolled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const enrollment = student.enrollments?.find(
                        (e) => e.classroomId === classroomId
                      );
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.gradeLevel}</TableCell>
                          <TableCell>
                            {student.createdAt
                              ? new Date(student.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assigned Tests Tab */}
        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assigned Tests</CardTitle>
                  <CardDescription>
                    Tests assigned to this classroom
                  </CardDescription>
                </div>
                <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Assign Test
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Test to {classroom?.name}</DialogTitle>
                      <DialogDescription>
                        Select a test to assign to all students in this classroom
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="test">Select Test</Label>
                        {tests.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No tests available. Upload vocabulary sheets to generate tests.
                          </p>
                        ) : (
                          <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                            <SelectTrigger id="test">
                              <SelectValue placeholder="Choose a test" />
                            </SelectTrigger>
                            <SelectContent>
                              {tests.map((test) => (
                                <SelectItem key={test.id} value={test.id}>
                                  {test.name} (Variant {test.variant})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAssignDialogOpen(false);
                            setSelectedTestId('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAssignTest}
                          disabled={!selectedTestId || isAssigning}
                        >
                          {isAssigning ? 'Assigning...' : 'Assign Test'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {assignSuccess && (
                <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600 dark:text-green-400">
                  Test assigned successfully!
                </div>
              )}
              <div className="text-center py-8 text-muted-foreground">
                <p>Assigned tests will be displayed here</p>
                <p className="text-sm mt-2">This feature will be completed in the next update</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Student Results</CardTitle>
              <CardDescription>
                Test results for students in this classroom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Results dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
