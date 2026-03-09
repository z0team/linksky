'use client';

import { useEffect, useState } from 'react';

type NavigatorConnection = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
};

type NavigatorWithPerformanceHints = Navigator & {
  connection?: NavigatorConnection;
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

const getLiteModeState = (forceLiteMode = false) => {
  if (forceLiteMode || typeof window === 'undefined') return forceLiteMode;

  const nav = navigator as NavigatorWithPerformanceHints;
  const connection = nav.connection;
  const saveData = connection?.saveData === true;
  const slowNetwork = typeof connection?.effectiveType === 'string' && /(^|-)2g$/.test(connection.effectiveType);
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
  const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;

  return saveData || slowNetwork || lowMemory || lowCpu;
};

export function useLiteMode(forceLiteMode = false) {
  const [liteMode, setLiteMode] = useState(() => getLiteModeState(forceLiteMode));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const nav = navigator as NavigatorWithPerformanceHints;
    const connection = nav.connection;

    const update = () => {
      setLiteMode(getLiteModeState(forceLiteMode || media.matches));
    };

    update();
    media.addEventListener('change', update);
    connection?.addEventListener?.('change', update);

    return () => {
      media.removeEventListener('change', update);
      connection?.removeEventListener?.('change', update);
    };
  }, [forceLiteMode]);

  return liteMode;
}
