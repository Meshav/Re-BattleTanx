import { PROTOCOL_LIMITS, legalGang, legalOracle, legalPerks, parseClientMsg, type ClientMsg } from "@re-tanx/sim";
import { send, type Client } from "./client.ts";
import { rateLimited, pushInput } from "./match/inputs.ts";
import { quickMatch } from "./lobby/quickMatch.ts";
import { setPaused } from "./match/match.ts";
import { createLobby, deployFor, joinLobby, leaveLobby, refreshMember, rejoinLobby, startLobby, updateSettings, type Lobbies } from "./lobby/lobbies.ts";

/** Every inbound message goes through parseClientMsg (the trust boundary) before anything acts on it. */
export function onMessage(ls: Lobbies, c: Client, raw: string): void {
  const msg = parseClientMsg(raw);
  if (!msg) return;
  const input = msg.t === "input";
  if (rateLimited(input ? c.inputTimes : c.ctrlTimes, Date.now(), input ? PROTOCOL_LIMITS.maxInputsPerSecond : PROTOCOL_LIMITS.maxControlPerSecond)) return;
  handle(ls, c, msg);
}

function handle(ls: Lobbies, c: Client, msg: ClientMsg): void {
  switch (msg.t) {
    case "hello":
      c.name = msg.name;
      c.gang = msg.gang;
      c.wingmen = msg.wingmen;
      c.ready = identify(ls, c, msg.token, msg.perks, msg.oracle).then(() => {
        c.gang = legalGang(c.profile!, msg.gang);
        refreshMember(ls, c);
      });
      c.ready.catch((e: unknown) => console.error("identify failed", e));
      return;
    case "gang":
      c.gang = c.profile ? legalGang(c.profile, msg.gang) : c.gang; // no hello yet: keep the starter gang
      return refreshMember(ls, c);
    case "create": return createLobby(ls, c, msg.settings);
    case "join": return joinLobby(ls, c, msg.code);
    case "quick": return quickMatch(ls, c);
    case "rejoin":
      return void (c.ready ?? Promise.resolve()).then(() => rejoinLobby(ls, c, msg.code), () => {});
    case "settings": return updateSettings(ls, c, msg.settings);
    case "start": return startLobby(ls, c);
    case "deploy": return deployFor(ls, c, msg.kind);
    case "leave": return leaveLobby(ls, c);
    case "ping": return send(c, { t: "pong", at: msg.at });
    case "pause": {
      const l = c.lobby ? ls.byCode.get(c.lobby) : undefined;
      if (l?.match && !l.settings.public && !l.settings.ranked && l.match.seats.some((s) => s.client === c)) setPaused(l.match, msg.on, c.name);
      return;
    }
    case "input": {
      const seat = c.lobby ? ls.byCode.get(c.lobby)?.match?.seats.find((s) => s.client === c) : undefined;
      if (seat) pushInput(seat.queue, msg.seq, msg.input, msg.view);
    }
  }
}

/** Known token → their profile; otherwise a fresh guest identity. Perks are trimmed to what that profile has unlocked. */
async function identify(ls: Lobbies, c: Client, token: string | undefined, perks: unknown, oracle: unknown): Promise<void> {
  const known = ls.svc.tokens.verify(token);
  const id = known ?? ls.svc.tokens.issue();
  const profileId = typeof id === "string" ? id : id.id;
  c.profileId = profileId;
  c.profile = await ls.svc.store.get(profileId);
  c.perks = legalPerks(c.profile, perks);
  c.oracle = legalOracle(c.profile, oracle);
  send(c, { t: "identity", token: typeof id === "string" ? token! : id.token, profile: c.profile });
}
