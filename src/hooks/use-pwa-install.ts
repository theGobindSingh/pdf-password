import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface UsePwaInstall {
  /** True when the browser has a deferred install prompt ready to show */
  canInstall: boolean;
  /** Trigger the native install prompt (no-op on iOS — show isIos instructions instead) */
  install: () => Promise<void>;
  /** True while waiting for the user to respond to the prompt */
  isInstalling: boolean;
  /** True on iOS Safari, which never fires beforeinstallprompt */
  isIos: boolean;
}

const detectIos = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return (
    (/iphone|ipad|ipod/i.test(navigator.userAgent) &&
      // iPadOS 13+ reports as Mac; check touch support as fallback
      !/(macintosh)/i.test(navigator.userAgent)) ||
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
};

const isRunningStandalone = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

/**
 * Captures the `beforeinstallprompt` event and exposes an `install()` function
 * that re-shows the browser's native PWA install dialog.
 *
 * On iOS Safari (which never fires `beforeinstallprompt`), `isIos` is true and
 * `canInstall` is true when the app is not yet running in standalone mode — so
 * the UI can show "Add to Home Screen" instructions instead.
 */
export const usePwaInstall = (): UsePwaInstall => {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIos] = useState(() => detectIos());
  const [isStandalone] = useState(() => isRunningStandalone());

  useEffect(() => {
    // Pick up the event if it fired before React mounted
    const early = (
      window as Window & {
        __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
      }
    ).__pwaInstallPrompt;
    if (early) {
      setPrompt(early);
      (
        window as Window & {
          __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
        }
      ).__pwaInstallPrompt = null;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If already installed, clear the prompt
    const appInstalledHandler = () => setPrompt(null);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    setIsInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setPrompt(null);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  // On iOS: show the button whenever not already running as a standalone app
  const canInstall = isIos ? !isStandalone : prompt !== null;

  return { canInstall, install, isInstalling, isIos };
};
