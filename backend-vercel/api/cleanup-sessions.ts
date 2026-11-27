// SRS4-04 (PIC B — Annis): pengarsipan sesi lama, dipanggil cron-job.org tiap 6 jam
// dengan header `x-cron-secret: <CRON_SECRET>`.
//
// Keputusan tim (28 Nov 2026): sesi DIARSIPKAN, bukan dihapus. Dokumen sessions diberi
// `diarsipkan: true` + `diarsipkanAt`, lalu Beranda menyembunyikannya. Catatan Kehadiran,
// Rekap, dan Dashboard tetap membaca sesi itu, jadi riwayat tidak hilang. Koleksi
// attendances, leaveRequests, fines, payments, dan notifications tidak disentuh.
//
// Sesi diarsipkan bila (SRS Sprint 4 poin 10 "Auto-Hapus Sesi Selesai"):
//   - status `ditutup` dan sudah ditutup lebih dari 24 jam, ATAU
//   - jamSelesai sesi sudah lewat lebih dari 24 jam (termasuk sesi yang lupa ditutup).

import type { VercelRequest, VercelResponse } from "@vercel/node";

import { adminDb } from "../lib/firebase-admin";

const BATAS_JAM = 24;
const MAKS_PER_BATCH = 450; // batas Firestore 500 tulis per batch
// Tanggal dan jam sesi ditulis dalam waktu Indonesia Barat; server Vercel berjalan di UTC.
const ZONA_WIB = "+07:00";

export type SesiUntukArsip = {
  status?: unknown;
  tanggal?: unknown;
  jamSelesai?: unknown;
  updatedAt?: unknown;
  diarsipkan?: unknown;
};

/** Waktu selesai sesi (tanggal + jamSelesai, WIB) dalam milidetik, atau null bila tidak valid. */
export function waktuSelesaiMs(sesi: SesiUntukArsip): number | null {
  if (typeof sesi.tanggal !== "string" || typeof sesi.jamSelesai !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sesi.tanggal) || !/^\d{2}:\d{2}$/.test(sesi.jamSelesai)) return null;
  const ms = Date.parse(`${sesi.tanggal}T${sesi.jamSelesai}:00${ZONA_WIB}`);
  return Number.isNaN(ms) ? null : ms;
}

/** updatedAt bisa string ISO (aplikasi) atau Timestamp Firestore (serverTimestamp). */
function keMs(nilai: unknown): number | null {
  if (typeof nilai === "string") {
    const ms = Date.parse(nilai);
    return Number.isNaN(ms) ? null : ms;
  }
  if (nilai && typeof nilai === "object" && "toMillis" in nilai && typeof nilai.toMillis === "function") {
    const ms: unknown = nilai.toMillis();
    return typeof ms === "number" ? ms : null;
  }
  return null;
}

export function perluDiarsipkan(sesi: SesiUntukArsip, sekarangMs: number): boolean {
  if (sesi.diarsipkan === true) return false;
  const batas = sekarangMs - BATAS_JAM * 60 * 60 * 1000;

  const selesai = waktuSelesaiMs(sesi);
  if (selesai !== null && selesai < batas) return true;

  if (sesi.status === "ditutup") {
    const ditutup = keMs(sesi.updatedAt);
    if (ditutup !== null && ditutup < batas) return true;
  }
  return false;
}

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

  try {
    const db = adminDb();
    const sekarang = Date.now();
    const snap = await db.collection("sessions").get();
    const target = snap.docs.filter((d) => perluDiarsipkan(d.data() as SesiUntukArsip, sekarang));

    const waktu = new Date(sekarang).toISOString();
    for (let i = 0; i < target.length; i += MAKS_PER_BATCH) {
      const batch = db.batch();
      target.slice(i, i + MAKS_PER_BATCH).forEach((d) => {
        batch.update(d.ref, { diarsipkan: true, diarsipkanAt: waktu });
      });
      await batch.commit();
    }

    console.log(`[cleanup-sessions] ${target.length} sesi diarsipkan dari ${snap.size}`);
    return res.status(200).json({ archived: target.length, checked: snap.size });
  } catch (err) {
    console.error("[cleanup-sessions] gagal", err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
