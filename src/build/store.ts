/**
 * The visitor's build, shared by every island on the page: the configurator
 * edits it; "your house", the factory and the installation show it.
 * A tiny external store (no library): get / subscribe / actions, undo,
 * persisted per browser and shareable as a ?build= link.
 */
import { useSyncExternalStore } from 'react';
import {
  DEFAULT_FOUNDATION,
  DEFAULT_PLOT,
  PLOT_LIMITS,
  SAMPLE_PRESET,
  addOnIds,
  addOnInfo,
  deckFinishes,
  presets,
  shellFinishes,
  trimFinishes,
  type AddOnId,
  type DeckSide,
  type Foundation,
  type ManualAddOn,
  type ManualKind,
  type Plot,
  type ShellType,
  type Turn,
  type UnitSpec,
} from '../data/build';
import { baseOf, canRemove, cells, centred, check, plotFor, rotated, suggest, type Unit, type Verdict } from './model';

export type AddOnMode = 'auto' | 'manual';

export interface BuildState {
  units: Unit[];
  addOns: AddOnId[];
  deckSide: DeckSide;
  shell: string;
  deck: string;
  trim: string;
  plot: Plot;
  foundation: Foundation;
  addOnMode: AddOnMode;
  /** Add-ons placed by hand (used when addOnMode is 'manual'). */
  manual: ManualAddOn[];
  /** Preset the build started from, while it is unchanged. */
  preset: string | null;
  nextId: number;
  /** Bumped on every change. */
  rev: number;
}

const EMPTY: BuildState = {
  units: [],
  addOns: [],
  deckSide: 'auto',
  shell: shellFinishes[0].id,
  deck: deckFinishes[0].id,
  trim: trimFinishes[0].id,
  plot: DEFAULT_PLOT,
  foundation: DEFAULT_FOUNDATION,
  addOnMode: 'auto',
  manual: [],
  preset: null,
  nextId: 1,
  rev: 0,
};

const KEY = 'vee.build/v2';
const KEY_V1 = 'vee.build/v1';
let state = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
const past: BuildState[] = [];

/* ---------- Share codes ---------- */
/*
 * v2~A0010.B2100~dpsh~a~stone.teak.black~6x4~1p~m~d00.t00.w11
 *    units (type, x, z base 36, floor, turn) ~ add-ons ~ deck side ~ finishes
 *    ~ plot ~ foundation (height index, f|p) ~ mode (a|m) ~ manual placements
 *    (kind letter, unit index in the encoded order, side).
 * v1 codes (no prefix) are still read.
 */

const LETTER: Record<AddOnId, string> = { deck: 'd', posts: 'p', spandrel: 's', handrail: 'h', steps: 't', shades: 'w', roof: 'r', solar: 'v' };
const KIND: Record<ManualKind, string> = { deck: 'd', steps: 't', shade: 'w', roof: 'r', solar: 'v' };
const KIND_OF = Object.fromEntries(Object.entries(KIND).map(([k, v]) => [v, k])) as Record<string, ManualKind>;

const order = (units: readonly Unit[]) => [...units].sort((p, q) => p.y - q.y || p.id - q.id);

export function encode(s: BuildState) {
  const list = order(s.units);
  const index = new Map(list.map((u, i) => [u.id, i]));
  const units = list.map((u) => `${u.t}${u.x.toString(36)}${u.z.toString(36)}${u.y}${u.r}`).join('.');
  const adds = s.addOns.map((a) => LETTER[a]).join('');
  const manual = s.manual
    .filter((m) => index.has(m.u))
    .map((m) => `${KIND[m.k]}${index.get(m.u)!.toString(36)}${m.s ?? ''}`)
    .join('.');
  return [
    'v2',
    units,
    adds,
    s.deckSide === 'auto' ? 'a' : s.deckSide,
    `${s.shell}.${s.deck}.${s.trim}`,
    `${s.plot.x}x${s.plot.z}`,
    `${s.foundation.h}${s.foundation.type === 'plinth' ? 'p' : 'f'}`,
    s.addOnMode === 'manual' ? 'm' : 'a',
    manual,
  ].join('~');
}

