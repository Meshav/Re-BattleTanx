import { saveToken, storedToken } from "../net/identity.ts";
import { downloadReplay, saveReplay } from "./replays.ts";
import type * as THREE from "three";
import { PROTOCOL_LIMITS, finalScore, type MatchResult, type Profile, type Replay, type ServerMsg, type World } from "@re-tanx/sim";
import { showDebrief } from "./campaign/debrief.ts";
import { recordWin } from "./campaign/progress.ts";
import { forgetRejoin, rememberRejoin } from "./rejoin.ts";
import { loadProfile } from "./profile/localProfile.ts";
import { connect, serverUrl, type Socket } from "../net/socket.ts";
import { startOnlineMatch, type OnlineMatch } from "../net/onlineMatch.ts";
import { showOnlineMenu, type OnlineChoice } from "./onlineMenu.ts";
import { showLobby } from "./lobbyScreen.ts";
import { showResults } from "./results.ts";
import type { Devices } from "./localPlayer.ts";
import type { Sfx } from "../audio/sfx.ts";

interface Ctx { host: HTMLElement; renderer: THREE.WebGLRenderer; devices: Devices; sfx: Sfx; onExit(): void }

const DEFAULT_SETTINGS = { mode: "deathmatch", scoreLimit: 0, bots: 2, difficulty: "normal", teams: "ffa", perks: true, map: "graybox", ranked: false, public: false } as const;

/** Online menu → socket → lobby ⇄ match. Any connection problem lands back on the online menu with the reason. */
export function startOnline(ctx: Ctx, error?: string): void {
  showOnlineMenu(ctx.host, error, { onBack: ctx.onExit, onGo: (c) => void go(ctx, c) });
}

const RETRY_MS = 2000;

async function go(ctx: Ctx, choice: OnlineChoice): Promise<void> {
  if (choice.rejoin) ctx.host.innerHTML = `<div class="overlay"><div class="card"><h2>Connection lost</h2><p class="muted">Rejoining your match…</p></div></div>`;
  let sock: Socket;
  try {
    sock = await connect(serverUrl());
  } catch (e) {
    if (choice.rejoin && Date.now() < (choice.until ?? 0)) return void setTimeout(() => void go(ctx, choice), RETRY_MS);
    return startOnline(ctx, (e as Error).message);
  }
  let code = choice.rejoin ?? "";
  let myId = 0;
  let match: OnlineMatch | undefined;
  let leaving = false;
  let progress: MatchResult | undefined;
  let profile: Profile | undefined; // server copy, for the in-match XP strip
  let upgrades = false; // lobby's "Upgrades" setting, for the V-level badges
  let pausable = false; // private, unranked lobby: the menu pauses the match
  let replay: Replay | undefined;
  let inLobby = false;
  const leave = () => {
    forgetRejoin();
    leaving = true;
    match?.stop();
    sock.close();
    ctx.onExit();
  };
  sock.onClose = () => {
    const wasPlaying = match !== undefined && !match.over();
    match?.stop();
    if (leaving) return;
    // mid-match: keep trying to get back in while the server holds the seat
    if (wasPlaying && code) return void go(ctx, { ...choice, join: undefined, rejoin: code, until: Date.now() + PROTOCOL_LIMITS.rejoinGraceMs });
    startOnline(ctx, "Disconnected from the server");
  };
  sock.onMessage = (m: ServerMsg) => {
    if (m.t === "welcome") {
      myId = m.playerId;
      const token = storedToken();
      sock.send({ t: "hello", name: choice.name, gang: choice.gang, perks: loadProfile().perks, wingmen: loadProfile().wingmen, ...(loadProfile().oracle ? { oracle: loadProfile().oracle } : {}), ...(token ? { token } : {}) });
      sock.send(choice.rejoin ? { t: "rejoin", code: choice.rejoin } : choice.quick ? { t: "quick" } : choice.join ? { t: "join", code: choice.join } : { t: "create", settings: DEFAULT_SETTINGS });
    }
    if (m.t === "identity") {
      saveToken(m.token);
      profile = m.profile;
    }
    if (m.t === "progress") {
      progress = m.result;
      profile = m.result.profile;
    }
    if (m.t === "replay") {
      replay = m.replay;
      saveReplay(replay); // watch it from the menu's "Watch last match" once you've left the lobby
    }
    if (m.t === "error" && inLobby) {
      // a refused action inside the lobby (e.g. ranked with one player): say so, stay put
      const el = ctx.host.querySelector("[data-lobby-error]");
      if (el) el.textContent = m.message;
      return;
    }
    if (m.t === "error") {
      forgetRejoin();
      leaving = true;
      sock.close();
      startOnline(ctx, m.message);
    }
    if (m.t === "lobby") {
      code = m.code;
      upgrades = m.settings.perks;
      pausable = !m.settings.public && !m.settings.ranked;
    }
    if (m.t === "lobby" && !match) {
      inLobby = true;
      showLobby(ctx.host, m, myId, { onSettings: (s) => sock.send({ t: "settings", settings: s }), onStart: () => sock.send({ t: "start" }), onLeave: leave, onTank: (kind) => sock.send({ t: "deploy", kind }) });
    }
    if (m.t === "start") {
      replay = undefined;
      rememberRejoin(code, choice);
      match = startOnlineMatch(sock, m.tankId, m.mode, m.map ?? m.mapId, ctx.renderer, ctx.devices, ctx.sfx, {
        onOver: (w) => {
          forgetRejoin();
          const r = replay;
          if (w.campaign) return coopDebrief(ctx, w, progress, leave);
          showResults(ctx.host, w, { onRematch: () => {}, onMenu: leave, rematchLabel: "Back to lobby soon…", ...(progress ? { xp: progress } : {}), ...(r ? { replay: { download: () => downloadReplay(r) } } : {}) });
        },
        onLeave: leave,
        profile,
        upgrades,
        mission: m.mission,
        deploy: (kind) => sock.send({ t: "deploy", kind }),
        pausable,
      });
    }
    if (m.t === "ended") {
      match?.stop();
      match = undefined;
    }
    match?.onServer(m);
  };
}

/** Campaign co-op result: the mission debrief with your server XP; a win also moves your own campaign on (not your wallet). */
function coopDebrief(ctx: Ctx, w: World, xp: MatchResult | undefined, leave: () => void): void {
  const c = w.campaign!;
  if (c.outcome === "won") recordWin(c.mission.id, finalScore(w).grade);
  showDebrief(ctx.host, w, { onMenu: leave, menuLabel: "Leave · back to lobby soon…", ...(xp ? { xp } : {}) });
}
