import { settings } from "../settings/settings.ts";

const NORMAL = [0x3a7bd5, 0xd5463a, 0x4caf50, 0xf2c230];
/** Okabe–Ito: distinguishable with the common colour-vision deficiencies. */
const SAFE = [0x0072b2, 0xe69f00, 0x009e73, 0xcc79a7];
const NAMES_NORMAL = ["Blue", "Red", "Green", "Yellow"];
const NAMES_SAFE = ["Blue", "Orange", "Teal", "Pink"];

export const teamColor = (team: number): number => (settings().colorblind ? SAFE : NORMAL)[team % 4]!;
export const teamCss = (team: number): string => `#${teamColor(team).toString(16).padStart(6, "0")}`;
export const teamName = (team: number): string => (settings().colorblind ? NAMES_SAFE : NAMES_NORMAL)[team % 4]!;
