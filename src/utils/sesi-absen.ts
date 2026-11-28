// SRS4-03 (PIC B — Annis): sesi mana yang dibuka tombol "Absen" melayang di tab bar praktikan.
// SRS 2 poin 8: tombol langsung membuka kamera presensi untuk sesi yang sedang `dibuka` dan
// praktikan menjadi pesertanya. Jika tidak ada sesi aktif, tombol nonaktif ("Tidak ada sesi aktif").
import type { Attendance, Session } from '@/types';
import { sesiSudahBerakhir } from '@/utils/sesi';

export type SesiAbsen =
  | { status: 'siap'; session: Session }
  | { status: 'sudah_hadir'; session: Session }
  | { status: 'tidak_ada' };

function waktuMulai(s: Session): number {
  const [y, m, d] = s.tanggal.split('-').map(Number);
  const [jam, menit] = s.jamMulai.split(':').map(Number);
  return new Date(y, m - 1, d, jam, menit).getTime();
}

/**
 * Pilih sesi untuk tombol Absen:
 * 1. Hanya sesi `dibuka`, belum lewat batas tutup, dan praktikan termasuk peserta.
 * 2. Utamakan sesi yang belum dipresensi; bila ada beberapa, yang jam mulainya paling dekat
 *    dengan sekarang (aturan sesi tidak boleh bentrok membuat ini jarang terjadi).
 * 3. Bila semua sesi aktif sudah dipresensi, kembalikan `sudah_hadir` supaya tombol bisa
 *    menunjukkan bahwa praktikan sudah absen.
 */
export function pilihSesiAbsen(
  sessions: Session[],
  attendances: Attendance[],
  userId: string,
  sekarang: Date = new Date(),
): SesiAbsen {
  const t = sekarang.getTime();
  const aktif = sessions
    .filter((s) => s.status === 'dibuka' && s.pesertaIds.includes(userId) && !sesiSudahBerakhir(s, sekarang))
    .sort((a, b) => Math.abs(waktuMulai(a) - t) - Math.abs(waktuMulai(b) - t));

  if (aktif.length === 0) return { status: 'tidak_ada' };

  const sudah = new Set(attendances.filter((a) => a.userId === userId).map((a) => a.sessionId));
  const belum = aktif.find((s) => !sudah.has(s.id));
  return belum ? { status: 'siap', session: belum } : { status: 'sudah_hadir', session: aktif[0] };
}
