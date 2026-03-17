import { Card, CardContent, CardHeader } from '@/components/ui';
import { UploadForm } from '@/components/upload-form';
import { useSharedFile } from '@/hooks';
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

const features = [
  'Files never leave your device',
  'No uploads to any server',
  'Runs entirely in your browser',
  '100% private, zero tracking',
];

export function HomeHeroSection() {
  const [pdfState, setPdfState] = useState<PdfState | null>(null);
  const sharedFile = useSharedFile();
  return (
    <div className="relative flex w-full h-dvh flex-col gap-0 justify-center items-center">
      <div className="mb-6 text-center max-w-[min(100%,450px)]">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Unlock your Password-Protected PDF
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Forgot the password to your PDF? Select the file and we'll
          systematically test every possible combination to recover it —
          entirely in your browser, your file never leaves your device.
        </p>
      </div>

      <Card className="w-[min(100%,450px)]">
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
      <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted-foreground max-w-[min(100%,450px)]">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-1.5">
            <span className="text-green-400">✓</span>
            {feature}
          </li>
        ))}
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
  );
}
