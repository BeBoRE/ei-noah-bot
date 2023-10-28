'use client';

import { useEffect, useRef } from 'react';

export const useTimeouts = () => {
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timeouts.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
    },
    [],
  );

  const addTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      callback();
      timeouts.current = timeouts.current.filter((t) => t !== timeout);
    }, delay);
    timeouts.current.push(timeout);
  };

  return addTimeout;
};
