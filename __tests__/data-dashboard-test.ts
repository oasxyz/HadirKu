// SRS4-03: uji perhitungan Dashboard Aslab (ringkasan, denda, grafik, riwayat, asprak).
import {
  awalMinggu,
  batangDenda,
  daftarAsprak,
  jadwalPerLab,
  kelompokDenda,
  labDikelola,
  ringkasDenda,
  ringkasLab,
  ringkasMingguIni,
  riwayatKegiatan,
  riwayatPembayaran,
  sesiBerlangsung,
} from '@/components/dashboard/data-dashboard';
import type { Fine, Lab, Payment, Session, User } from '@/types';

// Kamis, 26 Nov 2026 pukul 09.00 waktu lokal.
const SEKARANG = new Date(2026, 10, 26, 9, 0);

const lab = (id: string, namaLab: string): Lab => ({ id, namaLab, latitude: 0, longitude: 0, radiusMeter: 50 });
const LABS = [lab('b', 'Lab Informatika B'), lab('c', 'Lab Informatika C'), lab('fsm', 'Dekanat FSM')];

function sesi(id: string, over: Partial<Session>): Session {
  return {
    id,
    praktikum: 'Basis Data',
    labId: 'b',
    kelasLab: 'D1',
    tanggal: '2026-11-26',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    asistenId: 'asp1',
    pesertaIds: ['p1', 'p2'],
    status: 'belum_dibuka',
    ...over,
  };
}

const user = (id: string, role: User['role'], nama: string, kelas?: string): User => ({ id, role, nama, nim: '', kelas });

function denda(id: string, status: Fine['status'], nominal: number, createdAt: string): Fine {
  return { id, sessionId: 's', userId: 'p1', praktikum: 'Basis Data', kelasLab: 'D1', jumlahMenitTerlambat: 5, nominal, status, createdAt };
}

describe('labDikelola', () => {
  it('tanpa labIds → semua lab', () => {
    expect(labDikelola(LABS, undefined)).toHaveLength(3);
    expect(labDikelola(LABS, [])).toHaveLength(3);
  });
  it('dengan labIds → hanya lab itu', () => {
    expect(labDikelola(LABS, ['c']).map((l) => l.id)).toEqual(['c']);
  });
});

describe('ringkasLab', () => {
  it('menghitung lab dipakai, praktikan, rentang kelas, dan asprak mengajar', () => {
    const berlangsung = sesiBerlangsung(
      [sesi('a', { status: 'dibuka' }), sesi('b', { labId: 'c', asistenId: 'asp2', jamMulai: '13:00', jamSelesai: '15:00' })],
      SEKARANG,
    );
    const users = [
      user('p1', 'praktikan', 'Ani', 'D1'),
      user('p2', 'praktikan', 'Budi', 'A2'),
      user('asp1', 'asprak', 'Rizky'),
      user('asp2', 'asisten', 'Siti'),
      user('aslab', 'aslab', 'Nissa'),
    ];
    expect(ringkasLab(LABS, users, berlangsung)).toEqual({
      jumlahLab: 3,
      labDipakai: 1,
      jumlahPraktikan: 2,
      rentangKelas: 'A2–D1',
      jumlahAsprak: 2,
      asprakMengajar: 1,
    });
  });
});

describe('jadwalPerLab', () => {
  it('memisahkan berlangsung, berikutnya hari ini, dan semua jadwal hari ini', () => {
    const sessions = [
      sesi('pagi', { jamMulai: '07:00', jamSelesai: '08:30', status: 'ditutup' }),
      sesi('kini', { status: 'dibuka' }),
      sesi('siang', { jamMulai: '13:00', jamSelesai: '15:00' }),
      sesi('besok', { tanggal: '2026-11-27' }),
    ];
    const [b, c] = jadwalPerLab(LABS, sessions, SEKARANG);
    expect(b.label).toBe('Lab B');
    expect(b.berlangsung.map((s) => s.id)).toEqual(['kini']);
    expect(b.berikutnya?.id).toBe('siang');
    expect(b.hariIni.map((s) => s.id)).toEqual(['pagi', 'kini', 'siang']);
    expect(c.hariIni).toHaveLength(0);
  });
});

