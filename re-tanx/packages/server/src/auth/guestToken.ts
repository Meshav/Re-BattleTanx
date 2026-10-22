import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Guest identity: "<id>.<hmac>". Anyone holding the token is that guest; nobody can forge one without the secret.
 * Signing in with Discord/Google (auth/oauth.ts) ends in a token for the linked player id, so both paths look the same here.
 */
export interface Tokens { issue(): { id: string; token: string }; issueFor(id: string): string; verify(token: unknown): string | undefined }

export function createTokens(secret: string): Tokens {
  const sign = (id: string) => createHmac("sha256", secret).update(id).digest("base64url").slice(0, 32);
  return {
    issue() {
      const id = randomBytes(9).toString("base64url");
      return { id, token: `${id}.${sign(id)}` };
    },
    issueFor: (id) => `${id}.${sign(id)}`,
    verify(token) {
      if (typeof token !== "string" || token.length > 80) return undefined;
      const [id, mac] = token.split(".");
      if (!id || !mac || !/^[\w-]+$/.test(id)) return undefined;
      const want = Buffer.from(sign(id));
      const got = Buffer.from(mac);
      return want.length === got.length && timingSafeEqual(want, got) ? id : undefined;
    },
  };
}
