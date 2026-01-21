'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { classroomsApi, Classroom, ApiError } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { ClassroomListItem } from '@/components/classroom/classroom-list-item';
import { CreateClassroomDialog } from '@/components/classroom/create-classroom-dialog';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Error500 } from '@/components/error/http-errors';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { GraduationCap, Search, Loader2 } from 'lucide-react';

export default function ClassroomsPage() {
  const { accessToken } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler({ showToast: false });

  const fetchClassrooms = async () => {
    if (!accessToken) return;

    try {
      setError(null);
      const data = await classroomsApi.list(accessToken);
      setClassrooms(data.classrooms);
    } catch (err) {
      handleError(err, 'Failed to load classrooms');
      setError(err instanceof ApiError ? err.message : 'Failed to load classrooms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (error) {
    return <Error500 preserveLayout={true} onRetry={fetchClassrooms} />;
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
          {/* Search Bar - sticky on mobile for easy access while scrolling */}
          <div className="sticky top-0 z-10 bg-background pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classrooms by name, code, or grade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
