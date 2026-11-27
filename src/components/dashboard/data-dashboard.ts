// SRS4-03 (PIC B — Annis): perhitungan Dashboard Aslab.
// Fungsi murni tanpa React/Firebase supaya mudah diuji (lihat __tests__/data-dashboard-test.ts).
import { aktivitasLab, namaLabSingkat, sedangBerlangsung, waktuMulai } from '@/components/peta/aktivitas-lab';
import type { Attendance, Fine, FineStatus, Lab, Payment, Session, User } from '@/types';
import { isAsprakLike } from '@/types';

export function keIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "08:00" → "08.00", gaya jam di kartu HadirKu. */
export function jamTitik(jam: string): string {
  return jam.replace(':', '.');
}

// ---------------------------------------------------------------------------
// Cakupan lab aslab
// ---------------------------------------------------------------------------

/**
 * Lab yang dikelola aslab. SRS 5.2: dashboard difilter oleh `labIds` milik aslab.
 * Bila aslab belum diberi `labIds`, semua lab ditampilkan supaya dashboard tidak kosong.
 */
export function labDikelola(labs: Lab[], labIds: string[] | undefined): Lab[] {
  if (!labIds || labIds.length === 0) return labs;
  const set = new Set(labIds);
  return labs.filter((lab) => set.has(lab.id));
}

export function sesiDiLab(sessions: Session[], labs: Lab[], semuaLab: boolean): Session[] {
  if (semuaLab) return sessions;
  const set = new Set(labs.map((lab) => lab.id));
  return sessions.filter((s) => s.labId !== undefined && set.has(s.labId));
}

// ---------------------------------------------------------------------------
// Tab Hari Ini
// ---------------------------------------------------------------------------

/** Sesi yang sedang berlangsung sekarang (aturan sama dengan tab Peta), urut jam mulai. */
export function sesiBerlangsung(sessions: Session[], sekarang: Date): Session[] {
  return sessions
    .filter((s) => sedangBerlangsung(s, sekarang))
    .sort((a, b) => waktuMulai(a).getTime() - waktuMulai(b).getTime());
}

export type RingkasanLab = {
  jumlahLab: number;
  labDipakai: number;
  jumlahPraktikan: number;
  rentangKelas: string | null;
  jumlahAsprak: number;
  asprakMengajar: number;
};

export function ringkasLab(
  labs: Lab[],
  users: User[],
  berlangsung: Session[],
): RingkasanLab {
  const praktikan = users.filter((u) => u.role === 'praktikan');
  const kelas = [...new Set(praktikan.map((u) => u.kelas).filter((k): k is string => !!k))].sort();
  const labAktif = new Set(berlangsung.map((s) => s.labId).filter(Boolean));
  const asprakAktif = new Set(berlangsung.map((s) => s.asistenId));
  return {
    jumlahLab: labs.length,
    labDipakai: labs.filter((lab) => labAktif.has(lab.id)).length,
    jumlahPraktikan: praktikan.length,
    rentangKelas:
      kelas.length === 0 ? null : kelas.length === 1 ? kelas[0] : `${kelas[0]}–${kelas[kelas.length - 1]}`,
    jumlahAsprak: users.filter((u) => isAsprakLike(u.role)).length,
    asprakMengajar: asprakAktif.size,
  };
}

export type JadwalLab = {
  lab: Lab;
  label: string;
  berlangsung: Session[];
  berikutnya: Session | null;
  hariIni: Session[];
};

/** Jadwal per lab untuk hari ini: blok Sedang berlangsung, Berikutnya, dan Jadwal hari ini. */
export function jadwalPerLab(labs: Lab[], sessions: Session[], sekarang: Date): JadwalLab[] {
  const hariIni = keIso(sekarang);
  return labs.map((lab) => {
    const { berlangsung, berikutnya } = aktivitasLab(sessions, lab.id, sekarang);
    return {
      lab,
      label: namaLabSingkat(lab.namaLab),
      berlangsung,
      // Berikutnya hanya yang masih hari ini supaya sesuai judul "Jadwal Lab Hari Ini".
      berikutnya: berikutnya && berikutnya.tanggal === hariIni ? berikutnya : null,
      hariIni: sessions
        .filter((s) => s.labId === lab.id && s.tanggal === hariIni)
        .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai)),
    };
  });
}

