// SRS4-03 (PIC B — Annis): data untuk tombol "Absen" melayang di tab bar praktikan.
// Dipakai FloatingTabBar (milik PM): tombol aktif bila ada sesi dibuka yang belum dipresensi.
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { useCurrentUser } from '@/context/auth-context';
import { useSessions } from '@/hooks/use-sessions';
import { pilihSesiAbsen, type SesiAbsen } from '@/utils/sesi-absen';

export type TombolAbsen = {
  /** Tombol hanya ditampilkan untuk praktikan. */
  tampil: boolean;
  aktif: boolean;
  label: string;
  /** Keterangan untuk pembaca layar dan pesan saat tombol nonaktif diketuk. */
  keterangan: string;
  buka: () => void;
  sesi: SesiAbsen;
};

export function useSesiAbsen(): TombolAbsen {
  const currentUser = useCurrentUser();
  const { sessions, attendances } = useSessions();

  // Perbarui tiap 30 detik supaya tombol mati sendiri saat sesi lewat batas tutup.
  const [sekarang, setSekarang] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setSekarang(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const tampil = currentUser?.role === 'praktikan';
  const sesi = tampil ? pilihSesiAbsen(sessions, attendances, currentUser.id, sekarang) : { status: 'tidak_ada' as const };

  if (sesi.status === 'siap') {
    return {
      tampil,
      aktif: true,
      label: 'Absen',
      keterangan: `Buka kamera presensi ${sesi.session.praktikum} ${sesi.session.kelasLab}`,
      buka: () => router.push(`/presensi/${sesi.session.id}` as Href),
      sesi,
    };
  }
  if (sesi.status === 'sudah_hadir') {
    return {
      tampil,
      aktif: true,
      label: 'Sudah absen',
      keterangan: `Kamu sudah presensi di ${sesi.session.praktikum} ${sesi.session.kelasLab}`,
      // Tetap bisa dibuka untuk melihat status presensinya.
      buka: () => router.push(`/presensi/${sesi.session.id}` as Href),
      sesi,
    };
  }
  return {
    tampil,
    aktif: false,
    label: 'Absen',
    keterangan: 'Tidak ada sesi aktif',
    buka: () => {},
    sesi,
  };
}
