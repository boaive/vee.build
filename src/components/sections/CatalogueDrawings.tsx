/**
 * Catalogue drawings, generated from the same module data as the 3D scenes.
 * SVG rather than WebGL: sharper, lighter, and closer to an architectural index.
 */
import type { Level, Model } from '../../data/catalogue';
import { CELL, STOREY, span, type Placement } from '../../data/system';

const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);

/** Isometric projection, metres → drawing units. +x runs right-down, +z left-down, +y up. */
const iso = (x: number, y: number, z: number): [number, number] => [(x - z) * COS, (x + z) * SIN - y];
const pts = (list: [number, number][]) => list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

function toBox(p: Placement): Box {
  const [sx, sz] = span(p);
  return {
    x0: p.x * CELL,
    x1: (p.x + sx) * CELL,
    z0: p.z * CELL,
    z1: (p.z + sz) * CELL,
    y0: p.y * STOREY,
    y1: (p.y + 1) * STOREY,
  };
}

function bounds(levels: Level[]) {
  const all = levels.flatMap((l) => l.modules.map(toBox));
  return {
    x1: Math.max(...all.map((b) => b.x1)),
    z1: Math.max(...all.map((b) => b.z1)),
    y1: Math.max(...all.map((b) => b.y1)),
  };
}

/** Glazing drawn per 3 m cell on a visible face. */
function glazing(b: Box, face: 'x' | 'z') {
  const out: [number, number][][] = [];
  const len = face === 'z' ? b.x1 - b.x0 : b.z1 - b.z0;
  for (let c = 0; c < len / CELL; c++) {
    const a = c * CELL + 0.8;
    const e = c * CELL + 2.2;
    const lo = b.y0 + 1.0;
    const hi = b.y0 + 2.2;
    out.push(
      face === 'z'
        ? [iso(b.x0 + a, lo, b.z1), iso(b.x0 + e, lo, b.z1), iso(b.x0 + e, hi, b.z1), iso(b.x0 + a, hi, b.z1)]
        : [iso(b.x1, lo, b.z0 + a), iso(b.x1, lo, b.z0 + e), iso(b.x1, hi, b.z0 + e), iso(b.x1, hi, b.z0 + a)],
    );
  }
  return out;
}

