import { useEffect, useState } from 'react';
import { COMPACT_QUERY } from './device';

/** True on a compact layout (film/device.ts), after hydration; false on the server and on desktop. */
export function useCompact() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return compact;
}
