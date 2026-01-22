'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AlertTriangle } from 'lucide-react';

interface StagingErrorAccordionProps {
  error: Error | Record<string, unknown> | string | null | undefined;
  context?: string;
}

export function StagingErrorAccordion({ error, context }: StagingErrorAccordionProps) {
  // Only show in staging
  if (process.env.NEXT_PUBLIC_ENV !== 'staging') {
    return null;
  }

  if (!error) return null;

  const errorObj = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error));
  const isApiError = error && typeof error === 'object' && 'statusCode' in error;

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-destructive mb-1">
            🚨 STAGING: Detailed Error Information
          </h4>
          <p className="text-sm text-muted-foreground">
            This detailed error info is ONLY visible in staging to help with debugging.
          </p>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {/* Context */}
        {context && (
          <AccordionItem value="context">
            <AccordionTrigger className="text-sm font-medium">
              📍 Context
            </AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {context}
              </pre>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Error Message */}
        <AccordionItem value="message">
          <AccordionTrigger className="text-sm font-medium">
            💬 Error Message
          </AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
              {errorObj.message || 'No error message'}
            </pre>
          </AccordionContent>
        </AccordionItem>

        {/* API Error Details */}
        {isApiError && (
          <AccordionItem value="api-details">
            <AccordionTrigger className="text-sm font-medium">
              🌐 API Error Details
            </AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(error, null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Stack Trace */}
        {errorObj.stack && (
          <AccordionItem value="stack">
            <AccordionTrigger className="text-sm font-medium">
              📚 Stack Trace
            </AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
                {errorObj.stack}
              </pre>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* User Agent (helpful for iPad debugging) */}
        <AccordionItem value="user-agent">
          <AccordionTrigger className="text-sm font-medium">
            📱 User Agent
          </AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
              {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}
            </pre>
          </AccordionContent>
        </AccordionItem>

        {/* Full Error Object */}
        <AccordionItem value="full-object">
          <AccordionTrigger className="text-sm font-medium">
            🔍 Full Error Object
          </AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(
                error,
                Object.getOwnPropertyNames(error || {}),
                2
              )}
            </pre>
          </AccordionContent>
        </AccordionItem>

        {/* Timestamp */}
        <AccordionItem value="timestamp">
          <AccordionTrigger className="text-sm font-medium">
            ⏰ Timestamp
          </AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
              {new Date().toISOString()}
              {'\n'}
              {new Date().toLocaleString()}
            </pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
