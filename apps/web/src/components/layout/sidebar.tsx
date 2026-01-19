'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, BookOpen, Sparkles, Menu, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const teacherNavItems: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Classrooms', href: '/classrooms', icon: School },
  { label: 'Vocabulary', href: '/vocabulary', icon: BookOpen },
  { label: 'Students', href: '/students', icon: Users },
];

const studentNavItems: NavItem[] = [
  { label: 'My Tests', href: '/student-dashboard', icon: Home },
];

interface SidebarProps {
  userRole: 'TEACHER' | 'STUDENT';
  userName?: string;
}

function SidebarNav({ items, currentPath }: { items: NavItem[]; currentPath: string }) {
  return (
    <nav className="space-y-1" aria-label="Main navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
            {item.badge && (
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs" aria-label={`${item.badge} items`}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const navItems = userRole === 'TEACHER' ? teacherNavItems : studentNavItems;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 md:border-r md:bg-background" aria-label="Sidebar">
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center gap-2 px-6 py-4 border-b">
            <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg font-semibold">TestCraft AI</span>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <SidebarNav items={navItems} currentPath={pathname} />
          </div>

          {/* Footer */}
          {userName && (
            <>
              <Separator />
              <div className="p-4">
                <p className="text-sm text-muted-foreground truncate">{userName}</p>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-40"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              {/* Logo/Header */}
              <div className="flex items-center gap-2 px-6 py-4 border-b">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold">TestCraft AI</span>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto py-4 px-3">
                <SidebarNav items={navItems} currentPath={pathname} />
              </div>

              {/* Footer */}
              {userName && (
                <>
                  <Separator />
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground truncate">{userName}</p>
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
