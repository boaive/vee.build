import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  FOUNDATION_HEIGHTS,
  MAX_FLOORS,
  PLOT_LIMITS,
  addOnIds,
  addOnInfo,
  deckDetails,
  deckFinishes,
  finishNote,
  foundationTypes,
  manualKinds,
  presets,
  shellFinishes,
  trimFinishes,
  type DeckSide,
  type ManualAddOn,
  type ManualKind,
  type Turn,
  type UnitSpec,
} from '../../data/build';
import { CELL, describe, floorName, totals, type Piece } from '../../build/model';
import { build, encode, useBuild } from '../../build/store';
import { createProgress, type PlaceLabel } from '../../film/progress';
import type { AddOnHover, Hover, Orbit, Tool } from '../../three/scenes/BuildScene';
import { requestEnquiry } from '../forms/prefill';
import BuildPlan from './BuildPlan';

const Scene = lazy(() => import('../../three/scenes/BuildScene'));

const SIDE_NAMES: { value: DeckSide; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 0, label: 'Street' },
  { value: 1, label: 'Right' },
  { value: 3, label: 'Left' },
  { value: 2, label: 'Back' },
];
const SIDE_WORD = ['street side', 'right side', 'back', 'left side'];
const nameOf = (k: ManualKind) => manualKinds.find((x) => x.id === k)?.name ?? '';
const ACCESS_NOTE = 'The gallery and outer staircase come with the upper floor. They go when the shells they serve go.';
const EXTEND_LABEL = ['Extend toward the street', 'Extend right', 'Extend back', 'Extend left'];

