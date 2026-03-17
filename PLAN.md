# PDF Password Analyzer — Build Plan

> **Progress tracking**: After completing each step, mark its checkbox `- [x]` in this file before moving to the next step.

## Summary

A single-page client-side React app that lets a user upload a PDF, detects if it is password-protected, and attempts to brute-force crack the password using a Web Worker (keeping the UI responsive). Stack: React 19, Vite, TypeScript, TanStack Router/Query/Form, Tailwind CSS, shadcn-style UI components, react-toastify, pdf-lib.

---

## Phase 0: Create PLAN.md

- [x] Create this file as a living checklist

## Phase 1: Install Dependencies

- [x] `pnpm add @tanstack/react-router @tanstack/react-query @tanstack/react-form react-toastify pdf-lib`
- [x] `pnpm add tailwindcss @tailwindcss/vite`

## Phase 2: Configure Tooling

- [x] `vite.config.ts` — add Tailwind v4 plugin + `@` path alias
- [x] `tsconfig.app.json` — add `baseUrl` + `paths` for `@/*`
- [x] `index.html` — add `class="dark"` to `<html>`
- [x] `src/styles/index.css` — Tailwind import + CSS custom properties for dark theme

## Phase 3: Types

- [x] `src/types/pdf.types.ts`
- [x] `src/types/worker.types.ts`
- [x] `src/types/index.ts`

## Phase 4: Utils

- [x] `src/utils/pdf.ts` — `checkPdfProtection()`
- [x] `src/utils/brute-force.ts` — `generatePasswords()` generator
- [x] `src/utils/index.ts`

## Phase 5: Web Worker

- [x] `src/workers/brute-force.worker.ts`

## Phase 6: Hooks

- [x] `src/hooks/use-pdf-check.ts`
- [x] `src/hooks/use-cracker.ts`
- [x] `src/hooks/index.ts`

## Phase 7: UI Components (`src/components/ui/`)

- [x] `button.tsx`
- [x] `card.tsx`
- [x] `input.tsx`
- [x] `progress.tsx`
- [x] `badge.tsx`
- [x] `index.ts`

## Phase 8: Common Components (`src/components/common/`)

- [x] `file-input.tsx`
- [x] `loading-spinner.tsx`
- [x] `error-message.tsx`
- [x] `index.ts`

## Phase 9: Feature Components

- [x] `src/components/upload-form/upload-form.tsx`
- [x] `src/components/upload-form/index.tsx`
- [x] `src/components/cracker/components/progress-display.tsx`
- [x] `src/components/cracker/components/result-display.tsx`
- [x] `src/components/cracker/components/index.ts`
- [x] `src/components/cracker/cracker.tsx`
- [x] `src/components/cracker/index.tsx`
- [x] `src/components/index.ts`

## Phase 10: Pages + App Shell

- [x] `src/pages/home/index.tsx`
- [x] `src/pages/index.ts`
- [x] `src/router.tsx`
- [x] `src/app.tsx`
- [x] `src/main.tsx` (modify)

## Phase 11: Enhancements

- [x] Animated background blobs — two morphing blue blobs in `HomePage` + keyframes in `index.css`
- [x] Charset configuration — toggle chips for a-z / A-Z / 0-9 / symbols in `cracker.tsx`
- [x] Max-length input — number input (default 10, range 1-20) replaces hardcoded constant
- [x] Advanced settings panel — collapsible section with custom charset string input (overrides chip selection)
- [x] PDF info card — replaces uploader after file is checked (shows name, size, status, X to remove, drag-to-replace)

## Phase 12: Multi-Worker Parallel Pool

Partition the search space across N workers (one per CPU core) by assigning each a slice of the first character. Expected speedup: ~N× (linear with core count).

- [x] `src/types/worker.types.ts` — add `firstCharStart: number`, `firstCharEnd: number`, `workerId: number` to `WorkerStartMessage`
- [x] `src/utils/brute-force.ts` — extend `generatePasswords(charset, maxLength, firstCharStart?, firstCharEnd?)` to restrict iteration to the assigned first-character partition
- [x] `src/utils/index.ts` — re-export updated signature
- [x] `src/workers/brute-force.worker.ts` — read `firstCharStart`/`firstCharEnd` from the start message and pass them to `generatePasswords`
- [x] `src/hooks/use-cracker.ts` — spawn `Math.min(navigator.hardwareConcurrency ?? 4, charset.length)` workers; divide charset into equal slices; pass each worker its `firstCharStart`/`firstCharEnd`; aggregate `attempts` across all workers for progress; on any `success` message terminate all other workers immediately; on all workers sending `failure` resolve as failure

