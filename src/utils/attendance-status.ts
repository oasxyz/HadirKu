import type {
  Attendance,
  FinalAttendanceStatus,
  LeaveRequest,
  Session,
} from '@/types';
import { normalizeLeaveCategory } from '@/types';
import { sesiSudahBerakhir } from '@/utils/sesi';

/**
 * Hitung status akhir seorang praktikan pada satu sesi.
 * Prioritas:
 *   1. Ada di attendances → 'hadir'
 *   2. Ada leaveRequest status='diterima' kategori sakit → 'sakit'
 *   3. Ada leaveRequest status='diterima' kategori izin (atau null/lainnya) → 'izin'
 *   4. Sesi belum ditutup / belum lewat jamSelesai+15 → 'belum_hadir'
 *   5. Selain itu → 'alpha'
 */
export function computeFinalStatus(
  session: Session,
  userId: string,
  attendances: Attendance[],
  leaveRequests: LeaveRequest[],
  now: Date = new Date(),
): FinalAttendanceStatus {
  const hadir = attendances.some(
    (a) => a.sessionId === session.id && a.userId === userId,
  );
  if (hadir) return 'hadir';

  const izinDiterima = leaveRequests.find(
    (lr) =>
      lr.sessionId === session.id &&
      lr.userId === userId &&
      lr.status === 'diterima',
  );
  if (izinDiterima) {
    const kategori = normalizeLeaveCategory(izinDiterima.kategoriAi);
    return kategori === 'sakit' ? 'sakit' : 'izin';
  }

  const sesiTutup = session.status === 'ditutup' || sesiSudahBerakhir(session, now);
  if (!sesiTutup) return 'belum_hadir';

  return 'alpha';
}

/** Ringkasan jumlah status untuk kartu cincin. */
export interface StatusSummary {
  hadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  belum_hadir: number;
  total: number;
}

export function summarizeStatuses(
  rows: { status: FinalAttendanceStatus }[],
): StatusSummary {
  const summary: StatusSummary = {
    hadir: 0,
    sakit: 0,
    izin: 0,
    alpha: 0,
    belum_hadir: 0,
    total: rows.length,
  };
  for (const r of rows) {
    summary[r.status] += 1;
  }
  return summary;
}