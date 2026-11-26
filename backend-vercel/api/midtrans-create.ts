// SRS4-07 (PIC C — Yustinus). STUB sebelum Yustinus isi.
//
// Request (client aplikasi):
//   POST /api/midtrans-create
//   Authorization: Bearer <firebaseIdToken>
//   Body: { fineId: string }
//
// Response:
//   { token: string, redirectUrl: string, orderId: string }
//
// TODO SRS4-07:
//   1. Load dokumen fines/{fineId}; cek resource.userId == auth uid
//   2. Snap.createTransaction({ transaction_details: { order_id, gross_amount } })
//   3. Tulis payments/{orderId} = { status: 'pending', ... }
//   4. Update fines/{fineId} = { midtransOrderId, snapToken, status: 'processing' }
//   5. Return { token, redirectUrl, orderId }

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

    console.log("[STUB] midtrans-create", { uid, fineId });
    return res.status(200).json({
      stub: true,
      token: "stub-snap-token",
      redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/stub-snap-token`,
      orderId: `stub-${fineId}-${Date.now()}`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    console.error("[midtrans-create] error", err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
