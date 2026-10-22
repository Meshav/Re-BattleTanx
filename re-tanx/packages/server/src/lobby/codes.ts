import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to read aloud

export function newCode(taken: (code: string) => boolean, length = 5): string {
  for (;;) {
    const code = Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    if (!taken(code)) return code;
  }
}
