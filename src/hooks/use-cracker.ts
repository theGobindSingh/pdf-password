import type { WorkerOutMessage } from '@/types';
import { passwordIndex, passwordSpaceSize } from '@/utils';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface CrackOptions {
  pdfData: ArrayBuffer;
  charset?: string;
  /** Minimum password length to try (default 1 — i.e. no skipping). */
  minLength?: number;
  maxLength?: number;
  /** Resume strictly after this already-tried password candidate. */
  resumeAfter?: string;
}

export interface CrackerProgress {
  attempts: number;
  current: string;
  elapsedMs: number;
  speed: number;
}

export interface CrackerResult {
  type: 'success' | 'failure' | 'stopped';
  password?: string;
  attempts: number;
  lastTried?: string;
  elapsedMs: number;
  speed: number;
}

const DEFAULT_CHARSET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
const DEFAULT_MAX_LENGTH = 10;

/** How many password indices each worker claims per Atomics.add call. */
const BATCH_SIZE = 500;

export function useCracker() {
  const workersRef = useRef<Worker[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const [progress, setProgress] = useState<CrackerProgress>({
    attempts: 0,
    current: '',
    elapsedMs: 0,
    speed: 0,
  });
  const [result, setResult] = useState<CrackerResult | null>(null);

  // Terminate any running workers when the component unmounts mid-crack.
  useEffect(() => {
    return () => {
      workersRef.current.forEach((w) => w.terminate());
      workersRef.current = [];
    };
  }, []);

  const mutation = useMutation({
    mutationFn: ({
      pdfData,
      charset = DEFAULT_CHARSET,
      minLength = 1,
      maxLength = DEFAULT_MAX_LENGTH,
      resumeAfter,
    }: CrackOptions) => {
      return new Promise<CrackerResult>((resolve, reject) => {
        // Guard: detached or empty buffer means the PDF data was lost.
        if (pdfData.byteLength === 0) {
          reject(
            new Error(
              'PDF data is empty or has been detached. Please re-upload the file.',
            ),
          );
          return;
        }

        const supportsSharedCounter = typeof SharedArrayBuffer !== 'undefined';

        // One worker per logical CPU core, capped at charset length (no point having
        // more workers than there are distinct first characters to try). Hosts such
        // as GitHub Pages cannot enable cross-origin isolation headers, so they fall
        // back to a single sequential worker instead of failing outright.
        const numWorkers = supportsSharedCounter
          ? Math.min(navigator.hardwareConcurrency ?? 4, charset.length)
          : 1;

        const minLengthOffset =
          minLength <= 1 ? 0n : passwordSpaceSize(charset, minLength - 1);
        let startOffset = minLengthOffset;

        if (resumeAfter) {
          const resumeIndex = passwordIndex(charset, resumeAfter);
          if (resumeIndex === null) {
            reject(
              new Error(
                'Resume value contains characters outside the selected charset.',
              ),
            );
            return;
          }

          const resumeLength = resumeAfter.length;
          if (resumeLength > maxLength) {
            reject(
              new Error('Resume value is longer than the selected max length.'),
            );
            return;
          }

          startOffset = resumeIndex + 1n;
          if (startOffset < minLengthOffset) {
            startOffset = minLengthOffset;
          }
        }

        const sharedCounter = supportsSharedCounter
          ? new SharedArrayBuffer(8)
          : undefined;

        // BigInt64Array[0] — all workers race to atomically claim batches of indices.
        // Pre-seed the counter to the first index at minLength so shorter
        // passwords are never attempted.
        if (sharedCounter && startOffset > 0n) {
          new BigInt64Array(sharedCounter)[0] = startOffset;
        }

        const workers: Worker[] = [];
        workersRef.current = workers;

        // Track each worker's latest local attempt count for aggregated progress display.
        const workerAttempts = new Array<number>(numWorkers).fill(0);
        let failureCount = 0;
        let resolved = false;

        const terminateAll = () => {
          workers.forEach((w) => w.terminate());
          workers.length = 0;
          workersRef.current = [];
        };

        for (let i = 0; i < numWorkers; i++) {
          const worker = new Worker(
            new URL('../workers/brute-force.worker.ts', import.meta.url),
            { type: 'module' },
          );
          workers.push(worker);
          const workerId = i;

          worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
            if (resolved) return;
            const msg = event.data;

            if (msg.type === 'progress') {
              workerAttempts[workerId] = msg.attempts;
              const total = workerAttempts.reduce((s, n) => s + n, 0);
              const elapsedMs = startedAtRef.current
                ? Date.now() - startedAtRef.current
                : 0;
              setProgress({
                attempts: total,
                current: msg.current,
                elapsedMs,
                speed: elapsedMs > 0 ? total / (elapsedMs / 1000) : 0,
              });
            } else if (msg.type === 'success') {
              resolved = true;
              workerAttempts[workerId] = msg.attempts;
              const total = workerAttempts.reduce((s, n) => s + n, 0);
              const elapsedMs = startedAtRef.current
                ? Date.now() - startedAtRef.current
                : 0;
              terminateAll();
              startedAtRef.current = null;
              const res: CrackerResult = {
                type: 'success',
                password: msg.password,
                attempts: total,
                elapsedMs,
                speed: elapsedMs > 0 ? total / (elapsedMs / 1000) : 0,
              };
              setProgress((prev) => ({
                ...prev,
                attempts: total,
                elapsedMs,
                speed: elapsedMs > 0 ? total / (elapsedMs / 1000) : 0,
              }));
              setResult(res);
              resolve(res);
            } else if (msg.type === 'failure') {
              workerAttempts[workerId] = msg.attempts;
              failureCount++;
              if (failureCount === numWorkers) {
                resolved = true;
                terminateAll();
                const total = workerAttempts.reduce((s, n) => s + n, 0);
                const elapsedMs = startedAtRef.current
                  ? Date.now() - startedAtRef.current
                  : 0;
                startedAtRef.current = null;
                setProgress((prev) => ({
                  ...prev,
                  attempts: total,
                  elapsedMs,
                  speed: elapsedMs > 0 ? total / (elapsedMs / 1000) : 0,
                }));
                const res: CrackerResult = {
                  type: 'failure',
                  attempts: total,
                  elapsedMs,
                  speed: elapsedMs > 0 ? total / (elapsedMs / 1000) : 0,
                };
                setResult(res);
                resolve(res);
              }
            } else if (msg.type === 'worker-error') {
              console.error('[use-cracker] worker-error message:', msg);
              resolved = true;
              terminateAll();
              reject(
                new Error(
                  msg.message || 'An unexpected worker error occurred.',
                ),
              );
            }
          };

          worker.onerror = (err) => {
            console.error('[use-cracker] worker.onerror:', err);
            if (!resolved) {
              resolved = true;
              terminateAll();
              reject(
                new Error(
                  err.message || 'An unexpected worker error occurred.',
                ),
              );
            }
          };

          // Clone so the original ArrayBuffer stays intact for retries without re-upload.
          const cloned = pdfData.slice(0);
          worker.postMessage(
            {
              type: 'start',
              pdfData: cloned,
              charset,
              minLength,
              maxLength,
              sharedCounter,
              batchSize: BATCH_SIZE,
              workerId,
            },
            [cloned],
          );
        }
      });
    },
    onMutate: () => {
      startedAtRef.current = Date.now();
      setProgress({ attempts: 0, current: '', elapsedMs: 0, speed: 0 });
      setResult(null);
    },
  });

  useEffect(() => {
    if (!mutation.isPending || startedAtRef.current === null) {
      return;
    }

    const timer = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAtRef.current!;
      setProgress((prev) => ({
        ...prev,
        elapsedMs,
        speed: elapsedMs > 0 ? prev.attempts / (elapsedMs / 1000) : 0,
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mutation.isPending]);

  const stopCracking = useCallback(() => {
    const elapsedMs = progress.elapsedMs;
    const stoppedResult: CrackerResult = {
      type: 'stopped',
      attempts: progress.attempts,
      lastTried: progress.current || undefined,
      elapsedMs,
      speed: elapsedMs > 0 ? progress.attempts / (elapsedMs / 1000) : 0,
    };

    workersRef.current.forEach((w) => w.terminate());
    workersRef.current = [];
    mutation.reset();
    setResult(stoppedResult);
    startedAtRef.current = null;
    setProgress({ attempts: 0, current: '', elapsedMs: 0, speed: 0 });
  }, [mutation, progress.attempts, progress.current, progress.elapsedMs]);

  return {
    startCracking: mutation.mutate,
    stopCracking,
    isCracking: mutation.isPending,
    progress,
    result,
    error: mutation.error,
  };
}
