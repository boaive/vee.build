/**
 * The configurator's plan, drawn from the same build data as the 3D view.
 * Shells are buttons: the plan doubles as the keyboard way to select one.
 */
import type { KeyboardEvent } from 'react';
import type { AddOnId, DeckSide, ManualAddOn, Plot } from '../../data/build';
import { CELL, FRONT, cells, layoutAddOns, span, type Unit } from '../../build/model';

interface Props {
  units: readonly Unit[];
  addOns: readonly AddOnId[];
  deckSide: DeckSide;
  manual: readonly ManualAddOn[] | null;
  plot: Plot;
  floor: number;
  selected: number | null;
  onSelect: (id: number | null) => void;
}

/** Plan coordinates are metres from the plot's top-left corner (−x, −z), as the world. */
export default function BuildPlan({ units, addOns, deckSide, manual, plot, floor, selected, onSelect }: Props) {
  const W = plot.x * CELL;
  const D = plot.z * CELL;
  const here = units.filter((u) => u.y === floor);
  const below = units.filter((u) => u.y === floor - 1);
  const occupied = new Set(here.flatMap((u) => cells(u).map(([x, z]) => `${x},${z}`)));
  const terrace = floor > 0 ? below.flatMap((u) => cells(u)).filter(([x, z]) => !occupied.has(`${x},${z}`)) : [];
  const layout = floor === 0 ? layoutAddOns(units, new Set(addOns), deckSide, manual) : null;

  const all = units.filter((u) => u.y <= floor);
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const u of all)
    for (const [x, z] of cells(u)) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x + 1);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z + 1);
    }
  const hasDims = all.length > 0;

  const key = (e: KeyboardEvent, id: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id === selected ? null : id);
    }
  };

  return (
    <svg className="plan" viewBox={`-2.6 -2.8 ${W + 5.2} ${D + 6.4}`} role="group" aria-label={`Plan of ${floor === 0 ? 'the ground floor' : `floor ${floor}`}, plot ${W} m by ${D} m`}>
      <rect className="plan__site" x={0} y={0} width={W} height={D} rx={0.3} />
      {Array.from({ length: plot.x - 1 }, (_, i) => (
        <line key={`gx${i}`} className="plan__grid" x1={(i + 1) * CELL} y1={0} x2={(i + 1) * CELL} y2={D} />
      ))}
      {Array.from({ length: plot.z - 1 }, (_, i) => (
        <line key={`gz${i}`} className="plan__grid" x1={0} y1={(i + 1) * CELL} x2={W} y2={(i + 1) * CELL} />
      ))}

      {layout?.decks.map((r, i) => (
        <rect key={`d${i}`} className="plan__deck" x={r.x0} y={r.z0} width={r.x1 - r.x0} height={r.z1 - r.z0} />
      ))}
      {terrace.map(([x, z]) => (
        <rect key={`t${x}${z}`} className="plan__terrace" x={x * CELL} y={z * CELL} width={CELL} height={CELL} />
      ))}
      {below.map((u) => {
        const [sx, sz] = span(u.t, u.r);
        return <rect key={`b${u.id}`} className="plan__below" x={u.x * CELL + 0.1} y={u.z * CELL + 0.1} width={sx * CELL - 0.2} height={sz * CELL - 0.2} />;
      })}

      {here.map((u) => {
        const [sx, sz] = span(u.t, u.r);
        const x = u.x * CELL + 0.08;
        const y = u.z * CELL + 0.08;
        const w = sx * CELL - 0.16;
        const h = sz * CELL - 0.16;
        const [fx, fz] = FRONT[u.r];
        // The glazed front: a second line just inside the front wall.
        const g = 0.32;
        const front =
          fz === 1
            ? [x + 0.5, y + h - g, x + w - 0.5, y + h - g]
            : fz === -1
              ? [x + 0.5, y + g, x + w - 0.5, y + g]
              : fx === 1
                ? [x + w - g, y + 0.5, x + w - g, y + h - 0.5]
                : [x + g, y + 0.5, x + g, y + h - 0.5];
        const isSel = u.id === selected;
        return (
          <g
            key={u.id}
            className={`plan__unit${isSel ? ' is-selected' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            aria-label={`Shell ${u.t}, ${floor === 0 ? 'ground floor' : `floor ${floor}`}${isSel ? ', selected' : ''}`}
            onClick={() => onSelect(isSel ? null : u.id)}
            onKeyDown={(e) => key(e, u.id)}
          >
            <rect x={x} y={y} width={w} height={h} rx={0.12} />
            <line className="plan__front" x1={front[0]} y1={front[1]} x2={front[2]} y2={front[3]} />
            <text x={x + w / 2} y={y + h / 2 + 0.42}>
              {u.t}
            </text>
          </g>
        );
      })}

      {hasDims && (
        <g className="plan__dim">
          <line x1={x0 * CELL} y1={-1.3} x2={x1 * CELL} y2={-1.3} />
          <line x1={x0 * CELL} y1={-1.7} x2={x0 * CELL} y2={-0.9} />
          <line x1={x1 * CELL} y1={-1.7} x2={x1 * CELL} y2={-0.9} />
          <text x={((x0 + x1) * CELL) / 2} y={-1.75}>
            {(x1 - x0) * CELL} m
          </text>
          <line x1={-1.3} y1={z0 * CELL} x2={-1.3} y2={z1 * CELL} />
          <line x1={-1.7} y1={z0 * CELL} x2={-0.9} y2={z0 * CELL} />
          <line x1={-1.7} y1={z1 * CELL} x2={-0.9} y2={z1 * CELL} />
          <text x={-1.75} y={((z0 + z1) * CELL) / 2} transform={`rotate(-90 -1.75 ${((z0 + z1) * CELL) / 2})`}>
            {(z1 - z0) * CELL} m
          </text>
        </g>
      )}
      <text className="plan__street" x={W / 2} y={D + 2.9}>
        Street
      </text>
    </svg>
  );
}
