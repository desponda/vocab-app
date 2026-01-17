'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="border-b bg-white dark:bg-gray-900">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
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
        </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
