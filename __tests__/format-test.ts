// Uji format tanggal dan jam yang tampil di kartu dan chip.
import { formatRentangJam, formatTanggal, formatTanggalSingkat, tanggalValid } from '@/utils/format';

describe('formatTanggal', () => {
  it('menampilkan hari, tanggal, bulan singkat, dan tahun', () => {
    expect(formatTanggal('2026-11-19')).toBe('Kamis, 19 Nov 2026');
    expect(formatTanggal('2026-11-22')).toBe('Minggu, 22 Nov 2026');
  });
});

describe('formatTanggalSingkat', () => {
  it('tanpa tahun, nama hari tiga huruf', () => {
    expect(formatTanggalSingkat('2026-11-19')).toBe('Kam, 19 Nov');
    expect(formatTanggalSingkat('2026-01-01')).toBe('Kam, 1 Jan');
  });

  it('teks yang bukan tanggal dikembalikan apa adanya', () => {
    expect(formatTanggalSingkat('bukan-tanggal')).toBe('bukan-tanggal');
  });
});

describe('formatRentangJam', () => {
  it('menggabungkan jam mulai dan selesai', () => {
    expect(formatRentangJam('08:00', '10:00')).toBe('08:00 - 10:00');
  });
});

describe('tanggalValid', () => {
  it('tanggal kalender yang benar → valid', () => {
    expect(tanggalValid('2026-11-30')).toBe(true);
    expect(tanggalValid('2028-02-29')).toBe(true);
  });

  it('salah ketik atau format lain → tidak valid', () => {
    expect(tanggalValid('2026-11-40')).toBe(false);
    expect(tanggalValid('2026-11-35')).toBe(false);
    expect(tanggalValid('2026-02-29')).toBe(false);
    expect(tanggalValid('22/11/2026')).toBe(false);
  });
});
