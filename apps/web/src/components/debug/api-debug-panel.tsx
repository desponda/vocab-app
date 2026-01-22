'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Trash2 } from 'lucide-react';

interface ApiLog {
  timestamp: Date;
  method: string;
  url: string;
  status: number;
  duration: number;
  error?: string;
  userAgent?: string;
}

export function ApiDebugPanel() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Listen to custom API events
  useEffect(() => {
    const handleApiLog = (event: CustomEvent<ApiLog>) => {
      setLogs(prev => [event.detail, ...prev].slice(0, 100)); // Keep last 100, newest first
    };

    window.addEventListener('api-log', handleApiLog);
    return () => window.removeEventListener('api-log', handleApiLog);
  }, []);

  // Keyboard shortcut: Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'D') {
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Only render in staging (must be after hooks)
  if (process.env.NEXT_PUBLIC_ENV !== 'staging') return null;

  const handleExport = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Clear all API logs?')) {
      setLogs([]);
    }
  };

  const getStatusEmoji = (status: number) => {
    if (status === 0) return '⚫'; // Network error
    if (status >= 500) return '🔴'; // Server error
    if (status >= 400) return '🟡'; // Client error
    return '🟢'; // Success
  };

  const getStatusColor = (status: number) => {
    if (status === 0 || status >= 500) return 'text-red-600 dark:text-red-400';
    if (status >= 400) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        size="sm"
        variant={isOpen ? 'default' : 'outline'}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <>
            <X className="h-4 w-4 mr-1" />
            Close
          </>
        ) : (
          <>
            🐛 Debug ({logs.length})
          </>
        )}
      </Button>

      {/* Debug Panel */}
      {isOpen && (
        <Card className="fixed bottom-16 right-4 w-[500px] max-h-[500px] z-50 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">API Debug Panel</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={handleClear} title="Clear logs">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleExport} title="Export logs">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {logs.length} requests • Shift+D to toggle • Staging only
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No API requests yet. Make a request to see it here.
                </div>
              ) : (
                <div className="divide-y">
                  {logs.map((log, i) => (
                    <div key={i} className="p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none">{getStatusEmoji(log.status)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-semibold">{log.method}</span>
                            <span className="text-xs truncate">{log.url}</span>
                          </div>
                          <div className={`text-xs ${getStatusColor(log.status)}`}>
                            Status: {log.status === 0 ? 'Network Error' : log.status} • Duration: {log.duration}ms
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </div>
                          {log.error && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">
                              {log.error}
                            </div>
                          )}
                          {log.userAgent && (
                            <details className="mt-1">
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:underline">
                                User Agent
                              </summary>
                              <div className="text-xs text-muted-foreground mt-1 font-mono">
                                {log.userAgent}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
