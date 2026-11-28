// SRS4-04: tujuan deep link notifikasi dan kriteria arsip sesi oleh cron Vercel.
import { tipeNotifikasiValid, tujuanNotifikasi } from '@/utils/tujuan-notifikasi';

// Endpoint Vercel mengimpor Admin SDK; cukup uji fungsi murninya.
jest.mock('../backend-vercel/lib/firebase-admin', () => ({ adminDb: jest.fn() }));
// eslint-disable-next-line import/first
import { perluDiarsipkan, waktuSelesaiMs } from '../backend-vercel/api/cleanup-sessions';

describe('tujuanNotifikasi', () => {
  it('sesi dibuka dan jadwal berubah → detail sesi', () => {
    expect(tujuanNotifikasi({ type: 'sesi_dibuka', sessionId: 's1' })).toBe('/jadwal/s1');
    expect(tujuanNotifikasi({ type: 'jadwal_berubah', sessionId: 's1' })).toBe('/jadwal/s1');
    expect(tujuanNotifikasi({ type: 'sesi_dibuka' })).toBe('/jadwal');
  });

  it('izin → tab Izin, kelas → Profil', () => {
    expect(tujuanNotifikasi({ type: 'izin_diterima' })).toBe('/izin');
    expect(tujuanNotifikasi({ type: 'izin_ditolak' })).toBe('/izin');
    expect(tujuanNotifikasi({ type: 'kelas_diterima' })).toBe('/profil');
    expect(tujuanNotifikasi({ type: 'kelas_dipindah_aslab' })).toBe('/profil');
  });

  it('tagihan → detail tagihan, pembayaran → riwayat pembayaran', () => {
    expect(tujuanNotifikasi({ type: 'tagihan_baru', fineId: 'f1' })).toBe('/tagihan/f1');
    expect(tujuanNotifikasi({ type: 'tagihan_dibatalkan', fineId: 'f1' })).toBe('/tagihan/f1');
    expect(tujuanNotifikasi({ type: 'tagihan_jatuh_tempo' })).toBe('/pembayaran');
    expect(tujuanNotifikasi({ type: 'pembayaran_sukses' })).toBe('/pembayaran');
    expect(tujuanNotifikasi({ type: 'pembayaran_gagal' })).toBe('/pembayaran');
  });

  it('tipe tidak dikenal → Beranda', () => {
    expect(tujuanNotifikasi({ type: 'aneh' })).toBe('/jadwal');
    expect(tujuanNotifikasi({ type: null })).toBe('/jadwal');
  });

  it('validasi tipe', () => {
    expect(tipeNotifikasiValid('tagihan_baru')).toBe(true);
    expect(tipeNotifikasiValid('lainnya')).toBe(false);
  });
});

describe('perluDiarsipkan (cron cleanup-sessions)', () => {
  // 28 Nov 2026 10.00 WIB = 03.00 UTC.
  const SEKARANG = Date.parse('2026-11-28T10:00:00+07:00');

  it('membaca tanggal dan jam selesai sebagai WIB', () => {
    expect(waktuSelesaiMs({ tanggal: '2026-11-27', jamSelesai: '10:00' })).toBe(
      Date.parse('2026-11-27T03:00:00Z'),
    );
    expect(waktuSelesaiMs({ tanggal: '2026-11-40', jamSelesai: '10:00' })).toBeNull();
  });

  it('jam selesai lewat lebih dari 24 jam → diarsipkan, termasuk yang lupa ditutup', () => {
    expect(perluDiarsipkan({ status: 'dibuka', tanggal: '2026-11-27', jamSelesai: '09:59' }, SEKARANG)).toBe(true);
    expect(perluDiarsipkan({ status: 'belum_dibuka', tanggal: '2026-11-26', jamSelesai: '15:00' }, SEKARANG)).toBe(true);
  });

  it('belum 24 jam → tetap', () => {
    expect(perluDiarsipkan({ status: 'ditutup', tanggal: '2026-11-27', jamSelesai: '12:00', updatedAt: '2026-11-27T04:00:00Z' }, SEKARANG)).toBe(false);
  });

  it('ditutup lebih dari 24 jam lalu → diarsipkan (jam selesai tidak terbaca)', () => {
    expect(perluDiarsipkan({ status: 'ditutup', updatedAt: '2026-11-26T08:00:00Z' }, SEKARANG)).toBe(true);
    const timestamp = { toMillis: () => Date.parse('2026-11-26T08:00:00Z') };
    expect(perluDiarsipkan({ status: 'ditutup', updatedAt: timestamp }, SEKARANG)).toBe(true);
  });

  it('sudah diarsipkan → dilewati', () => {
    expect(perluDiarsipkan({ diarsipkan: true, status: 'ditutup', tanggal: '2026-11-01', jamSelesai: '10:00' }, SEKARANG)).toBe(false);
  });
});
