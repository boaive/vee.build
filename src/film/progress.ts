import { createContext, useContext, useEffect } from 'react';

/**
 * One film's scroll state. `target` follows the scrollbar, `value` is the
 * damped number every scene and HUD reads. Mutable on purpose: it changes
 * every frame and must not go through React state.
 */
export interface Progress {
  target: number;
  value: number;
  /** Set by the mounted Stage; asks R3F for one more frame. */
  invalidate: (() => void) | null;
  listeners: Set<(v: number) => void>;
  /** Index of a tag the pointer is on, or -1. Read by scenes that highlight parts. */
  focus: number;
  /** How far the title card before the film has opened, 0–1 (1 when there is none). */
  pre: number;
}

export const createProgress = (): Progress => ({
  target: 0,
  value: 0,
  invalidate: null,
  listeners: new Set(),
  focus: -1,
  pre: 1,
});

/** Places a DOM label at a world position. Supplied to scenes by Film. */
export type PlaceLabel = (id: string, x: number, y: number, opacity: number) => void;

export interface SceneProps {
  progress: Progress;
  place: PlaceLabel;
  compact: boolean;
  active: boolean;
  reduced: boolean;
  onReady: () => void;
}

export const FilmContext = createContext<Progress | null>(null);

/** Subscribe a DOM-updating callback to the damped progress. */
export function useFilmProgress(fn: (v: number) => void) {
  const progress = useContext(FilmContext);
  useEffect(() => {
    if (!progress) return;
    progress.listeners.add(fn);
    fn(progress.value);
    return () => {
      progress.listeners.delete(fn);
    };
    // fn is expected to be stable (refs only).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);
  return progress;
}
