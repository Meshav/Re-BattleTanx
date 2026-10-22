import { maxHp, type SimEvent, type Tank, type Vec2, type World } from "@re-tanx/sim";
import manifest from "../../../../data/audio.json";
import { settings } from "../settings/settings.ts";

export type SoundId = keyof typeof manifest.sfx;
export type MusicId = keyof typeof manifest.music;

/** Web Audio graph: sounds → sfx bus ┐→ master; music → music bus ┘. Everything is silent until the first user gesture. */
export interface Sfx {
  ctx: AudioContext | undefined;
  master?: GainNode; sfxBus?: GainNode; musicBus?: GainNode;
  buffers: Map<string, AudioBuffer>;
  /** end times of playing instances per sound, for voice limiting */
  voices: Map<string, number[]>;
  music?: { id: MusicId; src: AudioBufferSourceNode; gain: GainNode };
  wantMusic?: MusicId;
  engine?: { src: AudioBufferSourceNode; gain: GainNode };
  lowHpAt: number;
}

const HEARING = 120; // m: beyond this nothing is audible
const url = (file: string) => `${import.meta.env.BASE_URL}audio/${file}`;

export function createSfx(): Sfx {
  const sfx: Sfx = { ctx: undefined, buffers: new Map(), voices: new Map(), lowHpAt: 0 };
  const unlock = () => {
    if (sfx.ctx) return;
    const ctx = (sfx.ctx = new AudioContext());
    sfx.master = ctx.createGain();
    sfx.master.connect(ctx.destination);
    sfx.sfxBus = ctx.createGain();
    sfx.sfxBus.connect(sfx.master);
    sfx.musicBus = ctx.createGain();
    sfx.musicBus.connect(sfx.master);
    applyVolumes(sfx);
    void loadAll(sfx);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  // UI clicks for every button, menus included
  document.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest?.("button");
    if (b && !b.disabled) play(sfx, b.matches(".secondary, [data-back], [data-menu]") ? "ui_back" : "ui_click");
  });
  return sfx;
}

async function load(sfx: Sfx, key: string, file: string): Promise<void> {
  try {
    const res = await fetch(url(file));
    if (!res.ok) return;
    sfx.buffers.set(key, await sfx.ctx!.decodeAudioData(await res.arrayBuffer()));
  } catch {
    // missing or undecodable file: that sound stays silent
  }
}

async function loadAll(sfx: Sfx): Promise<void> {
  await Promise.all(Object.keys(manifest.sfx).map((id) => load(sfx, id, `sfx/${id}.wav`)));
  await Promise.all(Object.entries(manifest.music).map(([id, m]) => load(sfx, `music:${id}`, m.file)));
  if (sfx.wantMusic) playMusic(sfx, sfx.wantMusic);
}

/** Call after the settings screen saves. */
export function applyVolumes(sfx: Sfx): void {
  const s = settings();
  sfx.sfxBus?.gain.setValueAtTime(s.volume, sfx.ctx!.currentTime);
  sfx.musicBus?.gain.setValueAtTime(s.musicVolume, sfx.ctx!.currentTime);
}

/** One-shot. vol 0..1 on top of the manifest level, pan −1..1, rate = playback speed. */
export function play(sfx: Sfx, id: SoundId, o: { vol?: number; pan?: number; rate?: number } = {}): void {
  const ctx = sfx.ctx, buffer = sfx.buffers.get(id);
  if (!ctx || !buffer || !sfx.sfxBus) return;
  const def = manifest.sfx[id];
  const now = ctx.currentTime;
  const live = (sfx.voices.get(id) ?? []).filter((end) => end > now);
  if (live.length >= def.voices) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * def.pitchJitter);
  const gain = ctx.createGain();
  gain.gain.value = def.volume * (o.vol ?? 1);
  const pan = ctx.createStereoPanner();
  pan.pan.value = o.pan ?? 0;
  src.connect(gain).connect(pan).connect(sfx.sfxBus);
  src.start();
  live.push(now + buffer.duration / src.playbackRate.value);
  sfx.voices.set(id, live);
}

/** Swap the background loop with a short crossfade; undefined = silence. Safe to call before audio is unlocked. */
export function playMusic(sfx: Sfx, id: MusicId | undefined): void {
  sfx.wantMusic = id;
  const ctx = sfx.ctx;
  if (!ctx || !sfx.musicBus || sfx.music?.id === id) return;
  const fade = 0.8;
  if (sfx.music) {
    const old = sfx.music;
    old.gain.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
    old.src.stop(ctx.currentTime + fade * 2);
    sfx.music = undefined;
  }
  const buffer = id && sfx.buffers.get(`music:${id}`);
  if (!id || !buffer) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.setTargetAtTime(manifest.music[id].volume, ctx.currentTime, fade / 3);
  src.connect(gain).connect(sfx.musicBus);
  src.start();
  sfx.music = { id, src, gain };
}

