import { useState, useEffect } from 'react';

export function useStandaloneMode(): boolean {
  const [isStandalone, setIsStandalone] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isStandalone;
}
