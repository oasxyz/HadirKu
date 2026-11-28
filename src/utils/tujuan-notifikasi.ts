// SRS4-04 (PIC B — Annis): halaman tujuan saat notifikasi diketuk (deep link).
// Dipakai dari push notification (data.type + id rujukan) dan dari daftar notifikasi in-app.
import type { NotificationType } from '@/types';

export type DataNotifikasi = {
  type?: string | null;
  sessionId?: string | null;
  fineId?: string | null;
};

const TIPE: NotificationType[] = [
  'sesi_dibuka',
  'jadwal_berubah',
  'izin_diterima',
  'izin_ditolak',
  'kelas_diterima',
  'kelas_ditolak',
  'kelas_dipindah_aslab',
  'tagihan_baru',
  'tagihan_jatuh_tempo',
  'tagihan_dibatalkan',
  'pembayaran_sukses',
  'pembayaran_gagal',
];

export function tipeNotifikasiValid(type: unknown): type is NotificationType {
  return typeof type === 'string' && (TIPE as string[]).includes(type);
}

/**
 * Rute tujuan untuk satu notifikasi. Bila id rujukan hilang, jatuh ke halaman daftar yang
 * relevan supaya tidak membuka halaman detail kosong. Tipe tak dikenal → Beranda.
 */
export function tujuanNotifikasi(data: DataNotifikasi): string {
  const { type, sessionId, fineId } = data;
  switch (type) {
    case 'sesi_dibuka':
    case 'jadwal_berubah':
      return sessionId ? `/jadwal/${sessionId}` : '/jadwal';
    case 'izin_diterima':
    case 'izin_ditolak':
      return '/izin';
    case 'kelas_diterima':
    case 'kelas_ditolak':
    case 'kelas_dipindah_aslab':
      return '/profil';
    case 'tagihan_baru':
    case 'tagihan_jatuh_tempo':
    case 'tagihan_dibatalkan':
      return fineId ? `/tagihan/${fineId}` : '/pembayaran';
    case 'pembayaran_sukses':
    case 'pembayaran_gagal':
      return '/pembayaran';
    default:
      return '/jadwal';
  }
}
