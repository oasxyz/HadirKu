// Uji aturan waktu sesi: jam operasional lab dan larangan memilih waktu yang sudah lewat.
import {
  batasKeputusanIzin,
  JAM_BUKA_LAB,
  JAM_TUTUP_LAB,
  jendelaBukaSesi,
  masihBolehPutuskanIzin,
  validasiWaktuSesi,
} from '@/utils/waktu-sesi';

// Minggu, 22 Nov 2026 pukul 14:30 waktu perangkat.
const SEKARANG = new Date(2026, 10, 22, 14, 30);
const sesi = (tanggal: string, jamMulai: string, jamSelesai: string) => ({ tanggal, jamMulai, jamSelesai });

describe('validasiWaktuSesi: sesi baru', () => {
  it('besok dalam jam operasional → boleh', () => {
    expect(validasiWaktuSesi(sesi('2026-11-23', '08:00', '10:00'), SEKARANG)).toBeNull();
  });

  it('hari ini setelah jam sekarang → boleh', () => {
    expect(validasiWaktuSesi(sesi('2026-11-22', '15:00', '17:00'), SEKARANG)).toBeNull();
  });

  it('hari ini sebelum jam sekarang → ditolak', () => {
    expect(validasiWaktuSesi(sesi('2026-11-22', '13:00', '15:00'), SEKARANG)).toMatch(/sudah lewat/);
  });

  it('tanggal kemarin → ditolak', () => {
    expect(validasiWaktuSesi(sesi('2026-11-21', '08:00', '10:00'), SEKARANG)).toMatch(/Tanggal sesi sudah lewat/);
  });

  it('jam selesai tidak lebih lambat dari jam mulai → ditolak', () => {
    expect(validasiWaktuSesi(sesi('2026-11-23', '10:00', '10:00'), SEKARANG)).toMatch(/Jam selesai/);
    expect(validasiWaktuSesi(sesi('2026-11-23', '12:00', '10:00'), SEKARANG)).toMatch(/Jam selesai/);
  });

  it(`di luar jam operasional ${JAM_BUKA_LAB}–${JAM_TUTUP_LAB} → ditolak`, () => {
    expect(validasiWaktuSesi(sesi('2026-11-23', '06:30', '08:30'), SEKARANG)).toMatch(/jam operasional/);
    expect(validasiWaktuSesi(sesi('2026-11-23', '19:30', '21:30'), SEKARANG)).toMatch(/jam operasional/);
  });

  it('tepat di batas jam operasional → boleh', () => {
    expect(validasiWaktuSesi(sesi('2026-11-23', JAM_BUKA_LAB, JAM_TUTUP_LAB), SEKARANG)).toBeNull();
  });
});

describe('validasiWaktuSesi: mengubah sesi', () => {
  const semula = sesi('2026-11-22', '13:00', '15:00');

  it('sesi yang sedang berjalan boleh diperpanjang tanpa mengubah jam mulai', () => {
    expect(validasiWaktuSesi(sesi('2026-11-22', '13:00', '16:00'), SEKARANG, semula)).toBeNull();
  });

  it('jam mulai dipindah ke waktu yang sudah lewat → ditolak', () => {
    expect(validasiWaktuSesi(sesi('2026-11-22', '12:00', '15:00'), SEKARANG, semula)).toMatch(/sudah lewat/);
  });

  it('jam operasional tetap berlaku saat mengubah', () => {
    expect(validasiWaktuSesi(sesi('2026-11-22', '13:00', '22:00'), SEKARANG, semula)).toMatch(/jam operasional/);
  });
});

describe('jendelaBukaSesi', () => {
  const sesiPagi = { tanggal: '2026-11-22', jamMulai: '08:00', jamSelesai: '10:00' };
  const pada = (jam: number, menit: number, tanggal = 22) => new Date(2026, 10, tanggal, jam, menit);

  it('mulai 15 menit sebelum jam mulai sampai sebelum jam selesai → boleh', () => {
    expect(jendelaBukaSesi(sesiPagi, pada(7, 45)).boleh).toBe(true);
    expect(jendelaBukaSesi(sesiPagi, pada(9, 59)).boleh).toBe(true);
  });

  it('lebih awal dari 15 menit sebelum mulai → belum waktunya', () => {
    const hasil = jendelaBukaSesi(sesiPagi, pada(7, 44));
    expect(hasil).toMatchObject({ boleh: false, alasan: 'belum_waktunya' });
    if (!hasil.boleh) expect(hasil.bukaMulai).toEqual(pada(7, 45));
  });

  it('hari sebelumnya → belum waktunya', () => {
    expect(jendelaBukaSesi(sesiPagi, pada(9, 0, 21))).toMatchObject({ boleh: false, alasan: 'belum_waktunya' });
  });

  it('jam selesai atau sesudahnya → sudah lewat', () => {
    expect(jendelaBukaSesi(sesiPagi, pada(10, 0))).toMatchObject({ boleh: false, alasan: 'sudah_lewat' });
    expect(jendelaBukaSesi(sesiPagi, pada(9, 0, 23))).toMatchObject({ boleh: false, alasan: 'sudah_lewat' });
  });

  it('sesi jam 07:00 bisa dibuka mulai 06:45', () => {
    expect(jendelaBukaSesi({ ...sesiPagi, jamMulai: '07:00' }, pada(6, 45)).boleh).toBe(true);
  });
});

describe('batas keputusan izin H+3', () => {
  it('batasnya akhir hari ketiga setelah tanggal sesi', () => {
    expect(batasKeputusanIzin('2026-11-20')).toEqual(new Date(2026, 10, 23, 23, 59, 59));
    expect(batasKeputusanIzin('2026-11-30')).toEqual(new Date(2026, 11, 3, 23, 59, 59));
  });

  it('masih boleh sampai batas, setelahnya tidak', () => {
    expect(masihBolehPutuskanIzin('2026-11-20', new Date(2026, 10, 20, 9, 0))).toBe(true);
    expect(masihBolehPutuskanIzin('2026-11-20', new Date(2026, 10, 23, 23, 59))).toBe(true);
    expect(masihBolehPutuskanIzin('2026-11-20', new Date(2026, 10, 24, 0, 0))).toBe(false);
  });

  it('tanpa tanggal sesi tidak dibatasi', () => {
    expect(masihBolehPutuskanIzin(undefined, new Date(2030, 0, 1))).toBe(true);
  });
});
