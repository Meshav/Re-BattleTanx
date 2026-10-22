import graybox from "../../../../data/maps/graybox.json";
import fortress from "../../../../data/maps/fortress.json";
import neon from "../../../../data/maps/neon.json";
import bay from "../../../../data/maps/bay.json";
import plains from "../../../../data/maps/plains.json";
import type { MapJson } from "./map.ts";

/** Versus arenas (doc 08 §8.2). Campaign maps live inside their missions. */
export const versusMaps: MapJson[] = [graybox, fortress, neon, bay, plains];
export const mapById = (id: string): MapJson => versusMaps.find((m) => m.id === id) ?? graybox;
