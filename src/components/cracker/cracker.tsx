import { ErrorMessage } from '@/components/common';
import { Button, Input } from '@/components/ui';
import { useCracker } from '@/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ProgressDisplay, ResultDisplay } from './components';

const CHARSET_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const CHARSET_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHARSET_NUMBERS = '0123456789';
const CHARSET_SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

interface CharsetFlags {
  lower: boolean;
  upper: boolean;
  numbers: boolean;
  symbols: boolean;
}

const CHARSET_OPTIONS: {
  key: keyof CharsetFlags;
  label: string;
  title: string;
}[] = [
  { key: 'lower', label: 'a-z', title: 'Lowercase letters' },
  { key: 'upper', label: 'A-Z', title: 'Uppercase letters' },
  { key: 'numbers', label: '0-9', title: 'Digits' },
  { key: 'symbols', label: '#@!', title: 'Common symbols' },
];

function buildCharset(flags: CharsetFlags, custom: string): string {
  const trimmed = custom.trim();
  if (trimmed) return [...new Set(trimmed)].join('');
  let result = '';
  if (flags.lower) result += CHARSET_LOWER;
  if (flags.upper) result += CHARSET_UPPER;
  if (flags.numbers) result += CHARSET_NUMBERS;
  if (flags.symbols) result += CHARSET_SYMBOLS;
  return result || CHARSET_LOWER;
}

interface CrackerProps {
  pdfData: ArrayBuffer;
}

export function Cracker({ pdfData }: CrackerProps) {
  const { startCracking, stopCracking, isCracking, progress, result, error } =
    useCracker();

  const [charsetFlags, setCharsetFlags] = useState<CharsetFlags>({
    lower: true,
    upper: true,
    numbers: true,
    symbols: true,
  });
  const [minLength, setMinLength] = useState(1);
  const [maxLength, setMaxLength] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customCharset, setCustomCharset] = useState('');

  const effectiveCharset = buildCharset(charsetFlags, customCharset);
  const usingCustom = customCharset.trim().length > 0;

  useEffect(() => {
    if (result?.type === 'success') {
      toast.success(`Password found: "${result.password}"`);
    } else if (result?.type === 'failure') {
      toast.error('Could not determine the password.');
    }
  }, [result]);

  useEffect(() => {
    if (error) {
      console.error('[Cracker] mutation error:', error);
      toast.error(error.message);
    }
  }, [error]);

  function toggleFlag(key: keyof CharsetFlags) {
    setCharsetFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Password Finder
          </h3>
          <p className="text-xs text-muted-foreground">
            {usingCustom
              ? `Custom characters · ${effectiveCharset.length} unique chars`
              : `Testing ${effectiveCharset.length} characters · ${minLength === maxLength ? `${maxLength} char${maxLength !== 1 ? 's' : ''}` : `${minLength}–${maxLength} characters`}`}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {isCracking ? (
            <Button variant="destructive" size="sm" onClick={stopCracking}>
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() =>
                startCracking({
                  pdfData,
                  charset: effectiveCharset,
                  minLength,
                  maxLength,
                })
              }
            >
              Start Testing
            </Button>
          )}
        </div>
      </div>

      {/* Settings — hidden while cracking */}
      {!isCracking && (
        <div className="flex flex-col gap-3">
          {/* Charset toggles + max length */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Charset:</span>

              {CHARSET_OPTIONS.map(({ key, label, title }) => (
                <button
                  key={key}
                  type="button"
                  title={title}
                  onClick={() => toggleFlag(key)}
                  disabled={usingCustom}
                  className={[
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    'disabled:pointer-events-none disabled:opacity-40',
                    charsetFlags[key]
                      ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <label
                htmlFor="min-length"
                className="text-xs text-muted-foreground"
              >
                Min length:
              </label>
              <Input
                id="min-length"
                type="number"
                min={1}
                max={maxLength}
                value={minLength}
                onChange={(e) => {
                  const v = Math.max(
                    1,
                    Math.min(maxLength, Number(e.target.value) || 1),
                  );
                  setMinLength(v);
                }}
                className="h-8 w-16 px-2 text-xs"
              />
              <label
                htmlFor="max-length"
                className="text-xs text-muted-foreground"
              >
                Max:
              </label>
              <Input
                id="max-length"
                type="number"
                min={minLength}
                max={20}
                value={maxLength}
                onChange={(e) => {
                  const v = Math.max(
                    minLength,
                    Math.min(20, Number(e.target.value) || 1),
                  );
                  setMaxLength(v);
                }}
                className="h-8 w-16 px-2 text-xs"
              />
            </div>
          </div>

          {/* Advanced settings toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg
              className={[
                'h-3 w-3 transition-transform',
                showAdvanced ? 'rotate-90' : '',
              ].join(' ')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            Advanced options
          </button>

          {/* Advanced panel */}
          {showAdvanced && (
            <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <p className="text-xs font-medium text-foreground">
                  Custom characters
                  <span className="ml-1 font-normal text-muted-foreground">
                    — overrides the selections above
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enter specific characters you think the password might
                  contain.
                </p>
              </div>
              <Input
                id="custom-charset"
                type="text"
                placeholder="e.g. abc123 or characters you know the password uses"
                value={customCharset}
                onChange={(e) => setCustomCharset(e.target.value)}
                className="font-mono text-xs"
              />
              {usingCustom && (
                <p className="text-xs text-muted-foreground">
                  Using{' '}
                  <span className="font-medium text-foreground">
                    {effectiveCharset.length}
                  </span>{' '}
                  unique characters
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && <ErrorMessage message={error.message} />}

      {isCracking && <ProgressDisplay progress={progress} result={result} />}

      {result && <ResultDisplay result={result} />}
    </div>
  );
}
