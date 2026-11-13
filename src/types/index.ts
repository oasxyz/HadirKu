export type Role = 'asisten' | 'praktikan';

// Sprint 2: `id` = uid Firebase Auth, dokumen disimpan di koleksi `users`.
export interface User {
  id: string;
  nama: string;
  nim: string;
  role: Role;
  email?: string;
}

// Sprint 2: koleksi `classes`. Sesi dibuat dari kelas dan menyalin
// praktikum, kelasLab, asistenId, dan pesertaIds (denormalisasi agar rules dan query sederhana).
export interface Kelas {
  id: string;
  praktikum: string;
  kelasLab: string;
  asistenId: string;
  pesertaIds: string[];
}

export type SessionStatus = 'belum_dibuka' | 'dibuka' | 'ditutup';

// Titik lokasi dalam derajat desimal (WGS84).
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Session {
  id: string;
  kelasId?: string;
  praktikum: string;
  kelasLab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  asistenId: string;
  pesertaIds: string[];
  kodeSesi: string | null;
  status: SessionStatus;
  // Nama asisten, disalin saat sesi dibuat agar praktikan tidak perlu membaca dokumen `users` asisten
  // (rules melarang praktikan membaca data pengguna lain). Sesi lama belum punya field ini.
  asistenNama?: string;
  // Lokasi asisten saat sesi dibuka, acuan jarak presensi. Null jika izin ditolak atau GPS gagal.
  // Dikosongkan (null) saat sesi ditutup karena dokumen sesi terbaca oleh peserta.
  asistenCoords?: Coordinates | null;
}

// Sprint 2: ID dokumen presensi = `${sessionId}_${userId}` (lihat services/firebase.ts)
// sehingga presensi ganda otomatis ditolak.
export interface Attendance {
  id: string;
  sessionId: string;
  userId: string;
  waktuPresensi: string;
  // Jarak praktikan ke asisten saat presensi, dalam meter (dibulatkan). Hanya jarak, bukan koordinat.
  // Kosong jika lokasi tidak tersedia; kosong berarti tidak ditandai, bukan di luar batas.
  jarakMeter?: number | null;
}

// Nilai enum di bawah sudah ditetapkan di SRS Sprint 2; jangan menambah nilai sendiri.
export type LeaveStatus = 'menunggu' | 'diterima' | 'ditolak';
export type LeaveCategory = 'sakit' | 'keluarga' | 'akademik' | 'lainnya';

// Sprint 2: koleksi `leaveRequests`. `kategoriAi` hanya informasi pendukung
// (null jika AI gagal atau belum dijalankan); keputusan hanya dari asisten.
export interface LeaveRequest {
  id: string;
  sessionId: string;
  userId: string;
  alasan: string;
  kategoriAi: LeaveCategory | null;
  status: LeaveStatus;
  createdAt: string;
  diputuskanOleh: string | null;
  diputuskanAt: string | null;
}

export interface AppState {
  currentUserId: string;
  users: User[];
  sessions: Session[];
  attendances: Attendance[];
}

export type AppAction =
  | { type: 'OPEN_SESSION'; sessionId: string }
  | { type: 'CLOSE_SESSION'; sessionId: string }
  | { type: 'SUBMIT_ATTENDANCE'; sessionId: string; userId: string; kodeSesi: string }
  | { type: 'SWITCH_USER'; userId: string };
