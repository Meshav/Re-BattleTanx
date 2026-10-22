// Enforces doc 12's structural rules without a full ESLint setup.
// shortcut: line/regex checks only; move to ESLint (max-lines, no-restricted-imports, import/no-cycle) when CI is added
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const MAX_LINES = 250;
const BANNED_NAMES = /(^|\/)(utils|helpers|misc|common|types)\.ts$/;
const SIM_BANNED = /from\s+["'](three|ws|node:[^"']+|fs|path)["']|\b(window|document|process)\./;

const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (f === "node_modules" || f === "dist") return [];
  return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") ? [p] : [];
});

const problems = [];
for (const file of files("packages")) {
  const rel = relative(".", file);
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n").length;
  if (lines > MAX_LINES) problems.push(`${rel}: ${lines} lines (max ${MAX_LINES})`);
  if (BANNED_NAMES.test(rel)) problems.push(`${rel}: grab-bag file name — split by concept`);
  if (/export\s+default/.test(src) && !rel.endsWith("vite.config.ts")) problems.push(`${rel}: default export — use named exports`);
  if (rel.startsWith("packages/sim/") && SIM_BANNED.test(src)) problems.push(`${rel}: sim must not touch three/ws/DOM/Node`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("rules ok");
