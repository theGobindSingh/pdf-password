import { formatDuration, intervalToDuration } from 'date-fns';

export function formatElapsedTime(elapsedMs: number): string {
  if (elapsedMs <= 0) {
    return '0 seconds';
  }

  const duration = intervalToDuration({ start: 0, end: elapsedMs });
  const formatted = formatDuration(duration, {
    format: ['hours', 'minutes', 'seconds'],
    zero: false,
    delimiter: ' ',
  });

  return formatted || '0 seconds';
}
