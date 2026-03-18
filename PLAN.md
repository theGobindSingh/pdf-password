# PDF Password Analyzer — Build Plan

> **Progress tracking**: After completing each step, mark its checkbox `- [x]` in this file before moving to the next step.

## Summary

A single-page client-side React app that lets a user upload a PDF, detects if it is password-protected, and attempts to brute-force crack the password using a Web Worker (keeping the UI responsive). Stack: React 19, Vike + Vite, TypeScript, TanStack Query/Form, Tailwind CSS, shadcn-style UI components, react-toastify, pdf-lib.

---

## Phase 0: Create PLAN.md

- [x] Create this file as a living checklist

## Phase 1: Install Dependencies

- [x] `pnpm add @tanstack/react-router @tanstack/react-query @tanstack/react-form react-toastify pdf-lib`
- [x] `pnpm add tailwindcss @tailwindcss/vite`

## Phase 2: Configure Tooling

- [x] `vite.config.ts` — add Tailwind v4 plugin + `@` path alias
- [x] `tsconfig.app.json` — add `baseUrl` + `paths` for `@/*`
- [x] `eslint.config.js` — point typed linting at `tsconfig.app.json` so `pnpm lint` and `pnpm lint:fix` work with project references
- [x] `.github/copilot-instructions.md` — codify the repo preference for `const` arrow functions over `function` declarations
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
- [x] `src/utils/logger.ts` — centralize all console usage in one file and suppress `no-console` there only

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

## Phase 15: PWA — Offline-First + Installable + Web Share Target

Make the app installable as a Progressive Web App, work offline, and accept PDF files shared from the Android share sheet.

- [x] `pnpm add -D vite-plugin-pwa` + `pnpm add workbox-precaching workbox-core`
- [x] `src/sw.ts` — custom service worker: Workbox precache + share target handler (intercept POST `/share-target`, store file in IndexedDB, redirect to `/?shared=1`)
- [x] `vite.config.ts` — add `VitePWA({ strategies: 'injectManifest', ... })` with full manifest (name, icons, display, theme, `share_target` for `.pdf` files)
- [x] `vite.config.ts` — patch the custom service worker build output to use `codeSplitting: false` instead of the deprecated `inlineDynamicImports` flag emitted by `vite-plugin-pwa`
- [x] `src/pages/+Head.tsx` — add a manual `rel="manifest"` tag because Vike prerender does not receive Vite's automatic HTML manifest injection
- [x] `src/hooks/use-shared-file.ts` — reads and clears the pending shared file from IndexedDB when `?shared=1` is present in the URL
- [x] `src/hooks/use-pwa-install.ts` — captures `beforeinstallprompt`, exposes `canInstall` / `install()` / `isInstalling`
- [x] `src/hooks/index.ts` — re-export `useSharedFile` and `usePwaInstall`
- [x] `src/components/upload-form/upload-form.tsx` — add `initialFile?: File | null` prop; `useEffect` to auto-process a shared file on mount
- [x] `src/pages/home/index.tsx` — wire `useSharedFile()` → `<UploadForm initialFile={...} />` and render an Install button via `usePwaInstall()`

## Phase 15: Progress Throttle Tuning

Reduce main-thread `postMessage` saturation at high attempt rates. Zero-risk, zero-effort win.

- [x] `src/workers/brute-force.worker.ts` — increase `PROGRESS_INTERVAL` from `100` to `1000`

## Phase 16: Min-Length Support

Allow users to skip short password combinations when they know the password is at least N characters long. Implemented via shared-counter pre-seeding — no extra branching in the worker hot-path.

