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
    <div className="space-y-6">
      <WizardProgress />

      <div className="min-h-[400px]">
        {renderStep()}
      </div>

      <WizardNavigation onCancel={handleClose} onNext={handleNext} />
    </div>
  );
}

export function TestCreationWizard({ open, onOpenChange, onTestCreated }: TestCreationWizardProps) {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-sm:h-full max-sm:max-w-full max-sm:rounded-none">
        <DialogHeader>
          <DialogTitle>Create Test</DialogTitle>
          <DialogDescription>
            Upload a worksheet or study guide to generate practice tests for your students
          </DialogDescription>
        </DialogHeader>

        <WizardProvider>
          <WizardContent
            onClose={handleClose}
            onTestCreated={onTestCreated}
          />
        </WizardProvider>
      </DialogContent>
    </Dialog>
  );
}
