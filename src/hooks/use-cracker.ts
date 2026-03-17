import type { WorkerOutMessage } from '@/types';
import { passwordSpaceSize } from '@/utils';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface CrackOptions {
  pdfData: ArrayBuffer;
  charset?: string;
  /** Minimum password length to try (default 1 — i.e. no skipping). */
  minLength?: number;
  maxLength?: number;
}

export interface CrackerProgress {
  attempts: number;
  current: string;
}

export interface CrackerResult {
  type: 'success' | 'failure';
  password?: string;
  attempts: number;
}

const DEFAULT_CHARSET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
const DEFAULT_MAX_LENGTH = 10;

/** How many password indices each worker claims per Atomics.add call. */
const BATCH_SIZE = 500;

export function useCracker() {
  const workersRef = useRef<Worker[]>([]);
  const [progress, setProgress] = useState<CrackerProgress>({
    attempts: 0,
    current: '',
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
    }: CrackOptions) => {
      return new Promise<CrackerResult>((resolve, reject) => {
        // Guard: SharedArrayBuffer requires cross-origin isolation (COOP + COEP headers).
        if (typeof SharedArrayBuffer === 'undefined') {
          reject(
            new Error(
              'SharedArrayBuffer is unavailable — ensure the page is served with COOP/COEP headers.',
            ),
          );
          return;
        }

        // Guard: detached or empty buffer means the PDF data was lost.
        if (pdfData.byteLength === 0) {
          reject(
            new Error(
              'PDF data is empty or has been detached. Please re-upload the file.',
            ),
          );
          return;
        }

        // One worker per logical CPU core, capped at charset length (no point having
        // more workers than there are distinct first characters to try).
        const numWorkers = Math.min(
          navigator.hardwareConcurrency ?? 4,
          charset.length,
        );

        // BigInt64Array[0] — all workers race to atomically claim batches of indices.
        // Pre-seed the counter to the first index at minLength so shorter
        // passwords are never attempted.
        const sharedCounter = new SharedArrayBuffer(8);
        const startOffset =
          minLength <= 1 ? 0n : passwordSpaceSize(charset, minLength - 1);
        if (startOffset > 0n) {
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
              setProgress({ attempts: total, current: msg.current });
            } else if (msg.type === 'success') {
              resolved = true;
              workerAttempts[workerId] = msg.attempts;
              const total = workerAttempts.reduce((s, n) => s + n, 0);
              terminateAll();
              const res: CrackerResult = {
                type: 'success',
                password: msg.password,
                attempts: total,
              };
              setResult(res);
              resolve(res);
            } else if (msg.type === 'failure') {
              workerAttempts[workerId] = msg.attempts;
              failureCount++;
              if (failureCount === numWorkers) {
                resolved = true;
                terminateAll();
                const total = workerAttempts.reduce((s, n) => s + n, 0);
                const res: CrackerResult = { type: 'failure', attempts: total };
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
      setProgress({ attempts: 0, current: '' });
      setResult(null);
    },
  });

  const stopCracking = useCallback(() => {
    workersRef.current.forEach((w) => w.terminate());
    workersRef.current = [];
    mutation.reset();
    setProgress({ attempts: 0, current: '' });
    setResult(null);
  }, [mutation.reset]);

  return {
    startCracking: mutation.mutate,
    stopCracking,
    isCracking: mutation.isPending,
    progress,
    result,
    error: mutation.error,
  };
}
