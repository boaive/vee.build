import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  BufferGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  type Group,
  type InstancedMesh,
  type LineSegments,
  type Mesh,
} from 'three';
import { deckDetails, type ManualAddOn, type ManualKind, type Plot, type ShellType, type Turn, type UnitSpec } from '../../data/build';
import { CELL, FRONT, STOREY, baseOf, cells, check, layoutAddOns, occupancy, placeOf, sideOf, span, worldToCell, type AddOnLayout, type Unit } from '../../build/model';
import { build, shown, useBuild } from '../../build/store';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease } from '../../film/timeline';
import Stage, { useLabel, type Rig } from '../Stage';
import { Paving, rounded } from '../kit/env';
import { UNIT_BOX, memo, merge as mergeAll } from '../kit/geometry';
import { AddOnGhost, House } from '../kit/house';
import { Ground, LAND, TreeLine, Woodland, type TreeSpot } from '../kit/landscape';
import { ghostBad, ghostMat, mat } from '../kit/materials';
import { moduleGeometry } from '../kit/parts';

export type Tool = ShellType | null;

export interface Hover {
  spec: UnitSpec;
  ok: boolean;
  why?: string;
}

/** What the pointer is over while an add-on is armed. */
export interface AddOnHover {
  m: ManualAddOn;
  ok: boolean;
  /** Already placed: a click takes it away. */
  placed: boolean;
  why?: string;
}

/** Camera state the DOM drags and the scene eases towards. */
export interface Orbit {
  az: number;
  el: number;
  top: boolean;
  /** Distance multiplier from the wheel or pinch. */
  zoom: number;
}

export interface BuildSceneProps extends SceneProps {
  tool: Tool;
  addOnTool: ManualKind | null;
  turn: Turn;
  selected: number | null;
  orbit: Orbit;
  onHover: (h: Hover | null) => void;
  onAddOnHover: (h: AddOnHover | null) => void;
  onPick: (spec: UnitSpec) => void;
  onSelect: (id: number | null) => void;
  onAddOn: (m: ManualAddOn) => void;
}

const DROP = 0.45;
const Y = new Vector3(0, 1, 0);

/* ---------- Plot ---------- */

function gridLines(plot: Plot) {
  return memo(`build-grid-${plot.x}-${plot.z}`, () => {
    const W = plot.x * CELL;
    const D = plot.z * CELL;
    const pts: number[] = [];
    for (let i = 0; i <= plot.x; i++) pts.push(i * CELL, 0, 0, i * CELL, 0, D);
    for (let j = 0; j <= plot.z; j++) pts.push(0, 0, j * CELL, W, 0, j * CELL);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pts, 3));
    return g;
  });
}

const wallMat = new MeshStandardMaterial({ color: '#d2cdc3', roughness: 0.95 });

/** The plot: paved, with its grid and low walls on three sides; the street in front. */
function Site({ plot }: { plot: Plot }) {
  const W = plot.x * CELL;
  const D = plot.z * CELL;
  const walls = useMemo(
    () =>
      memo(`build-walls-${plot.x}-${plot.z}`, () => {
        const w = rounded(W + 3, 0.7, 0.3, 0.06).clone().translate(W / 2, 0, -1.65);
        const l = rounded(0.3, 0.7, D + 3.3, 0.06).clone().translate(-1.65, 0, D / 2 - 0.15);
        const r = rounded(0.3, 0.7, D + 3.3, 0.06).clone().translate(W + 1.65, 0, D / 2 - 0.15);
        return mergeAll([w, l, r]);
      }),
    [plot.x, plot.z, W, D],
  );
  return (
    <>
      <Paving w={W + 3} d={D + 3} x={W / 2} z={D / 2} tile={1.5} y={0.004} material={mat.paving} line="#3b3e43" lineOpacity={0.06} />
      <Paving w={W + 14} d={7} x={W / 2} z={D + 6.2} tile={3} y={0.006} material={mat.asphalt} line="#000000" lineOpacity={0.05} />
      <mesh geometry={walls} material={wallMat} castShadow receiveShadow />
      <lineSegments geometry={gridLines(plot)} position-y={0.06}>
        <lineBasicMaterial color="#6b6e74" transparent opacity={0.3} />
      </lineSegments>
    </>
  );
}

/* ---------- Ghosts and selection ---------- */

