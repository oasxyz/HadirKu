// SRS4-04 (PIC B — Annis). STUB sebelum Annis isi.
//
// Dipanggil cron-job.org tiap 6 jam dengan header `x-cron-secret: <CRON_SECRET>`.
// Fungsi: hapus dokumen sessions yang sudah ditutup lebih dari 24 jam.
// Log presensi (attendances), denda (fines), dan pembayaran (payments) TETAP DISIMPAN.
//
// TODO SRS4-04:
//   1. Hitung cutoff = now - 24 jam
//   2. Query sessions where status == 'ditutup' AND updatedAt < cutoff
//   3. Batch delete (batas 500/batch) sampai habis
//   4. Return { deleted: number }

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Hanya GET (biar gampang dipanggil cron-job.org) atau POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secretHeader = req.headers["x-cron-secret"];
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return res.status(500).json({ error: "CRON_SECRET belum di-set di Vercel." });
  }
  if (secretHeader !== expected) {
    return res.status(401).json({ error: "Invalid cron secret" });
  }

  console.log("[STUB] cleanup-sessions - not yet implemented");
  return res.status(200).json({ stub: true, deleted: 0 });
}
