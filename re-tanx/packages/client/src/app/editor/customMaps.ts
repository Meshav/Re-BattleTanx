import { checkMap, mapById, versusMaps, type MapJson } from "@re-tanx/sim";

const KEY = "re-tanx:maps";

/** Player-made arenas saved in this browser (re-validated on load: storage is editable). */
export function loadCustomMaps(): MapJson[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown[];
    return Array.isArray(raw) ? raw.flatMap((m) => checkMap(m).map ?? []) : [];
  } catch {
    return [];
  }
}

export function saveCustomMap(m: MapJson): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify([m, ...loadCustomMaps().filter((k) => k.id !== m.id && k.name !== m.name)]));
    return true;
  } catch {
    return false;
  }
}

export function deleteCustomMap(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadCustomMaps().filter((k) => k.id !== id)));
  } catch {
    // blocked storage: nothing to delete
  }
}

/** Built-in arenas, then yours. */
export const allArenas = (): MapJson[] => [...versusMaps, ...loadCustomMaps()];
export const customMap = (id: string | undefined): MapJson | undefined => (id?.startsWith("c-") ? loadCustomMaps().find((m) => m.id === id) : undefined);
export const arenaFor = (id: string | undefined): MapJson => customMap(id) ?? mapById(id ?? "graybox");