function footprintLoop(t: ShellType) {
  return memo(`ghost-loop-${t}`, () => {
    const [sx, sz] = span(t, 0);
    const box = UNIT_BOX.clone();
    box.scale(sx * CELL - 0.1, 0.001, sz * CELL - 0.1);
    return new EdgesGeometry(box);
  });
}

const okLine = new LineBasicMaterial({ color: '#e2491d' });
const badLine = new LineBasicMaterial({ color: '#b8320c', transparent: true, opacity: 0.6 });
const selLine = new LineBasicMaterial({ color: '#e2491d' });
const addGhost = new MeshStandardMaterial({ color: '#ffffff', emissive: '#e2491d', emissiveIntensity: 0.35, transparent: true, opacity: 0.55, depthWrite: false });
const removeGhost = new MeshStandardMaterial({ color: '#e2491d', transparent: true, opacity: 0.45, depthWrite: false });

function Ghost({ hover, base }: { hover: RefObject<Hover | null>; base: number }) {
  const group = useRef<Group>(null);
  const meshA = useRef<Mesh>(null);
  const meshB = useRef<Mesh>(null);
  const loop = useRef<LineSegments>(null);
  const current = useRef(new Vector3());
  const invalidate = useThree((s) => s.invalidate);

  useFrame((_, dt) => {
    const g = group.current;
    const h = hover.current;
    if (!g) return;
    g.visible = !!h;
    if (!h) return;
    const [x, y, z, ry] = placeOf(h.spec, base);
    const target = _t.set(x, y, z);
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 22);
    if (current.current.distanceTo(target) > 4) current.current.copy(target);
    else current.current.lerp(target, k);
    g.position.copy(current.current);
    g.position.y += 0.06;
    g.rotation.y = ry;
    if (meshA.current) {
      meshA.current.visible = h.spec.t === 'A';
      meshA.current.material = h.ok ? ghostMat : ghostBad;
    }
    if (meshB.current) {
      meshB.current.visible = h.spec.t === 'B';
      meshB.current.material = h.ok ? ghostMat : ghostBad;
    }
    if (loop.current) {
      loop.current.geometry = footprintLoop(h.spec.t);
      loop.current.material = h.ok ? okLine : badLine;
    }
    if (current.current.distanceTo(target) > 0.005) invalidate();
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={meshA} geometry={moduleGeometry('A')} material={ghostMat} renderOrder={2} />
      <mesh ref={meshB} geometry={moduleGeometry('B')} material={ghostMat} renderOrder={2} />
      <lineSegments ref={loop} position-y={-y0} />
    </group>
  );
}
const _t = new Vector3();
const y0 = 0.02;

function Selection({ units, selected, base }: { units: readonly Unit[]; selected: number | null; base: number }) {
  const u = units.find((x) => x.id === selected);
  const geo = useMemo(() => {
    if (!u) return null;
    const [sx, sz] = span(u.t, 0);
    const box = UNIT_BOX.clone();
    box.scale(sx * CELL + 0.12, STOREY + 0.1, sz * CELL + 0.12);
    return new EdgesGeometry(box);
  }, [u]);
  if (!u || !geo) return null;
  const [x, y, z, ry] = placeOf(u, base);
  return <lineSegments geometry={geo} material={selLine} position={[x, y + STOREY / 2, z]} rotation-y={ry} />;
}

/* ---------- Camera ---------- */

