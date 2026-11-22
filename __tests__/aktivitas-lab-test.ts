// Uji logika Peta Laboratorium (SRS3-03): jarak, pengelompokan lab, aktivitas, jadwal harian.
import {
  aktivitasLab,
  jadwalLabPadaTanggal,
  jarakMeter,
  kelompokkanLab,
  namaGrup,
  namaLabSingkat,
  sedangBerlangsung,
} from '@/components/peta/aktivitas-lab';
import type { Lab, Session } from '@/types';

function lab(id: string, namaLab: string, latitude: number, longitude: number, deskripsi?: string): Lab {
  return { id, namaLab, latitude, longitude, radiusMeter: 50, deskripsi };
}

let urutan = 0;
function sesi(data: Partial<Session>): Session {
  urutan += 1;
  return {
    id: `sesi-${urutan}`,
    praktikum: 'Praktikum',
    kelasLab: 'Kelas A',
    labId: 'lab-b',
    tanggal: '2026-11-20',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    asistenId: 'asisten-1',
    pesertaIds: [],
    status: 'belum_dibuka',
    ...data,
  };
}

describe('jarakMeter', () => {
  it('titik yang sama berjarak nol', () => {
    const titik = { latitude: -7.049, longitude: 110.4415 };
    expect(jarakMeter(titik, titik)).toBe(0);
  });

  it('0,001 derajat lintang kira-kira 111 meter', () => {
    const jarak = jarakMeter({ latitude: -7.049, longitude: 110.44 }, { latitude: -7.05, longitude: 110.44 });
    expect(jarak).toBeGreaterThan(110);
    expect(jarak).toBeLessThan(112);
  });

  it('simetris', () => {
    const a = { latitude: -7.049, longitude: 110.4415 };
    const b = { latitude: -7.0502, longitude: 110.4398 };
    expect(jarakMeter(a, b)).toBeCloseTo(jarakMeter(b, a), 6);
  });
});

describe('nama lab', () => {
  it('menyingkat "Lab Informatika B" menjadi "Lab B"', () => {
    expect(namaLabSingkat('Lab Informatika B')).toBe('Lab B');
    expect(namaLabSingkat('Laboratorium Informatika C')).toBe('Lab C');
    expect(namaLabSingkat('Dekanat FSM')).toBe('Dekanat FSM');
  });
});

describe('kelompokkanLab dan namaGrup', () => {
  const labs = [
    lab('dekanat-fsm', 'Dekanat FSM', -7.049037, 110.441484),
    lab('lab-b', 'Lab Informatika B', -7.0502, 110.4398, 'Gedung E'),
    lab('lab-c', 'Lab Informatika C', -7.0502, 110.4398, 'Gedung E'),
    lab('lab-d', 'Lab Informatika D', -7.0502, 110.4398, 'Gedung E'),
  ];

  it('lab di titik yang sama digabung jadi satu marker', () => {
    const grup = kelompokkanLab(labs);
    expect(grup).toHaveLength(2);
    expect(grup[1].labs.map((l) => l.id)).toEqual(['lab-b', 'lab-c', 'lab-d']);
  });

  it('grup satu lab memakai nama lab, grup berdeskripsi sama memakai deskripsi', () => {
    const [dekanat, gedungE] = kelompokkanLab(labs);
    expect(namaGrup(dekanat)).toBe('Dekanat FSM');
    expect(namaGrup(gedungE)).toBe('Gedung E');
  });

  it('grup tanpa deskripsi yang sama memakai gabungan nama singkat', () => {
    const [grup] = kelompokkanLab([
      lab('lab-b', 'Lab Informatika B', -7.05, 110.44),
      lab('lab-c', 'Lab Informatika C', -7.05, 110.44, 'Lantai 2'),
    ]);
    expect(namaGrup(grup)).toBe('Lab B, Lab C');
  });
});

