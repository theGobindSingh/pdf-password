# Project: PDF Password Analyzer

## Project Overview

Build a single-page React application that allows a user to upload a PDF file. The app checks if the PDF is password-protected. If it is not protected, the user is informed. If it is protected, the app attempts to brute-force crack the password by trying character combinations, and upon success displays the password.

The application must be pure client-side (no backend). All processing happens in the browser.

## Build Progress — PLAN.md

A `PLAN.md` file at the project root (`/home/rimuru/programming/pdf-unlocker/PLAN.md`) tracks every step of the build as a checkbox list.

**Rules for all contributors (human and AI):**

1. **Read `PLAN.md` first.** Before doing any work, read `PLAN.md` to understand what has already been completed and what comes next.
2. **Work in order.** Complete phases and steps in the order listed in `PLAN.md`. Do not skip ahead.
3. **One step at a time.** Finish a step fully before starting the next.
4. **Mark immediately.** As soon as a step is complete, update its checkbox from `- [ ]` to `- [x]` in `PLAN.md` before moving on.
5. **No regressions.** Do not uncheck or remove completed steps unless explicitly asked to redo them.
6. **Keep it current.** If new steps are discovered during implementation (e.g. a bug fix, a missing file), add them to the relevant phase in `PLAN.md` and check them off when done.

## Technology Stack

- **React** (with TypeScript) - bootstrapped via Vite.
- **TanStack Router** - for client-side routing (even though only one page, it sets up future scalability).
- **TanStack Query** - for managing server-state (or asynchronous state like the cracking process).
- **TanStack Hotkeys** - (for future) for optional keyboard shortcuts (e.g., start cracking with `Ctrl+Enter`).
- **TanStack Form** - for handling the PDF upload form.
- **Tailwind CSS** - for styling.
- **shadcn/ui** - for accessible, pre-built UI components (use the CLI to add components like Button, Input, Card, Progress, etc.).
- **react-toastify** - for toast notifications.
- **pdf.js (react-pdf)** + **pdf-lib** - to work with PDF files in the browser, check for password protection, and attempt decryption. Use dynamic imports to load these libraries only when needed to reduce initial bundle size.
- **Web Workers** - to run the brute-force cracking in a separate thread, preventing UI freeze.

## Project Structure (proposed)

```
src/
├── index.tsx                 # Entry point
├── main.tsx                   # Main App component
├── router.tsx                # TanStack Router configuration
├── pages/
│   ├── index.ts              # Exports all pages
│   └── home/
│       ├── index.tsx         # Home page component
│       └── components/       # Page-specific components (if any)
├── components/
│   ├── index.ts              # Exports all shared components
│   ├── ui/                   # shadcn components (added via CLI)
│   │   ├── index.ts          # Exports all UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── progress.tsx
│   ├── upload-form/
│   │   ├── index.tsx         # UploadForm component
│   │   └── upload-form.tsx   # Main component file (optional)
│   ├── cracker/
│   │   ├── index.tsx         # Cracker component
│   │   ├── cracker.tsx       # Main component
│   │   └── components/       # Sub-components for cracker
│   │       ├── index.ts
│   │       ├── progress-display.tsx
│   │       └── result-display.tsx
│   └── common/                # Truly reusable components
│       ├── index.ts
│       ├── file-input.tsx
│       ├── loading-spinner.tsx
│       └── error-message.tsx
├── hooks/
│   ├── index.ts              # Exports all hooks
│   ├── use-pdf-check.ts      # Hook to check if PDF is password-protected
│   └── use-cracker.ts        # Hook to manage cracking worker and state
├── workers/
│   ├── index.ts              # Worker exports (if needed)
│   └── brute-force.worker.ts # Web Worker that performs brute-force attempts
├── utils/
│   ├── index.ts              # Exports all utilities
│   ├── pdf.ts                # Utility functions for PDF operations
│   └── brute-force.ts        # Password generation logic
├── types/
│   ├── index.ts              # Exports all types
│   ├── pdf.types.ts          # PDF-related types
│   └── worker.types.ts       # Worker message types
└── styles/
    └── index.css             # Tailwind imports
```

## Naming Conventions

- **Folders and files**: Use lower case kebab-case (e.g., `upload-form.tsx`, `use-pdf-check.ts`)
- **Components**: Use PascalCase for component names in the file, but the filename is lower kebab-case
- **Index files**: Each folder should have an `index.ts` (or `index.tsx` for components) that exports the public API of that folder

## Reusability & Modularity Principles

