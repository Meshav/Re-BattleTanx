import type { Tokens } from "./auth/guestToken.ts";
import type { ProfileStore } from "./persist/profileStore.ts";

/** Long-lived server dependencies, passed down explicitly (no module globals). */
export interface Services { tokens: Tokens; store: ProfileStore }
