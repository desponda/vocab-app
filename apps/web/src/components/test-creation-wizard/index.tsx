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
  const uploadHook = useTestUpload();

  // Sync upload hook state to wizard context
  useEffect(() => {
    updateProcessing({
      stage: uploadHook.stage,
      progress: uploadHook.progress,
      message: uploadHook.message,
      sheetId: uploadHook.sheetId,
      error: uploadHook.error,
    });
  }, [uploadHook.stage, uploadHook.progress, uploadHook.message, uploadHook.sheetId, uploadHook.error, updateProcessing]);

  // Call onTestCreated when processing completes
  useEffect(() => {
    if (uploadHook.stage === 'complete' && uploadHook.sheetId && onTestCreated) {
      onTestCreated(uploadHook.sheetId);
    }
  }, [uploadHook.stage, uploadHook.sheetId, onTestCreated]);

  // Handle "Create Test" button click on Step 4
  const handleCreateTest = useCallback(async () => {
    if (!testType || !file) {
      return;
    }

    // Move to processing step
    nextStep();

    // Start upload
    await uploadHook.upload({
      file,
      name: config.name,
      testType,
      variants: config.variants,
      gradeLevel: config.gradeLevel,
      useAllWords: config.useAllWords,
      generatePreview: config.generatePreview,
    });
  }, [testType, file, config, nextStep, uploadHook]);

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
    if (uploadHook.stage === 'uploading') {
      if (confirm('Upload in progress. Cancel upload?')) {
        uploadHook.reset();
        resetWizard();
        onClose();
      }
      return;
    }

    if (uploadHook.stage === 'extracting' || uploadHook.stage === 'generating') {
      if (confirm('Processing will continue in background. Close wizard?')) {
        onClose();
      }
      return;
    }

    // Safe to close in other stages
    uploadHook.reset();
    resetWizard();
    onClose();
  }, [uploadHook.stage, uploadHook.reset, resetWizard, onClose]);

  // Browser-level protection during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploadHook.stage === 'uploading') {
        e.preventDefault();
        e.returnValue = 'Upload in progress. Leave page?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploadHook.stage]);

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
