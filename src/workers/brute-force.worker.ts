/// <reference lib="webworker" />
/// <reference lib="es2020.bigint" />

import type { WorkerInMessage, WorkerOutMessage } from '@/types';
import {
  logger,
  parsePdfEncrypt,
  passwordSpaceSize,
  verifyPassword,
  verifyPasswordAsync,
} from '@/utils';

// Phase 15: throttle progress messages to reduce main-thread postMessage saturation
const PROGRESS_INTERVAL = 1000;

const createBatchCandidateIterator = (
  charset: readonly string[],
  maxLength: number,
  startIdx: bigint,
  endIdx: bigint,
): { next: () => string | null } => {
  const base = BigInt(charset.length);
  const remainingInitial = endIdx - startIdx;

  if (remainingInitial <= 0n) {
    return {
      next: () => null,
    };
  }

  let offset = startIdx;
  let length = 1;
  let blockSize = base;

  while (length <= maxLength && offset >= blockSize) {
    offset -= blockSize;
    length++;
    blockSize *= base;
  }

  if (length > maxLength) {
    return {
      next: () => null,
    };
  }

  const digits = new Array<number>(length).fill(0);
  for (let i = length - 1; i >= 0; i--) {
    digits[i] = Number(offset % base);
    offset /= base;
  }

  const chars = digits.map((digit) => charset[digit]);
  const firstChar = charset[0];
  let remaining = remainingInitial;

  const advance = () => {
    for (let position = digits.length - 1; position >= 0; position--) {
      const nextDigit = digits[position] + 1;
      if (nextDigit < charset.length) {
        digits[position] = nextDigit;
        chars[position] = charset[nextDigit]!;
        return;
      }

      digits[position] = 0;
      chars[position] = firstChar;
    }

    digits.push(0);
    chars.push(firstChar);
  };

  return {
    next: () => {
      if (remaining <= 0n) {
        return null;
      }

      const candidate = chars.join('');
      remaining--;

      if (remaining > 0n) {
        advance();
      }

      return candidate;
    },
  };
};

// Catch any unhandled promise rejection that escapes the main try/catch
// (e.g. from a nested async call) and forward it to the main thread.
self.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  logger.error('[worker] unhandledrejection:', event.reason);
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
    const charsetChars = Array.from(charset);

    // Parse the PDF /Encrypt dictionary once — all subsequent checks are pure crypto.
    const dict = parsePdfEncrypt(pdfBytes);
    if (!dict) {
      // Unsupported encryption format (e.g. xref-stream-only or non-standard handler)
      logger.warn(
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

      const candidates = createBatchCandidateIterator(
        charsetChars,
        maxLength,
        batch.startIdx,
        batch.endIdx,
      );

      while (true) {
        const candidate = candidates.next();
        if (candidate === null) {
          break;
        }

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
    logger.error('[worker] unexpected error:', err);
    self.postMessage({
      type: 'worker-error',
      message: err instanceof Error ? err.message : String(err),
    } satisfies WorkerOutMessage);
  }
};
