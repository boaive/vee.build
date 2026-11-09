/**
 * The capsule's length, as the visitor has chosen it (developer,
 * 2026-11-09: "we only have one pod in there, other 2 will be options to
 * live, on clicking that the pod changes. by default it will be in 10m").
 * Set by the length buttons (the hero's capsule step, the POD page's
 * opening), read by the scenes that draw the pod (kit/pod.tsx, `follow`;
 * the phone's hero), which are told when it changes. One choice a page.
 */
import { podDefault, type PodLengthM } from '../data/pod';

export const podChoice = {
  length: podDefault as PodLengthM,
  listeners: new Set<() => void>(),
};

export function choosePod(length: PodLengthM) {
  if (podChoice.length === length) return;
  podChoice.length = length;
  podChoice.listeners.forEach((fn) => fn());
}
