import type { WebSocket } from "ws";
import type { GangId, PerkId, Profile, ServerMsg } from "@re-tanx/sim";

/** One connected browser. */
export interface Client {
  id: number; ws: WebSocket; name: string; gang: GangId;
  lobby: string | undefined;
  /** timestamps (ms) of recent input messages, for rate limiting */
  inputTimes: number[];
  /** same, for every other message (lobby, hello, ping) */
  ctrlTimes: number[];
  /** guest profile id + server-side profile (the server, not the client, awards XP) */
  profileId: string | undefined;
  profile: Profile | undefined;
  perks: PerkId[];
  /** resolves once hello has identified this player (rejoin needs the profile id) */
  ready?: Promise<void>;
}

export function send(c: Client, msg: ServerMsg): void {
  if (c.ws.readyState === c.ws.OPEN) c.ws.send(JSON.stringify(msg));
}
