import { Progress } from '@/components/ui';
import type { CrackerProgress, CrackerResult } from '@/hooks';

interface ProgressDisplayProps {
  progress: CrackerProgress;
  result: CrackerResult | null;
}

export function ProgressDisplay({ progress, result }: ProgressDisplayProps) {
  const { attempts, current } = progress;

  // Show indeterminate-style progress that cycles when active
  const displayValue = result ? 100 : attempts > 0 ? (attempts % 1000) / 10 : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          Trying a few common password options…
        </span>
        <span className="font-mono text-muted-foreground">
          {attempts.toLocaleString()} combinations tried
        </span>
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
}