describe('daftarAsprak', () => {
  it('yang mengajar di atas, lalu keterangan sesi berikutnya atau tidak mengajar', () => {
    const users = [user('asp1', 'asprak', 'Rizky'), user('asp2', 'asprak', 'Bagas'), user('asp3', 'asprak', 'Andi')];
    const sessions = [
      sesi('kini', { status: 'dibuka', kelasLab: 'D1' }),
      sesi('siang', { asistenId: 'asp2', labId: 'c', jamMulai: '13:00', jamSelesai: '15:00' }),
    ];
    const hasil = daftarAsprak(users, sessions, LABS, SEKARANG);
    expect(hasil.map((h) => h.user.nama)).toEqual(['Rizky', 'Andi', 'Bagas']);
    expect(hasil[0]).toMatchObject({ mengajar: true, keterangan: 'Basis Data D1 · Lab Informatika B' });
    expect(hasil[2].keterangan).toBe('Berikutnya 13.00 · Lab Informatika C');
    expect(hasil[1].keterangan).toBe('Tidak mengajar hari ini');
  });
});

describe('denda', () => {
  it('kelompok status', () => {
    expect(kelompokDenda('paid')).toBe('lunas');
    expect(kelompokDenda('processing')).toBe('belum');
    expect(kelompokDenda('expired')).toBe('batal');
  });

  it('ringkasan belum dibayar dan persentase lunas', () => {
    const fines = [
      denda('1', 'pending', 10000, '2026-11-26T08:10:00'),
      denda('2', 'processing', 10000, '2026-11-26T08:20:00'),
      denda('3', 'paid', 30000, '2026-11-25T08:00:00'),
      denda('4', 'cancelled', 10000, '2026-11-24T08:00:00'),
    ];
    expect(ringkasDenda(fines)).toEqual({ belumNominal: 20000, belumJumlah: 2, lunasJumlah: 1, persenLunas: 60 });
  });

  it('batang grafik per periode', () => {
    const fines = [
      denda('1', 'paid', 10000, new Date(2026, 10, 26, 8, 30).toISOString()),
      denda('2', 'pending', 10000, new Date(2026, 10, 26, 9, 15).toISOString()),
      denda('3', 'expired', 10000, new Date(2026, 10, 23, 10, 0).toISOString()),
      denda('4', 'paid', 20000, new Date(2026, 10, 2, 10, 0).toISOString()),
    ];
    const hari = batangDenda(fines, 'hari', SEKARANG);
    expect(hari).toHaveLength(7);
    expect(hari[0]).toMatchObject({ label: '07', lunas: 10000 });
    expect(hari[1]).toMatchObject({ label: '09', belum: 10000 });

    const minggu = batangDenda(fines, 'minggu', SEKARANG);
    expect(minggu.map((b) => b.label)).toEqual(['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']);
    expect(minggu[0].batal).toBe(10000);
    expect(minggu[3]).toMatchObject({ lunas: 10000, belum: 10000 });

    const bulan = batangDenda(fines, 'bulan', SEKARANG);
    expect(bulan).toHaveLength(5);
    expect(bulan[0].lunas).toBe(20000);
    expect(bulan[3]).toMatchObject({ lunas: 10000, belum: 10000, batal: 10000 });
  });
});

describe('riwayat', () => {
  it('kegiatan: hanya sesi ditutup, terbaru dulu', () => {
    const hasil = riwayatKegiatan([
      sesi('lama', { status: 'ditutup', tanggal: '2026-11-20' }),
      sesi('buka', { status: 'dibuka' }),
      sesi('baru', { status: 'ditutup', tanggal: '2026-11-25' }),
    ]);
    expect(hasil.map((s) => s.id)).toEqual(['baru', 'lama']);
  });

  it('pembayaran: hanya settlement, terbaru dulu', () => {
    const bayar = (id: string, status: Payment['status'], settledAt: string): Payment => ({
      id, fineId: 'f', userId: 'p1', nominal: 10000, midtransOrderId: id, status, createdAt: settledAt, settledAt,
    });
    const hasil = riwayatPembayaran([
      bayar('a', 'settlement', '2026-11-24T10:00:00'),
      bayar('b', 'pending', '2026-11-26T10:00:00'),
      bayar('c', 'settlement', '2026-11-26T08:00:00'),
    ]);
    expect(hasil.map((p) => p.id)).toEqual(['c', 'a']);
  });

  it('ringkasan minggu ini dimulai Senin', () => {
    expect(awalMinggu(SEKARANG)).toEqual(new Date(2026, 10, 23));
    const hasil = ringkasMingguIni(
      [sesi('x', { status: 'ditutup', tanggal: '2026-11-23' }), sesi('y', { status: 'ditutup', tanggal: '2026-11-22' })],
      [{ id: 'p', fineId: 'f', userId: 'u', nominal: 1, midtransOrderId: 'p', status: 'settlement', createdAt: new Date(2026, 10, 24).toISOString(), settledAt: null }],
      SEKARANG,
    );
    expect(hasil).toEqual({ sesiSelesai: 1, dendaLunas: 1 });
  });
});