function Director({ orbit, units, plot, base, rig }: { orbit: Orbit; units: readonly Unit[]; plot: Plot; base: number; rig: Rig }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const cur = useRef({ az: orbit.az, el: orbit.el, dist: 34, tx: 0, ty: 2, tz: 0 });

  const fit = useMemo(() => {
    const W = plot.x * CELL;
    const D = plot.z * CELL;
    const plotR = Math.hypot(W, D) * 0.5;
    if (!units.length) return { tx: 0, ty: 1.5, tz: 0, r: Math.max(13, plotR * 0.75) };
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    let top = 0;
    for (const u of units) {
      const [sx, sz] = span(u.t, u.r);
      x0 = Math.min(x0, u.x);
      x1 = Math.max(x1, u.x + sx);
      z0 = Math.min(z0, u.z);
      z1 = Math.max(z1, u.z + sz);
      top = Math.max(top, u.y + 1);
    }
    const w = (x1 - x0) * CELL;
    const d = (z1 - z0) * CELL;
    const h = top * STOREY + base;
    return {
      tx: ((x0 + x1) / 2) * CELL - W / 2,
      ty: Math.max(1.4, h * 0.42),
      tz: ((z0 + z1) / 2) * CELL - D / 2,
      r: Math.max(13, plotR * 0.62, Math.hypot(w, d, h * 1.15) * 0.62 + 6),
    };
  }, [units, plot, base]);

  useFrame((_, dt) => {
    const c = cur.current;
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 5.5);
    const el = orbit.top ? 1.48 : orbit.el;
    const az = orbit.top ? 0 : orbit.az;
    const aspect = size.width / size.height;
    const dist = fit.r * 2.25 * (aspect < 1.2 ? 1.2 / aspect : 1) * (orbit.top ? 1.05 : 1) * orbit.zoom;
    const before = c.az + c.el + c.dist + c.tx + c.ty + c.tz;
    c.az += (az - c.az) * k;
    c.el += (el - c.el) * k;
    c.dist += (dist - c.dist) * k;
    c.tx += (fit.tx - c.tx) * k;
    c.ty += ((orbit.top ? 0 : fit.ty) - c.ty) * k;
    c.tz += (fit.tz - c.tz) * k;
    camera.position.set(c.tx + Math.sin(c.az) * Math.cos(c.el) * c.dist, c.ty + Math.sin(c.el) * c.dist, c.tz + Math.cos(c.az) * Math.cos(c.el) * c.dist);
    camera.lookAt(c.tx, c.ty, c.tz);
    camera.updateMatrixWorld();
    rig.lightTarget.set(c.tx, 0, c.tz);
    if (Math.abs(c.az + c.el + c.dist + c.tx + c.ty + c.tz - before) > 0.0004) invalidate();
  });
  return null;
}

/* ---------- Surroundings ---------- */

const PALETTE = LAND.day;
const TREES: TreeSpot[] = [
  { x: -34, z: -30, s: 1.05, variant: 0 },
  { x: -46, z: -12, s: 0.9, variant: 1 },
  { x: 38, z: -34, s: 1.1, variant: 2 },
  { x: 52, z: -6, s: 0.85, variant: 0 },
  { x: -28, z: -48, s: 1.2, variant: 2 },
  { x: 20, z: -52, s: 0.95, variant: 1 },
];
const LINES: [number, number, number, number, number][] = [
  [-220, -160, 220, -190, 70],
  [-260, -90, -180, 140, 30],
  [190, -120, 250, 120, 28],
];

/* ---------- Scene ---------- */