/** Section 5: pick a shell, place it, stack it, finish it. */
export default function Configurator() {
  const state = useBuild((s) => s);
  const { units, addOns } = state;
  const t = useMemo(() => totals(units), [units]);

  const [tool, setTool] = useState<Tool>('A');
  const [addOnTool, setAddOnTool] = useState<ManualKind | null>(null);
  const [turn, setTurn] = useState<Turn>(0);
  const [selected, setSelected] = useState<number | null>(null);
  /** A selected add-on, or the gallery and staircase that come with an upper floor. */
  const [piece, setPiece] = useState<Piece | null>(null);
  const [floor, setFloor] = useState(0);
  const [status, setStatus] = useState('Choose a shell, then click the plot to place it. R rotates.');
  const [top, setTop] = useState(false);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const progress = useMemo(createProgress, []);
  const orbit = useRef<Orbit>({ az: 0.62, el: 0.56, top: false, zoom: 1 }).current;
  const drag = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null);
  const handles = useRef(new Map<string, HTMLElement>());

  /* Environment and proximity */
  useEffect(() => {
    setHydrated(true);
    const mqC = window.matchMedia('(max-width: 860px)');
    const mqR = window.matchMedia('(prefers-reduced-motion: reduce)');
    const still = new URLSearchParams(window.location.search).has('still');
    const sync = () => {
      setCompact(mqC.matches);
      setReduced(still || mqR.matches);
    };
    sync();
    mqC.addEventListener('change', sync);
    mqR.addEventListener('change', sync);
    const el = view.current;
    if (!el) return;
    const ioNear = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '80% 0px' });
    const ioVis = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    ioNear.observe(el);
    ioVis.observe(el);
    return () => {
      mqC.removeEventListener('change', sync);
      mqR.removeEventListener('change', sync);
      ioNear.disconnect();
      ioVis.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!near) setReady(false);
  }, [near]);

  // Keep the selection and the plan's floor valid as the build changes.
  useEffect(() => {
    if (selected !== null && !units.some((u) => u.id === selected)) setSelected(null);
    if (piece && !units.some((u) => u.id === piece.u)) setPiece(null);
    const floors = Math.max(1, t.floors);
    if (floor > floors - 1) setFloor(floors - 1);
  }, [units, selected, piece, floor, t.floors]);

  const repaint = () => progress.invalidate?.();

  /* DOM placed from 3D: plot handles and the selection pill. */
  const place = useCallback<PlaceLabel>((id, x, y, opacity) => {
    const el = handles.current.get(id);
    if (!el) return;
    if (opacity <= 0.01) {
      if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
      return;
    }
    el.style.visibility = 'visible';
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }, []);
  const handleRef = (id: string) => (el: HTMLElement | null) => {
    if (el) handles.current.set(id, el);
    else handles.current.delete(id);
  };

  /* ---------- Actions ---------- */

  const say = (msg: string) => setStatus(msg);

  const pick = useCallback((spec: UnitSpec) => {
    const r = build.place(spec);
    if (r.ok) {
      say(`Shell ${spec.t} placed · ${floorName(spec.y)}.${spec.y > 0 ? ' A gallery and an outer staircase reach its door.' : ''} Select it to rotate or remove it.`);
      setFloor(spec.y);
    } else say(r.why);
  }, []);

  const select = useCallback((id: number | null) => {
    setSelected(id);
    setPiece(null);
    if (id === null) return;
    const u = build.get().units.find((x) => x.id === id);
    if (u) {
      say(`Shell ${u.t} selected · ${floorName(u.y)}. Rotate it, remove it, or press Escape.`);
      setFloor(u.y);
    }
  }, []);

  const selectPiece = useCallback((p: Piece | null) => {
    setPiece(p);
    setSelected(null);
    if (!p) return;
    if (p.k === 'access') return say(ACCESS_NOTE);
    say(`${nameOf(p.k)} selected${p.s !== undefined ? ` · ${SIDE_WORD[p.s]}` : ''}. Remove it, or press Escape.`);
  }, []);

  const onHover = useCallback((h: Hover | null) => {
    if (h && !h.ok && h.why) setStatus(h.why);
    else if (h?.ok) setStatus(`Shell ${h.spec.t} · ${floorName(h.spec.y)} — click to place. R rotates it.`);
  }, []);

  const onAddOnHover = useCallback((h: AddOnHover | null) => {
    if (!h) return;
    const name = manualKinds.find((k) => k.id === h.m.k)?.name ?? '';
    if (!h.ok) setStatus(h.why ?? 'Not here.');
    else setStatus(`${name}${h.m.s !== undefined ? ` · ${SIDE_WORD[h.m.s]}` : ''} — click to ${h.placed ? 'remove' : 'place'}.`);
  }, []);

  const onAddOn = useCallback((m: ManualAddOn) => {
    const placed = build.toggleManual(m);
    const name = manualKinds.find((k) => k.id === m.k)?.name ?? '';
    say(`${name} ${placed ? 'placed' : 'removed'}${m.s !== undefined ? ` on the ${SIDE_WORD[m.s]}` : ''}.`);
  }, []);

  const rotate = () => {
    if (selected !== null) {
      const r = build.rotate(selected);
      say(r.ok ? 'Rotated 90°.' : r.why);
    } else {
      setTurn((v) => ((v + 1) % 4) as Turn);
      say('The next shell is rotated 90°. Its glazed front is marked on the plan.');
      repaint();
    }
  };

  const remove = () => {
    if (selected === null && piece) {
      if (piece.k === 'access') return say(ACCESS_NOTE);
      const r = build.removeManual(piece.s === undefined ? { k: piece.k, u: piece.u } : { k: piece.k, u: piece.u, s: piece.s });
      if (!r.ok) return say(r.why);
      say(`${nameOf(piece.k)} removed${piece.k === 'deck' ? ', with any steps on it' : ''}. Add-ons are now placed by hand.`);
      return setPiece(null);
    }
    if (selected === null) return say('Select a shell or an add-on first.');
    const r = build.remove(selected);
    if (r.ok) {
      setSelected(null);
      say('Removed.');
    } else say(r.why);
  };

  const undo = () => {
    if (!build.canUndo()) return say('Nothing to undo.');
    build.undo();
    setSelected(null);
    setPiece(null);
    say('Undone.');
  };

  const addAuto = () => {
    const r = build.add(tool ?? 'A', turn);
    if (r.ok) {
      const u = build.get().units.find((x) => x.id === r.id);
      say(`Shell ${u?.t} added · ${floorName(u?.y ?? 0)}.`);
      if (u) setFloor(u.y);
    } else say(r.why);
  };

  const choose = (next: Tool) => {
    setTool(next);
    setAddOnTool(null);
    if (next) {
      setSelected(null);
      setPiece(null);
    }
    say(next ? `Shell ${next} ready. Point at the plot, a wall or a roof. R rotates it.` : 'Click a shell or an add-on to select it.');
  };

  const chooseAddOn = (k: ManualKind | null) => {
    setAddOnTool(k);
    if (k) {
      setTool(null);
      setSelected(null);
      setPiece(null);
      build.setAddOnMode('manual');
      say(`${manualKinds.find((x) => x.id === k)?.name}: ${manualKinds.find((x) => x.id === k)?.hint}`);
    } else say('Add-on placing finished.');
  };

  const extend = (side: Turn, delta: 1 | -1) => {
    const r = build.resizePlot(side, delta);
    say(r.ok ? `Plot ${delta > 0 ? 'extended' : 'reduced'}: ${build.get().plot.x * CELL} m × ${build.get().plot.z * CELL} m.` : r.why);
    repaint();
  };

  const toggleTop = () => {
    orbit.top = !orbit.top;
    setTop(orbit.top);
    repaint();
  };

  const loadPreset = (id: string) => {
    build.loadPreset(id);
    setSelected(null);
    setPiece(null);
    setAddOnTool(null);
    setFloor(0);
    say(`${presets.find((p) => p.id === id)?.name} loaded. Change anything.`);
  };

  const quote = () => {
    const s = build.get();
    const names = s.addOnMode === 'manual' ? [...new Set(s.manual.map((m) => manualKinds.find((k) => k.id === m.k)?.name))] : s.addOns.map((a) => addOnInfo[a].name);
    const shell = shellFinishes.find((f) => f.id === s.shell)?.name;
    const deck = deckFinishes.find((f) => f.id === s.deck)?.name;
    const trim = trimFinishes.find((f) => f.id === s.trim)?.name;
    const foundation = `${FOUNDATION_HEIGHTS[s.foundation.h]} mm above ground, ${foundationTypes.find((f) => f.id === s.foundation.type)?.name.toLowerCase()}`;
    const link = `${window.location.origin}/?build=${encode(s)}#configure`;
    requestEnquiry({
      category: 'Modular Home',
      message: s.units.length
        ? `My configuration: ${describe(s.units)}.\nPlot: ${s.plot.x * CELL} m × ${s.plot.z * CELL} m.\nFoundation: ${foundation}.\nAdd-ons: ${names.length ? names.join(', ') : 'none'}.\nFinish (indicative): ${shell} shell, ${deck} deck, ${trim} trim.\n${link}\n\nSite location: `
        : 'I would like to discuss a modular home.\n\nSite location: ',
    });
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/?build=${encode(build.get())}#configure`;
    try {
      await navigator.clipboard.writeText(url);
      say('Link copied. Anyone with it opens this exact build.');
    } catch {
      say(url);
    }
  };

  /* ---------- Keyboard ---------- */

  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'z') {
      e.preventDefault();
      undo();
    } else if (k === 'r') rotate();
    else if (k === 'delete' || k === 'backspace') {
      if (selected !== null || piece) {
        e.preventDefault();
        remove();
      }
    } else if (k === '1') choose('A');
    else if (k === '2') choose('B');
    else if (k === 'escape') {
      if (addOnTool) chooseAddOn(null);
      else if (selected !== null || piece) {
        setSelected(null);
        setPiece(null);
      } else choose(null);
    } else if (k === 't') toggleTop();
  };

  /* ---------- Orbit by dragging, zoom with the wheel ---------- */

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    d.x = e.clientX;
    d.y = e.clientY;
    if (orbit.top) {
      orbit.top = false;
      setTop(false);
    }
    orbit.az -= dx * 0.008;
    if (e.pointerType !== 'touch') orbit.el = Math.min(1.3, Math.max(0.16, orbit.el + dy * 0.005));
    repaint();
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const zoom = (dir: 1 | -1) => {
    orbit.zoom = Math.min(1.8, Math.max(0.55, orbit.zoom * (dir > 0 ? 1 / 1.18 : 1.18)));
    repaint();
  };

  const mount = hydrated && near;
  const floors = Math.max(1, t.floors);
  const manualMode = state.addOnMode === 'manual';
  const placedCount = (k: ManualKind) => state.manual.filter((m) => m.k === k).length;

  return (
    <div className="cfg" ref={root}>
      <div
        className={`cfg__viewport${addOnTool ? ' is-placing' : ''}`}
        ref={view}
        tabIndex={0}
        role="application"
        aria-label="Configurator view. Keys: 1 Shell A, 2 Shell B, R rotate, Delete remove the selected shell or add-on, Ctrl+Z undo, T top view, Escape select."
        onKeyDown={onKey}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className={`cfg__stage${ready ? ' is-ready' : ''}`}>
          {mount && (
            <Suspense fallback={null}>
              <Scene
                progress={progress}
                place={place}
                compact={compact}
                active={visible}
                reduced={reduced}
                onReady={() => setReady(true)}
                tool={tool}
                addOnTool={addOnTool}
                turn={turn}
                selected={selected}
                piece={piece}
                orbit={orbit}
                onHover={onHover}
                onAddOnHover={onAddOnHover}
                onPick={pick}
                onSelect={select}
                onSelectPiece={selectPiece}
                onAddOn={onAddOn}
              />
            </Suspense>
          )}
          <div className="cfg__handles">
            {([0, 1, 2, 3] as Turn[]).map((s) => (
              <button
                key={s}
                type="button"
                ref={handleRef(`extend-${s}`)}
                className={`cfg__extend cfg__extend--${s}`}
                style={{ visibility: 'hidden' }}
                onClick={() => extend(s, 1)}
                aria-label={EXTEND_LABEL[s]}
                title={EXTEND_LABEL[s]}
              >
                <span aria-hidden="true">+</span>
              </button>
            ))}
            <div className="cfg__pill" ref={handleRef('selection')} style={{ visibility: 'hidden' }}>
              {selected !== null && (
                <button type="button" onClick={rotate}>
                  <span aria-hidden="true">↻</span> Rotate
                </button>
              )}
              <button type="button" onClick={remove}>
                Remove{selected === null && piece && piece.k !== 'access' ? ` ${nameOf(piece.k).toLowerCase()}` : ''}
              </button>
            </div>
          </div>
        </div>

        <div className="cfg__toolbar" role="toolbar" aria-label="Build tools">
          <div className="seg" role="radiogroup" aria-label="Shell to place">
            {(['A', 'B'] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={tool === s} className={`seg__btn${tool === s ? ' is-on' : ''}`} onClick={() => choose(s)}>
                <span className={`shell-icon shell-icon--${s}${turn % 2 && s === 'A' ? ' is-turned' : ''}`} aria-hidden="true" />
                Shell {s}
                <small>{s === 'A' ? '6 × 3 m' : '3 × 3 m'}</small>
              </button>
            ))}
            <button type="button" role="radio" aria-checked={tool === null && !addOnTool} className={`seg__btn${tool === null && !addOnTool ? ' is-on' : ''}`} onClick={() => choose(null)}>
              Select
            </button>
          </div>
          <div className="cfg__acts">
            <button type="button" className="tool tool--rotate" onClick={rotate} title="Rotate 90° (R)">
              <span aria-hidden="true">↻</span> Rotate{selected === null && tool ? ' next' : ''}
            </button>
            <button type="button" className="tool" onClick={addAuto} title="Add beside the house">
              + Add
            </button>
            <button type="button" className="tool" onClick={remove} disabled={selected === null && (!piece || piece.k === 'access')} title="Remove the selected shell or add-on (Delete)">
              Remove
            </button>
            <button type="button" className="tool" onClick={undo} title="Undo (Ctrl+Z)">
              Undo
            </button>
          </div>
          {addOnTool && (
            <button type="button" className="cfg__placing" onClick={() => chooseAddOn(null)}>
              Placing: {manualKinds.find((k) => k.id === addOnTool)?.name} <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>

        <div className="cfg__view">
          <button type="button" onClick={() => zoom(1)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={toggleTop} aria-pressed={top}>
            {top ? '3D view' : 'Top view'}
          </button>
        </div>
        <p className="cfg__status" role="status" aria-live="polite">
          {status}
        </p>
      </div>

      <aside className="cfg__panel" aria-label="Configuration">
        <section className="cfg__group">
          <h3 className="cfg__h">Start from</h3>
          <div className="chips">
            {presets.map((p) => (
              <button key={p.id} type="button" className={`chip${state.preset === p.id ? ' is-on' : ''}`} onClick={() => loadPreset(p.id)}>
                {p.name}
                <small>{p.note}</small>
              </button>
            ))}
            <button type="button" className="chip chip--quiet" onClick={() => (build.clear(), setSelected(null), setPiece(null), say('Plot cleared.'))}>
              Clear the plot
            </button>
          </div>
        </section>

        <section className="cfg__group">
          <h3 className="cfg__h">
            Plot <span className="cfg__tag">{state.plot.x * CELL} m × {state.plot.z * CELL} m</span>
          </h3>
          <div className="steppers">
            <div className="stepper">
              <span className="t-label">Width</span>
              <button type="button" onClick={() => extend(1, -1)} disabled={state.plot.x <= PLOT_LIMITS.min.x} aria-label="Narrower">
                −
              </button>
              <b>{state.plot.x * CELL} m</b>
              <button type="button" onClick={() => extend(1, 1)} disabled={state.plot.x >= PLOT_LIMITS.max.x} aria-label="Wider">
                +
              </button>
            </div>
            <div className="stepper">
              <span className="t-label">Depth</span>
              <button type="button" onClick={() => extend(2, -1)} disabled={state.plot.z <= PLOT_LIMITS.min.z} aria-label="Shallower">
                −
              </button>
              <b>{state.plot.z * CELL} m</b>
              <button type="button" onClick={() => extend(2, 1)} disabled={state.plot.z >= PLOT_LIMITS.max.z} aria-label="Deeper">
                +
              </button>
            </div>
          </div>
          <p className="cfg__note">Or use the + handles on each edge of the plot to extend it that way.</p>
        </section>

        <section className="cfg__group">
          <h3 className="cfg__h">Add-ons</h3>
          <div className="seg seg--panel" role="radiogroup" aria-label="How add-ons are placed">
            <button type="button" role="radio" aria-checked={!manualMode} className={`seg__btn${!manualMode ? ' is-on' : ''}`} onClick={() => (build.setAddOnMode('auto'), chooseAddOn(null))}>
              Automatic
            </button>
            <button type="button" role="radio" aria-checked={manualMode} className={`seg__btn${manualMode ? ' is-on' : ''}`} onClick={() => build.setAddOnMode('manual')}>
              Place by hand
            </button>
          </div>
          {!manualMode ? (
            <>
              <ul className="toggles">
                {addOnIds.map((id) => {
                  const on = addOns.includes(id);
                  return (
                    <li key={id}>
                      <button type="button" className={`toggle${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => build.toggleAddOn(id)}>
                        <span className="toggle__box" aria-hidden="true" />
                        <span className="toggle__name">{addOnInfo[id].name}</span>
                        <span className="toggle__hint">{addOnInfo[id].hint}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {addOns.includes('deck') && (
                <div className="sides" role="radiogroup" aria-label="Deck side">
                  <span className="t-label">Deck side</span>
                  {SIDE_NAMES.map((s) => (
                    <button key={String(s.value)} type="button" role="radio" aria-checked={state.deckSide === s.value} className={`side${state.deckSide === s.value ? ' is-on' : ''}`} onClick={() => build.setDeckSide(s.value)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="cfg__note">Pick an add-on, then click where it goes on the house. To take one away, choose Select, click it and press Remove.</p>
              <ul className="palette">
                {manualKinds.map((k) => (
                  <li key={k.id}>
                    <button type="button" className={`palette__btn${addOnTool === k.id ? ' is-on' : ''}`} aria-pressed={addOnTool === k.id} onClick={() => chooseAddOn(addOnTool === k.id ? null : k.id)}>
                      <span className="palette__name">{k.name}</span>
                      <span className="palette__count">{placedCount(k.id) || ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <ul className="toggles toggles--row">
                {deckDetails.map((id) => {
                  const on = addOns.includes(id);
                  return (
                    <li key={id}>
                      <button type="button" className={`toggle${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => build.toggleAddOn(id)}>
                        <span className="toggle__box" aria-hidden="true" />
                        <span className="toggle__name">{addOnInfo[id].name}</span>
                        <span className="toggle__hint">On every deck you place.</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {state.manual.length > 0 && (
                <button type="button" className="link cfg__share" onClick={() => (build.clearManual(), say('Placed add-ons cleared.'))}>
                  Clear placed add-ons
                </button>
              )}
            </>
          )}
        </section>

        <section className="cfg__group">
          <h3 className="cfg__h">
            Foundation <span className="cfg__tag">Illustrative</span>
          </h3>
          <div className="sides" role="radiogroup" aria-label="Height above ground">
            <span className="t-label">Height</span>
            {FOUNDATION_HEIGHTS.map((h, i) => (
              <button key={h} type="button" role="radio" aria-checked={state.foundation.h === i} className={`side${state.foundation.h === i ? ' is-on' : ''}`} onClick={() => build.setFoundation({ h: i as 0 | 1 | 2 })}>
                {h} mm
              </button>
            ))}
          </div>
          <div className="sides" role="radiogroup" aria-label="Foundation type">
            <span className="t-label">Type</span>
            {foundationTypes.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={state.foundation.type === f.id} className={`side${state.foundation.type === f.id ? ' is-on' : ''}`} onClick={() => build.setFoundation({ type: f.id })} title={f.hint}>
                {f.name}
              </button>
            ))}
          </div>
          <p className="cfg__note">Precast footings at every corner, height above ground set per site. Where shells meet they share one footing and one plinth.</p>
        </section>

        <section className="cfg__group">
          <h3 className="cfg__h">
            Finish <span className="cfg__tag">Indicative</span>
          </h3>
          {(
            [
              ['Shell', shellFinishes, state.shell, build.setShell],
              ['Deck', deckFinishes, state.deck, build.setDeck],
              ['Trim', trimFinishes, state.trim, build.setTrim],
            ] as const
          ).map(([name, list, current, set]) => (
            <div key={name} className="swatches" role="radiogroup" aria-label={`${name} finish`}>
              <span className="t-label">{name}</span>
              {list.map((f) => (
                <button key={f.id} type="button" role="radio" aria-checked={current === f.id} className={`swatch${current === f.id ? ' is-on' : ''}`} style={{ background: f.hex }} title={f.name} aria-label={f.name} onClick={() => set(f.id)} />
              ))}
              <span className="swatches__name">{list.find((f) => f.id === current)?.name}</span>
            </div>
          ))}
          <p className="cfg__note">{finishNote}</p>
        </section>

        <section className="cfg__group cfg__group--sheet">
          <div className="cfg__sheet-head">
            <h3 className="cfg__h">Your house</h3>
            <div className="floors" role="tablist" aria-label="Floor shown on the plan">
              {Array.from({ length: Math.max(floors, 1) }, (_, i) => (
                <button key={i} type="button" role="tab" aria-selected={floor === i} className={`floor${floor === i ? ' is-on' : ''}`} onClick={() => setFloor(i)}>
                  {i === 0 ? 'G' : i}
                </button>
              ))}
            </div>
          </div>
          <BuildPlan units={units} addOns={addOns} deckSide={state.deckSide} manual={manualMode ? state.manual : null} plot={state.plot} floor={floor} selected={selected} onSelect={select} />
          <p className="cfg__note">Each shell has one door, marked on the plan. It moves to a free wall when another shell stands against it.</p>
          <dl className="stats">
            <div>
              <dt>Area</dt>
              <dd>
                {t.sqft} <small>sq.ft.</small>
              </dd>
            </div>
            <div>
              <dt>Shells</dt>
              <dd>{t.count ? `${t.a} A · ${t.b} B` : '—'}</dd>
            </div>
            <div>
              <dt>Floors</dt>
              <dd>{t.floors ? (t.floors === 1 ? 'G' : `G+${t.floors - 1}`) : '—'}</dd>
            </div>
            <div>
              <dt>Footprint</dt>
              <dd>{t.count ? `${t.width} × ${t.depth} m` : '—'}</dd>
            </div>
          </dl>
          <p className="cfg__note">
            Areas are the brief&rsquo;s nominal figures: Shell A 200 sq.ft., Shell B 100 sq.ft. Up to {MAX_FLOORS} floors.
          </p>
        </section>

        <div className="cfg__cta">
          <a className="btn" href="#contact" onClick={quote}>
            Request a quote
          </a>
          <a className="btn btn--ghost btn--down" href="#your-house">
            See it alone
          </a>
          <button type="button" className="link cfg__share" onClick={copyLink}>
            Copy a link to this build
          </button>
        </div>
      </aside>
    </div>
  );
}
