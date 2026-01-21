'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  classroomsApi,
  testsApi,
  vocabularySheetsApi,
  type Classroom,
  type VocabularySheet,
  type TestAssignment,
  type Enrollment,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Copy,
  Check,
  Plus,
  Users,
  ClipboardCheck,
  TrendingUp,
  Target,
  ArrowLeft,
  Loader2,
  FileCheck,
  Trash2,
  Search,
  Pencil,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { ActivityFeed } from '@/components/classroom/activity-feed';
import { PerformanceChart } from '@/components/classroom/performance-chart';
import { TestPreviewDialog } from '@/components/classroom/test-preview-dialog';
import { formatRelativeDate, getScoreBadgeVariant } from '@/lib/utils';

interface ClassroomStats {
  studentCount: number;
  testsAssigned: number;
  avgTestScore: number;
  completionRate: number;
}

interface Activity {
  type: 'enrollment' | 'test_completion' | 'test_assignment';
  studentName?: string;
  testName?: string;
  score?: number;
  timestamp: string | Date;
}

interface TestAttempt {
  id: string;
  studentName: string;
  testName: string;
  variant: string;
  score: number;
  completedAt: string | Date;
}

export default function ClassroomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const { accessToken } = useAuth();

  // Core classroom data
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [vocabularySheets, setVocabularySheets] = useState<VocabularySheet[]>([]);
  const [assignedTests, setAssignedTests] = useState<TestAssignment[]>([]);
  const [stats, setStats] = useState<ClassroomStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings editing state
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    gradeLevel: 6,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

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
        setEnrollments(classroomData.classroom.enrollments || []);

        // Initialize edit form data
        setEditFormData({
          name: classroomData.classroom.name,
          gradeLevel: classroomData.classroom.gradeLevel,
        });

        // Load stats, activity, and test attempts in parallel
        const [statsData, activityData, attemptsData] = await Promise.all([
          classroomsApi.getStats(classroomId, accessToken),
          classroomsApi.getActivity(classroomId, accessToken),
          classroomsApi.getTestAttempts(classroomId, accessToken),
        ]);

        setStats(statsData);
        setActivities(activityData.activities);
        setTestAttempts(attemptsData.attempts);
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

        // Filter to only completed sheets with tests
        const validSheets = sheets.filter((sheet) => {
          const isCompleted = sheet.status === 'COMPLETED';
          const hasTests = sheet._count && sheet._count.tests > 0;
          return isCompleted && hasTests;
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
        undefined,
        accessToken
      );

      setAssignSuccess(true);
      setIsAssignDialogOpen(false);
      setSelectedSheetId('');

      // Reload assigned tests
      await loadAssignedTests();

      setTimeout(() => setAssignSuccess(false), 3000);
    } catch (err) {
      console.error('Error assigning vocabulary sheet:', err);
      setError('Failed to assign tests. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteClassroom = async () => {
    if (!accessToken) return;

    setIsDeleting(true);
    try {
      await classroomsApi.delete(classroomId, accessToken);
      router.push('/classrooms');
    } catch (err) {
      console.error('Error deleting classroom:', err);
      setError('Failed to delete classroom. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !classroom) return;

    // Validation
    const hasChanges =
      editFormData.name.trim() !== classroom.name ||
      editFormData.gradeLevel !== classroom.gradeLevel;

    if (!hasChanges) {
      setSettingsError('No changes detected');
      return;
    }

    if (!editFormData.name.trim()) {
      setSettingsError('Classroom name cannot be empty');
      return;
    }

    setIsSavingSettings(true);
    setSettingsError('');

    try {
      const { classroom: updatedClassroom } = await classroomsApi.update(
        classroomId,
        {
          name: editFormData.name.trim(),
          gradeLevel: editFormData.gradeLevel,
        },
        accessToken
      );

      // Optimistic update
      setClassroom(updatedClassroom);
      setEditFormData({
        name: updatedClassroom.name,
        gradeLevel: updatedClassroom.gradeLevel,
      });

      // Success feedback
      setSettingsSuccess(true);
      setIsEditingSettings(false);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating classroom:', err);
      setSettingsError('Failed to update classroom. Please try again.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCancelEditSettings = () => {
    if (!classroom) return;
    setEditFormData({
      name: classroom.name,
      gradeLevel: classroom.gradeLevel,
    });
    setSettingsError('');
    setIsEditingSettings(false);
  };

  const filteredEnrollments = enrollments.filter((enrollment) =>
    enrollment.student?.name?.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error || 'Classroom not found'}
        </div>
        <Button onClick={() => router.push('/classrooms')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classrooms
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
      {/* Classroom Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/classrooms')}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classrooms
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">{classroom.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">Grade {classroom.gradeLevel}</Badge>
            <span className="text-sm text-muted-foreground">
              Code: <span className="font-mono font-semibold">{classroom.code}</span>
            </span>
            <Button
              onClick={handleCopyCode}
              variant="ghost"
              size="sm"
              className="gap-1 h-7 px-2"
            >
              {copiedCode ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students ({enrollments.length})</TabsTrigger>
          <TabsTrigger value="tests">Tests ({assignedTests.length})</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Stats Grid */}
          {stats && (
            <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Students Enrolled"
                value={stats.studentCount}
                icon={Users}
                color="green"
              />
              <StatCard
                title="Tests Assigned"
                value={stats.testsAssigned}
                icon={FileCheck}
                color="purple"
              />
              <StatCard
                title="Avg Test Score"
                value={`${stats.avgTestScore}%`}
                icon={Target}
                color={stats.avgTestScore >= 80 ? 'green' : stats.avgTestScore >= 60 ? 'orange' : 'default'}
              />
              <StatCard
                title="Completion Rate"
                value={`${stats.completionRate}%`}
                icon={TrendingUp}
                color="blue"
              />
            </div>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Test
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Test to {classroom.name}</DialogTitle>
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
              <Button variant="outline" onClick={() => router.push(`/classrooms/${classroomId}`)}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                View Results
              </Button>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <ActivityFeed activities={activities} maxItems={15} />
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Enrolled Students</CardTitle>
                  <CardDescription>
                    Students who have joined using code {classroom.code}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollments.length > 0 && (
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}

              {enrollments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
                  <p className="mb-2">No students enrolled yet</p>
                  <p className="text-sm">
                    Share the classroom code <strong>{classroom.code}</strong> with your students
                  </p>
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No students found matching &quot;{studentSearchQuery}&quot;</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Grade Level</TableHead>
                        <TableHead>Enrolled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEnrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">
                            {enrollment.student?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{enrollment.student?.gradeLevel || 'N/A'}</TableCell>
                          <TableCell>{formatRelativeDate(enrollment.enrolledAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assigned Tests</CardTitle>
                  <CardDescription>Tests assigned to this classroom</CardDescription>
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
                      <DialogTitle>Assign Test to {classroom.name}</DialogTitle>
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
                  Tests assigned successfully!
                </div>
              )}
              {assignedTests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
                  <p>No tests assigned yet</p>
                  <p className="text-sm mt-2">
                    Click &quot;Assign Test&quot; to assign vocabulary tests to this classroom
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Variant</TableHead>
                        <TableHead className="hidden md:table-cell">Questions</TableHead>
                        <TableHead className="hidden lg:table-cell">Assigned</TableHead>
                        <TableHead className="hidden md:table-cell">Due Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                          <TableCell className="hidden md:table-cell">{assignment.test?._count?.questions || 0}</TableCell>
                          <TableCell className="hidden lg:table-cell">{formatRelativeDate(assignment.assignedAt)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {assignment.dueDate
                              ? formatRelativeDate(assignment.dueDate)
                              : 'No due date'}
                          </TableCell>
                          <TableCell className="text-right">
                            {assignment.test && (
                              <TestPreviewDialog
                                testId={assignment.test.id}
                                testName={assignment.test.name}
                                variant={assignment.test.variant}
                                accessToken={accessToken}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4 sm:space-y-5 md:space-y-6">
          {testAttempts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <ClipboardCheck className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
                  <p>No test results yet</p>
                  <p className="text-sm mt-2">
                    Results will appear here when students complete assigned tests
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Performance Chart */}
              <PerformanceChart
                data={(() => {
                  // Group attempts by test and calculate average scores
                  const testGroups = new Map<string, { scores: number[]; name: string }>();

                  testAttempts.forEach((attempt) => {
                    const key = `${attempt.testName}-${attempt.variant}`;
                    if (!testGroups.has(key)) {
                      testGroups.set(key, { scores: [], name: `${attempt.testName} (${attempt.variant})` });
                    }
                    testGroups.get(key)!.scores.push(attempt.score);
                  });

                  return Array.from(testGroups.values())
                    .map((data) => ({
                      testName: data.name,
                      avgScore: Math.round(data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length),
                      attempts: data.scores.length,
                    }))
                    .sort((a, b) => a.testName.localeCompare(b.testName));
                })()}
              />

              {/* Results Table */}
              <Card>
                <CardHeader>
                  <CardTitle>All Test Results</CardTitle>
                  <CardDescription>Click on a result to view detailed answers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Test</TableHead>
                          <TableHead className="hidden md:table-cell">Variant</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead className="hidden lg:table-cell">Completed</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {testAttempts.map((attempt) => (
                          <TableRow key={attempt.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-medium">{attempt.studentName}</TableCell>
                            <TableCell>{attempt.testName}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline">{attempt.variant}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getScoreBadgeVariant(attempt.score)}>
                                {attempt.score}%
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{formatRelativeDate(attempt.completedAt)}</TableCell>
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
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Success Message */}
          {settingsSuccess && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600 dark:text-green-400">
              Classroom updated successfully!
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Classroom Settings</CardTitle>
                  <CardDescription>Manage classroom configuration</CardDescription>
                </div>
                {!isEditingSettings && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingSettings(true)}
                    className="gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Settings
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="classroom-name">Classroom Name</Label>
                  <Input
                    id="classroom-name"
                    value={isEditingSettings ? editFormData.name : classroom.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    disabled={!isEditingSettings || isSavingSettings}
                    maxLength={100}
                    required
                  />
                  {!isEditingSettings && (
                    <p className="text-sm text-muted-foreground">
                      The name displayed for this classroom
                    </p>
                  )}
                </div>

                {/* Grade Level Field */}
                <div className="space-y-2">
                  <Label htmlFor="grade-level">Grade Level</Label>
                  <Select
                    value={isEditingSettings ? editFormData.gradeLevel.toString() : classroom.gradeLevel.toString()}
                    onValueChange={(value) => setEditFormData({ ...editFormData, gradeLevel: parseInt(value, 10) })}
                    disabled={!isEditingSettings || isSavingSettings}
                  >
                    <SelectTrigger id="grade-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                        <SelectItem key={grade} value={grade.toString()}>
                          Grade {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isEditingSettings && (
                    <p className="text-sm text-muted-foreground">
                      The grade level for this classroom
                    </p>
                  )}
                </div>

                {/* Classroom Code (Read-Only) */}
                <div className="space-y-2">
                  <Label>Classroom Code</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={classroom.code}
                      disabled
                      className="font-mono font-semibold"
                    />
                    <Button
                      type="button"
                      onClick={handleCopyCode}
                      variant="outline"
                      className="gap-2"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Students use this code to join the classroom
                  </p>
                </div>

                {/* Error Message */}
                {settingsError && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {settingsError}
                  </div>
                )}

                {/* Action Buttons (Edit Mode Only) */}
                {isEditingSettings && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEditSettings}
                      disabled={isSavingSettings}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSavingSettings}
                    >
                      {isSavingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Classroom
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete the classroom{' '}
                      <strong>{classroom.name}</strong> and remove all student enrollments.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteDialogOpen(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteClassroom}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Classroom'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
