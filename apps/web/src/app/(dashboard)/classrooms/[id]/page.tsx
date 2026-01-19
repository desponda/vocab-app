'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { classroomsApi, testsApi, vocabularySheetsApi, type Classroom, type Student, type Test, type VocabularySheet, type TestAssignment, type Enrollment } from '@/lib/api';
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
  const { accessToken } = useAuth();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [vocabularySheets, setVocabularySheets] = useState<VocabularySheet[]>([]);
  const [assignedTests, setAssignedTests] = useState<TestAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Load classroom details
  useEffect(() => {
    if (!accessToken) return;

    const loadClassroom = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Get classroom details with enrolled students
        const classroomData = await classroomsApi.get(classroomId, accessToken);
        setClassroom(classroomData.classroom);

        // Store enrollments (includes student data and enrollment date)
        setEnrollments(classroomData.classroom.enrollments || []);
      } catch (err) {
        console.error('Error loading classroom:', err);
        setError('Failed to load classroom details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadClassroom();
  }, [classroomId, accessToken]);

  // Load vocabulary sheets for bulk assignment
  useEffect(() => {
    if (!accessToken) return;

    const loadVocabularySheets = async () => {
      try {
        const { sheets } = await vocabularySheetsApi.list(accessToken);

        // Filter to only completed sheets with tests in new format
        // Note: Tests processed after 2026-01-18 will have multiple choice format
        const newFormatCutoff = new Date('2026-01-18T00:00:00Z');

        const validSheets = sheets.filter((sheet) => {
          const isCompleted = sheet.status === 'COMPLETED';
          const hasTests = sheet._count && sheet._count.tests > 0;
          const isNewFormat = sheet.processedAt && new Date(sheet.processedAt) >= newFormatCutoff;

          return isCompleted && hasTests && isNewFormat;
        });

        setVocabularySheets(validSheets);
      } catch (err) {
        console.error('Error loading vocabulary sheets:', err);
      }
    };

    loadVocabularySheets();
  }, [accessToken]);

  // Load assigned tests for this classroom
  const loadAssignedTests = useCallback(async () => {
    if (!accessToken) return;

    try {
      const { assignments } = await testsApi.listAssignedToClassroom(classroomId, accessToken);
      setAssignedTests(assignments);
    } catch (err) {
      console.error('Error loading assigned tests:', err);
    }
  }, [classroomId, accessToken]);

  useEffect(() => {
    loadAssignedTests();
  }, [loadAssignedTests]);

  const handleCopyCode = () => {
    if (classroom?.code) {
      navigator.clipboard.writeText(classroom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleBulkAssignVocabSheet = async () => {
    if (!selectedSheetId || !accessToken) return;

    setIsAssigning(true);
    try {
      await vocabularySheetsApi.assignToClassroom(
        selectedSheetId,
        classroomId,
        undefined, // no due date for now
        accessToken
      );

      setAssignSuccess(true);
      setIsAssignDialogOpen(false);
      setSelectedSheetId('');

      // Reload assigned tests to show the new assignments
      await loadAssignedTests();

      // Show success message with variant count
      setTimeout(() => setAssignSuccess(false), 3000);
    } catch (err) {
      console.error('Error assigning vocabulary sheet:', err);
      setError('Failed to assign tests. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
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
            Classroom Code: {classroom.code}
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
            Students ({enrollments.length})
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
              {enrollments.length === 0 ? (
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
                    {enrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">{enrollment.student?.name || 'Unknown'}</TableCell>
                        <TableCell>{enrollment.student?.gradeLevel || 'N/A'}</TableCell>
                        <TableCell>
                          {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
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
                        Select a vocabulary set to assign all its test variants to this classroom
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="vocab-sheet">Select Vocabulary Set</Label>
                        {vocabularySheets.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No tests available. Upload vocabulary sheets to generate tests.
                          </p>
                        ) : (
                          <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
                            <SelectTrigger id="vocab-sheet">
                              <SelectValue placeholder="Choose a vocabulary set" />
                            </SelectTrigger>
                            <SelectContent>
                              {vocabularySheets.map((sheet) => (
                                <SelectItem key={sheet.id} value={sheet.id}>
                                  {sheet.name} ({sheet._count?.tests || 0} variants)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {selectedSheetId && (
                          <p className="text-sm text-muted-foreground">
                            All test variants will be assigned to this classroom
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAssignDialogOpen(false);
                            setSelectedSheetId('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleBulkAssignVocabSheet}
                          disabled={!selectedSheetId || isAssigning}
                        >
                          {isAssigning ? 'Assigning...' : 'Assign All Variants'}
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
              {assignedTests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tests assigned yet</p>
                  <p className="text-sm mt-2">Click &quot;Assign Test&quot; to assign vocabulary tests to this classroom</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedTests.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.test?.sheet?.name || assignment.test?.name || 'Unknown Test'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{assignment.test?.variant}</Badge>
                        </TableCell>
                        <TableCell>{assignment.test?._count?.questions || 0}</TableCell>
                        <TableCell>
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {assignment.dueDate
                            ? new Date(assignment.dueDate).toLocaleDateString()
                            : 'No due date'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
