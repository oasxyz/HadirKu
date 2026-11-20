// SRS3-03 (PIC B — Annis): logika aktivitas laboratorium untuk tab Peta.
// Fungsi murni tanpa React supaya mudah diuji dan dipakai ulang.
import type { Lab, Session } from '@/types';
import { sesiSudahBerakhir } from '@/utils/sesi';

export type Titik = { latitude: number; longitude: number };

/** Jarak dua titik di permukaan bumi (rumus Haversine), dalam meter. */
export function jarakMeter(a: Titik, b: Titik): number {
  const R = 6371000;
  const rad = (derajat: number) => (derajat * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type GrupLab = {
  key: string;
  latitude: number;
  longitude: number;
  labs: Lab[];
};

/**
 * Nama gedung untuk label marker dan judul panel.
 * - Beberapa lab dalam satu titik dengan `deskripsi` sama (mis. "Gedung E"): pakai deskripsi itu.
 * - Beberapa lab tanpa deskripsi yang sama: gabungan nama lab.
 * - Satu lab: nama lab itu sendiri (deskripsinya ditampilkan sebagai keterangan).
 */
export function namaGrup(grup: GrupLab): string {
  if (grup.labs.length === 1) return grup.labs[0].namaLab;
  const deskripsi = grup.labs[0].deskripsi?.trim();
  const semuaSama = Boolean(deskripsi) && grup.labs.every((lab) => lab.deskripsi?.trim() === deskripsi);
  return semuaSama && deskripsi ? deskripsi : grup.labs.map((lab) => lab.namaLab).join(', ');
}

/**
 * Lab yang titiknya sama (mis. Lab B, C, D memakai patokan Gedung E) digabung menjadi satu
 * marker, supaya marker tidak menumpuk dan semuanya tetap bisa dipilih.
 */
export function kelompokkanLab(labs: Lab[]): GrupLab[] {
  const grup = new Map<string, GrupLab>();
  labs.forEach((lab) => {
    // 5 angka di belakang koma ≈ 1 meter.
    const key = `${lab.latitude.toFixed(5)},${lab.longitude.toFixed(5)}`;
    const ada = grup.get(key);
    if (ada) {
      ada.labs.push(lab);
    } else {
      grup.set(key, { key, latitude: lab.latitude, longitude: lab.longitude, labs: [lab] });
    }
  });
  return [...grup.values()];
}

function keWaktu(tanggal: string, jam: string): Date {
  const [year, month, day] = tanggal.split('-').map(Number);
  const [hour, minute] = jam.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export function waktuMulai(session: Pick<Session, 'tanggal' | 'jamMulai'>): Date {
  return keWaktu(session.tanggal, session.jamMulai);
}

/**
 * Praktikum sedang berlangsung (SRS 5.3 poin 1):
 * - berstatus `dibuka` dan belum lewat jamSelesai + toleransi, atau
 * - belum dibuka tetapi sekarang berada di rentang jam pelaksanaannya hari ini.
 * Sesi `ditutup` tidak dihitung berlangsung walaupun jamnya belum habis.
 */
export function sedangBerlangsung(session: Session, sekarang: Date): boolean {
  if (session.status === 'ditutup') return false;
  if (session.status === 'dibuka') return !sesiSudahBerakhir(session, sekarang);
  const mulai = waktuMulai(session);
  const selesai = keWaktu(session.tanggal, session.jamSelesai);
  return sekarang >= mulai && sekarang < selesai;
}

export type AktivitasLab = {
  berlangsung: Session[];
  berikutnya: Session | null;
};

/** Ringkasan aktivitas satu lab dari daftar sesi yang boleh dilihat pengguna. */
export function aktivitasLab(sessions: Session[], labId: string, sekarang: Date): AktivitasLab {
  const diLab = sessions.filter((session) => session.labId === labId);

  const berlangsung = diLab
    .filter((session) => sedangBerlangsung(session, sekarang))
    .sort((a, b) => waktuMulai(a).getTime() - waktuMulai(b).getTime());

  // SRS 5.3 poin 2: sesi belum_dibuka terdekat dengan waktu mulai >= sekarang.
  const berikutnya =
    diLab
      .filter((session) => session.status === 'belum_dibuka' && waktuMulai(session) >= sekarang)
      .sort((a, b) => waktuMulai(a).getTime() - waktuMulai(b).getTime())[0] ?? null;

  return { berlangsung, berikutnya };
}
