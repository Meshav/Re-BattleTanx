import { createRenderer } from "./render/scene.ts";
import { createKeyboard } from "./input/keyboard.ts";
import { createMouse } from "./input/mouse.ts";
import { applyVolumes, createSfx, playMusic } from "./audio/sfx.ts";
import { showMenu } from "./app/menu.ts";
import { showResults } from "./app/results.ts";
import { startLocalMatch } from "./app/localMatch.ts";
import { defaultConfig, type MatchConfig } from "./app/matchConfig.ts";
import { loadConfig, saveConfig } from "./settings/lastMatch.ts";
import { startOnline } from "./app/onlineFlow.ts";
import { takeSignInResult } from "./net/identity.ts";
import { startCampaign } from "./app/campaign/campaignFlow.ts";
import { showProfile } from "./app/profile/profileScreen.ts";
import { showSettings } from "./app/settingsScreen.ts";
import { awardLocal } from "./app/profile/localProfile.ts";
import { downloadReplay, loadReplay, pickReplayFile, saveReplay, watchReplay } from "./app/replays.ts";
import type { MapJson, Replay } from "@re-tanx/sim";
import { blankMap, showMapEditor } from "./app/editor/mapEditor.ts";
import { decodeMapCode } from "./app/editor/mapCode.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const host = document.querySelector<HTMLElement>("#hud")!;
const renderer = createRenderer(canvas);
const devices = { kb: createKeyboard(window), mouse: createMouse(canvas) };
const sfx = createSfx();

function menu(): void {
  renderer.clear();
  playMusic(sfx, "menu");
  showMenu(host, loadConfig() ?? defaultConfig(), { onStart: play, onOnline: online, onCampaign: campaign, onProfile: () => showProfile(host, menu), onSettings: () => showSettings(host, menu, () => applyVolumes(sfx)), onReplay: replayMenu, hasReplay: loadReplay() !== undefined, onEditor: () => editor(blankMap()) });
}

function campaign(): void {
  renderer.clear();
  startCampaign({ host, renderer, devices, sfx, onExit: menu });
}

function online(): void {
  renderer.clear();
  startOnline({ host, renderer, devices, sfx, onExit: menu });
}

function play(cfg: MatchConfig): void {
  saveConfig(cfg);
  host.innerHTML = "";
  startLocalMatch(cfg, renderer, devices, sfx, {
    onOver: (world, replay) => {
      if (replay) saveReplay(replay);
      showResults(host, world, {
        onRematch: () => play(cfg), onMenu: menu, xp: awardLocal(world),
        ...(replay ? { replay: { watch: () => watch(replay), download: () => downloadReplay(replay) } } : {}),
      });
    },
    onQuit: menu,
  });
}

function watch(r: Replay): void {
  host.innerHTML = "";
  watchReplay(r, { renderer, devices, sfx }, menu);
}

function editor(start: MapJson): void {
  renderer.clear();
  showMapEditor(host, start, {
    onBack: menu,
    // test drive: your usual setup, on this arena
    onTest: (m) => play({ ...(loadConfig() ?? defaultConfig()), map: m.id }),
  });
}

async function replayMenu(source: "last" | "file"): Promise<void> {
  const r = source === "last" ? loadReplay() : await pickReplayFile();
  if (r) watch(r);
  else if (source === "file") alert("That file isn't a Re-Tanx replay.");
}

const params = new URLSearchParams(location.search);
const signIn = takeSignInResult();
if (signIn) {
  renderer.clear();
  startOnline({ host, renderer, devices, sfx, onExit: menu }, signIn.ok ? undefined : signIn.error);
} else if (params.has("join")) online(); // invite link
else if (params.has("map")) {
  // shared arena link: open it in the editor (bad codes fall back to a blank map)
  const shared = decodeMapCode(params.get("map")!).map;
  history.replaceState(null, "", location.pathname);
  editor(shared ?? blankMap());
}
else if (params.has("quick")) play(loadConfig() ?? defaultConfig()); // skip the menu (dev + smoke tests)
else menu();
