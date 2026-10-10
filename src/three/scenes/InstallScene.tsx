import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Vector3, type Group, type InstancedMesh, type Mesh } from 'three';
import { FOUNDATION_HEIGHTS } from '../../data/build';
import { FRONT, extent, foundationLayout, placeOf, type Unit } from '../../build/model';
import { shown, useBuild } from '../../build/store';
import { INSTALL, PLACE, PREP, installClock, stillClock } from '../../film/installTimeline';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, hold, lerp, stagger, win } from '../../film/timeline';
import Stage, { aim, useLabel, useWarmAll, type Rig } from '../Stage';
import { Pad } from '../kit/buildings';
import { Paving } from '../kit/env';
import { UNIT_BOX, box, memo, merge, setInst } from '../kit/geometry';
import { FoundationParts, House } from '../kit/house';
import { LIFT, MobileCrane, TRUCK, Truck, prepareMachines } from '../kit/machines';
import { instanced, litGlass, mat } from '../kit/materials';
import { MODULE } from '../kit/parts';

/**
 * Installation: how the manufactured shell becomes a finished habitat, in
 * the order the client set out on 2026-10-10 (film/installTimeline.ts).
 *
 * The truck arrives with one shell (the scroll brings it in). Scrolling on
 * past the trigger sets things going by themselves: the crane lifts the
 * shell off the trailer by its four hooks and places it on the foundation,
 * which is already in the ground; the truck leaves; the rest of the
 * visitor's build (or the sample) comes together shell by shell, with no
 * more scrolling; its add-ons land; and only when the last piece is in do
 * its lights come on. They are dark on the road, in the air and while the
 * building goes up.
 *
 * So this film has a clock of its own, in seconds, started and run back by
 * the scroll. Given the scroll and that clock, everything in it is still
 * placed by one function of the two.
 */

/** One job per machine, for building them in idle time before the film mounts (film/prefetch.ts). */
export const prepare = prepareMachines;

/** Where the installation's own part of the film starts on the scroll: the site's preparation comes before it. */
const AFTER_PREP = PREP.truck;

/**
 * The plot made ready (client, 2026-10-11, "Ready before the shell
 * arrives", now the first part of this film): pegs at the corners and a
 * string line round the footprint a little outside it, a pit dug where each
 * footing goes, and, once the footings and plinths are in (FoundationParts),
 * the pits backfilled and the strings taken up. Driven by the scroll. In the
 * plot's own metres (the house's coordinates).
 */
