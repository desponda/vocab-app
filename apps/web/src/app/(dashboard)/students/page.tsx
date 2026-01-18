'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { studentsApi, Student } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { CreateStudentDialog } from '@/components/students/create-student-dialog';

export default function StudentsPage() {
  const { accessToken } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!accessToken) return;

      try {
        setIsLoading(true);
        const { students: fetchedStudents } = await studentsApi.list(
          accessToken
        );
        setStudents(fetchedStudents);
      } catch (err) {
        console.error('Failed to fetch students:', err);
        setError('Failed to load students');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [accessToken]);

  const handleStudentCreated = (student: Student) => {
    setStudents((prev) => [...prev, student]);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Students</h2>
          <p className="text-muted-foreground">
            Manage your students and their learning progress
          </p>
        </div>
        <CreateStudentDialog
          onStudentCreated={handleStudentCreated}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          }
        />
      </div>

      {students.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No students yet</CardTitle>
            <CardDescription>
              Get started by adding your first student
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateStudentDialog
              onStudentCreated={handleStudentCreated}
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Card key={student.id}>
              <CardHeader>
                <CardTitle>{student.name}</CardTitle>
                <CardDescription>Grade {student.gradeLevel}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href={`/students/${student.id}`}>
                    <Button className="w-full" variant="outline">
                      View & Upload Files
                    </Button>
                  </Link>
                  <Button className="w-full" variant="outline">
                    Practice Tests
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
