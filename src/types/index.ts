export type Role = 'asisten' | 'praktikan';

export interface User {
  id: string; // uid Firebase Auth
  nama: string;
  nim: string;
  role: Role;
  email?: string;
  pushTokens?: string[]; // Sprint 3: Token FCM untuk push notification
}

// Titik lokasi dalam derajat desimal (WGS84).
export interface Coordinates {
  lat: number;
  lng: number;
}

// Sprint 3: Entitas laboratorium untuk validasi lokasi dan Peta
export interface Lab {
  id: string; // misal: 'gedung-ap', 'lab-b', 'lab-c', 'lab-d'
  namaLab: string;
  deskripsi?: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  updatedBy?: string;
  updatedAt?: string;
}

export interface Kelas {
  id: string;
  praktikum: string;
  labId?: string; // Sprint 3: referensi ke koleksi labs
  kelasLab: string;
  asistenId: string;
  pesertaIds: string[];
}

export type SessionStatus = 'belum_dibuka' | 'dibuka' | 'ditutup';

export interface Session {
  id: string;
  kelasId?: string;
  praktikum: string;
  labId?: string; // Sprint 3: referensi ke koleksi labs (opsional selama transisi dari Sprint 2)
  kelasLab: string;
  tanggal: string; // YYYY-MM-DD
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
  asistenId: string;
  pesertaIds: string[];
  status: SessionStatus;
  asistenNama?: string;
  updatedAt?: string;
  /** @deprecated Sprint 3: Gunakan koleksi sessionCodes / sessionSecrets */
  kodeSesi?: string | null;
  /** @deprecated Sprint 3: Titik acuan lokasi kini diambil dari koleksi labs */
  asistenCoords?: Coordinates | null;
}

// Sprint 3: Rahasia kode sesi yang terpisah dari dokumen publik sessions
export interface SessionSecret {
  id: string; // Sama dengan sessionId
  kodeSesi: string; // 6 digit
  asistenId: string;
  updatedAt?: string;
}

export type AttendanceMethod = 'qr' | 'kode';

export interface Attendance {
  id: string; // Composite ID: sessionId_userId
  sessionId: string;
  userId: string;
  waktuPresensi: string;
  jarakMeter?: number | null;
  radiusSaatPresensi?: number;
  metode?: AttendanceMethod;
}

export type LeaveStatus = 'menunggu' | 'diterima' | 'ditolak';

// Sprint 3 menggunakan 'sakit' | 'izin'. Nilai Sprint 2 dipertahankan di union agar
// kode lama dan dokumen Firestore lama tidak error saat dikompilasi/dibaca.
export type LeaveCategory = 'sakit' | 'izin' | 'keluarga' | 'akademik' | 'lainnya';

// Helper untuk menormalisasi kategori izin lama Sprint 2 ke standar Sprint 3 ('sakit' | 'izin')
export function normalizeLeaveCategory(
  category: LeaveCategory | null | undefined
): 'sakit' | 'izin' | null {
  if (!category) return null;
  return category === 'sakit' ? 'sakit' : 'izin';
}

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

// Sprint 3: Status akhir kehadiran praktikan untuk Rekap Asisten & Catatan Praktikan
export type FinalAttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpha' | 'belum_hadir';

export type NotificationType = 'sesi_dibuka' | 'jadwal_berubah' | 'izin_diterima' | 'izin_ditolak';

export interface Notification {
  id: string;
  targetUserIds: string[];
  title: string;
  body: string;
  type: NotificationType;
  sessionId?: string;
  createdAt: string;
  readBy: string[];
}

export interface AppConfig {
  enforceMockLocationBlock: boolean;
  gpsAccuracyBufferMeter: number;
  useOsmFallbackTiles: boolean;
  aiTimeoutMs: number;
}

/** @deprecated Sprint 1 legacy state — akan dihapus saat pembersihan AppProvider (SRS3-02) */
export interface AppState {
  currentUserId: string;
  users: User[];
  sessions: Session[];
  attendances: Attendance[];
}

/** @deprecated Sprint 1 legacy action — akan dihapus saat pembersihan AppProvider (SRS3-02) */
export type AppAction =
  | { type: 'OPEN_SESSION'; sessionId: string }
  | { type: 'CLOSE_SESSION'; sessionId: string }
  | { type: 'SUBMIT_ATTENDANCE'; sessionId: string; userId: string; kodeSesi: string }
  | { type: 'SWITCH_USER'; userId: string };