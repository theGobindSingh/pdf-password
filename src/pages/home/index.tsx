import { Card, CardContent, CardHeader } from '@/components/ui';
import { UploadForm } from '@/components/upload-form';
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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Decorative background blobs */}
      <div className="blob pointer-events-none absolute -left-48 -top-48 h-[600px] w-[600px] bg-blue-600/10 blur-3xl" />
      <div className="blob-delay pointer-events-none absolute -bottom-48 -right-48 h-[500px] w-[500px] bg-blue-400/8 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Hero */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Find the Password to Your PDF
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload your PDF and we’ll test every possible combination to find
            your password — completely private, right in your browser.
          </p>
        </div>

        <Card>
          <CardHeader>
            <UploadForm
              file={pdfState?.file ?? null}
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
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 z-10 flex flex-col items-center gap-1 text-xs text-muted-foreground/50">
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
    </main>
  );
}
