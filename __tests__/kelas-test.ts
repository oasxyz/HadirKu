// Uji pengenalan kode kelas (A1–F2) dari teks kelas sesi lama.
import { DAFTAR_KELAS, kodeKelasDari } from '@/constants/kelas';

describe('kodeKelasDari', () => {
  it('mengenali kode baku dan variasi penulisan', () => {
    expect(kodeKelasDari('D1')).toBe('D1');
    expect(kodeKelasDari('d1')).toBe('D1');
    expect(kodeKelasDari('Kelas D1')).toBe('D1');
    expect(kodeKelasDari('kelas  c2')).toBe('C2');
  });

  it('teks bebas lama yang tidak cocok → null (harus dipilih ulang)', () => {
    expect(kodeKelasDari('kelas a')).toBeNull();
    expect(kodeKelasDari('Kelas A / Sesi 1')).toBeNull();
    expect(kodeKelasDari('G1')).toBeNull();
    expect(kodeKelasDari('')).toBeNull();
    expect(kodeKelasDari(undefined)).toBeNull();
  });

  it('daftar kelas A1 sampai F2, dua kelompok per huruf', () => {
    expect(DAFTAR_KELAS).toHaveLength(12);
    expect(DAFTAR_KELAS[0]).toBe('A1');
    expect(DAFTAR_KELAS[DAFTAR_KELAS.length - 1]).toBe('F2');
  });
});
