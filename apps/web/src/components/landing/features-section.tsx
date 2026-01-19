'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Zap, CheckCircle2, Users, TrendingUp, Smartphone } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Extraction',
    description:
      'Upload photos of vocabulary lists and our AI automatically extracts words and definitions',
  },
  {
    icon: Zap,
    title: 'Instant Test Generation',
    description:
      'Generate 3-10 test variants automatically with multiple question types',
  },
  {
    icon: CheckCircle2,
    title: 'Auto-Grading',
    description:
      'Tests are graded instantly with detailed feedback and performance tracking',
  },
  {
    icon: Users,
    title: 'Classroom Management',
    description:
      'Organize students by classroom with unique join codes',
  },
  {
    icon: TrendingUp,
    title: 'Progress Analytics',
    description:
      'Track student progress with detailed analytics and performance charts',
  },
  {
    icon: Smartphone,
    title: 'Mobile-Friendly',
    description:
      'Students can take tests on any device, anywhere',
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
            Everything you need to teach vocabulary
          </h2>
          <p className="text-lg text-muted-foreground md:text-xl">
            Powerful features designed to save time and improve learning outcomes
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
                  isVisible
                    ? 'animate-in fade-in slide-in-from-bottom-4'
                    : 'opacity-0'
                }`}
                style={{
                  animationDelay: isVisible ? `${index * 100}ms` : '0ms',
                  animationDuration: '500ms',
                  animationFillMode: 'both',
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
