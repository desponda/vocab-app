/**
 * Test Creation Wizard - Type Definitions
 */

export type TestType = 'VOCABULARY' | 'SPELLING' | 'GENERAL_KNOWLEDGE';

export type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'generating'
  | 'finalizing'
  | 'complete'
  | 'error';

export interface WizardConfig {
  name: string;
  gradeLevel: number | undefined;
  variants: number; // 3-10
  useAllWords: boolean; // Only for SPELLING
  generatePreview: boolean; // Optional preview before commit
}

export interface ProcessingStatus {
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  sheetId: string | null;
  error: string | null;
  estimatedTime?: string;
}

export interface WizardState {
  currentStep: number; // 1-5
  testType: TestType | null;
  file: File | null;
  config: WizardConfig;
  processing: ProcessingStatus;
  visitedSteps: Set<number>;
}

export interface WizardContextValue {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  updateConfig: (updates: Partial<WizardConfig>) => void;
  updateProcessing: (updates: Partial<ProcessingStatus>) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetWizard: () => void;
  canProceed: boolean;
}

export const INITIAL_CONFIG: WizardConfig = {
  name: '',
  gradeLevel: undefined,
  variants: 3,
  useAllWords: false,
  generatePreview: false,
};

export const INITIAL_PROCESSING: ProcessingStatus = {
  stage: 'idle',
  progress: 0,
  message: '',
  sheetId: null,
  error: null,
};

export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 1,
  testType: null,
  file: null,
  config: INITIAL_CONFIG,
  processing: INITIAL_PROCESSING,
  visitedSteps: new Set([1]),
};

export const WIZARD_STEPS = [
  { id: 1, label: 'Test Type', description: 'Choose test type' },
  { id: 2, label: 'Upload', description: 'Upload file' },
  { id: 3, label: 'Configure', description: 'Set options' },
  { id: 4, label: 'Review', description: 'Review and confirm' },
  { id: 5, label: 'Processing', description: 'Creating tests' },
] as const;

export type WizardStepId = typeof WIZARD_STEPS[number]['id'];
