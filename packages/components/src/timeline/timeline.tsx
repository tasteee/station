import { clamp, readableInk } from "@station/behaviors";
import { c, css, type, useEffect, useHost, useProp, useRef, useState } from "atomico";
import type { TimelineClip, TimelineKeyframe, TimelineToggle, TimelineTrack } from "../data-types.ts";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

export type { TimelineClip, TimelineKeyframe, TimelineToggle, TimelineTrack };

type TimelineEl = HTMLElement & {
  tracks?: TimelineTrack[];
  selection?: string[];
  zoom?: number;
  playhead?: number;
  snap?: number;
};

type Draft = Record<string, { start: number; end: number; trackId: string }>;
interface Drag {
  kind: "move" | "trim-start" | "trim-end" | "keyframe" | "scrub";
  ids: string[];
  startX: number;
  startY: number;
  moved: boolean;
  origin: Draft;
  keyTrack?: string;
  keyTime?: number;
}

const EDGE_PX = 6;
const SNAP_PX = 6;

const inkCache = new Map<string, string>();
/** Solid label strip + readable ink for a known clip color (CSS vars stay theme-driven otherwise). */
function inkFor(color: string | undefined): string {
  if (!color) return "";
  let ink = inkCache.get(color);
  if (!ink) {
    ink = readableInk(color);
    inkCache.set(color, ink);
  }
  return `--_strip:${color};--_ink:${ink}`;
}

/**
 * Multi-track timeline for video, audio and animation.
 * `tracks` is a property; the timeline never mutates it. Dragging shows a
 * preview and fires on release. Hold Alt to drag without snapping.
 *
 * Events: seek ({ time }), clipchange ({ id, trackId, start, end }), keyframechange ({ id, trackId, time }),
 * change (selection), trackchange ({ id, key, value }), zoomchange ({ zoom }), delete ({ ids }).
 */
