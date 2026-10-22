import type { MapJson } from "../data/map.ts";
import type { Replay } from "../replay/replay.ts";
import type { InputState } from "../input.ts";
import type { GangId } from "../data/gangDefs.ts";
import type { Difficulty } from "../data/aiDefs.ts";
import type { ModeKind } from "../modes/mode.ts";
import type { SimEvent } from "../events.ts";
import type { Snapshot } from "./snapshot.ts";
import type { PerkId } from "../progression/perks.ts";
import type { MatchResult, Profile } from "../progression/profile.ts";

/** Wire types shared by client and server (doc 12 §12.3). JSON for now. */

export interface LobbySettings { mode: ModeKind; scoreLimit: number; bots: number; difficulty: Difficulty; teams: "ffa" | "coop"; perks: boolean; map: string; ranked: boolean; /** listed for quick match; auto-starts */ public: boolean; /** a player-made arena (validated by checkMap); `map` is its id */ customMap?: MapJson }
export interface LobbyMember { id: number; name: string; gang: GangId; host: boolean }

export type ClientMsg =
  | { t: "hello"; name: string; gang: GangId; token?: string; perks?: PerkId[] }
  | { t: "create"; settings: LobbySettings }
  | { t: "join"; code: string }
  /** back into a running match after a dropped connection (same player token, within the grace period) */
  | { t: "rejoin"; code: string }
  /** join the fullest open public lobby, or open one */
  | { t: "quick" }
  | { t: "settings"; settings: LobbySettings }
  | { t: "gang"; gang: GangId }
  | { t: "start" }
  | { t: "leave" }
  | { t: "input"; seq: number; input: InputState; /** server tick the client's screen showed (lag compensation) */ view?: number }
  | { t: "ping"; at: number };

export type ServerMsg =
  | { t: "welcome"; playerId: number }
  | { t: "identity"; token: string; profile: Profile }
  | { t: "progress"; result: MatchResult }
  | { t: "lobby"; code: string; members: LobbyMember[]; settings: LobbySettings; /** public lobbies: seconds until it starts by itself */ startsIn?: number }
  | { t: "start"; mapId: string; tankId: number; seed: number; mode: ModeKind; map?: MapJson }
  | { t: "snap"; ack: number; snap: Snapshot; events: SimEvent[] }
  | { t: "replay"; replay: Replay }
  | { t: "ended" }
  | { t: "error"; message: string }
  | { t: "pong"; at: number };

export const PROTOCOL_LIMITS = { maxMessageBytes: 4096, maxInputsPerSecond: 90, codeLength: 5, maxNameLength: 16, maxPlayers: 8, maxControlPerSecond: 20, maxLobbies: 500, rejoinGraceMs: 60_000 } as const;
