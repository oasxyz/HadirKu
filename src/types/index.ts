export type Role = 'asisten' | 'praktikan';

export interface User {
  id: string;
  nama: string;
  nim: string;
  role: Role;
}

export type SessionStatus = 'belum_dibuka' | 'dibuka' | 'ditutup';

export interface Session {
  id: string;
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

export interface Attendance {
  id: string;
  sessionId: string;
  userId: string;
  waktuPresensi: string;
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