export const Timeline = c(
  ({ tracks, trackToggles, duration, format, fps, trackHeight, label }) => {
    const host = useHost<TimelineEl>();
    const [zoom, setZoom] = useProp<number>("zoom");
    const [playhead, setPlayhead] = useProp<number>("playhead");
    const [selection, setSelection] = useProp<string[]>("selection");
    const [scroll, setScroll] = useState({ left: 0, top: 0 });
    const [draft, setDraft] = useState<Draft>({});
    const [keyDraft, setKeyDraft] = useState<Record<string, number>>({});
    const lanes = useRef<HTMLDivElement>();
    const drag = useRef<Drag | null>(null);
    // Mirrors of the drafts: pointerup can arrive before the render that follows the last move.
    const draftRef = useRef<Draft>({});
    const keyDraftRef = useRef<Record<string, number>>({});
    const updateDraft = (next: Draft) => {
      draftRef.current = next;
      setDraft(next);
    };
    const updateKeyDraft = (next: Record<string, number>) => {
      keyDraftRef.current = next;
      setKeyDraft(next);
    };

    const z = zoom ?? 24;
    const th = trackHeight ?? 40;
    const list = tracks ?? [];
    const selected = new Set(selection ?? []);
    const allClips = list.flatMap((t) => (t.clips ?? []).map((clip) => ({ clip, trackId: t.id })));
    const contentEnd = Math.max(duration ?? 0, ...allClips.map(({ clip }) => clip.end)) + 4;

    const snapValue = (time: number, e: { altKey: boolean }, exclude: Set<string>) => {
      if (e.altKey) return time;
      const tolerance = SNAP_PX / z;
      const targets = [
        host.current.playhead ?? 0,
        ...allClips.filter(({ clip }) => !exclude.has(clip.id)).flatMap(({ clip }) => [clip.start, clip.end]),
      ];
      for (const t of targets) if (Math.abs(t - time) <= tolerance) return t;
      const grid = host.current.snap;
      return grid ? Math.round(time / grid) * grid : time;
    };

    const timeAt = (clientX: number) => {
      const r = lanes.current!.getBoundingClientRect();
      return Math.max(0, (clientX - r.left + lanes.current!.scrollLeft) / z);
    };
    const trackAt = (clientY: number) => {
      const r = lanes.current!.getBoundingClientRect();
      const i = Math.floor((clientY - r.top + lanes.current!.scrollTop) / th);
      return list[clamp(i, 0, list.length - 1)]?.id;
    };

    const select = (id: string, e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
      let next: string[];
      if (e.shiftKey || e.metaKey || e.ctrlKey)
        next = selected.has(id) ? [...selected].filter((s) => s !== id) : [...selected, id];
      else next = selected.has(id) ? [...selected] : [id];
      if (next.length !== selected.size || next.some((s) => !selected.has(s))) {
        setSelection(next);
        fire(host.current, "change", { selection: next });
      }
      return next;
    };

    const seek = (time: number) => {
      const t = clamp(time, 0, contentEnd);
      setPlayhead(t);
      fire(host.current, "seek", { time: t });
    };

    // ---- pointer ----
    const onlanepointerdown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.composedPath()[0] as HTMLElement;
      const clipEl = target.closest?.(".clip") as HTMLElement | null;
      const keyEl = target.closest?.(".key") as HTMLElement | null;
      lanes.current!.focus({ preventScroll: true });
      if (keyEl) {
        const id = keyEl.dataset.id!;
        select(id, e);
        drag.current = {
          kind: "keyframe",
          ids: [id],
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
          origin: {},
          keyTrack: keyEl.dataset.track,
          keyTime: Number(keyEl.dataset.time),
        };
      } else if (clipEl) {
        const id = clipEl.dataset.id!;
        const r = clipEl.getBoundingClientRect();
        const kind =
          e.clientX - r.left < EDGE_PX ? "trim-start" : r.right - e.clientX < EDGE_PX ? "trim-end" : "move";
        const ids = kind === "move" ? select(id, e) : [id];
        if (kind !== "move") select(id, { shiftKey: false, metaKey: false, ctrlKey: false });
        const origin: Draft = {};
        for (const { clip, trackId } of allClips)
          if (ids.includes(clip.id)) origin[clip.id] = { start: clip.start, end: clip.end, trackId };
        drag.current = { kind, ids, startX: e.clientX, startY: e.clientY, moved: false, origin };
      } else {
        // Empty lane: clear selection and move the playhead.
        if (selected.size) {
          setSelection([]);
          fire(host.current, "change", { selection: [] });
        }
        seek(timeAt(e.clientX));
        drag.current = {
          kind: "scrub",
          ids: [],
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
          origin: {},
        };
      }
      lanes.current!.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const onlanepointermove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 3) return;
      d.moved = true;
      const dt = (e.clientX - d.startX) / z;
      if (d.kind === "scrub") return seek(timeAt(e.clientX));
      if (d.kind === "keyframe") {
        updateKeyDraft({ [d.ids[0]!]: Math.max(0, snapValue(d.keyTime! + dt, e, new Set())) });
        return;
      }
      const exclude = new Set(d.ids);
      const next: Draft = {};
      if (d.kind === "move") {
        // Snap using the lead clip's start, then shift everything by the same amount.
        const lead = d.origin[d.ids[0]!]!;
        const snapped = snapValue(lead.start + dt, e, exclude);
        const snappedEnd = snapValue(lead.end + dt, e, exclude);
        const shift = Math.max(
          -Math.min(...Object.values(d.origin).map((o) => o.start)),
          snapped !== lead.start + dt ? snapped - lead.start : snappedEnd - lead.end,
        );
        const newTrack = d.ids.length === 1 ? trackAt(e.clientY) : undefined;
        for (const id of d.ids) {
          const o = d.origin[id]!;
          next[id] = { start: o.start + shift, end: o.end + shift, trackId: newTrack ?? o.trackId };
        }
      } else {
        const id = d.ids[0]!;
        const o = d.origin[id]!;
        const min = host.current.snap || 0.05;
        if (d.kind === "trim-start")
          next[id] = { ...o, start: clamp(snapValue(o.start + dt, e, exclude), 0, o.end - min) };
        else next[id] = { ...o, end: Math.max(o.start + min, snapValue(o.end + dt, e, exclude)) };
      }
      updateDraft(next);
    };

    const onlanepointerup = () => {
      const d = drag.current;
      drag.current = null;
      if (!d?.moved) return;
      if (d.kind === "keyframe") {
        const time = keyDraftRef.current[d.ids[0]!];
        updateKeyDraft({});
        if (time != null && time !== d.keyTime)
          fire(host.current, "keyframechange", { id: d.ids[0], trackId: d.keyTrack, time });
        return;
      }
      if (d.kind === "scrub") return;
      for (const [id, v] of Object.entries(draftRef.current)) {
        const o = d.origin[id]!;
        if (v.start !== o.start || v.end !== o.end || v.trackId !== o.trackId)
          fire(host.current, "clipchange", { id, ...v });
      }
      updateDraft({});
    };

    const onwheel = (e: WheelEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      const vp = lanes.current!;
      const r = vp.getBoundingClientRect();
      const anchorTime = (e.clientX - r.left + vp.scrollLeft) / z;
      const next = clamp(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 2, 2000);
      setZoom(next);
      fire(host.current, "zoomchange", { zoom: next });
      requestAnimationFrame(() => {
        vp.scrollLeft = anchorTime * next - (e.clientX - r.left);
      });
    };

    const onkeydown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selected.size) {
        e.preventDefault();
        fire(host.current, "delete", { ids: [...selected] });
      } else if (e.key === "Home") {
        e.preventDefault();
        seek(0);
      } else if (e.key === "End") {
        e.preventDefault();
        seek(Math.max(0, ...allClips.map(({ clip }) => clip.end)));
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && selected.size) {
        e.preventDefault();
        const step =
          (host.current.snap || 1 / (fps || 10)) * (e.shiftKey ? 10 : 1) * (e.key === "ArrowLeft" ? -1 : 1);
        for (const { clip, trackId } of allClips) {
          if (!selected.has(clip.id)) continue;
          const shift = Math.max(-clip.start, step);
          fire(host.current, "clipchange", {
            id: clip.id,
            trackId,
            start: clip.start + shift,
            end: clip.end + shift,
          });
        }
      }
    };

    useEffect(() => host.current.style.setProperty("--_th", `${th}px`), [th]);

    useEffect(() => {
      const vp = lanes.current!;
      vp.addEventListener("wheel", onwheel, { passive: false });
      return () => vp.removeEventListener("wheel", onwheel);
    });

    // Draft-adjusted clips per track (a clip dragged to another track moves there in the preview).
    const clipsFor = (trackId: string) =>
      allClips
        .map(({ clip, trackId: t }) => {
          const dr = draft[clip.id];
          return dr
            ? { clip: { ...clip, start: dr.start, end: dr.end }, trackId: dr.trackId, dragging: true }
            : { clip, trackId: t, dragging: false };
        })
        .filter((x) => x.trackId === trackId);

    const ph = playhead ?? 0;

    return (
      <host shadowDom>
        <div class="corner" part="corner">
          <slot name="corner" />
        </div>
        <div
          class="ruler-wrap"
          onpointerdown={(e: PointerEvent) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            seek(timeAt(e.clientX));
            drag.current = {
              kind: "scrub",
              ids: [],
              startX: e.clientX,
              startY: e.clientY,
              moved: true,
              origin: {},
            };
          }}
          onpointermove={(e: PointerEvent) => drag.current?.kind === "scrub" && seek(timeAt(e.clientX))}
          onpointerup={() => {
            drag.current = null;
          }}
        >
          <st-ruler format={format ?? "time"} fps={fps} zoom={z} offset={scroll.left / z} marker={ph} />
          <span class="ph-handle" style={`left:${ph * z - scroll.left}px`} />
        </div>
        <div class="heads" part="headers">
          <div class="heads-inner" style={`transform:translateY(${-scroll.top}px)`}>
            {list.map((t) => (
              <div class="head" data-track={t.id} style={t.color ? `--_c:${t.color}` : ""}>
                <span class="swatch" />
                <span class="head-label">{t.label}</span>
                {(trackToggles ?? []).map((tg) => (
                  <button
                    type="button"
                    class="tg"
                    aria-label={`${tg.label} ${t.label}`}
                    aria-pressed={t[tg.key] ? "true" : "false"}
                    onclick={() =>
                      fire(host.current, "trackchange", { id: t.id, key: tg.key, value: !t[tg.key] })
                    }
                  >
                    {tg.text}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div
          ref={lanes}
          class="lanes"
          part="lanes"
          tabindex="0"
          role="group"
          aria-label={label ?? "Timeline"}
          onscroll={(e: Event) => {
            const t = e.target as HTMLElement;
            setScroll({ left: t.scrollLeft, top: t.scrollTop });
          }}
          onpointerdown={onlanepointerdown}
          onpointermove={onlanepointermove}
          onpointerup={onlanepointerup}
          onpointercancel={() => {
            drag.current = null;
            updateDraft({});
            updateKeyDraft({});
          }}
          onkeydown={onkeydown}
        >
          <div class="content" style={`width:${contentEnd * z}px;height:${list.length * th}px`}>
            {list.map((t, i) => (
              <div class="lane" style={`top:${i * th}px;${t.color ? `--_c:${t.color}` : ""}`}>
                {clipsFor(t.id).map(({ clip, dragging }) => (
                  <div
                    class="clip"
                    part="clip"
                    data-id={clip.id}
                    data-selected={selected.has(clip.id) ? "" : null}
                    data-dragging={dragging ? "" : null}
                    style={`left:${clip.start * z}px;width:${Math.max(2, (clip.end - clip.start) * z)}px;${clip.color ? `--_c:${clip.color};` : ""}${inkFor(clip.color ?? t.color)}`}
                    title={clip.label}
                  >
                    <span class="clip-label">{clip.label}</span>
                  </div>
                ))}
                {(t.keyframes ?? []).map((k) => {
                  const time = keyDraft[k.id] ?? k.time;
                  return (
                    <span
                      class="key"
                      data-id={k.id}
                      data-track={t.id}
                      data-time={String(k.time)}
                      data-selected={selected.has(k.id) ? "" : null}
                      style={`left:${time * z}px`}
                    />
                  );
                })}
              </div>
            ))}
            <div class="playhead" style={`left:${ph * z}px`} />
          </div>
        </div>
      </host>
    );
  },
  {
    props: {
      tracks: type<TimelineTrack[]>(Array),
      trackToggles: type<TimelineToggle[]>(Array),
      selection: type<string[]>(Array),
      zoom: { type: Number, reflect: true, value: () => 24 },
      playhead: { type: Number, reflect: true, value: () => 0 },
      duration: { type: Number, reflect: true },
      snap: { type: Number, reflect: true },
      format: { type: String, reflect: true },
      fps: { type: Number, reflect: true },
      trackHeight: { type: Number, reflect: true },
      label: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          --_head: var(--st-timeline-header-width, 180px);
          display: grid;
          grid-template-columns: var(--_head) minmax(0, 1fr);
          grid-template-rows: 24px minmax(0, 1fr);
          min-height: 0;
          font-family: var(--st-font-sans);
          font-size: var(--st-text-1);
          color: var(--st-text);
          background: var(--st-bg-canvas);
        }
        .corner {
          background: var(--st-bg-panel);
          border-right: 1px solid var(--st-border-subtle);
          border-bottom: 1px solid var(--st-border);
        }
        .ruler-wrap {
          position: relative;
          min-width: 0;
          border-bottom: 1px solid var(--st-border);
          cursor: ew-resize;
          touch-action: none;
          overflow: hidden;
        }
        .ruler-wrap st-ruler {
          height: 100%;
          border-block-end-color: transparent;
        }
        .ph-handle {
          position: absolute;
          bottom: 0;
          width: 9px;
          height: 9px;
          margin-left: -4.5px;
          background: var(--st-border-focus);
          clip-path: polygon(0 0, 100% 0, 50% 100%);
          pointer-events: none;
        }
        .heads {
          overflow: hidden;
          background: var(--st-bg-panel);
          border-right: 1px solid var(--st-border-subtle);
        }
        .head {
          display: flex;
          align-items: center;
          gap: var(--st-space-1-5);
          height: var(--_th);
          padding-inline: var(--st-space-2);
          box-sizing: border-box;
          border-bottom: 1px solid var(--st-border-subtle);
          --_c: var(--st-gray-9);
        }
        .swatch {
          width: 3px;
          align-self: stretch;
          margin-block: 8px;
          border-radius: 2px;
          background: var(--_c);
        }
        .head-label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--st-text-strong);
          font-size: var(--st-text-2);
        }
        .tg {
          all: unset;
          display: grid;
          place-items: center;
          width: 20px;
          height: 20px;
          border-radius: var(--st-radius-1);
          color: var(--st-text-muted);
          font-weight: var(--st-weight-medium);
        }
        .tg:hover {
          background: var(--st-bg-hover);
          color: var(--st-text-strong);
        }
        .tg[aria-pressed="true"] {
          background: var(--st-signal-gradient);
          color: var(--st-text-on-signal);
        }
        .tg:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
        }
        .lanes {
          position: relative;
          overflow: auto;
          outline: none;
          touch-action: none;
          scrollbar-width: thin;
          scrollbar-color: var(--st-gray-a7) transparent;
        }
        .lanes:focus-visible {
          box-shadow: inset 0 0 0 var(--st-focus-ring-width) var(--st-border-focus);
        }
        .content {
          position: relative;
          min-width: 100%;
        }
        .lane {
          position: absolute;
          left: 0;
          right: 0;
          height: var(--_th);
          box-sizing: border-box;
          border-bottom: 1px solid var(--st-border-subtle);
          --_c: var(--st-gray-9);
        }
        .clip {
          position: absolute;
          top: 3px;
          bottom: 3px;
          box-sizing: border-box;
          overflow: hidden;
          border-radius: var(--st-radius-1);
          background: color-mix(in oklch, var(--_c) 40%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--_c) 75%, transparent);
          cursor: grab;
        }
        .clip::before,
        .clip::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          width: 6px;
          cursor: ew-resize;
        }
        .clip::before {
          left: 0;
        }
        .clip::after {
          right: 0;
        }
        .clip[data-selected] {
          box-shadow:
            inset 0 0 0 1px color-mix(in oklch, var(--_c) 75%, transparent),
            inset 0 0 0 2px var(--st-text-strong);
        }
        .clip[data-dragging] {
          opacity: 0.85;
          cursor: grabbing;
        }
        .clip-label {
          display: block;
          padding: 2px 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          /* A known clip color gets a solid strip with ink picked for contrast. */
          color: var(--_ink, var(--st-text-strong));
          background: var(--_strip, color-mix(in oklch, var(--_c) 55%, transparent));
          pointer-events: none;
        }
        .key {
          position: absolute;
          /* Centered in the clip body, below the label strip. */
          top: calc(50% + 9px);
          width: 9px;
          height: 9px;
          margin: -4.5px 0 0 -4.5px;
          rotate: 45deg;
          border-radius: 1px;
          background: var(--st-text-strong);
          box-shadow: 0 0 0 1px var(--st-bg-canvas);
          cursor: ew-resize;
          z-index: 1;
        }
        .key[data-selected] {
          background: var(--st-border-focus);
          box-shadow: 0 0 0 2px var(--st-text-strong);
        }
        .playhead {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--st-border-focus);
          pointer-events: none;
          z-index: 2;
        }
      `,
    ],
  },
);
