'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Button } from '@/components/ui/button';
import { VersionFooter } from '@/components/version-footer';
import { cn } from '@/lib/utils';

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();

  // Redirect to login if not a student
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: '/student-dashboard', label: 'My Tests' },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="border-b bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-2xl font-bold">Vocab App</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {user?.name}
                </span>
                <Button onClick={logout} variant="outline" size="sm">
                  Logout
                </Button>
              </div>
            </div>
            <nav className="flex h-12 items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-primary',
                    pathname === link.href
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
        <VersionFooter />
      </div>
    </ProtectedRoute>
  );
}
