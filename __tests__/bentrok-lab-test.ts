// Uji aturan: satu lab tidak boleh dipakai dua sesi pada jam yang tumpang tindih.
import type { Session } from '@/types';
import { cariBentrokLab } from '@/utils/bentrok-lab';

function sesi(data: Partial<Session>): Session {
  return {
    id: 'ada',
    praktikum: 'Basis Data',
    kelasLab: 'D1',
    labId: 'lab-b',
    tanggal: '2026-11-22',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    asistenId: 'asisten-lain',
    pesertaIds: [],
    status: 'belum_dibuka',
    ...data,
  };
}

const rencana = (jamMulai: string, jamSelesai: string, lain: Partial<Session> = {}) => ({
  labId: 'lab-b',
  tanggal: '2026-11-22',
  jamMulai,
  jamSelesai,
  ...lain,
});

describe('cariBentrokLab', () => {
  const ada = [sesi({})];

  it('jam tumpang tindih di lab dan tanggal sama → bentrok', () => {
    expect(cariBentrokLab(ada, rencana('11:00', '13:00'))?.id).toBe('ada');
    expect(cariBentrokLab(ada, rencana('09:00', '10:30'))?.id).toBe('ada');
    expect(cariBentrokLab(ada, rencana('10:30', '11:30'))?.id).toBe('ada');
    expect(cariBentrokLab(ada, rencana('08:00', '14:00'))?.id).toBe('ada');
  });

  it('sesi bersambung tidak bentrok', () => {
    expect(cariBentrokLab(ada, rencana('12:00', '14:00'))).toBeNull();
    expect(cariBentrokLab(ada, rencana('08:00', '10:00'))).toBeNull();
  });

  it('lab lain atau tanggal lain tidak bentrok', () => {
    expect(cariBentrokLab(ada, rencana('10:00', '12:00', { labId: 'lab-c' }))).toBeNull();
    expect(cariBentrokLab(ada, rencana('10:00', '12:00', { tanggal: '2026-11-23' }))).toBeNull();
  });

  it('sesi yang sedang diubah tidak dihitung bentrok dengan dirinya sendiri', () => {
    expect(cariBentrokLab(ada, rencana('10:30', '12:30'), 'ada')).toBeNull();
  });

  it('beberapa bentrok → yang paling awal', () => {
    const banyak = [sesi({ id: 'siang', jamMulai: '13:00', jamSelesai: '15:00' }), sesi({ id: 'pagi' })];
    expect(cariBentrokLab(banyak, rencana('11:00', '14:00'))?.id).toBe('pagi');
  });

  it('tanpa lab tidak dicek', () => {
    expect(cariBentrokLab(ada, rencana('10:00', '12:00', { labId: undefined }))).toBeNull();
  });
});
