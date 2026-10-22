import { playMusic } from "../../audio/sfx.ts";
import { campaignMissions, createMissionWorld, createRecorder, deployCost, deployTank, finalScore, levelFor, type Recorder, type Replay, type TankKind, type World } from "@re-tanx/sim";
import { downloadReplay, saveReplay, watchReplay } from "../replays.ts";
import { runLocalWorld, type RunCtx } from "../localMatch.ts";
import type { LocalPlayer } from "../localPlayer.ts";
import type { Device } from "../matchConfig.ts";
import { showCampaignMenu } from "./campaignMenu.ts";
import { showBriefing } from "./briefing.ts";
import { renderDeploy } from "./deployScreen.ts";
import { showDebrief } from "./debrief.ts";
import { betterGrade, freshProgress, loadProgress, saveProgress, type Progress } from "./progress.ts";
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
  const setup = { id: missions[i]!.id, players: tanks, bucks: p.bucks, difficulty: p.difficulty, seed: (Date.now() & 0xffff) || 1 };
  const world = createMissionWorld({ ...setup, mission: missions[i]! });
  const recorder = createRecorder({ map: "", slots: [], opts: {}, mission: setup }, tanks.length);
  ctx.host.innerHTML = "";
  const deploys = new Map<number, () => void>();
  runLocalWorld(world, DEVICES.slice(0, tanks.length), ctx, {
    onPlayerFrame: (lp, w) => redeploy(lp, w, deploys, recorder),
    onOver: (w) => finish(ctx, i, w, recorder.finish(w)),
    onQuit: () => startCampaign(ctx),
  }, { recorder });
}

/** Mid-mission: a dead player gets the deploy screen in their viewport (auto-picks after 8 s). */
function redeploy(lp: LocalPlayer, w: World, open: Map<number, () => void>, rec: Recorder): void {
  const c = w.campaign!;
  const id = lp.tank.id;
  const wrap = lp.hudRoot.querySelector<HTMLElement>(".deploy-wrap");
  const needs = !lp.tank.alive && c.pendingDeploy[id] === undefined && c.outcome === "playing" && lp.tank.respawnIn <= 0.5;
  if (!needs) {
    if (wrap) wrap.remove();
    open.get(id)?.();
    open.delete(id);
    return;
  }
  if (wrap) return;
  const el = document.createElement("div");
  el.className = "deploy-wrap";
  lp.hudRoot.appendChild(el);
  open.set(id, renderDeploy(el, { title: "Redeploy", bucks: c.bucks, cost: (k) => deployCost(c, k), autoSeconds: 8, preferred: lp.tank.kind, level: levelFor(loadProfile().xp).level }, (k) => {
    if (deployTank(w, id, k)) rec.action(w, w.tanks.indexOf(lp.tank), k);
  }));
}

function finish(ctx: Ctx, i: number, w: World, replay: Replay): void {
  saveReplay(replay);
  const c = w.campaign!;
  const p: Progress = loadProgress();
  if (c.outcome === "won") {
    p.bucks = c.bucks;
    p.unlocked = Math.max(p.unlocked, Math.min(i + 1, missions.length - 1));
    p.grades[c.mission.id] = betterGrade(p.grades[c.mission.id], finalScore(w).grade);
    saveProgress(p);
  }
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
