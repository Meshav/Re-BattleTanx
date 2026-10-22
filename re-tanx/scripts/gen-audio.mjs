// Generates the placeholder sound set: original, procedurally synthesized, no third-party samples.
// Run: node scripts/gen-audio.mjs   (needs ffmpeg for the music .mp3 files)
// Replace any file in packages/client/public/audio with a recorded one of the same name; data/audio.json sets levels.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "packages/client/public/audio");
const RATE = 22050;

// ---------- primitives ----------
let seed = 12345;
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
const buf = (sec) => new Float32Array(Math.ceil(sec * RATE));
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d)); // attack then exponential decay
const TAU = Math.PI * 2;
const wave = {
  sine: (p) => Math.sin(p * TAU),
  square: (p) => (p % 1 < 0.5 ? 1 : -1),
  saw: (p) => 2 * (p % 1) - 1,
  tri: (p) => 1 - 4 * Math.abs((p % 1) - 0.5),
};

/** Mix a voice into `out`: freq(t) and amp(t) are functions of seconds since `at`. */
function osc(out, { at = 0, dur, shape = "sine", freq, amp, lp }) {
  let phase = 0, y = 0;
  const k = lp ? 1 - Math.exp((-TAU * lp) / RATE) : 1;
  const start = Math.floor(at * RATE);
  for (let i = 0; i < dur * RATE && start + i < out.length; i++) {
    const t = i / RATE;
    phase += freq(t) / RATE;
    const s = shape === "noise" ? rand() : wave[shape](phase);
    y += k * (s - y);
    out[start + i] += y * amp(t);
  }
}

/** Filtered noise with a sweeping low-pass cutoff. */
function noise(out, { at = 0, dur, amp, cutoff }) {
  let y1 = 0, y2 = 0;
  const start = Math.floor(at * RATE);
  for (let i = 0; i < dur * RATE && start + i < out.length; i++) {
    const t = i / RATE;
    const k = 1 - Math.exp((-TAU * cutoff(t)) / RATE);
    y1 += k * (rand() - y1);
    y2 += k * (y1 - y2); // two poles: rounder rumble
    out[start + i] += y2 * amp(t) * 2;
  }
}

function normalize(b, peak = 0.9) {
  let m = 0;
  for (const v of b) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < b.length; i++) b[i] *= peak / m;
  // 5 ms fade-out so nothing clicks at the end
  const f = Math.min(b.length, Math.floor(0.005 * RATE));
  for (let i = 0; i < f; i++) b[b.length - 1 - i] *= i / f;
  return b;
}

function wav(b) {
  const data = Buffer.alloc(b.length * 2);
  b.forEach((v, i) => data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2));
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

// ---------- sound recipes ----------
const boom = (b, { dur, cut, thump }) => {
  noise(b, { dur, amp: (t) => env(t, 0.004, dur / 4), cutoff: (t) => cut * Math.exp(-t * 3) + 80 });
  osc(b, { dur: dur * 0.6, freq: (t) => thump * Math.exp(-t * 6) + 30, amp: (t) => env(t, 0.002, dur / 6) * 0.9 });
  return b;
};