1. **Component granularity**: Break down UI into small, focused components
2. **Single responsibility**: Each component/hook/util should do one thing well
3. **Composition over configuration**: Use component composition instead of large props
4. **Shared components**: Place truly reusable components in `components/common/`
5. **Feature-based organization**: Group related components within feature folders (e.g., `cracker/` has its own sub-components)
6. **Custom hooks**: Extract complex logic into reusable hooks
7. **Utility functions**: Keep pure logic in `utils/` for easy testing and reuse

## Detailed Feature Requirements

### 1. PDF Upload Form

- Use **TanStack Form** to create a simple form with a file input (accept `.pdf`).
- Validate that the uploaded file is a PDF.
- Store the file in component state (or TanStack Query cache) for later processing.
- Create reusable `FileInput` component under `components/common/` that handles file selection and basic validation.

### 2. Check Password Protection

- When a file is selected, automatically run the detection.
- Use a utility function that reads the PDF (e.g., with `pdf-lib`) and attempts to load it with an empty password.
  - If the PDF loads, it is not password-protected → show a toast: "This PDF has no password."
  - If loading fails due to an encryption error, it is password-protected → proceed to step 3.
- Handle other errors (corrupted file, etc.) and show appropriate toasts.

### 3. Brute-Force Cracking (if protected)

- Provide a **Start Cracking** button (only enabled when a protected PDF is uploaded).
- The cracking process must run in a **Web Worker** to keep the UI responsive.
- The worker should generate password candidates in a systematic way:
  - For a proof-of-concept, start with a limited character set and length (e.g., lowercase letters, max length 8). This can be made configurable later.
  - Use an iterative approach to avoid blocking (e.g., generate candidates and yield after each attempt).
- For each candidate, the worker attempts to open the PDF with that password. This requires sending the PDF data to the worker and using the same PDF library to attempt decryption.
- To avoid loading the PDF repeatedly, the worker can receive the PDF `ArrayBuffer` once and keep it in memory.
- The worker should post progress updates back to the main thread (e.g., number of attempts, current candidate).
- When a correct password is found, the worker posts the password back and terminates.
- If the worker exhausts all combinations, it posts a failure message.

### 4. UI Updates and Notifications

- While cracking, show a progress indicator (e.g., a shadcn `Progress` bar) and the current password being tried.
- Use **TanStack Query** to manage the cracking state (isLoading, isSuccess, data, error). The worker can be triggered via a mutation.
- When the password is found, display it prominently and show a success toast.
- If no password is found, show a failure toast.
- Use **react-toastify** for all notifications (info, success, error).

### 5. Keyboard Shortcuts (optional but nice - for future)

- With **TanStack Hotkeys**, add a shortcut like `Ctrl+Enter` to start cracking when a protected PDF is ready.

### 6. Styling and Design

- Dark theme as default (using Tailwind's dark mode classes or shadcn's dark variant).
- Minimalist layout: a centered card (shadcn `Card`) containing the upload form, and below it the cracker status area.
- Use shadcn components for buttons, inputs, cards, progress bars.
- Ensure responsive design.

### 7. Edge Cases and Error Handling

- Large PDF files: handle memory constraints gracefully; maybe limit file size with a warning.
- No file selected: disable cracking button.
- Cracking already in progress: prevent starting another worker.
- Worker errors: catch and display toast.
- Browser support for Web Workers and File API.

## Implementation Notes

- **PDF Library Choice**: `pdf-lib` is recommended because it can load PDFs with passwords and throw specific errors. However, it may not be the fastest for repeated decryption attempts. For a real brute-force, a lower-level library might be needed, but for this demo `pdf-lib` suffices. Alternatively, `pdf.js` can be used but is heavier.
- **Worker Communication**: Use `postMessage` to send commands and receive updates. Define a clear protocol:
  - Main → Worker: `{ type: 'start', pdfData: ArrayBuffer, charset: string, maxLength: number }`
  - Worker → Main: `{ type: 'progress', attempts: number, current: string }`
  - Worker → Main: `{ type: 'success', password: string }`
  - Worker → Main: `{ type: 'failure' }`
- **Password Generation**: Implement a recursive or iterative function that generates combinations. For performance, generate candidates on the fly rather than storing them.
- **TanStack Query Integration**: Use `useMutation` for starting the crack. The mutation function spawns the worker and returns a promise that resolves when the worker finishes (success/failure). Progress can be managed via side effects or by updating query data manually.
- **Form Handling**: TanStack Form is used for the upload, but the actual file input can be a simple `<input type="file">` wrapped in a form component. Use the form's `onSubmit` to trigger the check or cracking.
- **Component Reusability**: Build small, focused components that can be reused, for example:
  - `FileInput`: Handles file selection with validation
  - `LoadingSpinner`: Reusable loading indicator
  - `ErrorMessage`: Consistent error display
  - `ProgressDisplay`: Shows progress bar and current attempt
  - `ResultDisplay`: Shows success/failure result with password
