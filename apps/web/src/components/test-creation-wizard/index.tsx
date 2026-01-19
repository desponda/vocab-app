'use client';

import { useEffect } from 'react';
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

interface TestCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCreated?: (sheetId: string) => void;
}

function WizardContent({ onClose, onTestCreated }: { onClose: () => void; onTestCreated?: (sheetId: string) => void }) {
  const { state, resetWizard } = useWizard();
  const { currentStep, processing } = state;

  // Call onTestCreated when processing completes
  useEffect(() => {
    if (processing.stage === 'complete' && processing.sheetId && onTestCreated) {
      onTestCreated(processing.sheetId);
    }
  }, [processing.stage, processing.sheetId, onTestCreated]);

  // Handle dialog close with confirmation if needed
  const handleClose = () => {
    if (processing.stage === 'uploading') {
      if (confirm('Upload in progress. Cancel upload?')) {
        // TODO: Cancel upload XHR
        resetWizard();
        onClose();
      }
      return;
    }

    if (processing.stage === 'extracting' || processing.stage === 'generating') {
      if (confirm('Processing will continue in background. Close wizard?')) {
        onClose();
      }
      return;
    }

    // Safe to close in other stages
    resetWizard();
    onClose();
  };

  // Browser-level protection during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (processing.stage === 'uploading') {
        e.preventDefault();
        e.returnValue = 'Upload in progress. Leave page?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [processing.stage]);

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

      <WizardNavigation onCancel={handleClose} />
    </div>
  );
}

export function TestCreationWizard({ open, onOpenChange, onTestCreated }: TestCreationWizardProps) {
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
            onClose={() => onOpenChange(false)}
            onTestCreated={onTestCreated}
          />
        </WizardProvider>
      </DialogContent>
    </Dialog>
  );
}
