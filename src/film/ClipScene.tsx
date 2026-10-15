import { useEffect, useRef, useState } from 'react';
import type { SceneProps } from './progress';

export interface Clip {
  /** The clip's files, in the order a browser should try them (H.264 in MP4: every phone decodes it in hardware). */
  sources: { src: string; type: string }[];
  /** Its last frame, as a picture: where none may play, and with reduced motion. The first clip's first frame too: shown before it plays (each clip begins where the one before it ended). */
  first?: string;
  last: string;
}

/**
 * A film with cards drawn from recorded clips instead of a live 3D stage
 * (2026-10-15, the factory on a phone: "since the factory scene is more like
 * a 3d video, we can make it more realistic ... add in there like a video").
 * One clip a step: the scene from the step before to this one, rendered
 * offline from the film's own 3D scene at a quality no phone could draw
 * live (scripts/factory-video.mjs). The film is the same: its words, its
 * reel, its cards; its scene is this. When a step is chosen (a card, an
 * arrow, the reel playing on: `progress.chosen`) its clip plays from the
 * start and stands on its last frame. The first clip plays when the title
 * card has opened. Each clip begins where the one before it ended, so going
 * on from a step is seamless; the next clip is fetched while one plays, and
 * none before it is needed. With reduced motion, or where a browser will not
 * play a muted video by itself, each step is its last frame, still.
 */
export default function ClipScene({ clips, progress, active, reduced, onReady }: SceneProps & { clips: Clip[] }) {
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  /** The clip on show, and a picture over the clips while none is playing yet ('' when a clip is on show). */
  const [shown, setShown] = useState(0);
  const [still, setStill] = useState(clips[0]?.first ?? clips[0]?.last ?? '');
  const state = useRef({ want: 0, count: 0, started: false, active, reduced });
  state.current.active = active;
  state.current.reduced = reduced;

  useEffect(() => {
    onReady();
    // Reported once, when its first picture is there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const play = (k: number) => {
      const s = state.current;
      s.want = k;
      const v = videos.current[k];
      videos.current.forEach((o, j) => {
        if (j !== k && o && !o.paused) o.pause();
      });
      if (s.reduced || !v) {
        setStill(clips[k].last);
        setShown(k);
        return;
      }
      // The next clip is fetched behind this one, so that it is there when its step comes.
      const next = videos.current[k + 1];
      if (next && next.preload !== 'auto') next.preload = 'auto';
      v.preload = 'auto';
      try {
        v.currentTime = 0;
      } catch {
        // Not loaded yet: it starts from the start anyway.
      }
      const show = () => {
        if (state.current.want !== k) return;
        setShown(k);
        setStill('');
      };
      if (v.readyState >= 2) show();
      else v.addEventListener('playing', show, { once: true });
      // A clip that cannot be decoded here: the step as its last frame.
      v.addEventListener(
        'error',
        () => {
          if (state.current.want !== k) return;
          setStill(clips[k].last);
          setShown(k);
        },
        { once: true },
      );
      v.play()?.catch(() => {
        // A browser that will not play it (a low-power mode): the step as its last frame.
        if (state.current.want !== k) return;
        setStill(clips[k].last);
        setShown(k);
      });
    };
    const listen = () => {
      const s = state.current;
      if (progress.chosen >= 0 && progress.chosenCount !== s.count) {
        s.count = progress.chosenCount;
        s.started = true;
        play(progress.chosen);
        return;
      }
      // Nothing chosen yet: the first clip, once the title card before the film has opened.
      if (!s.started && s.active && progress.pre >= 0.999) {
        s.started = true;
        play(0);
      }
    };
    progress.listeners.add(listen);
    listen();
    return () => {
      progress.listeners.delete(listen);
    };
  }, [progress, clips]);

  // Out of sight: the clip waits; back in sight, it plays on from where it was.
  useEffect(() => {
    const v = videos.current[state.current.want];
    if (!v) return;
    if (!active) v.pause();
    else if (state.current.started && !state.current.reduced && v.paused && !v.ended && v.currentTime > 0) v.play()?.catch(() => {});
    if (active) progress.listeners.forEach((fn) => fn(progress.value));
  }, [active, progress]);

  return (
    <div className="film__clips" aria-hidden="true">
      {clips.map((c, k) => (
        <video
          key={k}
          ref={(el) => void (videos.current[k] = el)}
          className={k === shown && !still ? 'is-on' : undefined}
          muted
          playsInline
          disablePictureInPicture
          preload={k === 0 ? 'auto' : 'none'}
          tabIndex={-1}
        >
          {c.sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      ))}
      {still && <img className="film__clip-still" src={still} alt="" decoding="async" />}
    </div>
  );
}