export type BarisAsprak = { user: User; keterangan: string; mengajar: boolean };

/** Daftar asprak untuk lembar Asprak: yang sedang mengajar di atas, lalu sisanya urut nama. */
export function daftarAsprak(
  users: User[],
  sessions: Session[],
  labs: Lab[],
  sekarang: Date,
): BarisAsprak[] {
  const hariIni = keIso(sekarang);
  const namaLab = new Map(labs.map((lab) => [lab.id, lab.namaLab]));
  const lab = (s: Session) => (s.labId ? namaLab.get(s.labId) : undefined) ?? 'Lab belum diatur';
  const berlangsung = sesiBerlangsung(sessions, sekarang);

  return users
    .filter((u) => isAsprakLike(u.role))
    .map((user) => {
      const aktif = berlangsung.find((s) => s.asistenId === user.id);
      if (aktif) {
        return { user, mengajar: true, keterangan: `${aktif.praktikum} ${aktif.kelasLab} · ${lab(aktif)}` };
      }
      const nanti = sessions
        .filter(
          (s) =>
            s.asistenId === user.id &&
            s.tanggal === hariIni &&
            s.status === 'belum_dibuka' &&
            waktuMulai(s) >= sekarang,
        )
        .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai))[0];
      return {
        user,
        mengajar: false,
        keterangan: nanti
          ? `Berikutnya ${jamTitik(nanti.jamMulai)} · ${lab(nanti)}`
          : 'Tidak mengajar hari ini',
      };
    })
    .sort((a, b) => Number(b.mengajar) - Number(a.mengajar) || a.user.nama.localeCompare(b.user.nama));
}

export function jumlahHadir(attendances: Attendance[], sessionId: string): number {
  return attendances.filter((a) => a.sessionId === sessionId).length;
}

// ---------------------------------------------------------------------------
// Tab Riwayat: keuangan denda
// ---------------------------------------------------------------------------

export type KelompokDenda = 'lunas' | 'belum' | 'batal';

export function kelompokDenda(status: FineStatus): KelompokDenda {
  if (status === 'paid') return 'lunas';
  if (status === 'pending' || status === 'processing') return 'belum';
  return 'batal';
}

export type RingkasanDenda = {
  belumNominal: number;
  belumJumlah: number;
  lunasJumlah: number;
  /** Persentase nominal lunas dari denda yang masih berlaku (lunas + belum), 0–100. */
  persenLunas: number;
};

export function ringkasDenda(fines: Fine[]): RingkasanDenda {
  let belumNominal = 0;
  let belumJumlah = 0;
  let lunasNominal = 0;
  let lunasJumlah = 0;
  fines.forEach((f) => {
    const k = kelompokDenda(f.status);
    if (k === 'belum') {
      belumNominal += f.nominal;
      belumJumlah += 1;
    } else if (k === 'lunas') {
      lunasNominal += f.nominal;
      lunasJumlah += 1;
    }
  });
  const total = belumNominal + lunasNominal;
  return {
    belumNominal,
    belumJumlah,
    lunasJumlah,
    persenLunas: total === 0 ? 0 : Math.round((lunasNominal / total) * 100),
  };
}

export type Periode = 'hari' | 'minggu' | 'bulan';

export type BatangDenda = {
  label: string;
  /** Judul rincian saat batang diketuk, mis. "Pukul 09.00–11.00". */
  judul: string;
  lunas: number;
  belum: number;
  batal: number;
};

