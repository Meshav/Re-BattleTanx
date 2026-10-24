import { playMusic } from "../../audio/sfx.ts";
import { campaignMissions, createMissionWorld, createRecorder, deployCost, deployTank, finalScore, levelFor, loadoutOf, wingmenOracles, type MissionSetup, type Recorder, type Replay, type TankKind, type World } from "@re-tanx/sim";
import { downloadReplay, saveReplay, watchReplay } from "../replays.ts";
import { runLocalWorld, type RunCtx } from "../localMatch.ts";
import type { LocalPlayer } from "../localPlayer.ts";
import type { Device } from "../matchConfig.ts";
import { showCampaignMenu } from "./campaignMenu.ts";
import { showBriefing } from "./briefing.ts";
import { redeployPrompt, renderDeploy } from "./deployScreen.ts";
import { showDebrief } from "./debrief.ts";
import { freshProgress, loadProgress, recordWin, saveProgress } from "./progress.ts";
import { awardLocal, loadProfile } from "../profile/localProfile.ts";

const missions = campaignMissions;
const DEVICES: Device[] = ["kbm", "keys"];

interface Ctx extends RunCtx { host: HTMLElement; onExit(): void }

export function startCampaign(ctx: Ctx): void {
  playMusic(ctx.sfx, "menu");
  showCampaignMenu(ctx.host, missions, loadProgress(), {
    onPlay: (i, p) => {
      saveProgress(p);
      brief(ctx, i);
    },
    onReset: () => {
      saveProgress(freshProgress());
      startCampaign(ctx);
    },
    onBack: ctx.onExit,
  });
}

function brief(ctx: Ctx, i: number): void {
  showBriefing(ctx.host, missions[i]!, i, { onContinue: () => chooseTanks(ctx, i, []), onBack: () => startCampaign(ctx) });
}

/** Each local player buys an opening tank from the shared wallet (co-op shares Tank Bucks, as in Global Assault). */
function chooseTanks(ctx: Ctx, i: number, picked: TankKind[]): void {
  const p = loadProgress();
  if (picked.length >= p.players) return play(ctx, i, picked);
  const spent = picked.reduce((s, k) => s + deployCost(p, k), 0);
  const wrap = document.createElement("div");
  wrap.className = "overlay";
  ctx.host.innerHTML = "";
  ctx.host.appendChild(wrap);
  renderDeploy(wrap, { title: `P${picked.length + 1}: choose your tank`, bucks: p.bucks - spent, cost: (k) => deployCost(p, k), level: levelFor(loadProfile().xp).level }, (k) => chooseTanks(ctx, i, [...picked, k]));
}

function play(ctx: Ctx, i: number, tanks: TankKind[]): void {
  const p = loadProgress();
  const setup = { id: missions[i]!.id, players: tanks, bucks: p.bucks, difficulty: p.difficulty, seed: (Date.now() & 0xffff) || 1, countdown: true, ...p1Loadouts() };
  const world = createMissionWorld({ ...setup, mission: missions[i]! });
  const recorder = createRecorder({ map: "", slots: [], opts: {}, mission: setup }, tanks.length);
  ctx.host.innerHTML = "";
  const deploys = new Map<number, () => void>();
  runLocalWorld(world, DEVICES.slice(0, tanks.length), ctx, {
    onPlayerFrame: (lp, w) => redeployPrompt(lp, w, deploys, (k) => {
      if (deployTank(w, lp.tank.id, k)) recorder.action(w, w.tanks.indexOf(lp.tank), k);
    }),
    onOver: (w) => finish(ctx, i, w, recorder.finish(w)),
    onQuit: () => startCampaign(ctx),
  }, { recorder });
}

/** Split-screen shares one profile: P1 brings their loadout, and their Oracles ride with the wingmen. */
function p1Loadouts(): Pick<MissionSetup, "loadouts" | "allyOracles"> {
  const prof = loadProfile();
  return { loadouts: [loadoutOf(prof)], allyOracles: wingmenOracles(prof, prof.wingmen, prof.oracle) };
}

function finish(ctx: Ctx, i: number, w: World, replay: Replay): void {
  saveReplay(replay);
  const c = w.campaign!;
  if (c.outcome === "won") recordWin(c.mission.id, finalScore(w).grade, c.bucks);
  const hasNext = c.outcome === "won" && i + 1 < missions.length;
  const xp = awardLocal(w, c.outcome === "won" ? finalScore(w).grade : undefined);
  showDebrief(ctx.host, w, {
    xp,
    ...(hasNext ? { onNext: () => brief(ctx, i + 1) } : {}),
    onRetry: () => chooseTanks(ctx, i, []),
    onMenu: () => startCampaign(ctx),
    replay: { watch: () => watchReplay(replay, ctx, () => startCampaign(ctx)), download: () => downloadReplay(replay) },
  });
}
