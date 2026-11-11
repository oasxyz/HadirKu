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
}

// Sprint 2: ID dokumen presensi = `${sessionId}_${userId}` (lihat services/firebase.ts)
// sehingga presensi ganda otomatis ditolak.
export interface Attendance {
  id: string;
  sessionId: string;
  userId: string;
  waktuPresensi: string;
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
