'use client';

import { useWizard } from './WizardContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface WizardNavigationProps {
  onCancel?: () => void;
  onNext?: () => void;
}

export function WizardNavigation({ onCancel, onNext }: WizardNavigationProps) {
  const { state, previousStep, nextStep, canProceed } = useWizard();
  const { currentStep } = state;

  const isFirstStep = currentStep === 1;
  const isProcessingStep = currentStep === 5;

  const handleNext = () => {
    if (onNext) {
      onNext(); // Custom handler (e.g., for Step 4 to start upload)
    } else {
      nextStep(); // Default: just go to next step
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
      {/* Back button - only show on non-first, non-processing steps */}
      {!isFirstStep && !isProcessingStep && (
        <Button
          variant="outline"
          onClick={previousStep}
          className="w-full sm:w-auto min-h-[44px] gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      )}

      {/* Cancel button - only on first step */}
      {isFirstStep && onCancel && (
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full sm:w-auto min-h-[44px]"
        >
          Cancel
        </Button>
      )}

      {/* Spacer for desktop when Back button is shown */}
      {!isFirstStep && !isProcessingStep && <div className="hidden sm:flex sm:flex-1" />}

      {/* Next/Create Test button */}
      {!isProcessingStep && (
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className="w-full sm:w-auto min-h-[44px] gap-2 sm:ml-auto"
        >
          {currentStep === 4 ? (
            <>
              <Sparkles className="h-4 w-4" />
              Create Test
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
