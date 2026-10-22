/** On-screen twin sticks + buttons for phones/tablets. Left half: move. Right half: aim (push hard to fire). */
export interface Touch { lx: number; ly: number; rx: number; ry: number; fire: boolean; special: boolean; next: boolean; camera: boolean; el: HTMLElement }

const RADIUS = 60;

export function createTouch(host: HTMLElement): Touch {
  const el = document.createElement("div");
  el.className = "touch";
  el.innerHTML = `<div class="zone left" data-zone="l"><i class="knob"></i></div><div class="zone right" data-zone="r"><i class="knob"></i></div>
    <div class="tbtns"><button data-b="special" aria-label="Special">SP</button><button data-b="next" aria-label="Next special">⟳</button>
    <button data-b="camera" aria-label="Camera">◎</button><button data-b="fire" class="fire" aria-label="Fire">FIRE</button></div>`;
  host.appendChild(el);
  const t: Touch = { lx: 0, ly: 0, rx: 0, ry: 0, fire: false, special: false, next: false, camera: false, el };
  el.querySelectorAll<HTMLElement>("[data-zone]").forEach((z) => stick(t, z, z.dataset.zone === "l"));
  el.querySelectorAll<HTMLButtonElement>("[data-b]").forEach((b) => {
    const key = b.dataset.b as "fire" | "special" | "next" | "camera";
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); t[key] = true; });
    b.addEventListener("pointerup", () => { if (key === "fire" || key === "special") t[key] = false; });
    b.addEventListener("pointerleave", () => { if (key === "fire" || key === "special") t[key] = false; });
  });
  return t;
}

function stick(t: Touch, zone: HTMLElement, left: boolean): void {
  const knob = zone.querySelector<HTMLElement>(".knob")!;
  let id: number | undefined, ox = 0, oy = 0;
  const set = (x: number, y: number) => {
    const len = Math.hypot(x, y), k = len > RADIUS ? RADIUS / len : 1;
    const nx = (x * k) / RADIUS, ny = (y * k) / RADIUS;
    if (left) { t.lx = nx; t.ly = ny; } else { t.rx = nx; t.ry = ny; }
    knob.style.transform = `translate(${nx * RADIUS}px, ${ny * RADIUS}px)`;
  };
  zone.addEventListener("pointerdown", (e) => {
    id = e.pointerId; ox = e.clientX; oy = e.clientY;
    zone.setPointerCapture(e.pointerId);
    Object.assign(knob.style, { left: `${ox - zone.getBoundingClientRect().left}px`, top: `${oy - zone.getBoundingClientRect().top}px`, opacity: "1" });
  });
  zone.addEventListener("pointermove", (e) => { if (e.pointerId === id) set(e.clientX - ox, e.clientY - oy); });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = undefined;
    set(0, 0);
    knob.style.opacity = "0.4";
  };
  zone.addEventListener("pointerup", end);
  zone.addEventListener("pointercancel", end);
}

/** Read-and-clear the one-shot buttons. */
export function takeTap(t: Touch, key: "next" | "camera"): boolean {
  const v = t[key];
  t[key] = false;
  return v;
}