export function IsoDrawing({ model }: { model: Model }) {
  const boxes = model.levels
    .flatMap((l) => l.modules.map(toBox))
    .sort((a, b) => a.y0 - b.y0 || a.x1 + a.z1 - (b.x1 + b.z1));
  const { x1, z1, y1 } = bounds(model.levels);
  const m = 1.6;

  // Frame the drawing: project the extreme corners.
  const corners = [iso(-m, 0, -m), iso(x1 + m, 0, -m), iso(-m, 0, z1 + m), iso(x1 + m, 0, z1 + m), iso(0, y1, 0), iso(x1, y1, z1)];
  const minX = Math.min(...corners.map((c) => c[0])) - 2.2;
  const maxX = Math.max(...corners.map((c) => c[0])) + 2.2;
  const minY = Math.min(...corners.map((c) => c[1])) - 0.8;
  const maxY = Math.max(...corners.map((c) => c[1])) + 2.4;

  const terraces = model.levels.flatMap((l, i) => (l.terrace ?? []).map(([cx, cz]) => ({ cx, cz, y: i * STOREY })));
  const dimX = iso(x1 / 2, 0, z1 + m + 1.3);
  const dimZ = iso(x1 + m + 1.3, 0, z1 / 2);
  // Lettering is sized against the frame so it reads the same on every sheet.
  const em = (maxX - minX) / 38;

  return (
    <svg
      className="draw draw--iso"
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      role="img"
      aria-label={`Isometric view of ${model.name}: ${model.recipe}.`}
    >
      <polygon className="draw__base" points={pts([iso(-m, 0, -m), iso(x1 + m, 0, -m), iso(x1 + m, 0, z1 + m), iso(-m, 0, z1 + m)])} />

      {boxes.map((b, i) => (
        <g key={i}>
          <polygon className="draw__top" points={pts([iso(b.x0, b.y1, b.z0), iso(b.x1, b.y1, b.z0), iso(b.x1, b.y1, b.z1), iso(b.x0, b.y1, b.z1)])} />
          <polygon className="draw__left" points={pts([iso(b.x0, b.y0, b.z1), iso(b.x1, b.y0, b.z1), iso(b.x1, b.y1, b.z1), iso(b.x0, b.y1, b.z1)])} />
          <polygon className="draw__right" points={pts([iso(b.x1, b.y0, b.z0), iso(b.x1, b.y0, b.z1), iso(b.x1, b.y1, b.z1), iso(b.x1, b.y1, b.z0)])} />
          {glazing(b, 'z').map((g, k) => (
            <polygon key={`z${k}`} className="draw__glass" points={pts(g)} />
          ))}
          {glazing(b, 'x').map((g, k) => (
            <polygon key={`x${k}`} className="draw__glass" points={pts(g)} />
          ))}
        </g>
      ))}

      {terraces.map(({ cx, cz, y }, i) => {
        const a = cx * CELL;
        const c = cz * CELL;
        const top = y + 1;
        return (
          <g key={i} className="draw__rail">
            <polygon points={pts([iso(a, y, c), iso(a + CELL, y, c), iso(a + CELL, y, c + CELL), iso(a, y, c + CELL)])} className="draw__terrace" />
            <polyline points={pts([iso(a, top, c + CELL), iso(a + CELL, top, c + CELL), iso(a + CELL, top, c)])} />
            <polyline points={pts([iso(a, y, c + CELL), iso(a, top, c + CELL)])} />
            <polyline points={pts([iso(a + CELL, y, c + CELL), iso(a + CELL, top, c + CELL)])} />
            <polyline points={pts([iso(a + CELL, y, c), iso(a + CELL, top, c)])} />
          </g>
        );
      })}

      <g className="draw__dim">
        <polyline points={pts([iso(0, 0, z1 + m + 0.6), iso(x1, 0, z1 + m + 0.6)])} />
        <polyline points={pts([iso(x1 + m + 0.6, 0, 0), iso(x1 + m + 0.6, 0, z1)])} />
        <text x={dimX[0]} y={dimX[1] + em * 0.6} textAnchor="middle" fontSize={em}>
          {x1} m
        </text>
        <text x={dimZ[0]} y={dimZ[1] + em * 0.6} textAnchor="middle" fontSize={em}>
          {z1} m
        </text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Plans — drawn in feet, 10′ per 3 m cell, as the reference layouts are */
/* ------------------------------------------------------------------ */

const FT = 10;

function LevelPlan({ level, offset, showName, em }: { level: Level; offset: number; showName: boolean; em: number }) {
  const rects = level.modules.map((p) => {
    const [sx, sz] = span(p);
    return { x: p.x * FT, y: p.z * FT, w: sx * FT, h: sz * FT, t: p.t };
  });
  const w = Math.max(...rects.map((r) => r.x + r.w), ...(level.terrace ?? []).map(([cx]) => (cx + 1) * FT));
  const h = Math.max(...rects.map((r) => r.y + r.h), ...(level.terrace ?? []).map(([, cz]) => (cz + 1) * FT));

  return (
    <g transform={`translate(${offset} 0)`} fontSize={em}>
      {(level.terrace ?? []).map(([cx, cz], i) => (
        <g key={`t${i}`}>
          <rect className="plan__terrace" x={cx * FT} y={cz * FT} width={FT} height={FT} />
        </g>
      ))}
      {level.terrace && (
        <text className="plan__room" x={level.terrace[0][0] * FT + (level.terrace.length * FT) / 2} y={level.terrace[0][1] * FT + FT / 2 + em * 0.35}>
          Terrace
        </text>
      )}

      {level.rooms?.filter((r) => r.outdoor).map((r) => <rect key={r.name} className="plan__outdoor" x={r.x} y={r.y} width={r.w} height={r.h} />)}

      {rects.map((r, i) => (
        <rect key={i} className="plan__module" x={r.x} y={r.y} width={r.w} height={r.h} />
      ))}

      {level.rooms
        ? level.rooms.map((r, i) => (
            <g key={i}>
              {!r.outdoor && <rect className="plan__wall" x={r.x} y={r.y} width={r.w} height={r.h} />}
              <text className="plan__room" x={r.x + r.w / 2} y={r.y + r.h / 2 + (r.size && r.w >= 5 ? -em * 0.15 : em * 0.35)}>
                {r.w < 5 ? r.name.replace('Toilet', 'WC') : r.name}
              </text>
              {r.size && r.w >= 5 && (
                <text className="plan__size" x={r.x + r.w / 2} y={r.y + r.h / 2 + em * 1.05}>
                  {r.size}
                </text>
              )}
            </g>
          ))
        : rects.map((r, i) => (
            <text key={i} className="plan__room" x={r.x + r.w / 2} y={r.y + r.h / 2 + em * 0.35}>
              Shell {r.t} · {r.t === 'A' ? 18 : 9} m²
            </text>
          ))}

      <g className="plan__dim">
        <line x1={0} y1={-2} x2={w} y2={-2} />
        <line x1={0} y1={-2.6} x2={0} y2={-1.4} />
        <line x1={w} y1={-2.6} x2={w} y2={-1.4} />
        <text x={w / 2} y={-2.9} textAnchor="middle">
          {w}′ · {(w / FT) * CELL} m
        </text>
        <line x1={-2} y1={0} x2={-2} y2={h} />
        <line x1={-2.6} y1={0} x2={-1.4} y2={0} />
        <line x1={-2.6} y1={h} x2={-1.4} y2={h} />
        <text x={-2.9} y={h / 2} textAnchor="middle" transform={`rotate(-90 -2.9 ${h / 2})`}>
          {h}′ · {(h / FT) * CELL} m
        </text>
      </g>

      {showName && (
        <text className="plan__level" x={0} y={h + em * 2.6}>
          {level.name} floor
        </text>
      )}
    </g>
  );
}

export function PlanDrawing({ model }: { model: Model }) {
  const widths = model.levels.map((l) =>
    Math.max(...l.modules.map((p) => (p.x + span(p)[0]) * FT), ...(l.terrace ?? []).map(([cx]) => (cx + 1) * FT)),
  );
  const depth = Math.max(
    ...model.levels.flatMap((l) => [...l.modules.map((p) => (p.z + span(p)[1]) * FT), ...(l.terrace ?? []).map(([, cz]) => (cz + 1) * FT)]),
  );
  const gap = 9;
  const total = widths.reduce((s, w) => s + w, 0) + gap * (widths.length - 1);
  const multi = model.levels.length > 1;
  const vbW = total + 9;
  const em = vbW / 30;
  let offset = 0;

  return (
    <svg
      className="draw draw--plan"
      viewBox={`-6 -6 ${vbW} ${depth + (multi ? 13 : 9)}`}
      role="img"
      aria-label={
        model.layoutSource === 'reference'
          ? `Indicative floor plan of ${model.name}: ${model.levels[0].rooms?.map((r) => r.name.toLowerCase()).join(', ')}.`
          : `Module plan of ${model.name}: ${model.recipe}.`
      }
    >
      {model.levels.map((l, i) => {
        const el = <LevelPlan key={l.name} level={l} offset={offset} showName={multi} em={em} />;
        offset += widths[i] + gap;
        return el;
      })}
    </svg>
  );
}
