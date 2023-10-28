'use client';

import { useEffect, useState } from 'react';

export const useTimeouts = () => {
  const [timeouts, setTimeouts] = useState<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timeouts.forEach((timeout) => {
        clearTimeout(timeout);
      });
    },
    [timeouts],
  );

  const addTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(callback, delay);
    setTimeouts((list) => [...list, timeout]);
  };

  return addTimeout;
};
