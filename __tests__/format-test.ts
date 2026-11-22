// Uji format tanggal dan jam yang tampil di kartu dan chip.
import { formatRentangJam, formatTanggal, formatTanggalSingkat } from '@/utils/format';

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
