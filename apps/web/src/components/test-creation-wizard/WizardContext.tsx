'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import {
  WizardState,
  WizardContextValue,
  WizardConfig,
  ProcessingStatus,
  INITIAL_WIZARD_STATE,
  WIZARD_STEPS,
} from './types';

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

interface WizardProviderProps {
  children: ReactNode;
  onComplete?: (sheetId: string) => void;
}

export function WizardProvider({ children, onComplete }: WizardProviderProps) {
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateConfig = useCallback((updates: Partial<WizardConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...updates },
    }));
  }, []);

  const updateProcessing = useCallback((updates: Partial<ProcessingStatus>) => {
    setState(prev => ({
      ...prev,
      processing: { ...prev.processing, ...updates },
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step < 1 || step > WIZARD_STEPS.length) return;

    setState(prev => ({
      ...prev,
      currentStep: step,
      visitedSteps: new Set([...prev.visitedSteps, step]),
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const nextStep = Math.min(prev.currentStep + 1, WIZARD_STEPS.length);
      return {
        ...prev,
        currentStep: nextStep,
        visitedSteps: new Set([...prev.visitedSteps, nextStep]),
      };
    });
  }, []);

  const previousStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  const resetWizard = useCallback(() => {
    setState(INITIAL_WIZARD_STATE);
  }, []);

  // Validation logic - can we proceed from current step?
  const canProceed = useMemo(() => {
    switch (state.currentStep) {
      case 1: // Test Type Selection
        return state.testType !== null;

      case 2: // File Upload
        return state.file !== null;

      case 3: // Configuration
        return state.config.name.trim().length > 0 && state.config.name.length <= 100;

      case 4: // Review (always can proceed)
        return true;

      case 5: // Processing (can't manually proceed)
        return false;

      default:
        return false;
    }
  }, [state.currentStep, state.testType, state.file, state.config.name]);

  const value: WizardContextValue = useMemo(
    () => ({
      state,
      updateState,
      updateConfig,
      updateProcessing,
      goToStep,
      nextStep,
      previousStep,
      resetWizard,
      canProceed,
    }),
    [state, updateState, updateConfig, updateProcessing, goToStep, nextStep, previousStep, resetWizard, canProceed]
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
}