const SFX = {
  // weapons
  fire_shell: () => { const b = buf(0.45); noise(b, { dur: 0.45, amp: (t) => env(t, 0.002, 0.07), cutoff: (t) => 3000 * Math.exp(-t * 18) + 300 }); osc(b, { dur: 0.2, freq: (t) => 140 * Math.exp(-t * 12) + 45, amp: (t) => env(t, 0.001, 0.05) }); return b; },
  fire_mg: () => { const b = buf(0.08); noise(b, { dur: 0.08, amp: (t) => env(t, 0.001, 0.015), cutoff: () => 5000 }); osc(b, { dur: 0.04, shape: "square", freq: () => 180, amp: (t) => env(t, 0.001, 0.01) * 0.4 }); return b; },
  fire_turret: () => { const b = buf(0.07); noise(b, { dur: 0.07, amp: (t) => env(t, 0.001, 0.012), cutoff: () => 6500 }); return b; },
  fire_laser: () => { const b = buf(0.3); osc(b, { dur: 0.3, shape: "saw", freq: (t) => 2400 * Math.exp(-t * 9) + 200, amp: (t) => env(t, 0.002, 0.08), lp: 6000 }); osc(b, { dur: 0.3, shape: "square", freq: (t) => 1210 * Math.exp(-t * 9) + 100, amp: (t) => env(t, 0.002, 0.06) * 0.4 }); return b; },
  fire_plasma: () => { const b = buf(0.4); osc(b, { dur: 0.4, shape: "sine", freq: (t) => 300 + 900 * Math.exp(-t * 6) + 60 * Math.sin(t * 90), amp: (t) => env(t, 0.005, 0.12) }); noise(b, { dur: 0.3, amp: (t) => env(t, 0.002, 0.05) * 0.3, cutoff: () => 2500 }); return b; },
  fire_flame: () => { const b = buf(0.35); noise(b, { dur: 0.35, amp: (t) => env(t, 0.03, 0.12) * (0.7 + 0.3 * Math.sin(t * 140)), cutoff: () => 1400 }); return b; },
  fire_rocket: () => { const b = buf(0.7); noise(b, { dur: 0.7, amp: (t) => env(t, 0.01, 0.25), cutoff: (t) => 900 + 2500 * t }); osc(b, { dur: 0.15, freq: (t) => 220 * Math.exp(-t * 15) + 60, amp: (t) => env(t, 0.001, 0.04) }); return b; },
  fire_mortar: () => { const b = buf(0.6); osc(b, { dur: 0.35, freq: (t) => 90 * Math.exp(-t * 7) + 35, amp: (t) => env(t, 0.001, 0.09) }); noise(b, { dur: 0.6, amp: (t) => env(t, 0.002, 0.1) * 0.7, cutoff: (t) => 1200 * Math.exp(-t * 8) + 150 }); return b; },
  missile_launch: () => { const b = buf(0.9); noise(b, { dur: 0.9, amp: (t) => env(t, 0.05, 0.4), cutoff: (t) => 600 + 3000 * t }); osc(b, { dur: 0.9, shape: "saw", freq: (t) => 200 + 500 * t, amp: (t) => env(t, 0.05, 0.3) * 0.2, lp: 1500 }); return b; },
  // impacts
  hit_tank: () => { const b = buf(0.35); [520, 787, 1310].forEach((f, i) => osc(b, { dur: 0.35, shape: "tri", freq: () => f, amp: (t) => env(t, 0.001, 0.06 + i * 0.02) * 0.4 })); noise(b, { dur: 0.05, amp: (t) => env(t, 0.001, 0.01), cutoff: () => 6000 }); return b; },
  hit_shield: () => { const b = buf(0.4); osc(b, { dur: 0.4, freq: (t) => 900 + 300 * Math.sin(t * 60), amp: (t) => env(t, 0.003, 0.12) }); osc(b, { dur: 0.4, shape: "tri", freq: () => 1800, amp: (t) => env(t, 0.003, 0.08) * 0.3 }); return b; },
  explode_small: () => boom(buf(0.8), { dur: 0.8, cut: 2500, thump: 160 }),
  explode_large: () => boom(buf(1.8), { dur: 1.8, cut: 1800, thump: 120 }),
  building_crumble: () => { const b = buf(1.2); noise(b, { dur: 1.2, amp: (t) => env(t, 0.02, 0.35) * (0.6 + 0.4 * Math.abs(Math.sin(t * 37))), cutoff: () => 700 }); for (let k = 0; k < 7; k++) noise(b, { at: 0.05 + k * 0.13, dur: 0.12, amp: (t) => env(t, 0.001, 0.03) * 0.5, cutoff: () => 2500 }); return b; },
  building_collapse: () => { const b = boom(buf(2.5), { dur: 2.5, cut: 900, thump: 70 }); noise(b, { at: 0.3, dur: 2.2, amp: (t) => env(t, 0.2, 0.6) * 0.6, cutoff: () => 400 }); return b; },
  mine_trigger: () => { const b = buf(0.25); osc(b, { dur: 0.08, shape: "square", freq: () => 1700, amp: () => 0.5 }); osc(b, { at: 0.12, dur: 0.08, shape: "square", freq: () => 1700, amp: () => 0.5 }); return b; },
  nuke_detonate: () => { const b = boom(buf(4.5), { dur: 4.5, cut: 1200, thump: 55 }); noise(b, { at: 0.4, dur: 4, amp: (t) => env(t, 0.6, 1.2) * 0.8, cutoff: () => 250 }); return b; },
  nuke_beep: () => { const b = buf(0.15); osc(b, { dur: 0.15, shape: "square", freq: () => 1100, amp: (t) => env(t, 0.002, 0.05) * 0.6, lp: 3000 }); return b; },
  strike_warn: () => { const b = buf(0.5); osc(b, { dur: 0.5, shape: "saw", freq: (t) => 1500 - 900 * t, amp: (t) => env(t, 0.01, 0.2) * 0.5, lp: 4000 }); return b; },
  // specials & pickups
  special_use: () => { const b = buf(0.35); osc(b, { dur: 0.35, shape: "square", freq: (t) => 400 + 1600 * t, amp: (t) => env(t, 0.005, 0.12) * 0.5, lp: 3000 }); return b; },
  shield_up: () => { const b = buf(0.7); osc(b, { dur: 0.7, freq: (t) => 300 + 700 * Math.min(1, t * 2), amp: (t) => env(t, 0.05, 0.25) }); osc(b, { dur: 0.7, shape: "tri", freq: (t) => 601 + 1400 * Math.min(1, t * 2), amp: (t) => env(t, 0.05, 0.2) * 0.3 }); return b; },
  cloak: () => { const b = buf(0.8); noise(b, { dur: 0.8, amp: (t) => env(t, 0.1, 0.25) * 0.6, cutoff: (t) => 4000 * Math.exp(-t * 4) + 200 }); osc(b, { dur: 0.8, freq: (t) => 1200 * Math.exp(-t * 3), amp: (t) => env(t, 0.05, 0.2) * 0.4 }); return b; },
  teleport: () => { const b = buf(0.6); osc(b, { dur: 0.6, shape: "square", freq: (t) => 200 * 2 ** (t * 8 % 2), amp: (t) => env(t, 0.01, 0.2) * 0.4, lp: 2500 }); return b; },
  heal: () => { const b = buf(0.6); [523, 659, 784].forEach((f, i) => osc(b, { at: i * 0.08, dur: 0.4, freq: () => f, amp: (t) => env(t, 0.005, 0.12) * 0.5 })); return b; },
  pickup: () => { const b = buf(0.3); osc(b, { dur: 0.12, shape: "square", freq: () => 880, amp: (t) => env(t, 0.002, 0.05) * 0.4, lp: 4000 }); osc(b, { at: 0.08, dur: 0.18, shape: "square", freq: () => 1320, amp: (t) => env(t, 0.002, 0.07) * 0.4, lp: 4000 }); return b; },
  // tank
  engine_loop: () => {
    // exactly 1 s so it loops cleanly; the client changes pitch with throttle
    const b = buf(1);
    osc(b, { dur: 1, shape: "saw", freq: () => 46, amp: () => 0.5, lp: 260 });
    osc(b, { dur: 1, shape: "square", freq: () => 23, amp: (t) => 0.3 * (0.7 + 0.3 * Math.sin(t * TAU * 8)), lp: 180 });
    noise(b, { dur: 1, amp: () => 0.15, cutoff: () => 500 });
    return normalize(b, 0.6);
  },
  spawn: () => { const b = buf(0.6); osc(b, { dur: 0.6, shape: "saw", freq: (t) => 120 + 300 * t, amp: (t) => env(t, 0.02, 0.2) * 0.5, lp: 900 }); noise(b, { dur: 0.4, amp: (t) => env(t, 0.01, 0.1) * 0.4, cutoff: () => 1500 }); return b; },
  tank_destroyed: () => { const b = boom(buf(2), { dur: 2, cut: 2200, thump: 100 }); for (let k = 0; k < 5; k++) osc(b, { at: 0.1 + k * 0.17, dur: 0.3, shape: "tri", freq: () => 300 + rand() * 400, amp: (t) => env(t, 0.001, 0.05) * 0.25 }); return b; },
  low_hp: () => { const b = buf(0.25); osc(b, { dur: 0.25, shape: "square", freq: () => 660, amp: (t) => env(t, 0.005, 0.08) * 0.5, lp: 2000 }); return b; },
  boss_phase: () => { const b = buf(1.6); osc(b, { dur: 1.6, shape: "saw", freq: (t) => 55 + 20 * Math.sin(t * 5), amp: (t) => env(t, 0.1, 0.6), lp: 500 }); osc(b, { dur: 1.6, shape: "saw", freq: (t) => 82 + 30 * Math.sin(t * 5), amp: (t) => env(t, 0.1, 0.6) * 0.6, lp: 700 }); return b; },
  // announcer-style stingers
  wave_start: () => { const b = buf(0.9); [220, 277, 330].forEach((f, i) => osc(b, { at: i * 0.12, dur: 0.6, shape: "square", freq: () => f, amp: (t) => env(t, 0.005, 0.2) * 0.35, lp: 2500 })); return b; },
  round_end: () => { const b = buf(0.8); [392, 330, 262].forEach((f, i) => osc(b, { at: i * 0.12, dur: 0.5, shape: "tri", freq: () => f, amp: (t) => env(t, 0.005, 0.15) * 0.5 })); return b; },
  zone_move: () => { const b = buf(0.6); osc(b, { dur: 0.6, freq: (t) => 990 * (1 + t), amp: (t) => env(t, 0.01, 0.2) * 0.5 }); return b; },
  queen_taken: () => { const b = buf(0.6); [660, 880].forEach((f, i) => osc(b, { at: i * 0.15, dur: 0.35, shape: "square", freq: () => f, amp: (t) => env(t, 0.005, 0.1) * 0.4, lp: 3000 })); return b; },
  queen_captured: () => { const b = buf(1); [523, 659, 784, 1047].forEach((f, i) => osc(b, { at: i * 0.1, dur: 0.5, shape: "square", freq: () => f, amp: (t) => env(t, 0.005, 0.15) * 0.35, lp: 3500 })); return b; },
  win: () => { const b = buf(2); [262, 330, 392, 523, 392, 523].forEach((f, i) => osc(b, { at: i * 0.14, dur: i === 5 ? 1.2 : 0.3, shape: "square", freq: () => f, amp: (t) => env(t, 0.005, i === 5 ? 0.5 : 0.1) * 0.35, lp: 3000 })); return b; },
  lose: () => { const b = buf(2); [392, 370, 349, 330].forEach((f, i) => osc(b, { at: i * 0.3, dur: i === 3 ? 1.2 : 0.35, shape: "saw", freq: (t) => f * (i === 3 ? 1 - t * 0.1 : 1), amp: (t) => env(t, 0.01, i === 3 ? 0.5 : 0.15) * 0.4, lp: 1500 })); return b; },
  // UI
  ui_click: () => { const b = buf(0.06); osc(b, { dur: 0.06, shape: "square", freq: () => 1800, amp: (t) => env(t, 0.001, 0.012) * 0.5, lp: 5000 }); return b; },
  ui_confirm: () => { const b = buf(0.25); osc(b, { dur: 0.1, shape: "square", freq: () => 988, amp: (t) => env(t, 0.002, 0.04) * 0.4, lp: 4000 }); osc(b, { at: 0.07, dur: 0.18, shape: "square", freq: () => 1480, amp: (t) => env(t, 0.002, 0.06) * 0.4, lp: 4000 }); return b; },
  ui_back: () => { const b = buf(0.2); osc(b, { dur: 0.2, shape: "square", freq: (t) => 900 - 1500 * t, amp: (t) => env(t, 0.002, 0.06) * 0.4, lp: 3000 }); return b; },
};