const HARI_PENDEK = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function awalHari(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Senin minggu ini pukul 00.00. */
export function awalMinggu(d: Date): Date {
  const hari = (d.getDay() + 6) % 7; // Senin = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - hari);
}

/**
 * Batang grafik keuangan denda per periode, dikelompokkan dari tanggal denda dibuat.
 * - Hari ini: per 2 jam (jam operasional lab 07.00–21.00).
 * - Minggu ini: Senin–Minggu.
 * - Bulan ini: minggu ke-1 sampai ke-5 (tanggal 1–7, 8–14, dst).
 */
export function batangDenda(fines: Fine[], periode: Periode, sekarang: Date): BatangDenda[] {
  let batang: BatangDenda[];
  let indeks: (d: Date) => number;

  if (periode === 'hari') {
    const mulai = awalHari(sekarang).getTime();
    batang = Array.from({ length: 7 }, (_, i) => {
      const jam = 7 + i * 2;
      const pad = (n: number) => String(n).padStart(2, '0');
      return { label: pad(jam), judul: `Pukul ${pad(jam)}.00–${pad(jam + 2)}.00`, lunas: 0, belum: 0, batal: 0 };
    });
    indeks = (d) => {
      if (awalHari(d).getTime() !== mulai) return -1;
      const i = Math.floor((d.getHours() - 7) / 2);
      return Math.min(Math.max(i, 0), 6);
    };
  } else if (periode === 'minggu') {
    const senin = awalMinggu(sekarang).getTime();
    batang = HARI_PENDEK.map((h) => ({ label: h, judul: h, lunas: 0, belum: 0, batal: 0 }));
    indeks = (d) => {
      const selisih = Math.floor((awalHari(d).getTime() - senin) / 86400000);
      return selisih >= 0 && selisih < 7 ? selisih : -1;
    };
  } else {
    const hariTerakhir = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 0).getDate();
    const jumlahMinggu = Math.ceil(hariTerakhir / 7);
    batang = Array.from({ length: jumlahMinggu }, (_, i) => ({
      label: `Mg ${i + 1}`,
      judul: `Tanggal ${i * 7 + 1}–${Math.min((i + 1) * 7, hariTerakhir)}`,
      lunas: 0,
      belum: 0,
      batal: 0,
    }));
    indeks = (d) =>
      d.getFullYear() === sekarang.getFullYear() && d.getMonth() === sekarang.getMonth()
        ? Math.floor((d.getDate() - 1) / 7)
        : -1;
  }

  fines.forEach((f) => {
    const d = new Date(f.createdAt);
    if (Number.isNaN(d.getTime())) return;
    const i = indeks(d);
    if (i < 0) return;
    batang[i][kelompokDenda(f.status)] += f.nominal;
  });
  return batang;
}

// ---------------------------------------------------------------------------
// Tab Riwayat: kegiatan dan pembayaran
// ---------------------------------------------------------------------------

export function riwayatKegiatan(sessions: Session[], batas = 10): Session[] {
  return sessions
    .filter((s) => s.status === 'ditutup')
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.jamMulai.localeCompare(a.jamMulai))
    .slice(0, batas);
}

function waktuBayar(p: Payment): string {
  return p.settledAt ?? p.createdAt;
}

export function riwayatPembayaran(payments: Payment[], batas = 10): Payment[] {
  return payments
    .filter((p) => p.status === 'settlement')
    .sort((a, b) => waktuBayar(b).localeCompare(waktuBayar(a)))
    .slice(0, batas);
}

/** Ringkasan kartu Riwayat: jumlah sesi ditutup dan denda lunas sejak Senin minggu ini. */
export function ringkasMingguIni(
  sessions: Session[],
  payments: Payment[],
  sekarang: Date,
): { sesiSelesai: number; dendaLunas: number } {
  const senin = awalMinggu(sekarang);
  const seninIso = keIso(senin);
  return {
    sesiSelesai: sessions.filter((s) => s.status === 'ditutup' && s.tanggal >= seninIso).length,
    dendaLunas: payments.filter(
      (p) => p.status === 'settlement' && new Date(waktuBayar(p)).getTime() >= senin.getTime(),
    ).length,
  };
}

/** Teks jam bayar di daftar pembayaran: "09.12" bila hari ini, selain itu "Kam, 26 Nov". */
export function labelWaktuBayar(iso: string, sekarang: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  if (keIso(d) === keIso(sekarang)) return `${pad(d.getHours())}.${pad(d.getMinutes())}`;
  const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`;
}

export const LABEL_METODE: Record<string, string> = {
  gopay: 'GoPay',
  qris: 'QRIS',
  shopeepay: 'ShopeePay',
  bank_transfer: 'Virtual Account',
  echannel: 'Virtual Account',
  credit_card: 'Kartu',
};
