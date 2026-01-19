'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/stat-card';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  GraduationCap,
  BookOpen,
  Activity,
  Plus,
  Upload,
  Eye,
  Loader2,
  FileText,
} from 'lucide-react';
import { getTimeBasedGreeting, formatRelativeDate } from '@/lib/utils';

interface DashboardStats {
  totalStudents: number;
  activeClassrooms: number;
  vocabularySheets: {
    total: number;
    processing: number;
  };
  recentActivityCount: number;
}

interface Classroom {
  id: string;
  name: string;
  gradeLevel: number;
  code: string;
  _count: {
    enrollments: number;
  };
}

interface VocabularySheet {
  id: string;
  name: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  uploadedAt: string;
  _count?: {
    words: number;
    tests: number;
  };
}

export default function DashboardPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentClassrooms, setRecentClassrooms] = useState<Classroom[]>([]);
  const [recentSheets, setRecentSheets] = useState<VocabularySheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!accessToken) return;

      try {
        // Fetch dashboard stats
        const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/teachers/dashboard-stats`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        // Fetch recent classrooms
        const classroomsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/classrooms`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (classroomsRes.ok) {
          const data = await classroomsRes.json();
          setRecentClassrooms(data.classrooms.slice(0, 5));
        }

        // Fetch recent vocabulary sheets
        const sheetsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/vocabulary-sheets`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (sheetsRes.ok) {
          const data = await sheetsRes.json();
          setRecentSheets(data.sheets.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [accessToken]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {getTimeBasedGreeting()}
        </h2>
        <p className="text-muted-foreground">
          Here's what's happening with your classrooms today
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            icon={Users}
            color="green"
            onClick={() => router.push('/students')}
          />
          <StatCard
            title="Active Classrooms"
            value={stats.activeClassrooms}
            icon={GraduationCap}
            color="purple"
            onClick={() => router.push('/classrooms')}
          />
          <StatCard
            title="Vocabulary Sheets"
            value={stats.vocabularySheets.total}
            icon={BookOpen}
            color="blue"
            onClick={() => router.push('/vocabulary')}
          />
          <StatCard
            title="Recent Activity"
            value={stats.recentActivityCount}
            icon={Activity}
            color="orange"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push('/classrooms')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Classroom
          </Button>
          <Button onClick={() => router.push('/vocabulary')} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Vocabulary
          </Button>
          <Button onClick={() => router.push('/students')} variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            View All Students
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Classrooms */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Classrooms</CardTitle>
              <Link href="/classrooms">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentClassrooms.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No classrooms yet"
                description="Create your first classroom to get started"
                action={{
                  label: 'Create Classroom',
                  onClick: () => router.push('/classrooms'),
                }}
              />
            ) : (
              <div className="space-y-3">
                {recentClassrooms.map((classroom) => (
                  <div
                    key={classroom.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/classrooms/${classroom.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{classroom.name}</p>
                        <Badge variant="secondary">Grade {classroom.gradeLevel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {classroom._count.enrollments} {classroom._count.enrollments === 1 ? 'student' : 'students'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Vocabulary Uploads */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Vocabulary</CardTitle>
              <Link href="/vocabulary">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentSheets.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No vocabulary sheets yet"
                description="Upload your first vocabulary sheet"
                action={{
                  label: 'Upload Vocabulary',
                  onClick: () => router.push('/vocabulary'),
                }}
              />
            ) : (
              <div className="space-y-3">
                {recentSheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/vocabulary/${sheet.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{sheet.name}</p>
                        {sheet.status === 'PROCESSING' && (
                          <Badge variant="secondary" className="gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processing
                          </Badge>
                        )}
                        {sheet.status === 'COMPLETED' && (
                          <Badge variant="default">Completed</Badge>
                        )}
                        {sheet.status === 'FAILED' && (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeDate(sheet.uploadedAt)}
                        {sheet._count && ` • ${sheet._count.words} words • ${sheet._count.tests} tests`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