- [x] `src/types/worker.types.ts` — add optional `minLength: number` field to `WorkerStartMessage`
- [x] `src/hooks/use-cracker.ts` — add `minLength?: number` to `CrackOptions`; compute `startOffset = passwordSpaceSize(charset, minLength - 1)` and pre-seed `BigInt64Array(sharedCounter)[0]` before spawning workers
- [x] `src/workers/brute-force.worker.ts` — destructure `minLength` from the start message (honoured automatically via counter offset; no hot-path change)
- [x] `src/components/cracker/cracker.tsx` — add `minLength` state (default 1), render a "Min length" number input beside the existing "Max" input; clamp `minLength ≤ maxLength` and vice-versa; pass `minLength` to `startCracking`

## Phase 17: Homepage SEO Content

- [x] `src/components/ui/accordion.tsx` — add a lightweight shared accordion primitive for FAQ content
- [x] `src/pages/home/components/*` — add SEO-focused folds below the hero: problem statement, how-it-works, trust grid, FAQ, and disclaimer
- [x] `src/pages/home/components/*` — split the SEO sections into smaller modules and move SVG icons into `src/icons/`
- [x] `src/pages/home/index.tsx` — append the new sections below the existing hero and keep the footer at the end of the page
- [x] `src/pages/home/*.tsx` — refactor each SEO fold into its own page-level section file and move reusable section primitives into `src/components/seo/`
- [x] `src/pages/home/index.tsx` / `src/hooks/use-standalone-mode.ts` — keep SEO sections on the website, but hide everything between the hero and footer when the app is running as an installed standalone PWA

## Phase 18: Static SEO Head Metadata

- [x] `index.html` — refresh title, description, Open Graph, and Twitter metadata for the single-page marketing surface
- [x] `index.html` — add FAQPage JSON-LD aligned with the on-page FAQ copy

## Phase 19: Vike Static Prerender

- [x] `pnpm add vike vike-react`
- [x] `package.json` — switch `dev` / `build` / `start` scripts from Vite CLI to Vike CLI so prerender runs during production builds
- [x] `vite.config.ts` — add the Vike plugin alongside the existing React, Tailwind, and PWA plugins
- [x] `src/pages/+config.ts` — enable global prerendering and extend `vike-react`
- [x] `src/pages/+Head.tsx` — move the marketing metadata and structured data into Vike-managed head tags
- [x] `src/pages/index/+Page.tsx` — render the existing homepage through Vike for static generation
- [x] `src/app.tsx` — extract shared React providers so both the legacy SPA entry and Vike page can reuse them
- [x] `src/hooks/use-pwa-install.ts` — guard browser-only globals so build-time rendering stays safe

## Phase 21: Vike Files Under src/pages

- [x] move the Vike `+` files from top-level `pages/` into `src/pages/` so all page code lives under the source tree
- [x] `src/pages/_error/+Page.tsx` — add a simple global Vike error page for 404s and runtime failures

## Phase 22: GitHub Pages Deployment

- [x] `vite.config.ts` — derive the deploy base path from environment and apply it to the Pages build + PWA manifest URLs
- [x] `src/utils/base-path.ts` — add shared runtime helpers for building URLs under a configurable base path
- [x] `src/app.tsx` / `src/pages/+Head.tsx` / `src/sw.ts` — replace root-relative URLs with base-aware URLs so the app works under `/<repo>/`
- [x] `src/types/worker.types.ts` / `src/hooks/use-cracker.ts` / `src/workers/brute-force.worker.ts` — add a single-worker fallback for hosts without `SharedArrayBuffer`, including GitHub Pages
- [x] `.github/workflows/deploy-pages.yml` / `public/.nojekyll` — add the GitHub Pages deployment workflow and static hosting support files
- [x] `.github/workflows/deploy-pages.yml` — run `pnpm lint` as a required gate before the Pages deploy job
- [x] `package.json` — make `pnpm lint` a non-mutating check so CI fails cleanly instead of rewriting files
- [x] `.github/workflows/deploy-pages.yml` — use Node.js 22 for the lint and deploy jobs
- [x] `README.md` — document the deployment process and GitHub Pages runtime caveat

## Phase 23: Odometer Batch Iteration

