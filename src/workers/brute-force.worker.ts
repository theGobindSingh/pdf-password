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
  const {
    type,
    pdfData,
    charset,
    minLength,
    maxLength,
    sharedCounter,
    batchSize,
  } = event.data;
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

    const spaceSize = passwordSpaceSize(charset, maxLength);
    const BATCH = BigInt(batchSize);
    const isAsync = dict.r >= 5;
    const startOffset =
      minLength <= 1 ? 0n : passwordSpaceSize(charset, minLength - 1);

    let attempts = 0;
    let foundPassword: string | null = null;
    let nextIndex = startOffset;

    const claimBatch = (): { startIdx: bigint; endIdx: bigint } | null => {
      if (sharedCounter) {
        const counter = new BigInt64Array(sharedCounter);
        const startIdx = Atomics.add(counter, 0, BATCH);
        if (startIdx >= spaceSize) {
          return null;
        }

        return {
          startIdx,
          endIdx: startIdx + BATCH < spaceSize ? startIdx + BATCH : spaceSize,
        };
      }

      if (nextIndex >= spaceSize) {
        return null;
      }

      const startIdx = nextIndex;
      const endIdx =
        nextIndex + BATCH < spaceSize ? nextIndex + BATCH : spaceSize;
      nextIndex = endIdx;

      return { startIdx, endIdx };
    };

    outer: while (true) {
      const batch = claimBatch();
      if (!batch) {
        break;
      }

      for (let i = batch.startIdx; i < batch.endIdx; i++) {
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
