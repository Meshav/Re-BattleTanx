import type { Vec2 } from "../math/vec2.ts";
import type { StructureKind } from "./rules.ts";
import type { PickupKind } from "./pickupDefs.ts";

export interface MapJson { id: string; name: string; cell: number; rows: string[] }
export interface MapCellStructure { kind: StructureKind; cx: number; cy: number }
/** `hidden`: a cache buried under the building on the same cell — only collectable once it's rubble. */
export interface MapPickup { kind: PickupKind; pos: Vec2; random: boolean; hidden: boolean }
export interface GameMap {
  id: string; name: string; cell: number; cols: number; rows: number;
  structures: MapCellStructure[]; spawns: Vec2[]; pickups: MapPickup[];
  /** index = team */
  fortresses: Vec2[];
  /** campaign markers */
  enemySpawns: Vec2[]; reach: Vec2[]; captives: Vec2[]; extraction: Vec2[];
  /** runners escape through 'O'; 'u' = fixed enemy gun emplacement */
  exits: Vec2[]; enemyTurrets: Vec2[];
  /** campaign: pre-laid enemy mines ("m") */
  enemyMines: Vec2[];
  /** '~' cells: block tanks (not hovers), never block shots */
  water: boolean[];
}

const STRUCTURE_CHARS: Record<string, StructureKind> = { "#": "building", w: "wall", T: "target", C: "building" };
const FORTRESS_CHARS = "abcd";
const PICKUP_CHARS: Record<string, PickupKind> = { H: "health", D: "shield", A: "ammo", G: "guided", R: "swarm", M: "mine", N: "nuke", "*": "guided", $: "bucks", C: "bucks",
  L: "laser", P: "plasma", U: "turret", K: "shock", V: "cloak", F: "speed", J: "teleport", Y: "repair", Z: "edge" };
const MARKERS = { e: "enemySpawns", X: "reach", Q: "captives", E: "extraction", O: "exits", u: "enemyTurrets", m: "enemyMines" } as const;

export function parseMap(json: MapJson): GameMap {
  const structures: MapCellStructure[] = [];
  const spawns: Vec2[] = [];
  const pickups: MapPickup[] = [];
  const fortresses: Vec2[] = [];
  const marks = { enemySpawns: [] as Vec2[], reach: [] as Vec2[], captives: [] as Vec2[], extraction: [] as Vec2[], exits: [] as Vec2[], enemyTurrets: [] as Vec2[], enemyMines: [] as Vec2[] };
  const cols0 = Math.max(...json.rows.map((r) => r.length));
  const water = new Array<boolean>(cols0 * json.rows.length).fill(false);
  json.rows.forEach((row, cy) => {
    [...row].forEach((ch, cx) => {
      const centre = { x: (cx + 0.5) * json.cell, y: (cy + 0.5) * json.cell };
      const kind = STRUCTURE_CHARS[ch];
      if (kind) structures.push({ kind, cx, cy });
      if (ch === "S") spawns.push(centre);
      const pk = PICKUP_CHARS[ch];
      if (pk) pickups.push({ kind: pk, pos: centre, random: ch === "*", hidden: ch === "C" });
      const mark = MARKERS[ch as keyof typeof MARKERS];
      if (mark) marks[mark].push(centre);
      if (ch === "~") water[cy * cols0 + cx] = true;
      const team = FORTRESS_CHARS.indexOf(ch);
      if (team >= 0) fortresses[team] = centre;
    });
  });
  const cols = Math.max(...json.rows.map((r) => r.length));
  return { id: json.id, name: json.name, cell: json.cell, cols, rows: json.rows.length, structures, spawns, pickups, fortresses: fortresses.filter(Boolean), ...marks, water };
}