// ---------- music: seamless loops (tails wrap to the start) ----------
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI → Hz

function loop(bpm, bars, write) {
  const beat = 60 / bpm, len = bars * 4 * beat;
  const b = buf(len + 3); // room for tails
  write(b, beat);
  const n = Math.round(len * RATE);
  for (let i = n; i < b.length; i++) b[i - n] += b[i];
  return normalize(b.slice(0, n), 0.8);
}

const kick = (b, at) => osc(b, { at, dur: 0.3, freq: (t) => 120 * Math.exp(-t * 25) + 45, amp: (t) => env(t, 0.001, 0.08) });
const snare = (b, at) => { noise(b, { at, dur: 0.25, amp: (t) => env(t, 0.001, 0.06) * 0.6, cutoff: () => 4000 }); osc(b, { at, dur: 0.1, shape: "tri", freq: () => 190, amp: (t) => env(t, 0.001, 0.03) * 0.5 }); };
const hat = (b, at, open = false) => noise(b, { at, dur: open ? 0.2 : 0.05, amp: (t) => env(t, 0.001, open ? 0.06 : 0.012) * 0.25, cutoff: () => 9000 });

const MUSIC = {
  // driving minor riff, 132 bpm, 8 bars
  battle: () => loop(132, 8, (b, beat) => {
    const roots = [45, 45, 48, 43, 45, 45, 41, 43]; // A A C G A A F G
    const riff = [0, 0, 12, 0, 10, 0, 7, 0];
    roots.forEach((root, bar) => {
      const t0 = bar * 4 * beat;
      for (let s = 0; s < 8; s++) {
        const at = t0 + s * beat / 2;
        osc(b, { at, dur: beat / 2, shape: "saw", freq: () => NOTE(root - 12 + riff[s]), amp: (t) => env(t, 0.005, 0.12) * 0.55, lp: 700 });
        hat(b, at, s % 4 === 3);
      }
      [0, 1.5, 2].forEach((k) => kick(b, t0 + k * beat));
      [1, 3].forEach((k) => snare(b, t0 + k * beat));
      if (bar % 2 === 1) [0, 3, 7, 12, 7, 3].forEach((iv, k) => osc(b, { at: t0 + k * beat / 2 + 2 * beat - beat, dur: beat / 2, shape: "square", freq: () => NOTE(root + 12 + iv), amp: (t) => env(t, 0.005, 0.1) * 0.18, lp: 2500 }));
    });
  }),
  // slow, moody menu loop, 84 bpm, 8 bars
  menu: () => loop(84, 8, (b, beat) => {
    const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
    chords.forEach((ch, bar) => {
      const t0 = bar * 4 * beat;
      ch.forEach((n) => osc(b, { at: t0, dur: 4 * beat, shape: "tri", freq: (t) => NOTE(n) * (1 + 0.003 * Math.sin(t * 5)), amp: (t) => Math.min(1, t * 2) * Math.exp(-t * 0.25) * 0.2 }));
      osc(b, { at: t0, dur: 4 * beat, shape: "saw", freq: () => NOTE(ch[0] - 24), amp: (t) => env(t, 0.02, 1.2) * 0.45, lp: 300 });
      kick(b, t0);
      kick(b, t0 + 2.5 * beat);
      snare(b, t0 + 2 * beat);
      for (let s = 0; s < 4; s++) hat(b, t0 + s * beat + beat / 2);
    });
  }),
};

// ---------- write ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "sfx"), { recursive: true });
mkdirSync(join(OUT, "music"), { recursive: true });
for (const [id, make] of Object.entries(SFX)) {
  seed = 12345 + id.length * 977; // stable output per sound
  writeFileSync(join(OUT, "sfx", `${id}.wav`), wav(id === "engine_loop" ? make() : normalize(make())));
}
for (const [id, make] of Object.entries(MUSIC)) {
  seed = 777;
  const tmp = join(OUT, "music", `${id}.wav`);
  writeFileSync(tmp, wav(make()));
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", tmp, "-c:a", "libmp3lame", "-b:a", "96k", join(OUT, "music", `${id}.mp3`)]);
  rmSync(tmp);
}
console.log(`wrote ${Object.keys(SFX).length} sfx and ${Object.keys(MUSIC).length} music loops to ${OUT}`);
