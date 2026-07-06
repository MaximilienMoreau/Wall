import { NextRequest } from "next/server";

/** Le token admin est envoyé par le client via ce header (jamais en query string). */
export function getAdminTokenFromRequest(req: NextRequest): string | null {
  return req.headers.get("x-admin-token");
}