const PEG_OUT = 0.6;
function SiteMarks({ units, getP }: { units: readonly Unit[]; getP: () => number }) {
  const lay = useMemo(() => foundationLayout(units), [units]);
  // The outline's runs, each moved out from the building by PEG_OUT; a peg at each end.
  const runs = useMemo(
    () =>
      lay.plinths
        .filter((r) => r.inward !== null)
        .map((r) => {
          const [ox, oz] = FRONT[((r.inward as number) + 2) % 4 as 0 | 1 | 2 | 3];
          return { x0: r.x0 + ox * PEG_OUT, z0: r.z0 + oz * PEG_OUT, x1: r.x1 + ox * PEG_OUT, z1: r.z1 + oz * PEG_OUT };
        }),
    [lay],
  );
  const pegs = useMemo(() => {
    const out = new Map<string, [number, number]>();
    for (const r of runs)
      for (const q of [
        [r.x0, r.z0],
        [r.x1, r.z1],
      ] as [number, number][])
        out.set(q.map((v) => v.toFixed(2)).join(','), q);
    return [...out.values()];
  }, [runs]);
  const strings = useMemo(
    () =>
      memo(`site-strings-${runs.map((r) => [r.x0, r.z0, r.x1, r.z1].join(':')).join('|')}`, () =>
        merge(
          runs.map((r) => {
            const len = Math.hypot(r.x1 - r.x0, r.z1 - r.z0) + PEG_OUT * 2;
            const g = box(Math.abs(r.x1 - r.x0) > 1e-6 ? len : 0.012, 0.012, Math.abs(r.x1 - r.x0) > 1e-6 ? 0.012 : len);
            g.translate((r.x0 + r.x1) / 2, 0.42, (r.z0 + r.z1) / 2);
            return g;
          }),
        ),
      ),
    [runs],
  );
  const pegRef = useRef<InstancedMesh>(null);
  const pitRef = useRef<InstancedMesh>(null);
  const line = useRef<Mesh>(null);
  const last = useRef(-1);
  const pits = lay.footings;
  useLayoutEffect(() => {
    last.current = -1;
  }, [pits, pegs]);
  useFrame(() => {
    const p = getP();
    if (p === last.current) return;
    last.current = p;
    // Pegs go in first and come out with the strings; the strings are run between them.
    const peg = Math.min(win(p, PREP.pegs[0], PREP.pegs[1], ease.out), 1 - win(p, PREP.strings[0], PREP.strings[1], ease.in));
    const m = pegRef.current;
    if (m) {
      pegs.forEach(([x, z], i) => {
        const t = stagger(peg, i, pegs.length, 0.5);
        setInst(m, i, x, 0.25 + (1 - t) * 0.5, z, 0, t <= 0 ? 0.0001 : 0.05, t <= 0 ? 0.0001 : 0.5, t <= 0 ? 0.0001 : 0.05);
      });
      m.instanceMatrix.needsUpdate = true;
    }
    if (line.current) {
      const t = Math.min(win(p, PREP.pegs[0] + 0.03, PREP.pegs[1] + 0.02, ease.out), 1 - win(p, PREP.strings[0], PREP.strings[1] - 0.02, ease.in));
      line.current.visible = t > 0.01;
      line.current.scale.set(1, Math.max(0.0001, t), 1);
    }
    // A pit is dug where each footing goes, and filled in round it once the plinths are on.
    const dig = win(p, PREP.dig[0], PREP.dig[1], ease.out);
    const fill = win(p, PREP.backfill[0], PREP.backfill[1], ease.inOut);
    const q = pitRef.current;
    if (q) {
      pits.forEach((f, i) => {
        const t = Math.min(stagger(dig, i, pits.length, 0.5), 1 - fill);
        setInst(q, i, f.x, 0.075, f.z, 0, t <= 0.001 ? 0.0001 : 1.65 * t, 0.012, t <= 0.001 ? 0.0001 : 1.65 * t);
      });
      q.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      {pegs.length > 0 && <instancedMesh key={`pegs-${pegs.length}`} ref={pegRef} args={[UNIT_BOX, instanced(mat.deck), pegs.length]} castShadow frustumCulled={false} />}
      {pits.length > 0 && <instancedMesh key={`pits-${pits.length}`} ref={pitRef} args={[UNIT_BOX, instanced(mat.earth), pits.length]} receiveShadow frustumCulled={false} />}
      <mesh ref={line} geometry={strings} material={mat.marking} />
    </>
  );
}

/** The shell the truck brings: on the ground floor, a Shell A before a Shell B (the lifting frame is A's length), the first along the street. */
export function liftOrder(units: readonly Unit[]) {
  return [...units].sort((a, b) => a.y - b.y || (a.t === b.t ? 0 : a.t === 'A' ? -1 : 1) || a.x - b.x || a.z - b.z);
}

/** The crane's hook above a shell's underside: its hooks, and the lifting frame's drop to them. */
const HOOK_ABOVE = MODULE.H + 0.1 + LIFT.drop;
const _hook = new Vector3();

function Install({ progress, place, rig, reduced }: SceneProps & { rig: Rig }) {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const fit = useMemo(() => extent(view.units, view.base), [view.units, view.base]);
  const order = useMemo(() => liftOrder(view.units), [view.units]);
  const rank = useMemo(() => new Map(order.map((u, k) => [u.id, k])), [order]);
  const times = useMemo(() => installClock(order.length), [order.length]);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  /** The film's own clock, in seconds since the placement began. */
  const clock = useRef(0);

  // Its windows are dark until the building is complete: glazing of its own, brought up at the end.
  const glow = useMemo(() => litGlass(), []);
  useEffect(() => () => glow.dispose(), [glow]);

  // Scene layout around the build's footprint (house coordinates are offset by -cx, -cz).
  const off = useMemo(() => new Vector3(-fit.cx, 0, -fit.cz), [fit]);
  // The lane runs behind the plot, so nothing stands between the camera and the house.
  const laneZ = -(fit.d / 2 + 8.5);
  const crane = useMemo<[number, number, number]>(() => [fit.w / 2 + 8.5, 0, -fit.d / 2 - 2.6], [fit]);
  /** Where the frame is laid by when the crane has done its one lift: on the far side of the crane from the house. */
  const rest = useMemo(() => new Vector3(crane[0] + 4, LIFT.drop + 0.4, crane[2] - 10), [crane]);
  const first = order[0];
  /** Where the first shell is set down, and how it is turned there. */
  const home = useMemo(() => {
    const [x, y, z, ry] = first ? placeOf(first, view.base) : [0, 0, 0, 0];
    return { x: x + off.x, y, z: z + off.z, ry };
  }, [first, view.base, off]);
  // Nothing stands on the plot yet: the shell is carried just clear of the trailer and of its own footings.
  const carry = Math.max(home.y, TRUCK.deckY) + 2.3;

  /** The truck: brought in by the scroll once the plot is ready, sent on its way by the clock, cab first both times. */
  const truckX = (p: number, t: number) => lerp(62, 0, ease.outQuart(win(p, AFTER_PREP, INSTALL.arrive, ease.linear))) - win(t, PLACE.truck[0], PLACE.truck[1], ease.in) * 70;

  /** The first shell's underside and turn: on the trailer, in the air, on its footings. */
  const firstAt = (p: number, t: number): [number, number, number, number] => {
    const up = win(t, PLACE.up[0], PLACE.up[1], ease.inOutCubic);
    const over = win(t, PLACE.over[0], PLACE.over[1], ease.inOutCubic);
    const down = win(t, PLACE.down[0], PLACE.down[1], ease.inOutCubic);
    const x0 = lerp(62, 0, ease.outQuart(win(p, AFTER_PREP, INSTALL.arrive, ease.linear)));
    return [lerp(x0, home.x, over), lerp(TRUCK.deckY, carry, up) - down * (carry - home.y), lerp(laneZ, home.z, over), home.ry * over];
  };

  /** A shell's offset from its place, for the house: the first as the crane has it, the rest lowered in by themselves, one after another. */
  const pose = (u: Unit): [number, number, number, number, number?] | null => {
    const k = rank.get(u.id) ?? 0;
    const t = clock.current;
    const [fx, fy, fz] = placeOf(u, view.base);
    if (k === 0) {
      const w = firstAt(progress.value, t);
      return [w[0] - off.x - fx, w[1] - fy, w[2] - off.z - fz, 1, w[3]];
    }
    const [a, b] = times.shell(k - 1);
    const r = clamp01((t - a) / (b - a));
    if (r <= 0) return null;
    return [0, (1 - ease.outQuart(r)) * 7, 0, Math.min(1, r * 6)];
  };

  const turn = () => home.ry * win(clock.current, PLACE.over[0], PLACE.over[1], ease.inOutCubic);

  const getHook = () => {
    const p = progress.value;
    const t = clock.current;
    // Laid by, once it has let go.
    if (t >= PLACE.free[0]) {
      const clear = win(t, PLACE.free[0], PLACE.free[1], ease.inOutCubic);
      const stow = win(t, PLACE.stow[0], PLACE.stow[1], ease.inOutCubic);
      _hook.set(home.x, home.y + HOOK_ABOVE + clear * 2.4, home.z).lerp(rest, stow);
      // Up and over on the way, clear of the building.
      _hook.y += Math.sin(Math.PI * stow) * 2.5;
      return _hook;
    }
    if (t >= PLACE.hook[1]) {
      const w = firstAt(p, t);
      return _hook.set(w[0], w[1] + HOOK_ABOVE, w[2]);
    }
    // Waiting over where the trailer stops; then down onto the shell's four hooks.
    const reach = win(t, PLACE.hook[0], PLACE.hook[1], ease.inOutCubic);
    return _hook.set(0, TRUCK.deckY + HOOK_ABOVE + (1 - reach) * 2.3, laneZ);
  };

  /*
   * The clock: on once the scroll has passed the trigger, run back (faster)
   * when it goes back above it. It is moved on before anything in the
   * frame reads it (the house, the truck and the crane are drawn from
   * their own places in the frame, ahead of this component's): one frame
   * may be all a jump of the page gets.
   */
  useFrame((_, dt) => {
    const p = progress.value;
    if (reduced) {
      clock.current = stillClock(p, order.length);
      return;
    }
    const on = clock.current > 0 ? p >= INSTALL.rewind : p >= INSTALL.trigger;
    const target = on ? times.end : 0;
    if (clock.current === target) return;
    const step = Math.min(dt, 0.05);
    clock.current = target > clock.current ? Math.min(target, clock.current + step) : Math.max(target, clock.current - step * 3);
    invalidate();
  }, -1);

  const label = useLabel(place);
  /** Where the call-outs of the preparation stand, on the side away from the caption: a front peg, the front right footing's head, the middle of a front plinth. */
  const marks = useMemo(() => {
    const lay = foundationLayout(view.units);
    const above = FOUNDATION_HEIGHTS[view.foundation.h] / 1000;
    const first = [...lay.footings].sort((a, b) => b.z - a.z || b.x - a.x)[0];
    const front = lay.plinths.filter((r) => r.inward === 2).sort((a, b) => b.z0 - a.z0 || b.x0 - a.x0)[0];
    return {
      peg: first ? [first.x + off.x + PEG_OUT, 0.5, first.z + off.z + PEG_OUT] : null,
      footing: first ? [first.x + off.x, above + 0.12, first.z + off.z] : null,
      plinth: front && view.foundation.type === 'plinth' ? [(front.x0 + front.x1) / 2 + off.x, above * 0.6, front.z0 + off.z] : null,
    };
  }, [view.units, view.foundation, off]);

  useFrame(() => {
    const p = progress.value;
    const t = clock.current;
    // Lights: only when everything is in.
    glow.set(win(t, times.lights[0], times.lights[1], ease.inOut));

    // Camera, once the plot is ready: wide on arrival, raised over the placement, then down to eye level in front.
    const po = clamp01((p - AFTER_PREP) / (1 - AFTER_PREP));
    const e = ease.inOut(po);
    let az = lerp(0.78, 0.18, e);
    let el = lerp(0.24, 0.08, ease.inOut(win(po, 0.6, 1))) + 0.16 * Math.sin(Math.PI * clamp01(po / 0.8));
    let dist = fit.reach * lerp(3.6, 3, e);
    const look = [lerp(6, 0, ease.inOut(win(po, 0, 0.3))), fit.h * lerp(0.3, 0.42, e), lerp(-3, 0, e)];
    // Before it: close over the foundation as it goes in, turning slowly, then standing back for the truck.
    const w = ease.inOut(win(p, PREP.camera[0], PREP.camera[1], ease.linear));
    if (w < 1) {
      const u = clamp01(p / PREP.done);
      az = lerp(lerp(1.08, 0.9, u), az, w);
      el = lerp(lerp(0.42, 0.36, u), el, w);
      dist = lerp(fit.reach * lerp(2.1, 2.4, u), dist, w);
      look[0] = lerp(0, look[0], w);
      look[1] = lerp(0.2, look[1], w);
      look[2] = lerp(0, look[2], w);
    }
    aim(camera, [look[0] + Math.sin(az) * Math.cos(el) * dist, look[1] + Math.sin(el) * dist, look[2] + Math.cos(az) * Math.cos(el) * dist], look, size.width / size.height, 1.5, 0.7);
    rig.lightTarget.set(look[0], 0, look[2]);
    if (truck.current) truck.current.visible = p > AFTER_PREP - 0.01;
    // What goes in, named as it does.
    if (marks.peg) label('prep-pegs', marks.peg[0], marks.peg[1], marks.peg[2], hold(p, PREP.pegs[0] + 0.01, PREP.dig[1] + 0.01, 0.02));
    if (marks.footing) label('prep-footing', marks.footing[0], marks.footing[1], marks.footing[2], hold(p, PREP.footings[0] + 0.02, PREP.plinths[0] + 0.03, 0.02));
    if (marks.plinth) label('prep-plinth', marks.plinth[0], marks.plinth[1], marks.plinth[2], hold(p, PREP.plinths[0] + 0.03, PREP.done, 0.02));
  });

  const lane = useMemo(() => memo(`lane-${laneZ}`, () => merge([box(150, 0.04, 4.4, 20, 0.02, laneZ)])), [laneZ]);
  const all = useRef<Group>(null);
  const truck = useRef<Group>(null);
  // The add-ons are out of sight until the building is up: on the GPU before then, so their arrival costs nothing.
  useWarmAll(rig, all);

  return (
    <group ref={all}>
      <Pad w={fit.w + 10} d={fit.d + 9} r={0.5} y={0.01} material={mat.gravel} />
      <mesh geometry={lane} material={mat.paving} receiveShadow />
      <Paving w={2} d={6} x={-fit.w / 2 + 2} z={fit.d / 2 + 4} tile={1} y={0.015} material={mat.paving} lineOpacity={0.08} />
      <group position={off.toArray()}>
        <SiteMarks units={view.units} getP={() => progress.value} />
        <FoundationParts
          units={view.units}
          foundation={view.foundation}
          getFootings={() => win(progress.value, PREP.footings[0], PREP.footings[1], ease.linear)}
          getPlinths={() => win(progress.value, PREP.plinths[0], PREP.plinths[1], ease.linear)}
        />
        <House
          units={view.units}
          addOns={view.addOns}
          deckSide={view.deckSide}
          manual={view.manual}
          shellHex={view.shellHex}
          deckHex={view.deckHex}
          trimHex={view.trimHex}
          foundation={view.foundation}
          look={rig.look}
          glass={glow.material}
          footings={false}
          pose={pose}
          addOnT={() => win(clock.current, times.addOns[0], times.addOns[1], ease.out)}
          plot={view.plot}
        />
      </group>
      {/* Out of the picture while the plot is made ready: it sets off once the foundation is in. */}
      <group ref={truck}>
        <Truck getX={() => truckX(progress.value, clock.current)} z={laneZ} />
      </group>
      <MobileCrane position={crane} getHook={getHook} head={4.6} getTurn={turn} />
    </group>
  );
}

export default function InstallScene(props: SceneProps) {
  return (
    <Stage {...props} look="evening" ground="land" focus={[0.64, 0.56]} focusCompact={[0.5, 0.36]} shadowExtent={30}>
      {(rig) => <Install {...props} rig={rig} />}
    </Stage>
  );
}
