import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo } from 'react';
import type { BufferGeometry, PerspectiveCamera } from 'three';
import { shown, useBuild } from '../../build/store';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, lerp } from '../../film/timeline';
import Stage, { aim, type Rig } from '../Stage';
import { box, memo, merge, mergeGroups } from '../kit/geometry';
import { LAND, TreeLine, Woodland, along } from '../kit/landscape';
import { TRUCK, Truck, prepareMachines } from '../kit/machines';
import { mat, moduleMats } from '../kit/materials';
import { moduleGeometry } from '../kit/parts';
import { boxUV } from '../kit/textures';

/**
 * On the road: the truck that left the factory comes down a straight road
 * towards the viewer, with the finished shell on its trailer, and passes
 * close by on the way out of the picture (client, 2026-10-10: "drive
 * towards the viewer and appear to emerge out of the screen"; the client's
 * photograph gives the angle, from the front and to one side).
 *
 * It is one shot of a few seconds. Progress here is time, not scroll: the
 * section plays by itself, once, and the page is held while it does
 * (film/Film.tsx, `play`). Like every scene it is still a pure function of
 * that one number.
 *
 * The lens is wider than the other films' (it is what makes a thing coming
 * at it grow), and the eye stands low at the edge of the other lane. It is
 * on the truck's cab as it comes, goes round with it as it passes an arm's
 * length away, and is on its tail lamps as it drives off towards the
 * evening sky, where the site is. The shell's windows are dark: its lights
 * come on when it is a house.
 */

const ROAD = { w: 8.4, from: -330, to: 330 };
/** The truck keeps to the middle of its lane, on the viewer's right. */
const LANE = 2.05;
/** Where the middle of its trailer is along the road, start to end: it comes from ahead of the eye, passes it at about the half, and is well down the road behind it at the end. */
const DRIVE = { from: -66, to: 60, curve: 1.08 };
const driveAt = (p: number) => lerp(DRIVE.from, DRIVE.to, Math.pow(clamp01(p), DRIVE.curve));
/** The front of the cab from the middle of the trailer. */
const NOSE = -TRUCK.cabX + 1.2;

const EYE = { pos: [-2.7, 1.3, 5.2], fov: 46, fovUpright: 60 } as const;

/** Road surface, its lines and its verges. Groups: 0 asphalt, 1 paint, 2 gravel. */
function roadGeometry() {
  return memo('transit-road', () => {
    const len = ROAD.to - ROAD.from;
    const mid = (ROAD.to + ROAD.from) / 2;
    const tar = box(ROAD.w, 0.08, len, 0, 0, mid);
    boxUV(tar, 1);
    const paint: BufferGeometry[] = [];
    for (const s of [-1, 1]) paint.push(box(0.14, 0.012, len, s * (ROAD.w / 2 - 0.34), 0.046, mid));
    for (let z = ROAD.from + 4; z < ROAD.to; z += 9) paint.push(box(0.14, 0.012, 3, 0, 0.046, z));
    const verge = [-1, 1].map((s) => {
      const g = box(1.7, 0.06, len, s * (ROAD.w / 2 + 0.85), 0.0, mid);
      boxUV(g, 1);
      return g;
    });
    return mergeGroups([[tar], paint, verge]);
  });
}

/** What stands along the road and gives it its depth: marker posts on both verges, and a line of poles on the far side. Groups: 0 white, 1 dark. */
function roadsideGeometry() {
  return memo('transit-roadside', () => {
    const white: BufferGeometry[] = [];
    const dark: BufferGeometry[] = [];
    for (let z = ROAD.from + 6; z < ROAD.to; z += 12)
      for (const s of [-1, 1]) {
        const x = s * (ROAD.w / 2 + 0.55);
        white.push(box(0.1, 0.95, 0.05, x, 0.47, z));
        dark.push(box(0.105, 0.16, 0.055, x, 0.78, z));
      }
    for (let z = ROAD.from + 20; z < ROAD.to; z += 36) {
      const x = ROAD.w / 2 + 4.2;
      dark.push(box(0.24, 8.4, 0.24, x, 4.2, z), box(2.0, 0.12, 0.12, x, 7.7, z), box(1.3, 0.1, 0.1, x, 7.0, z));
    }
    return mergeGroups([white, dark]);
  });
}

/** Two ratchet straps over the load. */
function strapsGeometry() {
  return memo('transit-straps', () => {
    const parts: BufferGeometry[] = [];
    for (const x of [-1.75, 1.75]) {
      parts.push(box(0.07, 0.016, 3.02, x, 3.035, 0));
      for (const s of [-1, 1]) parts.push(box(0.07, 3.06, 0.016, x, 1.5, s * 1.504), box(0.09, 0.14, 0.06, x, 0.1, s * 1.52));
    }
    return merge(parts);
  });
}

