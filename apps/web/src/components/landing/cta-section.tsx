import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="bg-gradient-to-br from-primary via-primary/95 to-purple-600 py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Headline */}
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Ready to Transform Vocabulary Practice?
          </h2>

          {/* Subheadline */}
          <p className="mb-10 text-lg text-white/90 sm:text-xl md:text-2xl">
            Join teachers using AI-powered testing to improve student learning
          </p>

          {/* CTA Button */}
          <div className="flex flex-col items-center justify-center gap-4">
            <Link href="/register?role=teacher">
              <Button
                size="lg"
                className="group w-full bg-white text-primary hover:bg-white/90 sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            {/* Trust signal */}
            <p className="text-sm text-white/70">
              No credit card required • Get started in minutes
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
