'use client';

import { useWizard } from './WizardContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="flex items-center justify-between pt-6 border-t">
      {/* Back/Cancel button */}
      <div>
        {!isFirstStep && !isProcessingStep && (
          <Button variant="ghost" onClick={previousStep} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {isFirstStep && onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Next button */}
      <div>
        {!isProcessingStep && (
          <Button onClick={handleNext} disabled={!canProceed} className="gap-2">
            {currentStep === 4 ? 'Create Test' : 'Next'}
            {currentStep !== 4 && <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
