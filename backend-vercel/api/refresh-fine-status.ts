// SRS4-07 (PIC C — Yustinus). STUB sebelum Yustinus isi.
//
// Request (client aplikasi, saat praktikan tekan "Refresh status" di halaman tagihan):
//   POST /api/refresh-fine-status
//   Authorization: Bearer <firebaseIdToken>
//   Body: { fineId: string }
//
// TODO SRS4-07:
//   1. Cek ownership (resource.userId == auth uid)
//   2. snap.transaction.status(fines/{fineId}.midtransOrderId)
//   3. Sinkronkan ke fines & payments (sama seperti webhook)
//   4. Return status terkini

import type { VercelRequest, VercelResponse } from "@vercel/node";

import { applyCors, AuthError, verifyIdToken } from "../lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const uid = await verifyIdToken(req);
    const { fineId } = (req.body ?? {}) as { fineId?: string };
    if (!fineId) {
      return res.status(400).json({ error: "fineId wajib diisi" });
    }
    console.log("[STUB] refresh-fine-status", { uid, fineId });
    return res.status(200).json({ stub: true, status: "pending" });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    console.error("[refresh-fine-status] error", err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
