import { TOLERANSI_TUTUP_MENIT } from '@/constants/sesi';
import type { Session } from '@/types';

export function getBatasTutupSesi(
  session: Pick<Session, 'tanggal' | 'jamSelesai'>,
): Date {
  const [year, month, day] = session.tanggal.split('-').map(Number);
  const [endHour, endMin] = session.jamSelesai.split(':').map(Number);
  return new Date(year, month - 1, day, endHour, endMin + TOLERANSI_TUTUP_MENIT);
}

export function sesiSudahBerakhir(
  session: Pick<Session, 'tanggal' | 'jamSelesai'>,
  sekarang: Date = new Date(),
): boolean {
  return sekarang.getTime() >= getBatasTutupSesi(session).getTime();
}