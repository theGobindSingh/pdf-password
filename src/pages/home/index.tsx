import { Button, Card, CardContent, CardHeader } from '@/components/ui';
import { UploadForm } from '@/components/upload-form';
import { usePwaInstall, useSharedFile } from '@/hooks';
import { InfoCircleIcon } from '@/icons';
import type { PdfStatus } from '@/types';
import { lazy, Suspense, useState } from 'react';

const CrackerSection = lazy(() =>
  import('@/components/cracker').then((m) => ({ default: m.CrackerSection })),
);

interface PdfState {
  file: File;
  arrayBuffer: ArrayBuffer;
  status: PdfStatus;
}

export function HomePage() {
  const [pdfState, setPdfState] = useState<PdfState | null>(null);
  const sharedFile = useSharedFile();
  const { canInstall, install, isInstalling, isIos } = usePwaInstall();

  const [showIosHint, setShowIosHint] = useState(false);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      {/* Decorative background blobs — fixed overlay so they never affect layout */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="blob absolute -left-48 -top-48 h-[600px] w-[600px] bg-blue-600/10 blur-3xl" />
        <div className="blob-delay absolute -bottom-48 -right-48 h-[500px] w-[500px] bg-blue-400/8 blur-3xl" />
      </div>

      {/* All content — single in-flow column, scrolls as one unit */}
      <div className="relative z-10 flex w-full max-w-lg flex-col gap-0">
        {/* Hero */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Unlock your Password-Protected PDF
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Forgot the password to your PDF? Upload it and we'll systematically
            test every possible combination to recover it — entirely in your
            browser, your file never leaves your device.
          </p>
        </div>

        <Card>
          <CardHeader>
            <UploadForm
              file={pdfState?.file ?? null}
              initialFile={sharedFile}
              status={pdfState?.status ?? 'idle'}
              onPdfReady={({ file, arrayBuffer, protection }) =>
                setPdfState({ file, arrayBuffer, status: protection })
              }
              onRemove={() => setPdfState(null)}
            />
          </CardHeader>

          {pdfState?.status === 'protected' && pdfState.arrayBuffer && (
            <CardContent>
              <Suspense fallback={null}>
                <CrackerSection
                  pdfData={pdfState.arrayBuffer}
                  status={pdfState.status}
                />
              </Suspense>
            </CardContent>
          )}
        </Card>

        {/* Features */}
        <ul className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="text-green-400">✓</span>
            Files never leave your device
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-green-400">✓</span>
            No uploads to any server
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-green-400">✓</span>
            Runs entirely in your browser
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-green-400">✓</span>
            100% private, zero tracking
          </li>
        </ul>

        {/* Disclaimer */}
        <p className="mt-4 text-center text-xs text-muted-foreground/70">
          <InfoCircleIcon
            width={16}
            height={16}
            className="shrink-0 text-[#2d44c9] inline my-auto mb-0.75 mr-0.75"
          />
          This tool is intended only for accessing files you own or have
          permission to use.
        </p>

        {/* Footer — inside the content column, no special positioning needed */}
        <footer className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground/50">
          {canInstall && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={
                  isIos ? () => setShowIosHint((v) => !v) : () => void install()
                }
                disabled={isInstalling}
                className="flex items-center gap-1.5 text-xs cursor-pointer"
                aria-label="Install app"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {isInstalling ? 'Installing…' : 'Install App'}
              </Button>

              {/* iOS "Add to Home Screen" guidance */}
              {isIos && showIosHint && (
                <p className="max-w-xs text-center text-xs text-muted-foreground/70 px-4">
                  Tap the{' '}
                  <svg
                    className="inline h-3.5 w-3.5 align-text-bottom"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-label="Share"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>{' '}
                  Share button in Safari, then choose{' '}
                  <strong className="text-muted-foreground">
                    "Add to Home Screen"
                  </strong>
                  .
                </p>
              )}
            </>
          )}
          <p>
            Made with ❤️ in India by{' '}
            <a
              href="https://portfolio-gobindsingh.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
            >
              Gobind Singh
            </a>
          </p>
          <a
            href="https://github.com/theGobindSingh/pdf-password"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
          >
            Github Repo
          </a>
        </footer>
      </div>
    </main>
  );
}
