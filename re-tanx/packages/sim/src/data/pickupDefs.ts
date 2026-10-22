import raw from "../../../../data/pickups.json";

export type PickupKind = Exclude<keyof typeof raw, "radius">;
export const pickupDefs = raw;
