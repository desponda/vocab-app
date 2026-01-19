import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-purple-600 py-20 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Vocabulary Testing</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            AI-Powered Vocabulary Practice for Students
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/90 sm:text-xl md:text-2xl">
            Transform vocabulary lists into personalized practice tests in seconds.
            Upload images, generate tests, and track student progress automatically.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register?role=teacher">
              <Button size="lg" className="w-full bg-white text-primary hover:bg-white/90 sm:w-auto">
                Get Started Free
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto"
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* Trust signal */}
          <p className="mt-6 text-sm text-white/70">
            No credit card required • Free to start
          </p>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z"
            fill="currentColor"
            className="text-background"
          />
        </svg>
      </div>
    </section>
  );
}
