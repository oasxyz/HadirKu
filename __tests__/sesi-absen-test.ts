// SRS4-03: sesi yang dibuka tombol Absen melayang praktikan.
import type { Attendance, Session } from '@/types';
import { pilihSesiAbsen } from '@/utils/sesi-absen';

const SEKARANG = new Date(2026, 10, 26, 9, 0);

function sesi(id: string, over: Partial<Session> = {}): Session {
  return {
    id,
    praktikum: 'Basis Data',
    labId: 'b',
    kelasLab: 'D1',
    tanggal: '2026-11-26',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    asistenId: 'asp',
    pesertaIds: ['saya'],
    status: 'dibuka',
    ...over,
  };
}
const hadir = (sessionId: string): Attendance => ({ id: `${sessionId}_saya`, sessionId, userId: 'saya', waktuPresensi: '' });

describe('pilihSesiAbsen', () => {
  it('tidak ada sesi dibuka → tidak_ada', () => {
    expect(pilihSesiAbsen([sesi('a', { status: 'belum_dibuka' })], [], 'saya', SEKARANG)).toEqual({ status: 'tidak_ada' });
  });

  it('bukan peserta atau sesi sudah lewat batas tutup → tidak_ada', () => {
    const lain = sesi('a', { pesertaIds: ['orang-lain'] });
    const lewat = sesi('b', { tanggal: '2026-11-25' });
    expect(pilihSesiAbsen([lain, lewat], [], 'saya', SEKARANG).status).toBe('tidak_ada');
  });

  it('sesi dibuka yang belum dipresensi → siap', () => {
    const hasil = pilihSesiAbsen([sesi('a')], [], 'saya', SEKARANG);
    expect(hasil).toMatchObject({ status: 'siap', session: { id: 'a' } });
  });

  it('mengutamakan sesi yang belum dipresensi', () => {
    const hasil = pilihSesiAbsen([sesi('a'), sesi('b', { jamMulai: '08:30' })], [hadir('b')], 'saya', SEKARANG);
    expect(hasil).toMatchObject({ status: 'siap', session: { id: 'a' } });
  });

  it('semua sesi aktif sudah dipresensi → sudah_hadir', () => {
    expect(pilihSesiAbsen([sesi('a')], [hadir('a')], 'saya', SEKARANG)).toMatchObject({
      status: 'sudah_hadir',
      session: { id: 'a' },
    });
  });

  it('beberapa sesi aktif → jam mulai terdekat dengan sekarang', () => {
    const hasil = pilihSesiAbsen(
      [sesi('jauh', { jamMulai: '07:00' }), sesi('dekat', { jamMulai: '08:50' })],
      [],
      'saya',
      SEKARANG,
    );
    expect(hasil).toMatchObject({ status: 'siap', session: { id: 'dekat' } });
  });
});
