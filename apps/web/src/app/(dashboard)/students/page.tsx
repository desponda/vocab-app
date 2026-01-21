'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { studentsApi, ApiError } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Error500 } from '@/components/error/http-errors';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { Users, Search, Loader2 } from 'lucide-react';
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

export default function StudentsPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { handleError } = useErrorHandler({ showToast: false });

  const fetchStudents = async () => {
    if (!accessToken) return;

    try {
      setIsLoading(true);
      setError(null);
      const { students } = await studentsApi.getAllEnriched(accessToken);
      setStudents(students);
    } catch (err) {
      handleError(err, 'Failed to load students');
      setError(err instanceof ApiError ? err.message : 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;

    const query = searchQuery.toLowerCase();
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.classroomName.toLowerCase().includes(query) ||
        (student.gradeLevel && `grade ${student.gradeLevel}`.includes(query))
    );
  }, [students, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <Error500 preserveLayout={true} onRetry={fetchStudents} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Students</h2>
        <p className="text-muted-foreground">
          All students enrolled across your classrooms
        </p>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Students will appear here once they sign up using your classroom codes. Share your classroom codes to get started."
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Enrolled Students ({students.length})</CardTitle>
                <CardDescription>
                  Students who have registered and joined your classrooms
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name, classroom, or grade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Students Table */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No students found matching &quot;{searchQuery}&quot;
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Classroom</TableHead>
                      <TableHead className="hidden md:table-cell">Grade Level</TableHead>
                      <TableHead className="hidden lg:table-cell">Tests Taken</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow
                        key={`${student.id}-${student.classroomId}`}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/students/${student.id}`)}
                      >
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.classroomName}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {student.gradeLevel ? (
                            <Badge variant="secondary">Grade {student.gradeLevel}</Badge>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{student.testsAttempted}</TableCell>
                        <TableCell>
                          {student.avgScore !== null ? (
                            <Badge variant={getScoreBadgeVariant(student.avgScore)}>
                              {Math.round(student.avgScore)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {student.lastActive ? (
                            <span className="text-muted-foreground">
                              {formatRelativeDate(student.lastActive)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
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
      )}
    </div>
  );
}
