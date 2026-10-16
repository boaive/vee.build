import { useCallback, useState } from 'react';

/**
 * A per-browser convenience (sidebar collapsed, last range). It is never data:
 * storage can be blocked or empty, and the screen must render the same without it.
 */
export function usePersistentState<T extends string | boolean>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`vee-admin/${key}`);
      if (raw === null) return initial;
      return (typeof initial === 'boolean' ? raw === 'true' : raw) as T;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(`vee-admin/${key}`, String(next));
      } catch {
        /* blocked: lasts for the visit */
      }
    },
    [key],
  );
  return [value, set] as const;
}
