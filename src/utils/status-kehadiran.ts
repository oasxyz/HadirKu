// SRS3-04 (PIC B — Annis): status akhir kehadiran praktikan per sesi.
// Dipakai Rekap Asisten; Catatan Praktikan (PIC C) bisa memakai fungsi yang sama.
import { normalizeLeaveCategory } from '@/types';
import type { Attendance, FinalAttendanceStatus, LeaveRequest, Session } from '@/types';
import { sesiSudahBerakhir } from '@/utils/sesi';

/**
 * Sesi dianggap selesai bila sudah ditutup, atau masih `dibuka` tetapi sudah lewat
 * jamSelesai + toleransi. Sesi yang tidak pernah dibuka (`belum_dibuka`) tidak dianggap
 * selesai walaupun jamnya lewat: praktikan memang tidak bisa presensi, jadi tidak dihitung Alpha.
 */
export function sesiSelesai(
  session: Pick<Session, 'status' | 'tanggal' | 'jamSelesai'>,
  sekarang: Date = new Date(),
): boolean {
  if (session.status === 'ditutup') return true;
  if (session.status === 'dibuka') return sesiSudahBerakhir(session, sekarang);
  return false;
}

/**
 * Urutan prioritas: Hadir → izin diterima (Sakit / Izin) → Alpha (sesi selesai) → Belum Hadir.
 * Izin `menunggu` atau `ditolak` tidak mengubah status; setelah izin diterima, Alpha otomatis
 * berubah menjadi Sakit/Izin karena status dihitung ulang dari data terbaru.
 */
export function hitungStatusKehadiran(
  session: Pick<Session, 'id' | 'status' | 'tanggal' | 'jamSelesai'>,
  userId: string,
  attendances: Attendance[],
  leaveRequests: LeaveRequest[],
  sekarang: Date = new Date(),
): FinalAttendanceStatus {
  const sudahHadir = attendances.some(
    (item) => item.sessionId === session.id && item.userId === userId,
  );
  if (sudahHadir) return 'hadir';

  // Data Sprint 2 memakai auto ID, jadi satu praktikan bisa punya lebih dari satu dokumen izin.
  const izinDiterima = leaveRequests.find(
    (item) =>
      item.sessionId === session.id && item.userId === userId && item.status === 'diterima',
  );
  if (izinDiterima) {
    // Kategori kosong (AI gagal) dihitung sebagai Izin.
    return normalizeLeaveCategory(izinDiterima.kategoriAi) === 'sakit' ? 'sakit' : 'izin';
  }

  return sesiSelesai(session, sekarang) ? 'alpha' : 'belum_hadir';
}

export type RingkasanKehadiran = Record<FinalAttendanceStatus, number>;

export function ringkasKehadiran(statuses: FinalAttendanceStatus[]): RingkasanKehadiran {
  const ringkasan: RingkasanKehadiran = { hadir: 0, sakit: 0, izin: 0, alpha: 0, belum_hadir: 0 };
  statuses.forEach((status) => {
    ringkasan[status] += 1;
  });
  return ringkasan;
}
