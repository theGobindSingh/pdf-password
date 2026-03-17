import { Button } from '@/components/ui';
import { usePwaInstall } from '@/hooks';
import { useState } from 'react';

export function Footer() {
  const { canInstall, install, isInstalling, isIos } = usePwaInstall();
  const [showIosHint, setShowIosHint] = useState(false);
  return (
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
  );
}
