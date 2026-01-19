'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { classroomsApi, Classroom } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Users, Copy, Check } from 'lucide-react';
import Link from 'next/link';

export default function ClassroomsPage() {
  const { accessToken } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [newClassroomGrade, setNewClassroomGrade] = useState('6');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const fetchClassrooms = async () => {
      try {
        const data = await classroomsApi.list(accessToken);
        setClassrooms(data.classrooms);
      } catch (error) {
        console.error('Failed to fetch classrooms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassrooms();
  }, [accessToken]);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newClassroomName.trim()) return;

    setIsCreating(true);
    try {
      const gradeLevel = parseInt(newClassroomGrade, 10);
      const { classroom } = await classroomsApi.create(newClassroomName, gradeLevel, accessToken);
      setClassrooms((prev) => [classroom, ...prev]);
      setNewClassroomName('');
      setNewClassroomGrade('6');
    } catch (error) {
      console.error('Failed to create classroom:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading classrooms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Classrooms</h2>
        <p className="text-muted-foreground">
          Manage your classrooms and share codes with students
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Classroom</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateClassroom} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classroom-name">Classroom Name</Label>
                <Input
                  id="classroom-name"
                  placeholder="e.g., Grade 3A or Advanced English"
                  value={newClassroomName}
                  onChange={(e) => setNewClassroomName(e.target.value)}
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade-level">Grade Level</Label>
                <Select
                  value={newClassroomGrade}
                  onValueChange={setNewClassroomGrade}
                  disabled={isCreating}
                >
                  <SelectTrigger id="grade-level">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                      <SelectItem key={grade} value={grade.toString()}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={!newClassroomName.trim() || isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              Create Classroom
            </Button>
          </form>
        </CardContent>
      </Card>

      {classrooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No classrooms yet. Create one to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <Card key={classroom.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{classroom.name}</span>
                    </div>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Grade {classroom.gradeLevel}
                    </p>
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                  <div>
                    <p className="text-sm font-medium">Classroom Code</p>
                    <p className="text-2xl font-bold tracking-wider">
                      {classroom.code}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyCode(classroom.code)}
                  >
                    {copiedCode === classroom.code ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {classroom._count?.enrollments || 0} student
                    {classroom._count?.enrollments !== 1 ? 's' : ''}
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/classrooms/${classroom.id}`}>View Details</Link>
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
