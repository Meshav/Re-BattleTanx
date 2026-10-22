// Rename/legal pass guard (docs README "Legal / IP note"): no original BattleTanx names in anything a player sees.
// Scans data/*.json string values and client source outside comments. Internal lowercase ids (battlelord, goliath…) are fine;
// docs/, README and CHANGES_LOG may name the originals because they describe the homage.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DENY = [/BattleTanx/i, /Queen ?lords?/i, /Tank Bucks/i, /Battlelord/, /Griffin Spade/, /\bMadison\b/, /\bCassandra\b/, /Storm Ravens/,
  /\bthe Edge\b/i, /\bEdge(born)?\b/, /\bGoliath\b/, /\bMoto ?Tank\b/i, /\bMOTO\b|\bGOLIATH\b/, /\b3DO\b/];

const walk = (dir, ext) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (f === "node_modules" || f === "dist") return [];
  return statSync(p).isDirectory() ? walk(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : [];
});

const strings = (v, out = []) => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => k !== "_doc" && strings(x, out));
  return out;
};

const problems = [];
for (const file of walk("data", [".json"])) {
  for (const s of strings(JSON.parse(readFileSync(file, "utf8")))) {
    const hit = DENY.find((re) => re.test(s));
    if (hit) problems.push(`${file}: "${s.slice(0, 60)}" matches ${hit}`);
  }
}
for (const file of [...walk("packages/client/src", [".ts"]), "packages/client/index.html"].filter((f) => !f.endsWith(".test.ts"))) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*(\*|\/\*\*?).*$/, ""); // comments may say why
    const hit = DENY.find((re) => re.test(code));
    if (hit) problems.push(`${file}:${i + 1} matches ${hit}`);
  });
}
if (problems.length) {
  console.error(`Original-game names in player-facing text (rename them via data/names.json):\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("ip ok");
