'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  StudentEnrollmentSection,
  CTASection,
  Footer,
} from '@/components/landing';
import { Loader2 } from 'lucide-react';

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!isLoading && user) {
      const targetPath = user.role === 'STUDENT' ? '/student-dashboard' : '/dashboard';
      router.push(targetPath);
    }
  }, [user, isLoading, router]);

  // Show loading while checking auth
  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render landing page for unauthenticated users
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StudentEnrollmentSection />
      <CTASection />
      <Footer />
    </main>
  );
}
