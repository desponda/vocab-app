'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { classroomsApi } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StudentWithClassroom {
  id: string;
  name: string;
  gradeLevel: number | null | undefined;
  classroomName: string;
  enrolledAt: string;
}

export default function StudentsPage() {
  const { accessToken } = useAuth();
  const [students, setStudents] = useState<StudentWithClassroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!accessToken) return;

      try {
        setIsLoading(true);

        // Get all classrooms with enrollments
        const { classrooms } = await classroomsApi.list(accessToken);

        // Fetch detailed enrollment data for each classroom
        const allStudents: StudentWithClassroom[] = [];

        for (const classroom of classrooms) {
          const { classroom: detailedClassroom } = await classroomsApi.get(
            classroom.id,
            accessToken
          );

          const enrollments = detailedClassroom.enrollments || [];

          enrollments.forEach((enrollment) => {
            if (enrollment.student) {
              allStudents.push({
                id: enrollment.student.id,
                name: enrollment.student.name,
                gradeLevel: enrollment.student.gradeLevel,
                classroomName: detailedClassroom.name,
                enrolledAt: enrollment.enrolledAt,
              });
            }
          });
        }

        // Sort by enrollment date (most recent first)
        allStudents.sort((a, b) =>
          new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
        );

        setStudents(allStudents);
      } catch (err) {
        console.error('Failed to fetch students:', err);
        setError('Failed to load students');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [accessToken]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">{error}</p>
      </div>
    );
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
        <Card>
          <CardHeader>
            <CardTitle>No students yet</CardTitle>
            <CardDescription>
              Students will appear here once they sign up using your classroom codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Share your classroom codes with students so they can register and enroll.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Students ({students.length})</CardTitle>
            <CardDescription>
              Students who have registered and joined your classrooms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Classroom</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={`${student.id}-${student.classroomName}`}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.classroomName}</TableCell>
                    <TableCell>
                      {student.gradeLevel ? `Grade ${student.gradeLevel}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {new Date(student.enrolledAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
