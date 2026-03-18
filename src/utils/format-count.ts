const COUNT_UNITS = [
  { value: 1_000_000_000_000, suffix: 'T' },
  { value: 1_000_000_000, suffix: 'B' },
  { value: 1_000_000, suffix: 'M' },
  { value: 1_000, suffix: 'K' },
] as const;

export function formatAttemptCount(value: number): string {
  if (value < 1_000) {
    return value.toLocaleString();
  }

  for (const unit of COUNT_UNITS) {
    if (value >= unit.value) {
      const compact = (value / unit.value)
        .toFixed(2)
        .replace(/\.0+$|(?<=\.[0-9])0+$/g, '');

      return `${compact}${unit.suffix}`;
    }
  }

  return value.toLocaleString();
}