- [x] `src/workers/brute-force.worker.ts` — replace per-attempt `nthPassword()` hot-path calls with an odometer iterator that converts the claimed batch start index once and increments candidates in place
- [x] `README.md` — update the architecture notes to describe batch-start index conversion plus in-batch odometer stepping

## Phase 24: Resume-After Support

- [x] `src/utils/password-index.ts` — add `passwordIndex()` to map a known candidate back to its flat search-space index
- [x] `src/hooks/use-cracker.ts` — add `resumeAfter` support and pre-seed the shared counter to the next candidate after the supplied password
- [x] `src/components/cracker/cracker.tsx` — add a Resume-after input in advanced options so users can continue from a previous stopping point
- [x] `src/types/worker.types.ts` / `src/hooks/use-cracker.ts` / `src/workers/brute-force.worker.ts` — pass the computed start index into the single-worker fallback so resume-after and min-length behave the same in production hosts without `SharedArrayBuffer`

## Phase 25: Stop Snapshot

- [x] `src/hooks/use-cracker.ts` — preserve the last reported candidate and attempt count when the user stops a run manually
- [x] `src/components/cracker/components/result-display.tsx` / `src/components/cracker/cracker.tsx` — show the stopped state in the UI and toast the last available candidate

## Phase 26: Progress Telemetry + Hero Overflow Fix

- [x] `src/hooks/use-cracker.ts` / `src/components/cracker/components/progress-display.tsx` — add elapsed time and average attempts-per-second to the live cracking UI
- [x] `src/utils/format-elapsed.ts` / `package.json` — add a `date-fns`-based elapsed duration formatter for live progress display
- [x] `src/pages/home/hero.tsx` / `src/pages/home/index.tsx` — switch the first fold from rigid viewport centering to a growable min-height layout so taller center content no longer clips off-screen

## Phase 27: Finished-State Telemetry Copy

- [x] `src/hooks/use-cracker.ts` — persist elapsed time and average speed into finished results so completed cards can show them after live progress resets
- [x] `src/components/cracker/components/result-display.tsx` / `src/components/cracker/cracker.tsx` — show elapsed time and average speed in the stopped and success states, and rename the stopped copy to "Analyzing stopped"

## Phase 28: Advanced Panel Auto-Collapse

- [x] `src/components/cracker/cracker.tsx` — collapse Advanced options automatically after success or manual stop so completed runs return to the default compact state

## Phase 29: Installed PWA Hydration Fix

- [x] `src/hooks/use-standalone-mode.ts` — defer standalone-mode detection until after mount so the installed PWA hydrates the same markup as the prerendered page

## Phase 20: Legacy SPA Cleanup

- [x] `pnpm remove @tanstack/react-router`
- [x] `pnpm remove pdfjs-dist`
- [x] `src/app.tsx` — remove the unused `App` wrapper that only existed for the old TanStack Router bootstrap
- [x] `src/main.tsx` — delete the obsolete Vite SPA entrypoint
- [x] `src/router.tsx` — delete the obsolete TanStack Router setup
- [x] `index.html` — delete the obsolete Vite HTML entry template now that Vike generates the prerendered HTML output
- [x] `src/utils/brute-force.ts` — delete the unused legacy password generator and stop re-exporting it

## Verification

- [x] `PUBLIC_BASE_PATH=/pdf-unlocker/ pnpm build` completes and emits Pages-ready assets under `dist/client`
- [ ] `pnpm dev` starts at localhost:3000 with dark theme
- [ ] Upload unprotected.pdf → "No password" toast + Unprotected badge
- [ ] Upload protected.pdf → "Password-protected" toast + Protected badge + Start Cracking enabled
- [ ] Start Cracking → progress bar animates, counter increments, UI stays responsive
- [ ] Stop Cracking → worker terminates, UI resets

> **Note**: `pdf-lib` is still used for the initial protection check, while password verification in the hot path now uses the custom crypto verifier in `src/utils/pdf-verifier.ts`.
