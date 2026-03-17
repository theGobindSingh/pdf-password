import { ErrorMessage, FileInput, LoadingSpinner } from '@/components/common';
import { Badge, CardDescription, CardTitle } from '@/components/ui';
import { usePdfCheck } from '@/hooks';
import type { PdfStatus } from '@/types';
import { useForm } from '@tanstack/react-form';
import {
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';

interface PdfReadyData {
  file: File;
  arrayBuffer: ArrayBuffer;
  protection: 'protected' | 'unprotected';
}

interface UploadFormProps {
  file: File | null;
  /** A file received via the Web Share Target API — auto-processed on mount. */
  initialFile?: File | null;
  onPdfReady: (data: PdfReadyData) => void;
  onRemove: () => void;
  status: PdfStatus;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadge(status: PdfStatus) {
  switch (status) {
    case 'protected':
      return <Badge variant="warning">Password Protected</Badge>;
    case 'unprotected':
      return <Badge variant="success">No Password</Badge>;
    case 'error':
      return <Badge variant="destructive">Error</Badge>;
    default:
      return null;
  }
}

export function UploadForm({
  file,
  initialFile,
  onPdfReady,
  onRemove,
  status,
}: UploadFormProps) {
  const { checkPdfAsync, isPending, error, reset } = usePdfCheck();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const sharedFileProcessed = useRef(false);

  const form = useForm({
    defaultValues: { file: null as File | null },
  });

  const handleFileChange = useCallback(
    async (newFile: File) => {
      reset();

      if (
        newFile.type !== 'application/pdf' &&
        !newFile.name.toLowerCase().endsWith('.pdf')
      ) {
        toast.error('Please upload a PDF file.');
        return;
      }

      try {
        const result = await checkPdfAsync(newFile);
        onPdfReady({
          file: newFile,
          arrayBuffer: result.arrayBuffer,
          protection: result.result,
        });

        if (result.result === 'unprotected') {
          toast.info('This PDF is not password protected.');
        } else {
          toast.warn('This PDF is password protected.');
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not read this file. Please try a different PDF.';
        toast.error(msg);
      }
    },
    [checkPdfAsync, onPdfReady, reset],
  );

  // Auto-process a file that arrived via the Web Share Target
  useEffect(() => {
    if (initialFile && !sharedFileProcessed.current) {
      sharedFileProcessed.current = true;
      void handleFileChange(initialFile);
    }
    // handleFileChange is stable (useCallback) so this is safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  function handleRemove() {
    reset();
    form.reset();
    onRemove();
  }

  function handleCardDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isPending) setIsDraggingOver(true);
  }

  function handleCardDragLeave() {
    setIsDraggingOver(false);
  }

  function handleCardDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    if (isPending) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) void handleFileChange(dropped);
  }

  const showCard = file !== null && status === 'protected';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-y-1">
        <div>
          <CardTitle>PDF Unlocker</CardTitle>
          <CardDescription className="mt-1">
            Forgot your PDF password? Select your file and we'll recover it for
            you.
          </CardDescription>
        </div>
        {!isPending && statusBadge(status)}
      </div>

      {showCard ? (
        <div
          className={[
            'relative flex items-center gap-4 rounded-xl border-2 p-4 transition-colors',
            isDraggingOver
              ? 'cursor-copy border-primary bg-primary/10'
              : 'border-border bg-muted/30',
          ].join(' ')}
          onDragOver={handleCardDragOver}
          onDragLeave={handleCardDragLeave}
          onDrop={handleCardDrop}
        >
          {/* Hidden input for click-to-replace */}
          <input
            ref={replaceInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFileChange(f);
              e.target.value = '';
            }}
          />

          {/* PDF icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6M9 17h4"
              />
            </svg>
          </div>

          {/* File details */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>

          {/* Drag hint */}
          {isDraggingOver && (
            <p className="absolute inset-0 flex items-center justify-center rounded-xl text-sm font-medium text-primary">
              Drop to replace
            </p>
          )}

          {/* Loading overlay */}
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-card/80 text-sm text-muted-foreground">
              <LoadingSpinner size="sm" />
              <span>Checking your file…</span>
            </div>
          )}

          {/* X button */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            aria-label="Remove file"
            className="ml-auto shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ) : (
        <form.Field name="file">
          {(field) => (
            <FileInput
              onChange={(f) => {
                field.handleChange(f);
                void handleFileChange(f);
              }}
              disabled={isPending}
              fileName={field.state.value?.name}
            />
          )}
        </form.Field>
      )}

      {!showCard && isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner size="sm" />
          <span>Checking your file…</span>
        </div>
      )}

      {error && <ErrorMessage message={error.message} />}
    </div>
  );
}
