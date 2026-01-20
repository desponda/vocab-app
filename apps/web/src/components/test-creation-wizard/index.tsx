'use client';

import { useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WizardProvider, useWizard } from './WizardContext';
import { WizardProgress } from './WizardProgress';
import { WizardNavigation } from './WizardNavigation';
import { Step1TypeSelection } from './Step1TypeSelection';
import { Step2FileUpload } from './Step2FileUpload';
import { Step3Configuration } from './Step3Configuration';
import { Step4Review } from './Step4Review';
import { Step5Processing } from './Step5Processing';
import { useTestUpload } from './useTestUpload';

interface TestCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCreated?: (sheetId: string) => void;
}

function WizardContent({ onClose, onTestCreated }: { onClose: () => void; onTestCreated?: (sheetId: string) => void }) {
  const { state, resetWizard, nextStep, updateProcessing } = useWizard();
  const { currentStep, testType, file, config } = state;
  const { stage, progress, message, sheetId, error, upload, reset } = useTestUpload();

  // Sync upload hook state to wizard context
  // Only update if values actually changed to prevent infinite re-renders
  useEffect(() => {
    updateProcessing({
      stage,
      progress,
      message,
      sheetId,
      error,
    });
  }, [stage, progress, message, sheetId, error, updateProcessing]);

  // Call onTestCreated when processing completes
  useEffect(() => {
    if (stage === 'complete' && sheetId && onTestCreated) {
      onTestCreated(sheetId);
    }
  }, [stage, sheetId, onTestCreated]);

  // Handle "Create Test" button click on Step 4
  const handleCreateTest = useCallback(async () => {
    if (!testType || !file) {
      return;
    }

    // Move to processing step
    nextStep();

    // Start upload
    await upload({
      file,
      name: config.name,
      testType,
      variants: config.variants,
      gradeLevel: config.gradeLevel,
      useAllWords: config.useAllWords,
      generatePreview: config.generatePreview,
    });
  }, [testType, file, config, nextStep, upload]);

  // Handle "Next" button - on step 4 this becomes "Create Test"
  const handleNext = useCallback(() => {
    if (currentStep === 4) {
      handleCreateTest();
    } else {
      nextStep();
    }
  }, [currentStep, handleCreateTest, nextStep]);

  // Handle dialog close with confirmation if needed
  const handleClose = useCallback(() => {
    if (stage === 'uploading') {
      if (confirm('Upload in progress. Cancel upload?')) {
        reset();
        resetWizard();
        onClose();
      }
      return;
    }

    if (stage === 'extracting' || stage === 'generating') {
      if (confirm('Processing will continue in background. Close wizard?')) {
        onClose();
      }
      return;
    }

    // Safe to close in other stages
    reset();
    resetWizard();
    onClose();
  }, [stage, reset, resetWizard, onClose]);

  // Browser-level protection during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stage === 'uploading') {
        e.preventDefault();
        e.returnValue = 'Upload in progress. Leave page?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stage]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1TypeSelection />;

      case 2:
        return <Step2FileUpload />;

      case 3:
        return <Step3Configuration />;

      case 4:
        return <Step4Review />;

      case 5:
        return <Step5Processing />;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)] sm:max-h-none">
      {/* Progress - fixed at top */}
      <div className="flex-shrink-0">
        <WizardProgress />
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto px-1 py-4 sm:py-6">
        <div className="max-w-3xl mx-auto">
          {renderStep()}
        </div>
      </div>

      {/* Navigation - fixed at bottom on mobile */}
      <div className="flex-shrink-0 border-t bg-background pt-4">
        <WizardNavigation onCancel={handleClose} onNext={handleNext} />
      </div>
    </div>
  );
}

export function TestCreationWizard({ open, onOpenChange, onTestCreated }: TestCreationWizardProps) {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-sm:fixed max-sm:inset-0 max-sm:h-screen max-sm:max-h-screen max-sm:w-screen max-sm:max-w-full max-sm:rounded-none max-sm:border-0 flex flex-col p-0 sm:p-6">
        <div className="flex-shrink-0 px-6 pt-6 sm:p-0">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create Test</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Upload a worksheet to generate practice tests
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden px-6 pb-6 sm:p-0">
          <WizardProvider>
            <WizardContent
              onClose={handleClose}
              onTestCreated={onTestCreated}
            />
          </WizardProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
