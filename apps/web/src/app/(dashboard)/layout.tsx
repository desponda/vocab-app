'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/sidebar';
import { VersionFooter } from '@/components/version-footer';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  // Redirect students to student dashboard
  useEffect(() => {
    if (!isLoading && user && user.role !== 'TEACHER') {
      console.log('[Dashboard Layout] Non-teacher detected, redirecting to student dashboard:', { email: user.email, role: user.role });
      router.push('/student-dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar Navigation */}
        <Sidebar userRole="TEACHER" userName={user?.name} />

        {/* Main Content Area */}
        <div className="flex-1 md:pl-64">
          {/* Top Header (Mobile + Desktop) */}
          <header className="sticky top-0 z-30 border-b bg-background px-4 py-3 md:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 md:ml-0 ml-12">
                {/* Spacer for mobile hamburger menu */}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user?.name}
                </span>
                <Button onClick={logout} variant="outline" size="sm">
                  Logout
                </Button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="container mx-auto px-4 py-8 max-w-7xl">
            {children}
          </main>

          {/* Footer */}
          <VersionFooter />
        </div>
      </div>
    </ProtectedRoute>
  );
}
