import { useEffect, useState } from 'react';

const getStandaloneMode = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

export const useStandaloneMode = (): boolean => {
  const [isStandalone, setIsStandalone] = useState(getStandaloneMode);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const updateStandaloneMode = () => setIsStandalone(getStandaloneMode());

    updateStandaloneMode();
    mediaQuery.addEventListener('change', updateStandaloneMode);
    window.addEventListener('appinstalled', updateStandaloneMode);

    return () => {
      mediaQuery.removeEventListener('change', updateStandaloneMode);
      window.removeEventListener('appinstalled', updateStandaloneMode);
    };
  }, []);

  return isStandalone;
};
