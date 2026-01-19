'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Zap, CheckCircle2, Users, TrendingUp, Smartphone } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

const features = [
  {
    icon: Brain,
    title: 'Multi-Type Test Generation',
    description:
      'Create vocabulary, spelling, and knowledge tests from any image. One platform, every assessment type.',
  },
  {
    icon: Zap,
    title: 'Instant AI Extraction',
    description:
      'Upload photos of worksheets or study guides. AI extracts content and generates 3-10 test variants in seconds.',
  },
  {
    icon: CheckCircle2,
    title: 'Auto-Grading & Feedback',
    description:
      'Tests grade themselves instantly with detailed performance tracking and insights.',
  },
  {
    icon: Users,
    title: 'Classroom Management',
    description:
      'Organize students by classroom with unique join codes and bulk test assignment.',
  },
  {
    icon: TrendingUp,
    title: 'Performance Analytics',
    description:
      'Track progress with charts, identify struggling students, and export detailed reports.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-Optimized',
    description:
      'Students test on any device. Teachers manage from anywhere. Works offline.',
  },
];

export function FeaturesSection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Everything You Need for Practice Testing
          </h2>
          <p className="text-lg text-muted-foreground md:text-xl">
            Powerful AI features designed to save time and improve student outcomes
          </p>
        </div>

        {/* Features grid */}
        <div ref={ref} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className={`border-2 transition-all hover:border-primary/50 hover:shadow-lg ${
                  isVisible ? 'animate-slide-in' : 'opacity-0'
                }`}
                style={{
                  animationDelay: isVisible ? `${index * 100}ms` : '0ms',
                }}
              >
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
