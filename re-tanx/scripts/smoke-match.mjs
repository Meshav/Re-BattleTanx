// Plays one short online match against bots through a running deployment, waits for the server's XP award, then checks match history.
// Usage: node scripts/smoke-match.mjs ws://localhost:24873/ws
import { WebSocket } from "ws";

const url = process.argv[2] ?? "ws://localhost:24873/ws";
const ws = new WebSocket(url);
const seen = new Set();
let seq = 0, timer, token;
const send = (m) => ws.send(JSON.stringify(m));
const fail = (why) => { console.error("FAIL:", why); process.exit(1); };
setTimeout(() => fail("no award within 150 s"), 150_000);
ws.on("message", (d) => {
  const m = JSON.parse(String(d));
  seen.add(m.t);
  if (m.t === "welcome") { send({ t: "hello", name: "Smoke", gang: "ironHounds" }); send({ t: "create", settings: { mode: "deathmatch", scoreLimit: 1, bots: 3, difficulty: "hard", teams: "ffa", map: "graybox" } }); }
  if (m.t === "identity") token = m.token;
  if (m.t === "lobby" && !timer) { send({ t: "start" }); }
  if (m.t === "start") timer = setInterval(() => send({ t: "input", seq: ++seq, input: { throttle: 1, steer: Math.sin(seq / 25), aim: seq / 40, fire: seq % 6 === 0 } }), 33);
  if (m.t === "progress") {
    console.log(`ok: match finished, award ${m.result.award.total} XP; replay received: ${seen.has("replay")}`);
    // the match should now be in this player's history
    setTimeout(async () => {
      const http = url.replace(/^ws/, "http").replace(/\/ws$/, "");
      const rows = await (await fetch(`${http}/history`, { headers: { authorization: `Bearer ${token}` } })).json();
      console.log(`ok: history has ${rows.length} match(es); latest: ${rows[0]?.mode} on ${rows[0]?.mapId}, place ${rows[0]?.place + 1}`);
      process.exit(rows.length ? 0 : 1);
    }, 500);
  }
});
ws.on("error", (e) => fail(e.message));
