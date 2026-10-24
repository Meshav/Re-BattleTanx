import type { PickupKind } from "@re-tanx/sim";

/** Pictograms for pickup crates, drawn in a 100 × 100 box: white with a dark outline so they read on any tile colour. */
type Icon = (g: CanvasRenderingContext2D) => void;

const INK = "#15130e";
const TAU = Math.PI * 2;

/** Outline first, then fill: overlapping shapes merge into one silhouette. */
function ink(g: CanvasRenderingContext2D, p: Path2D): void {
  g.lineWidth = 7;
  g.lineJoin = "round";
  g.strokeStyle = INK;
  g.stroke(p);
  g.fillStyle = "#fff";
  g.fill(p);
}

const poly = (p: Path2D, pts: number[]): Path2D => {
  p.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i]!, pts[i + 1]!);
  p.closePath();
  return p;
};
const circle = (p: Path2D, x: number, y: number, r: number, ccw = false): Path2D => {
  p.moveTo(x + r, y);
  p.arc(x, y, r, 0, TAU, ccw);
  return p;
};
const dot = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  g.fillStyle = INK;
  g.fill(circle(new Path2D(), x, y, r));
};
const star = (p: Path2D, x: number, y: number, outer: number, inner: number, points = 5): Path2D =>
  poly(p, Array.from({ length: points * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / points, r = i % 2 ? inner : outer;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  }).flat());
const ROCKET = [0, -32, 7, -20, 7, 6, 14, 16, 7, 13, 7, 16, -7, 16, -7, 13, -14, 16, -7, 6, -7, -20];

function rocket(g: CanvasRenderingContext2D, x: number, y: number, angle: number, scale: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.scale(scale, scale);
  ink(g, poly(new Path2D(), ROCKET));
  g.restore();
}

function eye(): Path2D {
  const p = new Path2D();
  p.moveTo(12, 50);
  p.quadraticCurveTo(50, 12, 88, 50);
  p.quadraticCurveTo(50, 88, 12, 50);
  return p;
}

const ICONS: Record<PickupKind, Icon> = {
  health: (g) => { const p = new Path2D(); p.rect(38, 16, 24, 68); p.rect(16, 38, 68, 24); ink(g, p); },
  repair: (g) => {
    g.save(); g.translate(50, 54); g.rotate(-Math.PI / 4);
    const p = circle(new Path2D(), 0, -22, 16); p.rect(-6, -12, 12, 46); ink(g, p);
    g.fillStyle = INK; g.fillRect(-5, -42, 10, 16);
    g.restore();
  },
  shield: (g) => {
    const p = new Path2D();
    p.moveTo(50, 12); p.lineTo(84, 24); p.lineTo(84, 50); p.bezierCurveTo(84, 72, 68, 84, 50, 90); p.bezierCurveTo(32, 84, 16, 72, 16, 50); p.lineTo(16, 24); p.closePath();
    ink(g, p);
  },
  ammo: (g) => {
    const p = new Path2D();
    for (const x of [28, 50, 72]) { p.moveTo(x - 8, 84); p.lineTo(x - 8, 42); p.quadraticCurveTo(x - 8, 18, x, 14); p.quadraticCurveTo(x + 8, 18, x + 8, 42); p.lineTo(x + 8, 84); p.closePath(); }
    ink(g, p);
  },
  guided: (g) => {
    for (const [x, y] of [[20, 86], [28, 74], [34, 62]]) ink(g, circle(new Path2D(), x!, y!, 4));
    rocket(g, 60, 40, Math.PI / 4, 1.35);
  },
  swarm: (g) => { rocket(g, 28, 58, -0.45, 0.95); rocket(g, 72, 58, 0.45, 0.95); rocket(g, 50, 50, 0, 1.05); },
  mine: (g) => {
    const p = circle(new Path2D(), 50, 52, 22);
    for (let k = 0; k < 8; k++) circle(p, 50 + Math.cos((k * TAU) / 8) * 30, 52 + Math.sin((k * TAU) / 8) * 30, 6);
    ink(g, p);
    dot(g, 50, 52, 7);
  },
  nuke: (g) => {
    const p = circle(new Path2D(), 50, 52, 7);
    for (const a of [-90, 30, 150].map((d) => (d * Math.PI) / 180)) {
      p.moveTo(50 + Math.cos(a - 0.52) * 13, 52 + Math.sin(a - 0.52) * 13);
      p.arc(50, 52, 38, a - 0.52, a + 0.52);
      p.arc(50, 52, 13, a + 0.52, a - 0.52, true);
      p.closePath();
    }
    ink(g, p);
  },
  star: (g) => ink(g, star(new Path2D(), 50, 54, 40, 17)),
  bucks: (g) => {
    const teeth = Array.from({ length: 32 }, (_, i) => {
      const a = (i * TAU) / 32, r = Math.floor(i / 2) % 2 ? 26 : 36;
      return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
    }).flat();
    ink(g, poly(new Path2D(), teeth));
    dot(g, 50, 50, 10);
  },
  laser: (g) => { const p = new Path2D(); p.rect(8, 34, 18, 32); p.rect(22, 44, 50, 12); star(p, 78, 50, 18, 7, 6); ink(g, p); },
  plasma: (g) => {
    const p = circle(new Path2D(), 50, 50, 20);
    for (const a of [0.6, 2.7, 4.8]) circle(p, 50 + Math.cos(a) * 34, 50 + Math.sin(a) * 34, 6);
    ink(g, p);
  },
  turret: (g) => { const p = new Path2D(); p.rect(30, 28, 34, 24); p.rect(60, 34, 30, 9); p.rect(43, 50, 9, 18); poly(p, [26, 88, 47, 64, 69, 88]); ink(g, p); },
  shock: (g) => ink(g, poly(new Path2D(), [60, 8, 24, 56, 46, 56, 36, 92, 78, 40, 56, 40, 68, 8])),
  cloak: (g) => { ink(g, eye()); dot(g, 50, 50, 10); ink(g, poly(new Path2D(), [18, 76, 76, 18, 84, 26, 26, 84])); },
  speed: (g) => { const p = new Path2D(); for (const dx of [0, 26]) poly(p, [10 + dx, 20, 32 + dx, 20, 56 + dx, 50, 32 + dx, 80, 10 + dx, 80, 34 + dx, 50]); ink(g, p); },
  teleport: (g) => {
    const p = circle(new Path2D(), 50, 50, 38);
    circle(p, 50, 50, 26, true);
    poly(p, [50, 28, 64, 46, 56, 46, 56, 70, 44, 70, 44, 46, 36, 46]);
    ink(g, p);
  },
  edge: (g) => { ink(g, poly(new Path2D(), [50, 10, 86, 50, 50, 90, 14, 50])); ink(g, star(new Path2D(), 50, 50, 16, 7, 4)); dot(g, 50, 50, 5); },
  loot: (g) => {
    g.font = "bold 78px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 7;
    g.strokeStyle = INK;
    g.strokeText("?", 50, 56);
    g.fillStyle = "#fff";
    g.fillText("?", 50, 56);
  },
};

/** A 128 px crate face: tile colour, dark frame with a light bevel, pictogram in the middle. */
export function drawPickupFace(c: HTMLCanvasElement, kind: PickupKind, color: number): void {
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = INK;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  g.fillRect(8, 8, 112, 112);
  g.strokeStyle = "rgba(255,255,255,.45)";
  g.lineWidth = 3;
  g.strokeRect(12, 12, 104, 104);
  g.translate(14, 14);
  ICONS[kind](g);
}
