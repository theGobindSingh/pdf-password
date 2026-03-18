import { Progress } from '@/components/ui';
import type { CrackerProgress, CrackerResult } from '@/hooks';
import { formatAttemptCount, formatElapsedTime } from '@/utils';

interface ProgressDisplayProps {
  progress: CrackerProgress;
  result: CrackerResult | null;
}

export const ProgressDisplay = ({ progress, result }: ProgressDisplayProps) => {
  const { attempts, current, elapsedMs, speed } = progress;

  // Show indeterminate-style progress that cycles when active
  let displayValue = 0;
  if (result) {
    displayValue = 100;
  } else if (attempts > 0) {
    displayValue = (attempts % 1000) / 10;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-foreground">
          Trying a few common password options…
        </span>
        <span className="font-mono text-muted-foreground">
          {formatAttemptCount(attempts)} combinations tried
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <span className="block text-[11px] uppercase tracking-wide text-muted-foreground/80">
            Time Elapsed
          </span>
          <span className="font-mono text-foreground">
            {formatElapsedTime(elapsedMs)}
          </span>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <span className="block text-[11px] uppercase tracking-wide text-muted-foreground/80">
            Speed
          </span>
          <span className="font-mono text-foreground">
            {speed > 0 ? `${formatAttemptCount(speed)}/s` : '0/s'}
          </span>
        </div>
      </div>

      <Progress value={displayValue} />

      {current && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Testing:</span>
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
            {current}
          </code>
        </div>
      )}
    </div>
  );
};
