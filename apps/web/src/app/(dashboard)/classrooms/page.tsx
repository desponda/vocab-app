'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { classroomsApi, Classroom } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { ClassroomListItem } from '@/components/classroom/classroom-list-item';
import { CreateClassroomDialog } from '@/components/classroom/create-classroom-dialog';
import { EmptyState } from '@/components/dashboard/empty-state';
import { GraduationCap, Search, Loader2 } from 'lucide-react';

export default function ClassroomsPage() {
  const { accessToken } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleClassroomCreated = (classroom: Classroom) => {
    setClassrooms((prev) => [classroom, ...prev]);
  };

  // Filter classrooms based on search query
  const filteredClassrooms = useMemo(() => {
    if (!searchQuery.trim()) return classrooms;

    const query = searchQuery.toLowerCase();
    return classrooms.filter(
      (classroom) =>
        classroom.name.toLowerCase().includes(query) ||
        classroom.code.toLowerCase().includes(query) ||
        `grade ${classroom.gradeLevel}`.includes(query)
    );
  }, [classrooms, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Classrooms</h2>
          <p className="text-muted-foreground">
            Manage your classrooms and share codes with students
          </p>
        </div>
        <CreateClassroomDialog
          accessToken={accessToken}
          onClassroomCreated={handleClassroomCreated}
        />
      </div>

      {classrooms.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No classrooms yet"
          description="Create your first classroom to get started with managing students and assigning tests"
        />
      ) : (
        <>
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classrooms by name, code, or grade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Classrooms List */}
          {filteredClassrooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No classrooms found matching &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClassrooms.map((classroom) => (
                <ClassroomListItem
                  key={classroom.id}
                  id={classroom.id}
                  name={classroom.name}
                  gradeLevel={classroom.gradeLevel}
                  code={classroom.code}
                  studentCount={classroom._count?.enrollments || 0}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
