import { Button } from '@/components/ui';
import type { CrackerResult } from '@/hooks';
import { formatAttemptCount, formatElapsedTime } from '@/utils';
import { useState } from 'react';

interface ResultDisplayProps {
  result: CrackerResult;
}

export const ResultDisplay = ({ result }: ResultDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const exactAttempts = result.attempts.toLocaleString();
  const exactSpeed = result.speed.toLocaleString(undefined, {
    maximumFractionDigits: result.speed >= 100 ? 0 : 2,
  });

  const handleCopy = () => {
    if (result.password) {
      void navigator.clipboard.writeText(result.password).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (result.type === 'failure') {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg bg-destructive/10 p-4 text-center">
        <svg
          className="h-8 w-8 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="font-semibold text-destructive">
          Could not determine the password.
        </p>
        <p className="text-xs text-muted-foreground">
          Tried {formatAttemptCount(result.attempts)} combinations
        </p>
      </div>
    );
  }

  if (result.type === 'stopped') {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg bg-amber-500/10 p-4 text-center">
        <svg
          className="h-8 w-8 text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12H9m12 0A9 9 0 113 12a9 9 0 0118 0z"
          />
        </svg>
        <p className="font-semibold text-amber-400">Analyzing stopped</p>
        <p className="text-xs text-muted-foreground">
          Tried {formatAttemptCount(result.attempts)} combinations before
          stopping
        </p>
        <div className="grid w-full max-w-sm grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <span className="block text-[11px] uppercase tracking-wide text-muted-foreground/80">
              Time Elapsed
            </span>
            <span className="font-mono text-foreground">
              {formatElapsedTime(result.elapsedMs)}
            </span>
          </div>
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <span className="block text-[11px] uppercase tracking-wide text-muted-foreground/80">
              Average Speed
            </span>
            <span className="font-mono text-foreground">{exactSpeed}/s</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <span>Last reported candidate:</span>
          <code className="rounded-md bg-muted px-3 py-1.5 font-mono text-sm text-foreground">
            {result.lastTried ?? 'Not available yet'}
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-green-500/10 p-4 text-center">
      <svg
        className="h-8 w-8 text-green-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="font-semibold text-green-400">
        We found a matching password
      </p>
      <code className="rounded-md bg-muted px-4 py-2 font-mono text-lg font-bold text-foreground">
        {result.password}
      </code>
      <Button variant="outline" size="sm" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy Password'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Matched after {exactAttempts} combinations tried
      </p>
      <div className="grid w-full max-w-sm grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <span className="block text-[11px] uppercase tracking-wide text-muted-foreground/80">
            Time Elapsed
          </span>
          <span className="font-mono text-foreground">
            {formatElapsedTime(result.elapsedMs)}
          </span>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <span className="block text-[11px] uppercase tracking-wide text-muted-foreground/80">
            Average Speed
          </span>
          <span className="font-mono text-foreground">{exactSpeed}/s</span>
        </div>
      </div>
    </div>
  );
};
