// Uji aturan status kehadiran (SRS3-04): Hadir, Sakit, Izin, Alpha, Belum Hadir.
import type { Attendance, LeaveRequest, Session } from '@/types';
import { getBatasTutupSesi, sesiSudahBerakhir } from '@/utils/sesi';
import { hitungStatusKehadiran, ringkasKehadiran, sesiSelesai } from '@/utils/status-kehadiran';

const UID = 'praktikan-1';

function sesi(status: Session['status'], tanggal = '2026-11-20', jamSelesai = '10:00') {
  return { id: 'sesi-1', status, tanggal, jamSelesai };
}

function hadir(sessionId = 'sesi-1', userId = UID): Attendance {
  return { id: `${sessionId}_${userId}`, sessionId, userId, waktuPresensi: '2026-11-20T01:05:00.000Z' };
}

function izin(
  status: LeaveRequest['status'],
  kategoriAi: LeaveRequest['kategoriAi'],
  userId = UID,
): LeaveRequest {
  return {
    id: `sesi-1_${userId}`,
    sessionId: 'sesi-1',
    userId,
    alasan: 'Alasan uji',
    kategoriAi,
    status,
    createdAt: '2026-11-19T12:00:00.000Z',
    diputuskanOleh: status === 'menunggu' ? null : 'Asisten',
    diputuskanAt: status === 'menunggu' ? null : '2026-11-20T00:00:00.000Z',
  };
}

// Jam lokal perangkat, sama seperti cara aplikasi menghitung.
const SEBELUM_SELESAI = new Date(2026, 10, 20, 9, 30);
const DALAM_TOLERANSI = new Date(2026, 10, 20, 10, 14);
const LEWAT_TOLERANSI = new Date(2026, 10, 20, 10, 15);

describe('batas tutup sesi', () => {
  it('jamSelesai ditambah toleransi 15 menit', () => {
    expect(getBatasTutupSesi({ tanggal: '2026-11-20', jamSelesai: '10:00' })).toEqual(
      new Date(2026, 10, 20, 10, 15),
    );
  });

  it('melewati tengah malam tetap benar', () => {
    expect(getBatasTutupSesi({ tanggal: '2026-11-20', jamSelesai: '23:50' })).toEqual(
      new Date(2026, 10, 21, 0, 5),
    );
  });

  it('belum berakhir selama masih dalam toleransi', () => {
    const s = { tanggal: '2026-11-20', jamSelesai: '10:00' };
    expect(sesiSudahBerakhir(s, DALAM_TOLERANSI)).toBe(false);
    expect(sesiSudahBerakhir(s, LEWAT_TOLERANSI)).toBe(true);
  });
});

describe('sesiSelesai', () => {
  it('sesi ditutup selalu selesai', () => {
    expect(sesiSelesai(sesi('ditutup'), SEBELUM_SELESAI)).toBe(true);
  });

  it('sesi dibuka selesai setelah lewat jamSelesai + toleransi', () => {
    expect(sesiSelesai(sesi('dibuka'), DALAM_TOLERANSI)).toBe(false);
    expect(sesiSelesai(sesi('dibuka'), LEWAT_TOLERANSI)).toBe(true);
  });

  it('sesi yang tidak pernah dibuka tidak pernah dianggap selesai', () => {
    expect(sesiSelesai(sesi('belum_dibuka'), new Date(2026, 11, 31))).toBe(false);
  });
});

describe('hitungStatusKehadiran', () => {
  it('presensi tercatat → Hadir, walaupun ada izin', () => {
    expect(
      hitungStatusKehadiran(sesi('ditutup'), UID, [hadir()], [izin('diterima', 'sakit')], LEWAT_TOLERANSI),
    ).toBe('hadir');
  });

  it('izin sakit diterima → Sakit', () => {
    expect(hitungStatusKehadiran(sesi('ditutup'), UID, [], [izin('diterima', 'sakit')])).toBe('sakit');
  });

  it('izin biasa diterima → Izin', () => {
    expect(hitungStatusKehadiran(sesi('ditutup'), UID, [], [izin('diterima', 'izin')])).toBe('izin');
  });

  it('kategori Sprint 2 (keluarga/akademik/lainnya) dan kategori kosong dihitung Izin', () => {
    for (const kategori of ['keluarga', 'akademik', 'lainnya', null] as const) {
      expect(hitungStatusKehadiran(sesi('ditutup'), UID, [], [izin('diterima', kategori)])).toBe('izin');
    }
  });

  it('izin ditolak dan tidak hadir setelah sesi selesai → Alpha', () => {
    expect(
      hitungStatusKehadiran(sesi('ditutup'), UID, [], [izin('ditolak', 'izin')], LEWAT_TOLERANSI),
    ).toBe('alpha');
  });

  it('izin masih menunggu dan sesi selesai → Alpha', () => {
    expect(
      hitungStatusKehadiran(sesi('ditutup'), UID, [], [izin('menunggu', 'sakit')], LEWAT_TOLERANSI),
    ).toBe('alpha');
  });

  it('sesi masih dibuka dan belum presensi → Belum Hadir', () => {
    expect(hitungStatusKehadiran(sesi('dibuka'), UID, [], [], SEBELUM_SELESAI)).toBe('belum_hadir');
  });

  it('sesi dibuka tapi lewat toleransi → Alpha walau status belum ditutup', () => {
    expect(hitungStatusKehadiran(sesi('dibuka'), UID, [], [], LEWAT_TOLERANSI)).toBe('alpha');
  });

  it('sesi tidak pernah dibuka → tetap Belum Hadir, bukan Alpha', () => {
    expect(hitungStatusKehadiran(sesi('belum_dibuka'), UID, [], [], new Date(2026, 11, 31))).toBe(
      'belum_hadir',
    );
  });

  it('data milik praktikan lain atau sesi lain tidak ikut dihitung', () => {
    const lain = [hadir('sesi-1', 'praktikan-2'), hadir('sesi-2', UID)];
    const izinLain = [izin('diterima', 'sakit', 'praktikan-2')];
    expect(hitungStatusKehadiran(sesi('ditutup'), UID, lain, izinLain, LEWAT_TOLERANSI)).toBe('alpha');
  });

  it('beberapa dokumen izin (data Sprint 2): yang diterima dipakai', () => {
    const daftar = [izin('ditolak', 'izin'), { ...izin('diterima', 'sakit'), id: 'auto-id-2' }];
    expect(hitungStatusKehadiran(sesi('ditutup'), UID, [], daftar, LEWAT_TOLERANSI)).toBe('sakit');
  });
});

describe('ringkasKehadiran', () => {
  it('menghitung tiap status, termasuk yang nol', () => {
    expect(ringkasKehadiran(['hadir', 'hadir', 'sakit', 'alpha'])).toEqual({
      hadir: 2,
      sakit: 1,
      izin: 0,
      alpha: 1,
      belum_hadir: 0,
    });
  });

  it('daftar kosong → semua nol', () => {
    expect(ringkasKehadiran([])).toEqual({ hadir: 0, sakit: 0, izin: 0, alpha: 0, belum_hadir: 0 });
  });
});
