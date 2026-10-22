import { RUBBLE, type Tank, type World } from "@re-tanx/sim";
import { PICKUP_STYLE } from "../render/views/pickupView.ts";
import { BEACON_CSS } from "../render/views/beaconView.ts";

import { teamCss } from "../render/teamColors.ts";
const SIZE = 180;

/** Top-down radar: buildings, live pickups, tanks (original: radar always on in multiplayer). */
export function drawMinimap(canvas: HTMLCanvasElement, world: World, me: Tank): void {
  const g = canvas.getContext("2d");
  if (!g) return;
  const { cols, rows, cell } = world.map;
  const s = SIZE / Math.max(cols, rows);
  canvas.width = Math.ceil(cols * s);
  canvas.height = Math.ceil(rows * s);
  g.fillStyle = "rgba(20,20,16,.85)";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#2e5f7a";
  world.map.water.forEach((w, i) => w && g.fillRect((i % cols) * s, Math.floor(i / cols) * s, s, s));
  for (const st of world.structures) {
    g.fillStyle = st.stage === RUBBLE ? "#3d3a33" : st.stage === 1 ? "#6b6152" : "#9c8f7a";
    g.fillRect(st.cx * s, st.cy * s, s, s);
  }
  const k = s / cell;
  for (const p of world.pickups) {
    if (!p.active) continue;
    g.fillStyle = `#${PICKUP_STYLE[p.kind].color.toString(16).padStart(6, "0")}`;
    g.fillRect(p.pos.x * k - 1.5, p.pos.y * k - 1.5, 3, 3);
  }
  for (const n of world.nukes) dot(g, n.pos.x * k, n.pos.y * k, 5, "#ff2a2a");
  if (world.campaign) {
    for (const p of world.map.reach) ring(g, p.x * k, p.y * k, BEACON_CSS.reach);
    for (const p of world.map.extraction) ring(g, p.x * k, p.y * k, BEACON_CSS.extract);
    for (const st of world.structures) if (st.kind === "target" && st.stage < 2) { g.fillStyle = "#e8483b"; g.fillRect(st.cx * s, st.cy * s, s, s); }
  }
  if (world.zone) {
    g.strokeStyle = world.zone.holder >= 0 ? teamCss(world.zone.holder) : "#ffffff";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(world.zone.pos.x * k, world.zone.pos.y * k, world.zone.radius * k, 0, Math.PI * 2);
    g.stroke();
  }
  if (world.queens.length) world.map.fortresses.forEach((f, team) => {
    g.strokeStyle = teamCss(team);
    g.lineWidth = 2;
    g.strokeRect(f.x * k - 5, f.y * k - 5, 10, 10);
  });
  for (const q of world.queens) diamond(g, q.pos.x * k, q.pos.y * k, q.team < 0 ? "#d86bff" : teamCss(q.team));
  for (const t of world.tanks) {
    if (!t.alive) continue;
    dot(g, t.pos.x * k, t.pos.y * k, t === me ? 4 : 3, teamCss(t.team));
    if (t === me) dot(g, t.pos.x * k, t.pos.y * k, 1.5, "#fff");
  }
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function diamond(g: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  g.fillStyle = color;
  g.strokeStyle = "#ffd34a";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, y - 4);
  g.lineTo(x + 3, y);
  g.lineTo(x, y + 4);
  g.lineTo(x - 3, y);
  g.closePath();
  g.fill();
  g.stroke();
}

function ring(g: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, 6, 0, Math.PI * 2);
  g.stroke();
}
