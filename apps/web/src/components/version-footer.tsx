'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function VersionFooter() {
  const [version, setVersion] = useState<string | null>(null);
  const frontendVersion = process.env.NEXT_PUBLIC_VERSION || 'dev';

  useEffect(() => {
    // Fetch backend version from health endpoint
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => {
        if (data.version) {
          setVersion(data.version);
        }
      })
      .catch(() => {
        // Silently fail - version is not critical
      });
  }, []);

  return (
    <footer className="border-t mt-8">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>© 2026 Vocab App</p>
          <div className="flex items-center gap-4">
            {version && (
              <p title="Backend Version">
                API: <code className="font-mono">{version}</code>
              </p>
            )}
            <p title="Frontend Version">
              Web: <code className="font-mono">{frontendVersion}</code>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
