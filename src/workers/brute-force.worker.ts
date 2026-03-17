/// <reference lib="webworker" />
/// <reference lib="es2020.bigint" />

import type { WorkerInMessage, WorkerOutMessage } from '@/types';
import {
  nthPassword,
  parsePdfEncrypt,
  passwordSpaceSize,
  verifyPassword,
  verifyPasswordAsync,
} from '@/utils';

// Phase 15: throttle progress messages to reduce main-thread postMessage saturation
const PROGRESS_INTERVAL = 1000;

// Catch any unhandled promise rejection that escapes the main try/catch
// (e.g. from a nested async call) and forward it to the main thread.
self.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  console.error('[worker] unhandledrejection:', event.reason);
  self.postMessage({
    type: 'worker-error',
    message:
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason),
  } satisfies WorkerOutMessage);
});

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  // minLength is honoured by the pre-seeded sharedCounter start offset (set in
  // use-cracker.ts).  The worker itself just needs to include it in the message
  // destructure so TypeScript is satisfied; no extra logic is required here.
  const { type, pdfData, charset, maxLength, sharedCounter, batchSize } =
    event.data;
  if (type !== 'start') return;

  try {
    const pdfBytes = new Uint8Array(pdfData);

    // Parse the PDF /Encrypt dictionary once — all subsequent checks are pure crypto.
    const dict = parsePdfEncrypt(pdfBytes);
    if (!dict) {
      // Unsupported encryption format (e.g. xref-stream-only or non-standard handler)
      console.warn(
        '[worker] parsePdfEncrypt returned null — could not find/parse /Encrypt dict. First 512 bytes (latin-1):',
        new TextDecoder('iso-8859-1').decode(pdfBytes.slice(0, 512)),
      );
      self.postMessage({
        type: 'failure',
        attempts: 0,
      } satisfies WorkerOutMessage);
      return;
    }

    const counter = new BigInt64Array(sharedCounter);
    const spaceSize = passwordSpaceSize(charset, maxLength);
    const BATCH = BigInt(batchSize);
    const isAsync = dict.r >= 5;

    let attempts = 0;
    let foundPassword: string | null = null;

    outer: while (true) {
      // Atomically claim the next batch of indices from the shared counter.
      const startIdx = Atomics.add(counter, 0, BATCH);
      if (startIdx >= spaceSize) break;

      const endIdx =
        startIdx + BATCH < spaceSize ? startIdx + BATCH : spaceSize;

      for (let i = startIdx; i < endIdx; i++) {
        const candidate = nthPassword(charset, maxLength, Number(i));

        const match = isAsync
          ? await verifyPasswordAsync(dict, candidate)
          : verifyPassword(dict, candidate);

        if (match) {
          foundPassword = candidate;
          break outer;
        }

        attempts++;
        if (attempts % PROGRESS_INTERVAL === 0) {
          self.postMessage({
            type: 'progress',
            attempts,
            current: candidate,
          } satisfies WorkerOutMessage);
        }
      }
    }

    if (foundPassword !== null) {
      self.postMessage({
        type: 'success',
        password: foundPassword,
        attempts,
      } satisfies WorkerOutMessage);
    } else {
      self.postMessage({
        type: 'failure',
        attempts,
      } satisfies WorkerOutMessage);
    }
  } catch (err) {
    console.error('[worker] unexpected error:', err);
    self.postMessage({
      type: 'worker-error',
      message: err instanceof Error ? err.message : String(err),
    } satisfies WorkerOutMessage);
  }
};
