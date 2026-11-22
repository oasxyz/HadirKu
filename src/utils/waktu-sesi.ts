// Aturan waktu saat membuat/mengubah sesi praktikum.
// - Sesi hanya boleh dalam jam operasional lab (lihat JAM_BUKA_LAB / JAM_TUTUP_LAB).
// - Tidak boleh dijadwalkan di waktu yang sudah lewat.
// - Saat mengubah sesi, aturan "sudah lewat" hanya dicek bila tanggal/jam mulai diganti,
//   supaya sesi yang sedang berjalan tetap bisa diperbarui (mis. memperpanjang jam selesai).

/** Jam operasional lab sesuai jadwal resmi: slot paling awal 07.30, paling akhir selesai 20.15. */
export const JAM_BUKA_LAB = '07:00';
export const JAM_TUTUP_LAB = '21:00';

export type WaktuSesi = { tanggal: string; jamMulai: string; jamSelesai: string };

function tanggalLokal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function jamLokal(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Pesan kesalahan, atau null bila waktu sesi boleh dipakai. Format jam HH:mm, tanggal YYYY-MM-DD. */
export function validasiWaktuSesi(
  rencana: WaktuSesi,
  sekarang: Date = new Date(),
  semula?: WaktuSesi,
): string | null {
  const { tanggal, jamMulai, jamSelesai } = rencana;

  if (jamMulai >= jamSelesai) return 'Jam selesai harus lebih lambat dari jam mulai';
  if (jamMulai < JAM_BUKA_LAB || jamSelesai > JAM_TUTUP_LAB) {
    return `Sesi harus berada di jam operasional lab, ${JAM_BUKA_LAB}–${JAM_TUTUP_LAB}`;
  }

  const waktuBerubah =
    !semula || semula.tanggal !== tanggal || semula.jamMulai !== jamMulai;
  if (!waktuBerubah) return null;

  const hariIni = tanggalLokal(sekarang);
  if (tanggal < hariIni) return 'Tanggal sesi sudah lewat. Pilih hari ini atau tanggal berikutnya';
  if (tanggal === hariIni && jamMulai < jamLokal(sekarang)) {
    return `Jam mulai sudah lewat. Pilih jam setelah ${jamLokal(sekarang)}`;
  }
  return null;
}

/** Sesi boleh dibuka mulai sekian menit sebelum jam mulai, sampai jam selesai. */
export const MENIT_BUKA_LEBIH_AWAL = 15;

export type JendelaBuka =
  | { boleh: true }
  | { boleh: false; alasan: 'belum_waktunya' | 'sudah_lewat'; bukaMulai: Date };

/** Apakah tombol Buka Sesi boleh dipakai sekarang (hanya di tanggal sesi, mulai −15 menit s.d. jam selesai). */
export function jendelaBukaSesi(
  sesi: WaktuSesi,
  sekarang: Date = new Date(),
): JendelaBuka {
  const [y, m, d] = sesi.tanggal.split('-').map(Number);
  const [jm, mm] = sesi.jamMulai.split(':').map(Number);
  const [js, ms] = sesi.jamSelesai.split(':').map(Number);
  const bukaMulai = new Date(y, m - 1, d, jm, mm - MENIT_BUKA_LEBIH_AWAL);
  const selesai = new Date(y, m - 1, d, js, ms);
  if (sekarang < bukaMulai) return { boleh: false, alasan: 'belum_waktunya', bukaMulai };
  if (sekarang >= selesai) return { boleh: false, alasan: 'sudah_lewat', bukaMulai };
  return { boleh: true };
}

/** Asisten bisa memutuskan izin sampai akhir hari H+3 dari tanggal sesi. */
export const BATAS_HARI_KEPUTUSAN_IZIN = 3;

/** Batas akhir keputusan izin: pukul 23:59:59 pada tanggal sesi + 3 hari (waktu perangkat). */
export function batasKeputusanIzin(tanggalSesi: string): Date {
  const [y, m, d] = tanggalSesi.split('-').map(Number);
  return new Date(y, m - 1, d + BATAS_HARI_KEPUTUSAN_IZIN, 23, 59, 59);
}

export function masihBolehPutuskanIzin(tanggalSesi: string | undefined, sekarang: Date = new Date()): boolean {
  // Tanpa data sesi (mis. sesi terhapus) tidak dibatasi supaya izin tidak terkunci tanpa alasan.
  if (!tanggalSesi) return true;
  return sekarang <= batasKeputusanIzin(tanggalSesi);
}