function decode(code: string): BuildState | null {
  const v2 = code.startsWith('v2~');
  const parts = (v2 ? code.slice(3) : code).split('~');
  const [u = '', a = '', d = 'a', f = '', pl = '', fo = '', mo = 'a', ma = ''] = parts;
  const specs: UnitSpec[] = [];
  for (const tok of u.split('.').filter(Boolean)) {
    const m = /^([AB])([0-9a-z])([0-9a-z])(\d)([0-3])$/.exec(tok);
    if (!m) return null;
    specs.push({ t: m[1] as ShellType, x: parseInt(m[2], 36), z: parseInt(m[3], 36), y: +m[4], r: +m[5] as Turn });
  }
  let plot = plotFor(specs);
  const pm = /^(\d+)x(\d+)$/.exec(pl);
  if (pm) plot = clampPlot({ x: Math.max(plot.x, +pm[1]), z: Math.max(plot.z, +pm[2]) });
  const units = admit(specs, plot);
  if (!units) return null;
  const addOns = addOnIds.filter((id) => a.includes(LETTER[id]));
  const [shell, deck, trim] = f.split('.');
  const fm = /^([0-2])([fp])$/.exec(fo);
  const foundation: Foundation = fm ? { h: +fm[1] as 0 | 1 | 2, type: fm[2] === 'p' ? 'plinth' : 'footings' } : DEFAULT_FOUNDATION;
  const list = order(units);
  const manual: ManualAddOn[] = [];
  for (const tok of ma.split('.').filter(Boolean)) {
    const mm = /^([dtwrv])([0-9a-z])([0-3]?)$/.exec(tok);
    const target = mm ? list[parseInt(mm[2], 36)] : undefined;
    if (!mm || !target) continue;
    manual.push({ k: KIND_OF[mm[1]], u: target.id, ...(mm[3] ? { s: +mm[3] as Turn } : {}) });
  }
  return {
    ...EMPTY,
    units,
    addOns,
    deckSide: d === 'a' ? 'auto' : (Math.min(3, Math.max(0, +d || 0)) as Turn),
    shell: shellFinishes.some((x) => x.id === shell) ? shell : EMPTY.shell,
    deck: deckFinishes.some((x) => x.id === deck) ? deck : EMPTY.deck,
    trim: trimFinishes.some((x) => x.id === trim) ? trim : EMPTY.trim,
    plot,
    foundation,
    addOnMode: v2 && mo === 'm' ? 'manual' : 'auto',
    manual,
    nextId: units.length + 1,
  };
}

const clampPlot = (p: Plot): Plot => ({
  x: Math.min(PLOT_LIMITS.max.x, Math.max(PLOT_LIMITS.min.x, p.x)),
  z: Math.min(PLOT_LIMITS.max.z, Math.max(PLOT_LIMITS.min.z, p.z)),
});

/** Accept a list of shells only if every one is valid in order (ground first). */
function admit(specs: readonly UnitSpec[], plot: Plot): Unit[] | null {
  const units: Unit[] = [];
  const sorted = [...specs].sort((p, q) => p.y - q.y);
  for (const s of sorted) {
    if (!check(units, s, undefined, plot).ok) return null;
    units.push({ ...s, id: units.length + 1 });
  }
  return units;
}

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('build');
    const raw = fromUrl ?? window.localStorage.getItem(KEY) ?? window.localStorage.getItem(KEY_V1);
    const s = raw ? decode(raw) : null;
    if (s) state = s;
  } catch {
    /* storage can be unavailable; start empty */
  }
}

function save() {
  try {
    window.localStorage.setItem(KEY, encode(state));
  } catch {
    /* not essential */
  }
}

function commit(next: Omit<BuildState, 'rev'>, record = true) {
  if (record) {
    past.push(state);
    if (past.length > 80) past.shift();
  }
  state = { ...next, rev: state.rev + 1 };
  save();
  listeners.forEach((l) => l());
}

