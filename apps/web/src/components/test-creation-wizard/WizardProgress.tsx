'use client';

import { useWizard } from './WizardContext';
import { WIZARD_STEPS } from './types';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function WizardProgress() {
  const { state } = useWizard();
  const { currentStep, visitedSteps } = state;

  return (
    <nav aria-label="Progress" className="mb-4 sm:mb-8">
      {/* Desktop: Full progress bar */}
      <ol className="hidden sm:flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <li key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Step indicator */}
                <div className="flex items-center w-full">
                  {index > 0 && (
                    <div
                      className={cn(
                        'h-0.5 flex-1 transition-colors',
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}

                  <div
                    className={cn(
                      'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                      isActive && 'border-primary bg-primary text-primary-foreground shadow-lg',
                      isCompleted && 'border-primary bg-primary text-primary-foreground',
                      !isActive &&
                        !isCompleted &&
                        'border-muted-foreground/30 bg-background text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}

                    {isActive && (
                      <span className="absolute -inset-1 rounded-full border-2 border-primary animate-pulse" />
                    )}
                  </div>

                  {index < WIZARD_STEPS.length - 1 && (
                    <div
                      className={cn(
                        'h-0.5 flex-1 transition-colors',
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                </div>

                {/* Step label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isActive && 'text-primary',
                      !isActive && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile: Compact step indicator */}
      <div className="sm:hidden flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            {currentStep}
          </div>
          <div>
            <p className="text-sm font-medium">{WIZARD_STEPS[currentStep - 1].label}</p>
            <p className="text-xs text-muted-foreground">
              Step {currentStep} of {WIZARD_STEPS.length}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.round((currentStep / WIZARD_STEPS.length) * 100)}%
        </span>
      </div>
    </nav>
  );
}
