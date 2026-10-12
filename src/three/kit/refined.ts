/**
 * Which scenes show the kit's materials in their refined finish
 * (materials.ts). A scene that wants it puts its buildings inside
 * `<Refined value>`; the kit's building components read `useRefined()` and
 * hand it to `kit`, `shellMat`, `trimMat` and `moduleMats`. Anywhere else
 * they get the materials as they were. For now that is the hero alone
 * (developer, 2026-10-12: the hero first, the other scenes after it has
 * been looked at).
 */
import { createContext, useContext } from 'react';

export const Refined = createContext(false);

/** True inside a refined scene. */
export const useRefined = () => useContext(Refined);
