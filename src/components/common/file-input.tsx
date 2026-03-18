import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';

interface FileInputProps {
  onChange: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  fileName?: string;
}

export const FileInput = ({
  onChange,
  accept = '.pdf',
  disabled = false,
  fileName,
}: FileInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  let dragStateClass =
    'cursor-pointer border-border bg-muted/30 hover:border-primary/60 hover:bg-muted/50';

  if (disabled) {
    dragStateClass = 'cursor-not-allowed border-border bg-muted/30 opacity-50';
  } else if (isDraggingOver) {
    dragStateClass = 'cursor-copy border-primary bg-primary/10';
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onChange(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onChange(file);
  };

  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed',
        'p-8 text-center transition-colors',
        dragStateClass,
      ].join(' ')}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' '))
          inputRef.current?.click();
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload PDF file"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        aria-hidden="true"
      />

      <svg
        className="h-10 w-10 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>

      {fileName ? (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-foreground">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            Click or drop to swap file
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-foreground">
            Upload your PDF to get started
          </p>
          <p className="text-xs text-muted-foreground">
            We&apos;ll test every password combination to find yours
          </p>
        </div>
      )}
    </div>
  );
};
