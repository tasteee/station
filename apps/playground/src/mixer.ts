import "@station/tokens";
import "@station/tokens/fonts.css";
import "@station/components";
import "./playground.css";
import "./mixer.css";
import "./icons.ts";
import "./nav.ts";

// biome-ignore lint/suspicious/noExplicitAny: demo page reads many element props.
type El = HTMLElement & Record<string, any>;
const $ = (sel: string) => document.querySelector(sel) as El;

const TRACKS = [
  { name: "Kick", color: "#e5484d", clips: [[0, 32]] },
  { name: "Snare", color: "#f76b15", clips: [[4, 28]] },
  {
    name: "Hats",
    color: "#ffc53d",
    clips: [
      [8, 16],
      [20, 12],
    ],
  },
  {
    name: "Bass",
    color: "#46a758",
    clips: [
      [0, 16],
      [18, 14],
    ],
  },
  { name: "Keys", color: "#12a594", clips: [[8, 24]] },
  { name: "Lead", color: "#3e63dd", clips: [[16, 16]] },
  {
    name: "Vocal",
    color: "#8e4ec6",
    clips: [
      [12, 8],
      [22, 10],
    ],
  },
  { name: "FX Bus", color: "#d6409f", clips: [[28, 4]] },
];
const SECONDS = 36;

// ---------- Arrangement ----------
const tracks = $("#tracks");
tracks.innerHTML = TRACKS.map(
  (t, i) => `
  <st-row class="track" data-track="${i}">
    <st-row class="track-head" gap="1.5" padding-x="2">
      <span class="swatch" style="background:${t.color}"></span>
      <st-text size="small" tone="strong" truncate grow>${t.name}</st-text>
      <st-toggle-button size="small" label="Mute ${t.name}" class="ms">M</st-toggle-button>
      <st-toggle-button size="small" label="Solo ${t.name}" class="ms">S</st-toggle-button>
    </st-row>
    <div class="lane">
      ${t.clips.map(([start, len]) => `<div class="clip" style="--c:${t.color};left:calc(${start} * var(--pps));width:calc(${len} * var(--pps))"><span>${t.name}</span></div>`).join("")}
      <div class="playhead"></div>
    </div>
  </st-row>`,
).join("");

// ---------- Mixer strips ----------
const strip = (name: string, color: string, master = false) => `
  <st-column class="strip${master ? " master" : ""}" gap="2" padding="2" x-align="center">
    <st-text size="small" tone="strong" truncate class="strip-name"><span class="dot" style="background:${color}"></span>${name}</st-text>
    ${
      master
        ? ""
        : `<st-row gap="2">
      <st-knob size="small" label="${name} send A" value="0" min="0" max="100" default="0">A</st-knob>
      <st-knob size="small" label="${name} send B" value="20" min="0" max="100" default="0">B</st-knob>
    </st-row>`
    }
    <st-knob label="${name} pan" value="0" min="-50" max="50" step="1" default="0" bipolar show-value>Pan</st-knob>
    <st-row gap="1.5" y-align="stretch" class="fader-row">
      <st-slider orientation="vertical" label="${name} volume" value="${master ? 80 : 60 + Math.round(Math.random() * 25)}" class="fader"></st-slider>
      <st-meter class="meter" label="${name} left"></st-meter>
      <st-meter class="meter" label="${name} right"></st-meter>
    </st-row>
    <st-text size="small" numeric class="db">0.0 dB</st-text>
    ${
      master
        ? ""
        : `<st-row gap="1">
      <st-toggle-button size="small" label="Mute ${name}" class="ms">M</st-toggle-button>
      <st-toggle-button size="small" label="Solo ${name}" class="ms solo">S</st-toggle-button>
      <st-toggle-button size="small" label="Arm ${name} for recording" icon="player-record" class="arm"></st-toggle-button>
    </st-row>`
    }
  </st-column>`;

const mixer = $("#mixer");
mixer.innerHTML = `<st-row y-align="stretch" class="strips">${TRACKS.map((t) => strip(t.name, t.color)).join("")}<st-divider></st-divider>${strip("Master", "var(--st-text-strong)", true)}</st-row>`;

const faderToDb = (v: number) => (v <= 0 ? -Infinity : 40 * Math.log10(v / 80));
for (const s of mixer.querySelectorAll<El>(".strip")) {
  const fader = s.querySelector<El>(".fader")!;
  const db = s.querySelector<El>(".db")!;
  const show = () => {
    const d = faderToDb(fader.value);
    db.textContent = Number.isFinite(d) ? `${d > 0 ? "+" : ""}${d.toFixed(1)} dB` : "-∞ dB";
  };
  fader.addEventListener("input", show);
  show();
}

// ---------- Transport + meters ----------
const ruler = $("#timeline-ruler");
const play = $("#play");
let playing = false;
let position = 0;
let last = 0;
const levels = new Map<El, { level: number; peak: number; hold: number }>();

function setPosition(p: number) {
  position = p;
  ruler.marker = p;
  document.documentElement.style.setProperty("--playhead", String(p));
  const m = Math.floor(p / 60);
  $("#clock").textContent = `${m}:${(p % 60).toFixed(1).padStart(4, "0")}`;
}

function tick(now: number) {
  const dt = last ? (now - last) / 1000 : 0;
  last = now;
  if (playing) {
    setPosition((position + dt) % SECONDS);
    for (const s of mixer.querySelectorAll<El>(".strip")) {
      const gain = faderToDb(s.querySelector<El>(".fader")!.value);
      const muted = s.querySelector<El>(".ms")?.pressed;
      for (const m of s.querySelectorAll<El>(".meter")) {
        const st = levels.get(m) ?? { level: -60, peak: -60, hold: 0 };
        const target = muted ? -60 : -18 + gain + Math.random() * 14 - (Math.random() < 0.1 ? 8 : 0);
        st.level = Math.max(target, st.level - 60 * dt);
        if (st.level >= st.peak) {
          st.peak = st.level;
          st.hold = 1;
        } else {
          st.hold -= dt;
          if (st.hold < 0) st.peak = Math.max(-60, st.peak - 20 * dt);
        }
        levels.set(m, st);
        m.value = st.level;
        m.peak = st.peak;
      }
    }
    $("#cpu").value = 20 + Math.random() * 30;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

play.addEventListener("change", () => {
  playing = play.pressed;
  play.icon = playing ? "player-stop" : "player-play";
});
$("#stop").addEventListener("click", () => {
  playing = false;
  play.pressed = false;
  play.icon = "player-play";
  setPosition(0);
  for (const m of mixer.querySelectorAll<El>(".meter")) {
    m.value = -60;
    m.peak = null;
    levels.delete(m);
  }
});
$("#rewind").addEventListener("click", () => setPosition(0));
document.addEventListener("keydown", (e) => {
  const typing = e.composedPath().some((n) => ["input", "textarea"].includes((n as Element).localName));
  if (
    typing ||
    e.key !== " " ||
    (e.target as Element).closest?.("st-toggle-button, st-button, st-icon-button")
  )
    return;
  e.preventDefault();
  play.click();
});
setPosition(0);
