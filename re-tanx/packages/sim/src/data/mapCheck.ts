import type { MapJson } from "./map.ts";

/** What a player-made versus map may contain: ground, buildings, walls, water, spawns, fortresses and pickups. No campaign markers. */
export const EDITOR_TILES = ".#w~Sabcd" + "HDAGRMNLPUKVFJYZ*$";
export const MAP_LIMITS = { minCols: 12, maxCols: 40, minRows: 8, maxRows: 24, maxName: 24 } as const;

const SOLID = new Set(["#", "~"]); // walls are breachable; water stops non-hover tanks

/** Every open cell reachable from the first spawn (walls count as passable: they can be shot through). */
function reachableFrom(rows: string[], sx: number, sy: number): Set<number> {
  const cols = rows[0]!.length;
  const seen = new Set([sy * cols + sx]);
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x! + dx!, ny = y! + dy!;
      const ch = rows[ny]?.[nx];
      if (ch === undefined || SOLID.has(ch) || seen.has(ny * cols + nx)) continue;
      seen.add(ny * cols + nx);
      stack.push([nx, ny]);
    }
  }
  return seen;
}

/** Validate a player-made map (it crosses a trust boundary when shared or sent to the server). Returns the cleaned map or the problems. */
export function checkMap(v: unknown): { map: MapJson; problems: [] } | { map: undefined; problems: string[] } {
  const o = v as Partial<MapJson> | null;
  const problems: string[] = [];
  const rows = Array.isArray(o?.rows) && o.rows.every((r) => typeof r === "string") ? (o.rows as string[]) : [];
  const cols = rows[0]?.length ?? 0;
  if (rows.length < MAP_LIMITS.minRows || rows.length > MAP_LIMITS.maxRows || cols < MAP_LIMITS.minCols || cols > MAP_LIMITS.maxCols)
    problems.push(`Size must be ${MAP_LIMITS.minCols}–${MAP_LIMITS.maxCols} × ${MAP_LIMITS.minRows}–${MAP_LIMITS.maxRows}`);
  else if (rows.some((r) => r.length !== cols)) problems.push("Every row must be the same width");
  else if (rows.some((r) => [...r].some((ch) => !EDITOR_TILES.includes(ch)))) problems.push("Unknown tile");
  if (problems.length) return { map: undefined, problems };
  const spawns: [number, number][] = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === "S" && spawns.push([x, y])));
  if (spawns.length < 2) problems.push("Needs at least 2 spawn points (S)");
  for (const f of "abcd") if (rows.join("").split(f).length > 2) problems.push(`Only one fortress ${f}`);
  if (spawns.length) {
    const seen = reachableFrom(rows, spawns[0]![0], spawns[0]![1]);
    const cut = spawns.filter(([x, y]) => !seen.has(y * cols + x)).length;
    if (cut) problems.push(`${cut} spawn point${cut > 1 ? "s are" : " is"} cut off`);
  }
  if (problems.length) return { map: undefined, problems };
  const name = (typeof o?.name === "string" ? o.name.replace(/[^\p{L}\p{N} '_-]/gu, "").trim().slice(0, MAP_LIMITS.maxName) : "") || "Custom arena";
  return { map: { id: customMapId(rows), name, cell: 10, rows }, problems: [] };
}

/** Content-addressed id, so the same layout is the same map everywhere. */
export function customMapId(rows: string[]): string {
  let h = 2166136261;
  for (const ch of rows.join("|")) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `c-${(h >>> 0).toString(36)}`;
}