const withUnits = (units: Unit[], extra: Partial<BuildState> = {}) => {
  const ids = new Set(units.map((u) => u.id));
  return { ...state, units, preset: null, manual: state.manual.filter((m) => ids.has(m.u)), ...extra };
};

export type Result = Verdict & { id?: number };

const sameManual = (a: ManualAddOn, b: ManualAddOn) => a.k === b.k && a.u === b.u && (a.s ?? -1) === (b.s ?? -1);

export const build = {
  get(): BuildState {
    load();
    return state;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  canUndo: () => past.length > 0,
  undo() {
    const prev = past.pop();
    if (!prev) return;
    state = { ...prev, rev: state.rev + 1 };
    save();
    listeners.forEach((l) => l());
  },

  place(spec: UnitSpec): Result {
    const s = build.get();
    const v = check(s.units, spec, undefined, s.plot);
    if (!v.ok) return v;
    const id = s.nextId;
    commit(withUnits([...s.units, { ...spec, id }], { nextId: id + 1 }));
    return { ok: true, id };
  },
  add(t: ShellType, r: Turn): Result {
    const s = build.get();
    const spot = suggest(s.units, t, r, s.plot);
    if (!spot) return { ok: false, why: 'There is no free spot left for that shell. Extend the plot.' };
    return build.place(spot);
  },
  remove(id: number): Result {
    const s = build.get();
    const u = s.units.find((x) => x.id === id);
    if (!u) return { ok: false, why: 'Nothing selected.' };
    const v = canRemove(s.units, u);
    if (!v.ok) return v;
    commit(withUnits(s.units.filter((x) => x.id !== id)));
    return { ok: true };
  },
  rotate(id: number): Result {
    const s = build.get();
    const u = s.units.find((x) => x.id === id);
    if (!u) return { ok: false, why: 'Nothing selected.' };
    const r = rotated(s.units, u, s.plot);
    if ('ok' in r) return r;
    commit(withUnits(s.units.map((x) => (x.id === id ? r : x))));
    return { ok: true, id };
  },
  toggleAddOn(id: AddOnId) {
    const s = build.get();
    const on = new Set(s.addOns);
    if (on.has(id)) {
      on.delete(id);
      // Parts that hang off the deck go with it.
      if (id === 'deck') for (const a of addOnIds) if (addOnInfo[a].needs === 'deck') on.delete(a);
    } else {
      on.add(id);
      const needs = addOnInfo[id].needs;
      if (needs) on.add(needs);
    }
    commit({ ...s, addOns: addOnIds.filter((a) => on.has(a)), preset: s.preset });
  },
  setAddOnMode(mode: AddOnMode) {
    const s = build.get();
    if (s.addOnMode === mode) return;
    commit({ ...s, addOnMode: mode });
  },
  /** Place a manual add-on, or take it away if it is already there. Returns true when placed. */
  toggleManual(m: ManualAddOn): boolean {
    const s = build.get();
    const has = s.manual.some((x) => sameManual(x, m));
    // Roof and solar: one of each per shell, whichever side was clicked.
    const manual = has ? s.manual.filter((x) => !sameManual(x, m)) : [...s.manual, m];
    commit({ ...s, manual, addOnMode: 'manual' });
    return !has;
  },
  hasManual: (m: ManualAddOn) => build.get().manual.some((x) => sameManual(x, m)),
  clearManual() {
    const s = build.get();
    if (!s.manual.length) return;
    commit({ ...s, manual: [] });
  },
  setDeckSide(side: DeckSide) {
    commit({ ...build.get(), deckSide: side });
  },
  setShell(id: string) {
    commit({ ...build.get(), shell: id });
  },
  setDeck(id: string) {
    commit({ ...build.get(), deck: id });
  },
  setTrim(id: string) {
    commit({ ...build.get(), trim: id });
  },
  setFoundation(f: Partial<Foundation>) {
    const s = build.get();
    commit({ ...s, foundation: { ...s.foundation, ...f } });
  },
  /**
   * Grow or shrink the plot by one row of cells on a side (0 street, 1 right,
   * 2 back, 3 left). Growing left or back shifts the house so it stays put.
   */
  resizePlot(side: Turn, delta: 1 | -1): Result {
    const s = build.get();
    const alongX = side === 1 || side === 3;
    const plot = { ...s.plot };
    if (alongX) plot.x += delta;
    else plot.z += delta;
    const limited = clampPlot(plot);
    if (limited.x !== plot.x || limited.z !== plot.z)
      return { ok: false, why: delta > 0 ? 'The plot cannot grow further that way.' : 'The plot cannot get any smaller.' };
    const shift = side === 3 || side === 2 ? delta : 0;
    const units = s.units.map((u) => (alongX ? { ...u, x: u.x + shift } : { ...u, z: u.z + shift }));
    if (delta < 0 && units.some((u) => cells(u).some(([x, z]) => x < 0 || z < 0 || x >= plot.x || z >= plot.z)))
      return { ok: false, why: 'A shell stands on that edge. Move it before shrinking the plot.' };
    commit({ ...s, plot, units });
    return { ok: true };
  },
  loadPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    const s = build.get();
    const plot = clampPlot({ x: Math.max(s.plot.x, plotFor(p.units).x), z: Math.max(s.plot.z, plotFor(p.units).z) });
    const units = admit(centred(p.units, plot), plot) ?? [];
    commit({ ...s, units, addOns: p.addOns, deckSide: p.deckSide, plot, addOnMode: 'auto', manual: [], preset: p.id, nextId: units.length + 1 });
  },
  clear() {
    const s = build.get();
    if (!s.units.length && !s.addOns.length) return;
    commit({ ...s, units: [], addOns: [], deckSide: 'auto', manual: [], preset: null, nextId: 1 });
  },
};

