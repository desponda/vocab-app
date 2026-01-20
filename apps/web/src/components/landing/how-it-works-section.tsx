'use client';

import { Upload, Wand2, Send } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

const steps = [
  {
    number: 1,
    icon: Upload,
    title: 'Upload Vocabulary',
    description:
      'Take a photo of your vocabulary list or upload a PDF. Our AI extracts words and definitions automatically.',
  },
  {
    number: 2,
    icon: Wand2,
    title: 'Generate Tests',
    description:
      'Create multiple test variants instantly with varied question types (spelling, definitions, fill-in-blank, multiple choice).',
  },
  {
    number: 3,
    icon: Send,
    title: 'Assign & Track',
    description:
      'Share classroom codes with students. They take tests on their devices and you see results in real-time.',
  },
];

export function HowItWorksSection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section id="how-it-works" className="bg-muted/50 py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground md:text-xl">
            Get started in three simple steps
          </p>
        </div>

        {/* Steps timeline */}
        <div ref={ref} className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className={`relative ${
                    isVisible ? 'animate-slide-in' : 'opacity-0'
                  }`}
                  style={{
                    animationDelay: isVisible ? `${index * 150}ms` : '0ms',
                  }}
                >
                  {/* Connector line (hidden on mobile, shown on desktop between steps) */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-gradient-to-r from-primary to-primary/30 md:block" />
                  )}

                  {/* Step card */}
                  <div className="relative z-10 text-center">
                    {/* Number badge */}
                    <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-4xl font-bold text-primary-foreground shadow-lg">
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-md">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>

                    {/* Content */}
                    <h3 className="mb-3 text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
