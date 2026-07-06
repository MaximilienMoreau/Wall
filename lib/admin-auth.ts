import { randomBytes, timingSafeEqual } from "crypto";

export function generateAdminToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Comparaison en temps constant pour éviter les attaques par mesure de timing. */
export function isValidAdminToken(provided: string | null | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