/** Subscribe a component to part of the build. Select stable values (fields), not new objects. */
export function useBuild<T>(select: (s: BuildState) => T): T {
  return useSyncExternalStore(
    build.subscribe,
    () => select(build.get()),
    () => select(EMPTY),
  );
}

/* ---------- What to show where the build appears ---------- */

export interface Shown {
  units: Unit[];
  addOns: AddOnId[];
  deckSide: DeckSide;
  /** Manual placements, or null when add-ons are laid out automatically. */
  manual: ManualAddOn[] | null;
  shellHex: string;
  deckHex: string;
  trimHex: string;
  foundation: Foundation;
  /** Underside of the ground floor above ground. */
  base: number;
  plot: Plot;
  /** True when the visitor has not placed anything and the sample stands in. */
  sample: boolean;
  name: string;
}

const sampleCache = new Map<string, Unit[]>();

export function shown(s: BuildState): Shown {
  const shellHex = (shellFinishes.find((f) => f.id === s.shell) ?? shellFinishes[0]).hex;
  const deckHex = (deckFinishes.find((f) => f.id === s.deck) ?? deckFinishes[0]).hex;
  const trimHex = (trimFinishes.find((f) => f.id === s.trim) ?? trimFinishes[0]).hex;
  const common = { shellHex, deckHex, trimHex, foundation: s.foundation, base: baseOf(s.foundation) };
  if (s.units.length) {
    const p = s.preset ? presets.find((x) => x.id === s.preset) : null;
    return {
      ...common,
      units: s.units,
      addOns: s.addOns,
      deckSide: s.deckSide,
      manual: s.addOnMode === 'manual' ? s.manual : null,
      plot: s.plot,
      sample: false,
      name: p ? p.name : 'Your house',
    };
  }
  const p = presets.find((x) => x.id === SAMPLE_PRESET)!;
  let units = sampleCache.get(p.id);
  if (!units) {
    units = admit(centred(p.units), DEFAULT_PLOT) ?? [];
    sampleCache.set(p.id, units);
  }
  return { ...common, units, addOns: p.addOns, deckSide: p.deckSide, manual: null, plot: DEFAULT_PLOT, sample: true, name: p.name };
}
