# PDF Unlocker

A fully client-side, browser-based tool that detects whether a PDF is password-protected and, if it is, attempts to recover the password through brute-force search — all without sending your file to any server.

---

## Table of Contents

- [PDF Unlocker](#pdf-unlocker)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [How It Works](#how-it-works)
    - [Step 1 — Protection Detection](#step-1--protection-detection)
    - [Step 2 — Brute-Force Engine](#step-2--brute-force-engine)
    - [Step 3 — Password Space Navigation](#step-3--password-space-navigation)
    - [Step 4 — Cryptographic Verification](#step-4--cryptographic-verification)
    - [Step 5 — Multi-Worker Parallelism](#step-5--multi-worker-parallelism)
    - [Step 6 — Work-Stealing with SharedArrayBuffer](#step-6--work-stealing-with-sharedarraybuffer)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Install](#install)
    - [Dev Server](#dev-server)
    - [Production Build](#production-build)
    - [GitHub Pages Deployment](#github-pages-deployment)
  - [Usage Guide](#usage-guide)
    - [Upload a PDF](#upload-a-pdf)
    - [Configure the Search](#configure-the-search)
    - [Min / Max Length](#min--max-length)
    - [Custom Charset](#custom-charset)
    - [Start \& Stop](#start--stop)
  - [Configuration Reference](#configuration-reference)
  - [Architecture Deep-Dive](#architecture-deep-dive)
    - [Password Index Space](#password-index-space)
    - [SharedArrayBuffer Coordination](#sharedarraybuffer-coordination)
    - [PDF Verifier — No Full Parsing in the Hot Path](#pdf-verifier--no-full-parsing-in-the-hot-path)
    - [Revision 2/3/4 (RC4)](#revision-234-rc4)
    - [Revision 5/6 (AES-256)](#revision-56-aes-256)
    - [React Compiler](#react-compiler)
  - [Security \& Privacy](#security--privacy)
  - [Browser Requirements](#browser-requirements)
  - [Known Limitations](#known-limitations)
  - [Development Notes](#development-notes)

---

## Features

- **100 % client-side** — your PDF never leaves the browser tab.
- **Automatic protection detection** — knows instantly whether a PDF needs a password.
- **Parallel brute-force** — spawns one Web Worker per logical CPU core; all workers share a single atomic counter for zero-overhead work-stealing.
- **Custom cryptographic verifier** — implemented from scratch using the browser's `SubtleCrypto` API and a hand-rolled MD5; 100–500× faster than verifying via a full PDF renderer.
- **Supports all common Standard Security Handler revisions** — RC4 40/128-bit (R2/R3/R4) and AES-256 (R5/R6, PDF 1.7 Extension Level 3 / PDF 2.0).
- **Configurable search space** — choose character sets (lowercase, uppercase, digits, symbols), set a minimum and maximum password length, or type a completely custom character set.
- **Live progress** — see the attempt counter tick up and the current candidate in real time without freezing the UI.
- **Dark theme by default** — clean, minimal card layout with animated background blobs.

---

## How It Works

### Step 1 — Protection Detection

When you select a PDF file, `checkPdfProtection()` (in `src/utils/pdf.ts`) tries to open it with `pdf-lib` using no password. `pdf-lib` is loaded lazily via a dynamic import so it never bloats the initial bundle.

- If the document loads → shows an "Unprotected" badge and a toast.
- If `pdf-lib` throws an error mentioning "encrypt", "password", "decrypt", or "protected" → shows a "Protected" badge and unlocks the **Start Testing** button.
- Any other error (corrupted file, unsupported format, file too large) surfaces as a toast.

### Step 2 — Brute-Force Engine

When you click **Start Testing**, `useCracker` (in `src/hooks/use-cracker.ts`) is invoked as a TanStack Query `useMutation`. It:

1. Uses a shared atomic counter when `SharedArrayBuffer` is available (requires COOP/COEP headers — served automatically by Vite in dev and preview mode).
2. Falls back to one sequential worker on hosts such as GitHub Pages that cannot provide those headers.
3. Pre-seeds the starting index to `passwordSpaceSize(charset, minLength - 1)` so that all passwords shorter than `minLength` are skipped from the very start — no wasted work.
4. Clones the PDF `ArrayBuffer` once per worker (via `ArrayBuffer.slice`) and spawns the worker pool.
5. Resolves the mutation promise when any worker posts `success` (or all workers post `failure`).

### Step 3 — Password Space Navigation

The search space is a **flat integer range** ordered by length first, then lexicographically within each length:

```text
index 0                → "a"   (first 1-char candidate)
index (charset.length - 1) → last 1-char candidate
index charset.length   → "aa"  (first 2-char candidate)
…
```

Two utility functions in `src/utils/password-index.ts` power this:

- **`passwordSpaceSize(charset, maxLength): bigint`** — total number of candidates. Returns `bigint` to avoid precision loss for large search spaces (e.g. 88-char charset at length 10 is ~3.7 × 10¹⁹).
- **`nthPassword(charset, maxLength, n): string`** — converts a flat integer index to the corresponding candidate via base-N odometer arithmetic. Workers now use it conceptually only at batch boundaries: each claimed batch is positioned once, then iterated in-place with an odometer-style incrementer to avoid rebuilding every candidate from scratch.

### Step 4 — Cryptographic Verification

The most important performance decision: passwords are verified using a **purpose-built crypto verifier** (`src/utils/pdf-verifier.ts`) instead of loading the PDF through a full renderer on every attempt.

The verifier:

1. **Parses the `/Encrypt` dictionary** from raw PDF bytes once (finds the xref table, follows the trailer to `/Encrypt`, reads `/R`, `/V`, `/O`, `/U`, `/P`, `/KeyLength`, `/ID`).
2. **Derives the encryption key** from the candidate password using the algorithm specified by `/R`.
3. **Validates the key** against the pre-computed `/U` (user password hash) stored in the PDF — this is a pure crypto comparison that takes microseconds.

No PDF rendering. No DOM. No I/O. Just math.

### Step 5 — Multi-Worker Parallelism

Workers are spawned one per logical CPU core (capped at the charset length):

```ts
const numWorkers = Math.min(navigator.hardwareConcurrency ?? 4, charset.length);
```

All workers receive the same `SharedArrayBuffer` reference (not a copy). There is no static work partitioning — every worker races for the next batch of indices via atomics, which naturally balances load when some workers are slower (e.g. due to AES-256 async operations).

When one worker finds the password:

- It posts a `success` message to the main thread.
- The main thread calls `terminate()` on every other worker immediately.

### Step 6 — Work-Stealing with SharedArrayBuffer

Each worker claims work in batches (default `BATCH_SIZE = 500` indices per claim):

```ts
const startIdx = Atomics.add(counter, 0, BATCH); // atomic fetch-and-add
if (startIdx >= spaceSize) break; // all work exhausted

const endIdx = min(startIdx + BATCH, spaceSize);
const iterator = createBatchCandidateIterator(
  charset,
  maxLength,
  startIdx,
  endIdx,
);
for (let candidate = iterator.next(); candidate; candidate = iterator.next()) {
  // ... verify ...
}
```

`Atomics.add` is a single CPU instruction on x86/ARM — contention is negligible even with 16 workers on the same counter. The worker only does the expensive index-to-password conversion once per claimed batch; the rest of the batch advances by mutating the candidate in place.

---

## Tech Stack

| Layer         | Library                                                 | Purpose                         |
| ------------- | ------------------------------------------------------- | ------------------------------- |
| Build         | [Vike](https://vike.dev) + [Vite 8](https://vitejs.dev) | Static prerendering + bundling  |
| Language      | TypeScript 5.9                                          | Type safety                     |
| UI framework  | React 19                                                | Component rendering             |
| Compiler      | React Compiler (Babel plugin)                           | Automatic memoization           |
| Rendering     | Vike SSG                                                | Pre-rendered static HTML output |
| Async state   | TanStack Query                                          | Mutation lifecycle for cracking |
| Forms         | TanStack Form                                           | Upload form handling            |
| Styling       | Tailwind CSS v4                                         | Utility-first CSS               |
| Notifications | react-toastify                                          | Toast messages                  |
| PDF detection | pdf-lib 1.17                                            | Initial protection check        |
| Crypto        | SubtleCrypto (browser built-in) + hand-rolled MD5       | Fast password verification      |
| Concurrency   | Web Workers + SharedArrayBuffer + Atomics               | Parallel brute-force            |

---

## Project Structure

```text
pdf-unlocker/
├── pages/
│   ├── +config.ts               # Vike global config: prerender + shared metadata
│   ├── +Head.tsx                # Global head tags and structured data
│   └── index/
│       └── +Page.tsx            # Prerendered home page entry
├── vite.config.ts               # Vike/Vite config: prerender plugin, Tailwind, React Compiler, COOP/COEP headers, @ alias
├── src/
│   ├── pages/
│   │   ├── +config.ts           # Vike global config: prerender + shared metadata
│   │   ├── +Head.tsx            # Global head tags and structured data
│   │   ├── index/
│   │   │   └── +Page.tsx        # Prerendered home page entry
│   │   ├── home/
│   │   │   └── index.tsx        # HomePage — layout, animated blobs, Card shell
│   │   └── index.ts             # Re-exports HomePage for app code
│   ├── app.tsx                   # Shared React providers (QueryClient + ToastContainer)
│   ├── styles/
│   │   └── index.css             # Tailwind import + CSS variables + blob animation keyframes
│   ├── types/
│   │   ├── pdf.types.ts          # PdfStatus, PdfProtectionResult
│   │   └── worker.types.ts       # WorkerInMessage / WorkerOutMessage union types
│   ├── utils/
│   │   ├── pdf.ts                # checkPdfProtection() — uses pdf-lib lazily
│   │   ├── password-index.ts     # nthPassword() + passwordSpaceSize() — flat-index navigation
│   │   └── pdf-verifier.ts       # parsePdfEncrypt() + verifyPassword() + verifyPasswordAsync()
│   ├── workers/
│   │   └── brute-force.worker.ts # Web Worker: claims index batches atomically, verifies via pdf-verifier
│   ├── hooks/
│   │   ├── use-pdf-check.ts      # usePdfCheck — wraps checkPdfProtection in a TanStack Query mutation
│   │   └── use-cracker.ts        # useCracker — spawns workers, aggregates progress, exposes startCracking/stopCracking
│   ├── icons/
│   │   └── info-circle.tsx       # SVG icon component
│   └── components/
│       ├── ui/                   # shadcn-style primitives (Button, Card, Input, Progress, Badge)
│       ├── common/               # Shared atoms: FileInput, LoadingSpinner, ErrorMessage
│       ├── upload-form/          # UploadForm — TanStack Form + FileInput + PDF info card
│       └── cracker/
│           ├── cracker.tsx       # Cracker — charset toggles, min/max length controls, start/stop button
│           └── components/
│               ├── progress-display.tsx  # ProgressDisplay — attempt counter + progress bar + current candidate
│               └── result-display.tsx    # ResultDisplay — success (shows password) or failure banner
```

---

├── pages/
│ ├── +config.ts # Vike global config: prerender + shared metadata
│ ├── +Head.tsx # Global head tags and structured data
│ └── index/
│ └── +Page.tsx # Prerendered home page entry

## Getting Started

### Prerequisites

│ ├── app.tsx # Shared React providers (QueryClient + ToastContainer)

- [Node.js](https://nodejs.org) 20 or later
- [pnpm](https://pnpm.io) 9 or later (`npm install -g pnpm`)

### Install

```bash
pnpm install
```

### Dev Server

```bash
pnpm dev
```

Opens Vike's dev server at `http://localhost:3000`. The dev server automatically sets the required `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers that unlock `SharedArrayBuffer`.

### Production Build

```bash
pnpm build       # TypeScript compile + Vike production build + prerender
pnpm start       # Preview the prerendered output at localhost:3000
```

> **Important**: your production web server should serve the COOP/COEP headers if you want the full multi-worker engine. Without them, the app falls back to a single worker instead of failing.

### GitHub Pages Deployment

This repository now includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that publishes the static build from `dist/client` to GitHub Pages.

1. Push the repository to GitHub.
2. In the repository settings, open **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` or `master`, or run the **Deploy GitHub Pages** workflow manually.

The workflow automatically sets `PUBLIC_BASE_PATH` so the app works both for project pages (`https://<user>.github.io/<repo>/`) and user/org pages (`https://<user>.github.io/`).

If you need to build locally for Pages, use the same environment variable before running `pnpm build`:

```bash
PUBLIC_BASE_PATH=/pdf-unlocker/ pnpm build
```

GitHub Pages cannot send the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers required for `SharedArrayBuffer`. Because of that, the deployed app automatically falls back to a single worker on Pages instead of failing. The UI still works, but cracking throughput will be lower than on a host where COOP/COEP headers are available.

---

## Usage Guide

### Upload a PDF

Drag and drop a `.pdf` file onto the upload area, or click to open a file picker. The file is read entirely in-memory (`FileReader.readAsArrayBuffer`) — nothing is uploaded anywhere.

After selection, the app immediately runs the protection check. The result is shown as a badge:

- **Unprotected** (green) — the PDF has no password. A toast confirms this and no further action is needed.
- **Protected** (amber) — the PDF is encrypted. The cracker panel appears below.

To try a different file, click the **×** button on the file info card.

### Configure the Search

Before starting, configure the character set and password length range:

**Charset toggles** (shown as chips):

| Chip  | Characters included          |
| ----- | ---------------------------- | -------- |
| `a-z` | `abcdefghijklmnopqrstuvwxyz` |
| `A-Z` | `ABCDEFGHIJKLMNOPQRSTUVWXYZ` |
| `0-9` | `0123456789`                 |
| `#@!` | `!@#$%^&\*()-\_=+[]{}        | ;:,.<>?` |

All four are enabled by default. Click any chip to toggle that group on or off.

### Min / Max Length

Use the **Min length** and **Max length** number inputs to define the range of password lengths to search:

- **Min length** (default `1`) — passwords shorter than this are skipped entirely. If you know the password is at least 6 characters, set Min to `6` to skip ~26 billion unnecessary short attempts.
- **Max length** (default `10`) — the search stops after exhausting all candidates up to this length.

The two inputs clamp against each other: `minLength` can never exceed `maxLength` and vice versa. The subtitle under "Password Finder" updates live to reflect the current settings:

- `"Testing 88 characters · 6–10 characters"` — when min < max
- `"Testing 88 characters · 8 chars"` — when min = max

### Custom Charset

Expand **Advanced options** to type a custom character set. When this field is non-empty, the charset toggle chips are ignored and only the exact characters you typed are used (deduplicated automatically).

This is useful when you remember parts of the password (e.g. only digits and a known symbol), dramatically shrinking the search space.

### Start & Stop

Click **Start Testing** to begin. You will see:

- An attempt counter incrementing in real time (aggregated across all workers).
- The current candidate being tested.
- A `Progress` bar showing completion through the search space.

Click **Stop** at any time to terminate all workers.

**On success**: the password is displayed in a green banner with a copy-friendly monospaced font. A success toast also fires.

**On failure** (all combinations exhausted): a red banner and toast indicate no matching password was found within the configured search space.

---

## Configuration Reference

| Setting             | Default | Range          | Description                                       |
| ------------------- | ------- | -------------- | ------------------------------------------------- | ------------------- |
| Charset — lowercase | on      | toggle         | `a-z` (26 chars)                                  |
| Charset — uppercase | on      | toggle         | `A-Z` (26 chars)                                  |
| Charset — digits    | on      | toggle         | `0-9` (10 chars)                                  |
| Charset — symbols   | on      | toggle         | `!@#$%^&\*()-\_=+[]{}                             | ;:,.<>?` (26 chars) |
| Custom charset      | empty   | any string     | Overrides all toggles when non-empty              |
| Min length          | 1       | 1 – maxLength  | Skip passwords shorter than this                  |
| Max length          | 10      | minLength – 20 | Stop after exhausting passwords up to this length |
| Batch size          | 500     | (internal)     | Index claims per `Atomics.add` call               |
| Progress interval   | 1000    | (internal)     | Attempts between `postMessage` progress updates   |

---

## Architecture Deep-Dive

### Password Index Space

The entire search space is modelled as a **flat 0-based integer range**. Ordering:

```text
length 1:  index 0 … (|charset|¹ − 1)
length 2:  index |charset|¹ … (|charset|¹ + |charset|² − 1)
…
length N:  index ∑ᵢ₌₁ᴺ⁻¹ |charset|ⁱ … (∑ᵢ₌₁ᴺ |charset|ⁱ − 1)
```

Total size:

$$\text{spaceSize}(charset, N) = \sum_{k=1}^{N} |charset|^k$$

`bigint` is used throughout to avoid floating-point precision loss. A 10-character password space over all printable ASCII (~95 chars) is ≈ 6 × 10¹⁹ — well beyond `Number.MAX_SAFE_INTEGER`.

To position a worker at batch start index `n`, the search subtracts the length-block offsets until it finds which block `n` falls into, then uses repeated modulo once to extract the initial character positions. After that, the batch advances with an odometer carry step instead of recomputing every later candidate from the raw index:

```ts
for (let len = 1; len <= maxLength; len++) {
  const count = base ** len;
  if (offset < count) {
    for (let i = len - 1; i >= 0; i--) {
      chars[i] = charset[offset % base];
      offset = Math.floor(offset / base);
    }
    return chars.join('');
  }
  offset -= count;
}
```

### SharedArrayBuffer Coordination

`SharedArrayBuffer` requires two HTTP response headers to be present:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These are configured in `vite.config.ts` for both the dev server and the `preview` server. You must replicate them in your production web server (nginx, Caddy, Netlify `_headers` file, etc.).

The coordination mechanism is a single `BigInt64Array` cell at index 0 inside the shared buffer. All workers do:

```ts
const startIdx = Atomics.add(counter, 0, BATCH); // fetch-and-add, returns old value
```

This is a single atomic CPU instruction — it returns the previous value and increments the counter in one uninterruptible step. Because no two workers can receive the same `startIdx`, there is zero duplication of work.

### PDF Verifier — No Full Parsing in the Hot Path

The key insight is that the PDF `/Encrypt` dictionary contains everything needed to verify a password candidate — no rendering or full parsing is required. The verifier parses this dictionary **once**, stores the result in a plain JS object (`EncryptDict`), and then every verification call is pure math.

The verifier handles two families of Standard Security Handler:

### Revision 2/3/4 (RC4)

Based on **ISO 32000-1 §7.6.3**, using MD5 key derivation and RC4 stream cipher:

1. Pad or truncate the candidate password to 32 bytes using the standard PDF padding string.
2. Concatenate: `padded_password ‖ /O ‖ /P (4 bytes LE) ‖ /ID[0] ‖ [extra for R≥4]`.
3. Hash with MD5; for R≥3, iterate the hash 50 more times.
4. The resulting n-byte key (where n = `/KeyLength / 8`) is the encryption key.
5. For R2: RC4-encrypt the 32-byte padding with the key; compare with `/U`.
6. For R3/R4: RC4-encrypt MD5(`padding ‖ /ID[0]`) with key, then XOR-chain 19 more RC4 passes; compare first 16 bytes with `/U`.

MD5 is run entirely in JS (`src/utils/pdf-verifier.ts`) using the standard RFC 1321 algorithm with precomputed T-table constants and per-round shift table. RC4 is a straightforward 256-byte key-scheduling + PRGA loop.

### Revision 5/6 (AES-256)

Based on **PDF 1.7 Extension Level 3 / ISO 32000-2**, using SHA-256 via `SubtleCrypto`:

1. Extract a 8-byte validation salt from bytes 32–39 of `/U`.
2. Compute SHA-256(`password ‖ validation_salt`).
3. Compare the 32-byte result with bytes 0–31 of `/U`.

This path is asynchronous (`verifyPasswordAsync`) and uses `crypto.subtle.digest('SHA-256', ...)` — a native browser implementation, far faster than any JS equivalent.

### React Compiler

The project uses the experimental **React Compiler** (`babel-plugin-react-compiler` via `@rolldown/plugin-babel`). This automatically inserts `useMemo` / `useCallback` / caching where the compiler determines it is safe and beneficial — no manual memoization annotations are needed. This eliminates the most common class of React performance bugs.

---

## Security & Privacy

- **Nothing leaves your browser.** The PDF `ArrayBuffer` is read from disk into browser memory and stays there. No fetch calls, no WebSockets, no Service Worker caches that outlive the tab.
- **Web Workers are isolated.** Each worker runs in a separate thread with no access to the DOM or the main thread's memory (except through explicit `postMessage` and the shared counter buffer).
- **The shared counter is write-once per claim.** Workers only write to offset 0 of the shared buffer via `Atomics.add`. They cannot corrupt each other's state.
- **No third-party analytics or tracking.**

---

## Browser Requirements

| Feature             | Chrome | Firefox | Safari | Edge |
| ------------------- | ------ | ------- | ------ | ---- |
| Web Workers         | 4+     | 3.5+    | 4+     | 12+  |
| `SharedArrayBuffer` | 68+    | 79+     | 15.2+  | 79+  |
| `SubtleCrypto`      | 37+    | 34+     | 10.1+  | 12+  |
| `BigInt`            | 67+    | 68+     | 14+    | 79+  |
| `Atomics`           | 68+    | 78+     | 15.2+  | 79+  |

In practice, any browser released after early 2022 will work. If `SharedArrayBuffer` is unavailable (missing COOP/COEP headers), the app shows a clear error toast rather than silently falling back to a single-worker mode.

---

## Known Limitations

- **Speed vs. password length**: brute-force is exponential. A 10-character password over 88 characters has ~3.7 × 10¹⁹ candidates. Even at 5 million attempts/second (across 8 cores), exhaustive search would take millions of years. The tool is practical only for short or partial passwords.
- **PDF 2.0 / custom security handlers**: non-Standard Security Handlers (e.g. company-specific DRM plugins) are not supported. The verifier will post `failure` with 0 attempts.
- **XRef stream-only PDFs**: some PDF generators omit the classic cross-reference table and use only compressed xref streams. `parsePdfEncrypt` may not locate the `/Encrypt` dictionary in these files; it will log a warning and post `failure`.
- **Owner passwords**: the verifier checks the **user password** only. Owner passwords (which restrict printing/copying but not opening) follow a different derivation path and are not currently implemented.
- **File size**: very large PDFs (> ~100 MB) may cause memory pressure when cloned across N workers. A 50 MB PDF × 16 workers = ~800 MB resident. Consider closing other tabs if memory is limited.

---

## Development Notes

**Linting and formatting:**

```bash
pnpm lint       # Prettier (write) + ESLint (check)
pnpm lint:fix   # Prettier (write) + ESLint (fix)
```

**TypeScript paths:** The `@/` alias resolves to `src/`. Configured in both `vite.config.ts` (Vite) and `tsconfig.app.json` (TypeScript language server).

**Adding shadcn components:** The `src/components/ui/` folder holds hand-crafted shadcn-style primitives. To add a new one, create `src/components/ui/my-component.tsx` and re-export it from `src/components/ui/index.ts`.

**Worker hot-reload in dev:** Vite automatically HMRs the main bundle, but workers are separate entry points. After editing `brute-force.worker.ts`, reload the page to pick up the new worker bundle.

**PLAN.md:** A detailed build-phase checklist at the project root tracks every implementation step. Consult it before adding new features to understand what has already been done and in what order.