function Configurator({ tool, addOnTool, turn, selected, orbit, onHover, onAddOnHover, onPick, onSelect, onAddOn, place, rig, reduced }: BuildSceneProps & { rig: Rig }) {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const units = state.units;
  const plot = state.plot;
  const base = baseOf(state.foundation);
  const W = plot.x * CELL;
  const D = plot.z * CELL;
  const hover = useRef<Hover | null>(null);
  const lastKey = useRef('');
  const invalidate = useThree((s) => s.invalidate);
  const label = useLabel(place);
  const [addHover, setAddHover] = useState<AddOnHover | null>(null);

  // When a shell arrives, it drops in.
  const arrivals = useRef(new Map<number, number>());
  const known = useRef<Set<number> | null>(null);
  useEffect(() => {
    const now = performance.now();
    if (!known.current) known.current = new Set(units.map((u) => u.id));
    else
      for (const u of units)
        if (!known.current.has(u.id)) {
          known.current.add(u.id);
          if (!reduced) arrivals.current.set(u.id, now);
        }
    invalidate();
  }, [units, reduced, invalidate]);

  // Plot edge handles and the selection's tool pill, placed as DOM.
  useFrame(() => {
    if (arrivals.current.size) invalidate();
    const ox = -W / 2;
    const oz = -D / 2;
    label('extend-0', 0, 0.1, oz + D + 1.1, 1);
    label('extend-1', ox + W + 1.1, 0.1, 0, 1);
    label('extend-2', 0, 0.1, oz - 1.1, 1);
    label('extend-3', ox - 1.1, 0.1, 0, 1);
    const u = units.find((x) => x.id === selected);
    if (u) {
      const [x, y, z] = placeOf(u, base);
      label('selection', ox + x, y + STOREY + 0.7, oz + z, 1);
    } else label('selection', 0, 0, 0, 0);
  });

  const pose = (u: Unit): [number, number, number, number] => {
    const at = arrivals.current.get(u.id);
    if (at === undefined) return [0, 0, 0, 1];
    const t = clamp01((performance.now() - at) / (DROP * 1000));
    if (t >= 1) arrivals.current.delete(u.id);
    return [0, (1 - ease.seat(t)) * 3.4, 0, 1];
  };

  const setHover = (h: Hover | null) => {
    hover.current = h;
    const k = h ? `${h.spec.t}${h.spec.x}${h.spec.z}${h.spec.y}${h.spec.r}${h.ok}` : '';
    if (k !== lastKey.current) {
      lastKey.current = k;
      onHover(h);
      invalidate();
    }
  };

  const setAdd = (h: AddOnHover | null) => {
    const k = h ? `${h.m.k}${h.m.u}${h.m.s}${h.ok}${h.placed}` : '';
    if (k === lastKey.current) return;
    lastKey.current = k;
    setAddHover(h);
    onAddOnHover(h);
    invalidate();
  };

  /** Candidate placement for the armed shell at a cell, choosing which way an A extends. */
  const candidate = (cx: number, cz: number, y: number, fx: number, fz: number): Hover | null => {
    if (!tool) return null;
    const [sx, sz] = span(tool, turn);
    const options: UnitSpec[] = [];
    const prefer = (sx > 1 ? fx >= 0.5 : sz > 1 ? fz >= 0.5 : true) ? 0 : 1;
    const a: UnitSpec = { t: tool, r: turn, y, x: cx, z: cz };
    const b: UnitSpec = { t: tool, r: turn, y, x: cx - (sx - 1), z: cz - (sz - 1) };
    if (prefer === 0) options.push(a, b);
    else options.push(b, a);
    for (const o of options) {
      const v = check(build.get().units, o, undefined, plot);
      if (v.ok) return { spec: o, ok: true };
    }
    const v = check(build.get().units, options[0], undefined, plot);
    return { spec: options[0], ok: false, why: v.ok ? undefined : v.why };
  };

  /** Plot coordinates (metres from the plot corner) of a world point. */
  const local = (p: Vector3) => [p.x + W / 2, p.z + D / 2] as const;

  const fromGround = (p: Vector3) => {
    const [lx, lz] = local(p);
    const [cx, cz] = worldToCell(lx, lz);
    return candidate(cx, cz, 0, lx / CELL - cx, lz / CELL - cz);
  };

  const unitHit = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const mesh = e.object as InstancedMesh;
    const type = mesh.userData.type as ShellType | undefined;
    if (!type || e.instanceId === undefined || !e.face) return null;
    const u = units.filter((x) => x.t === type)[e.instanceId];
    if (!u) return null;
    return { u, n: e.face.normal.clone().applyAxisAngle(Y, (u.r * Math.PI) / 2) };
  };

  const fromUnit = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const hit = unitHit(e);
    if (!hit) return null;
    const { u, n } = hit;
    const [lx, lz] = local(e.point);
    if (n.y > 0.5) {
      const [cx, cz] = worldToCell(lx, lz);
      return { unit: u, hover: candidate(cx, cz, u.y + 1, lx / CELL - cx, lz / CELL - cz) };
    }
    const [cx, cz] = worldToCell(lx + n.x * 0.6, lz + n.z * 0.6);
    return { unit: u, hover: candidate(cx, cz, u.y, 0.5 + n.x * 0.5, 0.5 + n.z * 0.5) };
  };

  /** What the armed add-on would do at this hit. */
  const addOnAt = (e: ThreeEvent<PointerEvent | MouseEvent>): AddOnHover | null => {
    if (!addOnTool) return null;
    const hit = unitHit(e);
    if (!hit) return null;
    const { u, n } = hit;
    const occ = occupancy(units);
    if (addOnTool === 'roof' || addOnTool === 'solar') {
      const m: ManualAddOn = { k: addOnTool, u: u.id };
      const covered = cells(u).some(([x, z]) => occ.has(`${x},${z},${u.y + 1}`)) || units.some((o) => o.y === u.y + 1);
      return { m, ok: !covered, placed: build.hasManual(m), why: covered ? 'Only the top shells take a roof or panels.' : undefined };
    }
    if (n.y > 0.5) return { m: { k: addOnTool, u: u.id }, ok: false, placed: false, why: 'Point at a wall of the shell.' };
    const s = sideOf(n.x, n.z);
    const m: ManualAddOn = { k: addOnTool, u: u.id, s };
    const [fx, fz] = FRONT[s];
    if (!cells(u).some(([x, z]) => !occ.has(`${x + fx},${z + fz},${u.y}`))) return { m, ok: false, placed: false, why: 'That wall meets another shell.' };
    if ((addOnTool === 'deck' || addOnTool === 'steps') && u.y !== 0) return { m, ok: false, placed: false, why: 'Decks and steps go on the ground floor.' };
    if (addOnTool === 'steps' && !build.hasManual({ k: 'deck', u: u.id, s })) return { m, ok: false, placed: false, why: 'Place a deck on that side first.' };
    return { m, ok: true, placed: build.hasManual(m) };
  };

  const ghostLayout = useMemo<AddOnLayout | null>(() => {
    if (!addHover || !addHover.ok) return null;
    const extra: ManualAddOn[] = [addHover.m];
    if (addHover.m.k === 'steps' && addHover.m.s !== undefined) extra.push({ k: 'deck', u: addHover.m.u, s: addHover.m.s });
    const on = new Set(state.addOns.filter((a) => deckDetails.includes(a)));
    return layoutAddOns(units, on, 'auto', extra, base);
  }, [addHover, units, state.addOns, base]);

  const onGroundMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === 'touch') return;
    e.stopPropagation();
    if (addOnTool) return setAdd(null);
    setHover(fromGround(e.point));
  };
  const onUnitMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === 'touch') return;
    e.stopPropagation();
    if (addOnTool) return setAdd(addOnAt(e));
    setHover(fromUnit(e)?.hover ?? null);
  };
  const onGroundClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6 || addOnTool) return;
    if (!tool) return onSelect(null);
    const h = fromGround(e.point);
    if (h?.ok) onPick(h.spec);
    else setHover(h);
  };
  const onUnitClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    if (addOnTool) {
      const h = addOnAt(e);
      if (h?.ok) {
        onAddOn(h.m);
        lastKey.current = '';
        setAdd({ ...h, placed: !h.placed });
      } else if (h) setAdd(h);
      return;
    }
    const hit = fromUnit(e);
    if (!hit) return;
    if (!tool) return onSelect(hit.unit.id);
    if (hit.hover?.ok) onPick(hit.hover.spec);
    else onSelect(hit.unit.id);
  };

  useEffect(() => {
    if (!tool) setHover(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);
  useEffect(() => {
    if (!addOnTool) setAdd(null);
    else setHover(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOnTool]);

  return (
    <>
      <Director orbit={orbit} units={units} plot={plot} base={base} rig={rig} />
      <Ground palette={PALETTE} flat={70} hills={26} seed={9} />
      <Woodland spots={TREES} palette={PALETTE} flat={70} hills={26} />
      <TreeLine lines={LINES} palette={PALETTE} flat={70} hills={26} />
      <group position={[-W / 2, 0, -D / 2]}>
        <Site plot={plot} />
        <mesh rotation-x={-Math.PI / 2} position={[W / 2, 0.01, D / 2]} onPointerMove={onGroundMove} onPointerOut={() => (addOnTool ? setAdd(null) : setHover(null))} onClick={onGroundClick}>
          <planeGeometry args={[W + 2, D + 2]} />
          <meshBasicMaterial visible={false} />
        </mesh>
        {units.length > 0 && (
          <group onPointerMove={onUnitMove} onClick={onUnitClick}>
            <House
              units={units}
              addOns={view.addOns}
              deckSide={view.deckSide}
              manual={view.manual}
              shellHex={view.shellHex}
              deckHex={view.deckHex}
              trimHex={view.trimHex}
              foundation={view.foundation}
              look={rig.look}
              pose={pose}
            />
          </group>
        )}
        <Selection units={units} selected={selected} base={base} />
        <Ghost hover={hover} base={base} />
        <AddOnGhost layout={ghostLayout} material={addHover?.placed ? removeGhost : addGhost} />
      </group>
    </>
  );
}

export default function BuildScene(props: BuildSceneProps) {
  return (
    <Stage {...props} look="site" ground="none" focus={[0.5, 0.54]} focusCompact={[0.5, 0.52]} shadowExtent={30} post={{ ao: true, aoRadius: 0.8, bloom: 0.12, bloomThreshold: 2.4 }}>
      {(rig) => <Configurator {...props} rig={rig} />}
    </Stage>
  );
}
