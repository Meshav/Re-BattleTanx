import { checkMap, type MapJson } from "@re-tanx/sim";

/** Share code: base64url of name + rows. */
export function encodeMapCode(m: MapJson): string {
  const bytes = new TextEncoder().encode(JSON.stringify([m.name, m.rows]));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeMapCode(code: string): ReturnType<typeof checkMap> {
  try {
    const bin = atob(code.trim().replace(/-/g, "+").replace(/_/g, "/"));
    const [name, rows] = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as [unknown, unknown];
    return checkMap({ name, rows });
  } catch {
    return { map: undefined, problems: ["That isn't a map code"] };
  }
}