const roadMats = [mat.asphalt, mat.marking, mat.gravel];
const sideMats = [mat.marking, mat.paintDark];

/** Trees stand back from the road, and thinner on the left, where the words are. */
const TREES = along(
  [
    [15, -196, 19, -8, 9],
    [26, -150, 40, 30, 5],
    [-22, -200, -17, -70, 4],
    [-46, -120, -36, 10, 3],
  ],
  [0.7, 1.15],
  17,
);
const LINES: [number, number, number, number, number][] = [
  [-280, -330, 280, -360, 70],
  [-320, -200, -240, 120, 34],
  [230, -220, 320, 120, 34],
];
const EYE_PLAN = [[EYE.pos[0], EYE.pos[2]]] as const;
/*
 * The land is the stage's own open ground, level to the horizon: the kit's
 * rolling terrain is a hundred thousand triangles shaped on the main
 * thread, and built here it was a third of a second in the middle of the
 * scroll that arrives from the factory. At the eye's height nothing of it
 * showed that a line of trees does not.
 */
const LEVEL = { flat: 1e5, hills: 0 };

/** One job per geometry, for building them in idle time before the film mounts (film/prefetch.ts). */
export const prepare: (() => void)[] = [...prepareMachines.slice(0, 2), () => void roadGeometry(), () => void roadsideGeometry(), () => void strapsGeometry(), () => void moduleGeometry('A')];

function Transit({ progress, rig }: SceneProps & { rig: Rig }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const shellHex = useBuild((s) => shown(s).shellHex);
  // By day: its lights stay off on the road.
  const cargo = useMemo(() => moduleMats(shellHex, 'day'), [shellHex]);

  const upright = size.width < size.height;
  useLayoutEffect(() => {
    const was = camera.fov;
    // An upright screen sees less to each side: a wider lens there, so the truck is whole as it passes.
    camera.fov = upright ? EYE.fovUpright : EYE.fov;
    camera.updateProjectionMatrix();
    return () => {
      camera.fov = was;
      camera.updateProjectionMatrix();
    };
  }, [camera, upright]);

  useFrame(() => {
    const p = progress.value;
    const z = driveAt(p);
    // How far it is past the eye (negative: still coming).
    const past = z - EYE.pos[2];
    // The part of it the eye is on: its nose as it comes, its tail as it goes. That halves how fast the eye has to turn.
    const on = lerp(NOSE, -TRUCK.deckL / 2 - 0.3, ease.inOut(clamp01((past + 15) / 27)));
    const look = [LANE - 0.45, lerp(2.15, 1.75, clamp01(past / 30)), z + on];
    // The ground shakes a little as it passes.
    const pass = Math.exp(-Math.abs(past) / 7) * 0.026;
    const pos = [EYE.pos[0] + Math.sin(p * 211) * pass, EYE.pos[1] + Math.sin(p * 173 + 1.3) * pass * 0.7, EYE.pos[2]];
    // The eye turns where it stands: it is not drawn back for a narrow screen, or it would swing round as it turned.
    aim(camera, pos, look, 1, 1, 0);
    rig.lightTarget.set(LANE, 0, Math.max(-60, Math.min(50, z)));
  });

  return (
    <>
      <Woodland spots={TREES} palette={LAND.gold} flat={LEVEL.flat} hills={LEVEL.hills} eye={EYE_PLAN} />
      <TreeLine lines={LINES} palette={LAND.gold} flat={LEVEL.flat} hills={LEVEL.hills} seed={52} />
      <mesh geometry={roadGeometry()} material={roadMats} position-y={0.012} receiveShadow />
      <mesh geometry={roadsideGeometry()} material={sideMats} castShadow />
      {/* The truck's own line runs along the road: towards its cab is towards the viewer. */}
      <group rotation-y={Math.PI / 2}>
        <Truck getX={() => -driveAt(progress.value)} z={LANE}>
          {/* The shell's front, with its door, is on the side the viewer sees. */}
          <group position-y={TRUCK.deckY} rotation-y={Math.PI}>
            <mesh geometry={moduleGeometry('A')} material={cargo} castShadow receiveShadow />
            <mesh geometry={strapsGeometry()} material={mat.rubber} castShadow />
          </group>
        </Truck>
      </group>
    </>
  );
}

export default function TransitScene(props: SceneProps) {
  return (
    <Stage {...props} look="evening" ground="land" focus={[0.6, 0.56]} focusCompact={[0.5, 0.5]} shadowExtent={26} fogRange={[70, 900]}>
      {(rig) => <Transit {...props} rig={rig} />}
    </Stage>
  );
}
