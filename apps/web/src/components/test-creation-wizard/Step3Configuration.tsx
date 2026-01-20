'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useWizard } from './WizardContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Info, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

const configSchema = z.object({
  name: z.string().min(1, 'Test name is required').max(100, 'Test name must be 100 characters or less'),
  gradeLevel: z.number().min(1).max(12).optional(),
  variants: z.number().min(3).max(10),
  useAllWords: z.boolean(),
  generatePreview: z.boolean(),
});

type ConfigFormData = z.infer<typeof configSchema>;

function generateTestName(fileName: string): string {
  // Remove extension
  const nameWithoutExt = fileName.replace(/\.(png|jpg|jpeg|webp|pdf)$/i, '');

  // Replace underscores and hyphens with spaces
  const withSpaces = nameWithoutExt.replace(/[_-]/g, ' ');

  // Capitalize first letter of each word
  const capitalized = withSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return capitalized.trim();
}

export function Step3Configuration() {
  const { state, updateConfig } = useWizard();
  const { config, file, testType } = state;
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      name: config.name,
      gradeLevel: config.gradeLevel,
      variants: config.variants,
      useAllWords: config.useAllWords,
      generatePreview: config.generatePreview,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  // Auto-generate name from file if empty
  useEffect(() => {
    if (file && !config.name) {
      const generatedName = generateTestName(file.name);
      setValue('name', generatedName);
      updateConfig({ name: generatedName });
    }
  }, [file, config.name, setValue, updateConfig]);

  // Sync form values to wizard state
  useEffect(() => {
    updateConfig({
      name: watchedValues.name,
      gradeLevel: watchedValues.gradeLevel,
      variants: watchedValues.variants,
      useAllWords: watchedValues.useAllWords,
      generatePreview: watchedValues.generatePreview,
    });
  }, [watchedValues, updateConfig]);

  const gradeLevels = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="space-y-1 sm:space-y-2">
        <h3 className="text-lg sm:text-xl font-semibold">Configure Your Test</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Customize the test settings and options
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Test Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Test Name
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter test name"
            className={cn(errors.name && 'border-destructive')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            This name will be visible to students when they take the test
          </p>
        </div>

        {/* Grade Level */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="gradeLevel">Grade Level (Optional)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Adjusts question complexity and phrasing to be age-appropriate.
                    This doesn&apos;t affect which words are included, just how questions are worded.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={watchedValues.gradeLevel?.toString() || undefined}
            onValueChange={(value) => setValue('gradeLevel', value ? parseInt(value) : undefined)}
          >
            <SelectTrigger id="gradeLevel">
              <SelectValue placeholder="Select grade level" />
            </SelectTrigger>
            <SelectContent>
              {gradeLevels.map((grade) => (
                <SelectItem key={grade} value={grade.toString()}>
                  Grade {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Leave empty for general audience
          </p>
        </div>

        {/* Number of Variants */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label>Number of Test Variants: {watchedValues.variants}</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Creates different versions of the same test with questions in different orders.
                    Useful for preventing cheating when students sit near each other.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="px-2">
            <Slider
              value={[watchedValues.variants]}
              onValueChange={(value) => setValue('variants', value[0])}
              min={3}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>3 variants</span>
              <span>10 variants</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            More variants = more variety, but longer processing time
          </p>
        </div>

        {/* Validation Warnings */}
        {watchedValues.variants >= 8 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Higher processing time:</strong> Generating {watchedValues.variants} test variants will take approximately {Math.ceil(watchedValues.variants * 0.5)}-{Math.ceil(watchedValues.variants * 1)} minutes.
            </AlertDescription>
          </Alert>
        )}

        {watchedValues.generatePreview && watchedValues.variants >= 5 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Extended processing:</strong> Preview generation with {watchedValues.variants} variants will add significant time. Consider disabling preview or reducing variants if you need results quickly.
            </AlertDescription>
          </Alert>
        )}

        {/* Advanced Options */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-4 h-auto">
              <span className="font-semibold">Advanced Options</span>
              {isAdvancedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4 px-4 pb-2">
            {/* Use All Words - Only for SPELLING */}
            {testType === 'SPELLING' && (
              <>
                <div className="flex items-start space-x-3 rounded-lg border p-4">
                  <Checkbox
                    id="useAllWords"
                    checked={watchedValues.useAllWords}
                    onCheckedChange={(checked) => setValue('useAllWords', checked as boolean)}
                  />
                  <div className="space-y-1 flex-1">
                    <label
                      htmlFor="useAllWords"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Use all words from file
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Skip AI extraction and use every line as a spelling word. Best for simple word lists without definitions.
                    </p>
                  </div>
                </div>

                {watchedValues.useAllWords && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Fast processing mode:</strong> AI will not analyze the content. Each line in your file will be treated as a word. Make sure your file contains one word per line.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Generate Preview */}
            <div className="flex items-start space-x-3 rounded-lg border p-4">
              <Checkbox
                id="generatePreview"
                checked={watchedValues.generatePreview}
                onCheckedChange={(checked) => setValue('generatePreview', checked as boolean)}
              />
              <div className="space-y-1 flex-1">
                <label
                  htmlFor="generatePreview"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Generate preview before creating
                </label>
                <p className="text-xs text-muted-foreground">
                  See sample questions before committing. Adds 1-2 minutes to processing time.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
