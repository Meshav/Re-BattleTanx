import type { ModeRules } from "./mode.ts";
import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { CampaignState } from "../campaign/state.ts";
import { humans, primariesDone, settleOptionals, updateObjectives } from "../campaign/objectives.ts";
import { stepWaves } from "../campaign/waves.ts";
import { setupCaptives, stepRescue } from "../campaign/rescue.ts";
import { affordable } from "../campaign/deploy.ts";
import { addScore, killPoints } from "../campaign/scoring.ts";
import { campaignDefs } from "../campaign/missionDefs.ts";
import { stepBosses } from "../campaign/boss.ts";
import { dist } from "../math/vec2.ts";
import { specialDefs } from "../data/specialDefs.ts";

const P = campaignDefs.points;

/** Single-player / co-op missions: scripted waves, objectives, Tank Bucks instead of lives. */
export const campaign: ModeRules = {
  setup(world) {
    setupCaptives(world);
    for (const pos of world.map.enemyTurrets) world.turrets.push({ id: world.nextId++, ownerId: 0, team: 1, pos: { ...pos }, rot: 0, hp: specialDefs.turret.hp * 2.5, life: Infinity, cooldown: 0 });
    for (const pos of world.map.enemyMines) world.mines.push({ id: world.nextId++, ownerId: 0, team: 1, pos: { ...pos }, armIn: 0 });
  },
  onTick(world, events) {
    const c = world.campaign;
    if (!c || c.outcome !== "playing") return [];
    c.elapsed += world.dt;
    for (const t of world.tanks) if (t.alive) delete c.pendingDeploy[t.id];
    c.playerDeaths = humans(world).reduce((n, t) => n + t.deaths, 0);
    scoreStructures(world, events);
    const out = [...stepWaves(world, c), ...stepRescue(world), ...stepBosses(world)];
    if (updateObjectives(world, c)) addScore(world, P.objective);
    if (primariesDone(c)) win(c);
    else if (runnerEscaped(world, c)) lose(c, "They got away");
    else if (outOfTanks(world, c)) lose(c, "Out of Tank Bucks");
    return out;
  },
  onKill(world, victim, killer) {
    const c = world.campaign;
    if (!c) return;
    if (victim.team !== 0 && killer?.team === 0) addScore(world, world.bosses.some((b) => b.tankId === victim.id) ? P.boss : killPoints(victim));
  },
  canRespawn: (world, tank) => world.campaign?.pendingDeploy[tank.id] !== undefined,
  checkWin(world) {
    const o = world.campaign?.outcome;
    return o === "won" ? 0 : o === "lost" ? 1 : undefined;
  },
};

function scoreStructures(world: World, events: SimEvent[]): void {
  for (const e of events) {
    if (e.type !== "structureStage" || e.stage !== 2) continue;
    const s = world.structures.find((k) => k.id === e.structureId);
    addScore(world, s?.kind === "target" ? P.target : P.structure);
  }
}

/** Every human is dead, none has a tank on order, and the wallet can't buy one. */
function outOfTanks(world: World, c: CampaignState): boolean {
  const hs = humans(world);
  return hs.length > 0 && hs.every((t) => !t.alive && !c.pendingDeploy[t.id]) && affordable(c).length === 0;
}

function win(c: CampaignState): void {
  settleOptionals(c);
  const optional = c.mission.objectives.filter((d, i) => d.optional && c.objectives[i]!.done).length;
  c.bucks += c.mission.reward + optional * campaignDefs.optionalBucks;
  c.outcome = "won";
}

function lose(c: CampaignState, reason: string): void {
  c.outcome = "lost";
  c.failReason = reason;
}

const runnerEscaped = (world: World, c: CampaignState): boolean =>
  c.runners.some((id) => {
    const t = world.tanks.find((k) => k.id === id);
    return t?.alive === true && world.map.exits.some((e) => dist(e, t.pos) < 8);
  });