## Phase 13: Lightweight PDF Password Verifier (Drop pdfjs from the hot path)

Replace pdfjs-dist in the brute-force loop with a custom verifier built on `SubtleCrypto` (browser built-in). Eliminates full PDF-parsing overhead per attempt. Expected speedup: 100-500× per attempt.

- [x] `src/utils/pdf-verifier.ts` — parse the PDF's `Encrypt` dictionary (fields: `/R`, `/V`, `/O`, `/U`, `/P`, `/KeyLength`, `/ID`) from raw `Uint8Array`; implement Standard Security Handler revision 2/3 key derivation (MD5-based RC4 key validated against `/U`) and revision 5/6 (SHA-256 validated against `/U` owner/user hash) using `crypto.subtle`; export `async function verifyPdfPassword(pdfBytes: Uint8Array, password: string): Promise<boolean>`
- [x] `src/utils/index.ts` — re-export `verifyPdfPassword`
- [x] `src/workers/brute-force.worker.ts` — replace the `PDFJS.getDocument` / `onPassword` loop with a plain `for…of` loop over `generatePasswords`; call `await verifyPdfPassword(pdfBytes, candidate)` per iteration; remove `pdfjs-dist` and `workerUrl` imports; post `progress` every `PROGRESS_INTERVAL` attempts and `success`/`failure` as before

## Phase 14: SharedArrayBuffer + Atomics Work-Stealing Coordinator

Enable dynamic load balancing: fast workers claim more work from a shared counter instead of sitting idle after exhausting their static partition. Requires COOP/COEP headers.

- [x] `vite.config.ts` — add dev-server response headers `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (required to unlock `SharedArrayBuffer`)
- [x] `src/utils/password-index.ts` — implement `nthPassword(charset: string, maxLength: number, n: number): string` (converts a flat integer index to a candidate via base-N arithmetic) and `passwordSpaceSize(charset: string, maxLength: number): number`
- [x] `src/utils/index.ts` — re-export new functions
- [x] `src/types/worker.types.ts` — replace `firstCharStart`/`firstCharEnd` with `sharedCounter: SharedArrayBuffer` (a single `Int32Array` counter workers atomically increment to claim the next batch) and `batchSize: number`
- [x] `src/workers/brute-force.worker.ts` — use `Atomics.add(counter, 0, batchSize)` to claim a batch of indices; convert each claimed index to a candidate via `nthPassword`; loop until `Atomics.load` reads past `passwordSpaceSize`
- [x] `src/hooks/use-cracker.ts` — allocate `new SharedArrayBuffer(8)`, initialize the counter to 0, pass the same buffer to all workers (shared reference, not cloned)

## Phase 15: Progress Throttle Tuning

Reduce main-thread `postMessage` saturation at high attempt rates. Zero-risk, zero-effort win.

- [x] `src/workers/brute-force.worker.ts` — increase `PROGRESS_INTERVAL` from `100` to `1000`

## Phase 16: Min-Length Support

Allow users to skip short password combinations when they know the password is at least N characters long. Implemented via shared-counter pre-seeding — no extra branching in the worker hot-path.

- [x] `src/types/worker.types.ts` — add optional `minLength: number` field to `WorkerStartMessage`
- [x] `src/hooks/use-cracker.ts` — add `minLength?: number` to `CrackOptions`; compute `startOffset = passwordSpaceSize(charset, minLength - 1)` and pre-seed `BigInt64Array(sharedCounter)[0]` before spawning workers
- [x] `src/workers/brute-force.worker.ts` — destructure `minLength` from the start message (honoured automatically via counter offset; no hot-path change)
- [x] `src/components/cracker/cracker.tsx` — add `minLength` state (default 1), render a "Min length" number input beside the existing "Max" input; clamp `minLength ≤ maxLength` and vice-versa; pass `minLength` to `startCracking`

## Verification

- [ ] `pnpm dev` starts at localhost:3000 with dark theme
- [ ] Upload unprotected.pdf → "No password" toast + Unprotected badge
- [ ] Upload protected.pdf → "Password-protected" toast + Protected badge + Start Cracking enabled
- [ ] Start Cracking → progress bar animates, counter increments, UI stays responsive
- [ ] Stop Cracking → worker terminates, UI resets

> **Note**: `pdfjs-dist` was added (instead of relying on `pdf-lib` for cracking) because `pdf-lib` v1.17.1 has no runtime password-decryption support. `pdf-lib` is still used for the initial protection check; `pdfjs-dist` drives the brute-force loop via its `onPassword` callback mechanism.
