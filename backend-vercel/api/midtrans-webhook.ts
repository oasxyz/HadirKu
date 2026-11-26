// SRS4-07 (PIC C — Yustinus). STUB sebelum Yustinus isi.
//
// Request: POST dari Midtrans ke URL ini (lihat dashboard Midtrans > Settings > Payment Notification URL).
// Tidak pakai Authorization Bearer; pengamanan via signature verification.
//
// TODO SRS4-07:
//   1. Baca body: order_id, status_code, gross_amount, signature_key, transaction_status, payment_type
//   2. Verifikasi signature:
//      sha512(order_id + status_code + gross_amount + process.env.MIDTRANS_SERVER_KEY) == signature_key
//   3. Translate transaction_status ke FineStatus / PaymentStatus
//   4. Update payments/{order_id} (set status, settledAt, rawPayload)
//   5. Update fines/{fineId} (set status: 'paid' | 'failed' | 'expired')
//   6. Tulis notifications tipe 'pembayaran_sukses' / 'pembayaran_gagal' ke targetUserIds: [userId]
//   7. Return 200 OK dengan body JSON kosong (Midtrans retry kalau non-2xx)

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("[STUB] midtrans-webhook", {
    headers: req.headers,
    body: req.body,
  });

  return res.status(200).json({ stub: true, received: true });
}