/** Your own tank's engine: pitch and level follow speed. Pass undefined to stop it (menus, death screens). */
export function updateEngine(sfx: Sfx, me: Tank | undefined): void {
  const ctx = sfx.ctx, buffer = sfx.buffers.get("engine_loop");
  if (!ctx || !buffer || !sfx.sfxBus) return;
  if (!me?.alive) {
    sfx.engine?.src.stop();
    sfx.engine = undefined;
    return;
  }
  if (!sfx.engine) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = ctx.createGain();
    src.connect(gain).connect(sfx.sfxBus);
    src.start();
    sfx.engine = { src, gain };
  }
  const speed = Math.min(1, Math.abs(me.speed) / 12);
  sfx.engine.src.playbackRate.setTargetAtTime(0.8 + speed * 0.9, ctx.currentTime, 0.1);
  sfx.engine.gain.gain.setTargetAtTime(manifest.sfx.engine_loop.volume * (0.55 + speed * 0.45), ctx.currentTime, 0.1);
}

const FIRE: Record<string, SoundId> = {
  shell: "fire_shell", hitscan: "fire_mg", turret: "fire_turret", laser: "fire_laser", flame: "fire_flame", rocket: "fire_rocket", mortar: "fire_mortar",
};
const SPECIAL: Partial<Record<string, SoundId>> = {
  guided: "missile_launch", swarm: "missile_launch", nuke: "nuke_beep", health: "heal", repair: "heal", laser: "fire_laser", plasma: "fire_plasma",
  cloak: "cloak", teleport: "teleport", shock: "explode_small",
};

/** Turn a tick's sim events into sound, heard from `me` (positional volume + stereo pan relative to the chase camera). */
export function playEvents(sfx: Sfx, events: SimEvent[], world: World, me: Tank): void {
  const at = (pos: Vec2) => {
    const dx = pos.x - me.pos.x, dy = pos.y - me.pos.y;
    const vol = Math.max(0, 1 - Math.hypot(dx, dy) / HEARING);
    // camera right in sim coords is (−sin rot, cos rot)
    const pan = Math.max(-1, Math.min(1, (-dx * Math.sin(me.rot) + dy * Math.cos(me.rot)) / 40));
    return { vol: vol * vol, pan };
  };
  const tankPos = (id: number) => world.tanks.find((t) => t.id === id)?.pos ?? me.pos;
  for (const e of events) {
    switch (e.type) {
      case "fire": play(sfx, FIRE[e.weapon] ?? "fire_shell", at(e.pos)); break;
      case "hit": if (e.amount > 0) play(sfx, "hit_tank", at(e.pos)); break;
      case "shieldHit": play(sfx, "hit_shield", at(tankPos(e.tankId))); break;
      case "explode": play(sfx, e.radius >= 6 ? "explode_large" : "explode_small", at(e.pos)); break;
      case "kill": play(sfx, "tank_destroyed", at(tankPos(e.victimId))); break;
      case "spawn": play(sfx, "spawn", at(e.pos)); break;
      case "structureStage": play(sfx, e.stage >= 2 ? "building_collapse" : "building_crumble", at(structurePos(world, e.structureId) ?? me.pos)); break;
      case "special": play(sfx, SPECIAL[e.kind] ?? "special_use", at(e.pos)); break;
      case "pickup": if (e.tankId === me.id) play(sfx, "pickup"); break;
      case "mineTrigger": play(sfx, "mine_trigger", at(e.pos)); break;
      case "nukeDetonate": play(sfx, "nuke_detonate"); break;
      case "strikeWarn": play(sfx, "strike_warn", at(e.pos)); break;
      case "bossPhase": play(sfx, "boss_phase"); break;
      case "wave": play(sfx, "wave_start"); break;
      case "round": play(sfx, "round_end"); break;
      case "convoy": play(sfx, "queen_captured"); break;
      case "zone": play(sfx, "zone_move"); break;
      case "rail": if (e.tankId === me.id) play(sfx, e.what === "mount" ? "shield_up" : "ui_back"); break;
      case "queen": play(sfx, e.what === "captured" ? "queen_captured" : e.what === "taken" ? "queen_taken" : "ui_confirm"); break;
      case "matchOver": play(sfx, e.winner === me.team ? "win" : "lose"); break;
    }
  }
  // low-health warning: a beep every 1.2 s under 25 % HP
  const ctx = sfx.ctx;
  if (ctx && me.alive && me.hp < maxHp(me) * 0.25 && ctx.currentTime >= sfx.lowHpAt) {
    play(sfx, "low_hp");
    sfx.lowHpAt = ctx.currentTime + 1.2;
  }
}

function structurePos(world: World, id: number): Vec2 | undefined {
  const s = world.structures.find((k) => k.id === id);
  return s && { x: (s.cx + 0.5) * world.map.cell, y: (s.cy + 0.5) * world.map.cell };
}
