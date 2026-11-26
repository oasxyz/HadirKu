// Verifikasi Firebase ID token dari header Authorization.
// Dipakai di setiap API route yang butuh autentikasi (midtrans-create, refresh-fine-status).
// Client kirim token lewat header: `Authorization: Bearer <firebaseIdToken>`.

import type { VercelRequest } from "@vercel/node";

import { adminAuth } from "./firebase-admin";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Mengembalikan uid praktikan yang terotentikasi, atau melempar AuthError. */
export async function verifyIdToken(req: VercelRequest): Promise<string> {
  const header = req.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    throw new AuthError("Authorization header kosong atau format salah.");
  }
  try {
    const decoded = await adminAuth().verifyIdToken(match[1]);
    return decoded.uid;
  } catch (err) {
    throw new AuthError(
      "ID token tidak valid atau kadaluarsa: " + (err as Error).message,
    );
  }
}

/** CORS preflight + izinkan origin dari env. Dipanggil di awal setiap handler. */
export function applyCors(req: VercelRequest, res: import("@vercel/node").VercelResponse): boolean {
  const origin = process.env.ALLOWED_ORIGIN ?? "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,x-cron-secret");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