describe('sedangBerlangsung', () => {
  const jam9 = new Date(2026, 10, 20, 9, 0);

  it('sesi dibuka berlangsung sampai jamSelesai + toleransi', () => {
    const s = sesi({ status: 'dibuka' });
    expect(sedangBerlangsung(s, jam9)).toBe(true);
    expect(sedangBerlangsung(s, new Date(2026, 10, 20, 10, 10))).toBe(true);
    expect(sedangBerlangsung(s, new Date(2026, 10, 20, 10, 20))).toBe(false);
  });

  it('sesi belum dibuka dihitung berlangsung hanya di rentang jamnya', () => {
    const s = sesi({ status: 'belum_dibuka' });
    expect(sedangBerlangsung(s, jam9)).toBe(true);
    expect(sedangBerlangsung(s, new Date(2026, 10, 20, 10, 0))).toBe(false);
    expect(sedangBerlangsung(s, new Date(2026, 10, 20, 7, 59))).toBe(false);
  });

  it('sesi ditutup tidak pernah berlangsung', () => {
    expect(sedangBerlangsung(sesi({ status: 'ditutup' }), jam9)).toBe(false);
  });
});

describe('aktivitasLab', () => {
  const sekarang = new Date(2026, 10, 20, 9, 0);

  it('memisahkan sesi berlangsung dan sesi berikutnya di lab yang dipilih', () => {
    const berlangsung = sesi({ status: 'dibuka', jamMulai: '08:00', jamSelesai: '10:00' });
    const nanti = sesi({ jamMulai: '13:00', jamSelesai: '15:00' });
    const besok = sesi({ tanggal: '2026-11-21', jamMulai: '08:00' });
    const labLain = sesi({ labId: 'lab-c', status: 'dibuka' });
    const hasil = aktivitasLab([besok, nanti, berlangsung, labLain], 'lab-b', sekarang);
    expect(hasil.berlangsung.map((s) => s.id)).toEqual([berlangsung.id]);
    expect(hasil.berikutnya?.id).toBe(nanti.id);
  });

  it('tidak ada sesi → kosong', () => {
    expect(aktivitasLab([], 'lab-b', sekarang)).toEqual({ berlangsung: [], berikutnya: null });
  });

  it('sesi lampau yang belum dibuka tidak dianggap berikutnya', () => {
    const kemarin = sesi({ tanggal: '2026-11-19' });
    expect(aktivitasLab([kemarin], 'lab-b', sekarang).berikutnya).toBeNull();
  });
});

describe('jadwalLabPadaTanggal', () => {
  it('urut jam mulai dengan slot kosong di antara sesi', () => {
    const pagi = sesi({ jamMulai: '08:00', jamSelesai: '10:00' });
    const siang = sesi({ jamMulai: '13:00', jamSelesai: '15:00' });
    const baris = jadwalLabPadaTanggal([siang, pagi], 'lab-b', '2026-11-20');
    expect(baris).toEqual([
      { jenis: 'sesi', session: pagi },
      { jenis: 'kosong', mulai: '10:00', selesai: '13:00' },
      { jenis: 'sesi', session: siang },
    ]);
  });

  it('sesi bentrok tidak menghasilkan slot kosong', () => {
    const a = sesi({ jamMulai: '08:00', jamSelesai: '11:00' });
    const b = sesi({ jamMulai: '10:00', jamSelesai: '12:00' });
    const baris = jadwalLabPadaTanggal([a, b], 'lab-b', '2026-11-20');
    expect(baris.map((x) => x.jenis)).toEqual(['sesi', 'sesi']);
  });

  it('slot kosong dihitung dari jam selesai terjauh, bukan sesi terakhir', () => {
    const panjang = sesi({ jamMulai: '08:00', jamSelesai: '12:00' });
    const pendek = sesi({ jamMulai: '09:00', jamSelesai: '10:00' });
    const sore = sesi({ jamMulai: '13:00', jamSelesai: '14:00' });
    const kosong = jadwalLabPadaTanggal([panjang, pendek, sore], 'lab-b', '2026-11-20').filter(
      (x) => x.jenis === 'kosong',
    );
    expect(kosong).toEqual([{ jenis: 'kosong', mulai: '12:00', selesai: '13:00' }]);
  });

  it('hanya lab dan tanggal yang diminta', () => {
    const labLain = sesi({ labId: 'lab-c' });
    const hariLain = sesi({ tanggal: '2026-11-21' });
    expect(jadwalLabPadaTanggal([labLain, hariLain], 'lab-b', '2026-11-20')).toEqual([]);
  });
});
