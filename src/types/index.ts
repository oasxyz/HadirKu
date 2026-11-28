// Sprint 4: hirarki role baru - aslab (manajemen lab) > asprak (asisten praktikum) > praktikan.
// 'asisten' dipertahankan sebagai alias lama Sprint 1-3 agar dokumen users lama tetap terbaca.
export type Role = 'aslab' | 'asprak' | 'praktikan' | 'asisten';

// Sprint 4: helper agar kode baru maupun lama kompak - menerima 'asprak' maupun 'asisten'.
export function isAsprakLike(role: Role | null | undefined): boolean {
  return role === 'asprak' || role === 'asisten';
}

export function isAslabLike(role: Role | null | undefined): boolean {
  return role === 'aslab';
}

// Sprint 4: staf lab (asprak, alias lama asisten, dan aslab). "aslab mewarisi semua izin asprak",
// jadi layar Sprint 1-3 yang dulu mengecek `role === 'asisten'` memakai helper ini.
export function isStafLab(role: Role | null | undefined): boolean {
  return isAsprakLike(role) || isAslabLike(role);
}

export interface User {
  id: string; // uid Firebase Auth
  nama: string;
  nim: string;
  role: Role;
  email?: string;
  kelas?: string; // Kelas praktikum default/aktif praktikan, mis. "D1" (lihat constants/kelas.ts)
  kelasKuliah?: string; // Batas kelas mata kuliah praktikan, mis. "A".."E"
  kelasPraktikum?: Record<string, string>; // Peta nama praktikum -> sub-kelas, mis. { "Basis Data": "D1", "Sistem Operasi": "D2" }
  pushTokens?: string[]; // Sprint 3: Token FCM untuk push notification
  // Sprint 4 (SRS4-01): lab yang dipegang aslab/asprak. Aslab mengurus semua lab; asprak terbatas.
  labIds?: string[];
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
  // Sprint 4 (SRS4-06): toleransi keterlambatan (menit) dan nominal denda default lab ini.
  // Bila kosong, pakai appConfig/runtime.gracePeriodDefault / dendaDefault.
  gracePeriodMenit?: number;
  dendaPerKelambatan?: number;
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
  // Sprint 4 (SRS4-04): diisi cron cleanup-sessions untuk sesi selesai > 24 jam. Sesi
  // diarsipkan (bukan dihapus) supaya riwayat Catatan, Rekap, dan Dashboard tetap utuh;
  // Beranda menyembunyikannya.
  diarsipkan?: boolean;
  diarsipkanAt?: string;
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
  // Sprint 4 (SRS4-06): selisih menit dari jamMulai sesi ke waktuPresensi.
  // > 0 berarti terlambat; 0/null berarti tepat waktu.
  menitTerlambat?: number | null;
  // Sprint 4 (SRS4-06): rujukan ke dokumen fines yang dibuat atas keterlambatan ini (bila ada).
  fineId?: string | null;
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
  // Sprint 4 (SRS4-05): sentimen hasil analisis AI, informasi pendukung untuk asprak di
  // halaman Pemeriksaan Izin. Boleh null jika model AI belum tersedia.
  sentimenAi?: 'positif' | 'netral' | 'negatif' | null;
  status: LeaveStatus;
  createdAt: string;
  diputuskanOleh: string | null;
  diputuskanAt: string | null;
}

// Sprint 3: Status akhir kehadiran praktikan untuk Rekap Asisten & Catatan Praktikan
export type FinalAttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpha' | 'belum_hadir';

export type NotificationType =
  | 'sesi_dibuka'
  | 'jadwal_berubah'
  | 'izin_diterima'
  | 'izin_ditolak'
  | 'kelas_diterima'
  | 'kelas_ditolak'
  // Sprint 4 (SRS4-01): aslab memindah praktikan antar kelas top-down.
  | 'kelas_dipindah_aslab'
  // Sprint 4 (SRS4-04 & SRS4-06..08): siklus hidup tagihan denda keterlambatan.
  | 'tagihan_baru'
  | 'tagihan_jatuh_tempo'
  | 'tagihan_dibatalkan'
  | 'pembayaran_sukses'
  | 'pembayaran_gagal';

// Pengajuan pindah kelas praktikum. ID dokumen = uid praktikan (satu pengajuan aktif per orang).
// `asistenIds` = asisten yang sedang memegang praktikan (pembuat sesi yang memuatnya);
// hanya mereka yang boleh memutuskan.
export interface PengajuanKelas {
  id: string;
  userId: string;
  nama: string;
  nim: string;
  kelasLama: string | null;
  kelasBaru: string;
  alasan: string;
  asistenIds: string[];
  status: LeaveStatus;
  createdAt: string;
  diputuskanOleh: string | null;
  diputuskanAt: string | null;
}

export interface Notification {
  id: string;
  targetUserIds: string[];
  title: string;
  body: string;
  type: NotificationType;
  sessionId?: string;
  // Sprint 4 (SRS4-04): deep link ke halaman spesifik. Isi fineId untuk notifikasi tagihan,
  // pengajuanKelasUid untuk notifikasi pindah kelas.
  fineId?: string;
  pengajuanKelasUid?: string;
  createdAt: string;
  readBy: string[];
  // Sprint 4 (SRS4-04): uid yang menghapus notifikasi ini dari daftarnya (soft delete).
  // Dokumen tetap disimpan untuk audit; pengguna lain tetap melihatnya.
  hiddenFor?: string[];
}

// Sprint 4 (SRS4-06..08): tagihan denda keterlambatan praktikum.
// ID dokumen deterministik: sessionId_userId agar denda per sesi per praktikan unik.
export type FineStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'cancelled'
  | 'failed'
  | 'expired';

export interface Fine {
  id: string;
  sessionId: string;
  userId: string;
  labId?: string;
  praktikum: string;
  kelasLab: string;
  jumlahMenitTerlambat: number;
  nominal: number; // rupiah
  status: FineStatus;
  createdAt: string;
  updatedAt?: string;
  // Diisi Cloud Function createMidtransTransaction saat praktikan menekan Bayar.
  midtransOrderId?: string | null;
  snapToken?: string | null;
  snapRedirectUrl?: string | null;
  // Diisi saat denda dibatalkan otomatis (mis. izin diterima).
  cancelledReason?: string | null;
  cancelledBy?: string | null;
}

// Rekam satu dokumen per percobaan/penyelesaian pembayaran Midtrans.
// ID dokumen = midtransOrderId agar webhook berulang tidak menciptakan duplikat.
export type PaymentStatus =
  | 'pending'
  | 'settlement'
  | 'expire'
  | 'cancel'
  | 'deny'
  | 'failure';

export interface Payment {
  id: string; // = midtransOrderId
  fineId: string;
  userId: string;
  nominal: number;
  midtransOrderId: string;
  midtransTransactionId?: string;
  paymentType?: string;
  status: PaymentStatus;
  rawPayload?: Record<string, unknown>;
  createdAt: string;
  settledAt?: string | null;
}

// Sprint 4 (SRS4-01): log aslab bulk import dari CSV. Simpan ringkasan per baris
// supaya aslab bisa menelusuri siapa diterima/ditolak kapan.
export type BulkImportKind = 'lab' | 'praktikan' | 'asprak';
export type BulkImportRowStatus = 'accepted' | 'rejected' | 'edited';

export interface BulkImportRow {
  rowIndex: number;
  status: BulkImportRowStatus;
  payload: Record<string, unknown>;
  message?: string;
}

export interface BulkImport {
  id: string;
  kind: BulkImportKind;
  createdBy: string;
  createdAt: string;
  totalRow: number;
  diterima: number;
  ditolak: number;
  rows: BulkImportRow[];
}

export interface AppConfig {
  enforceMockLocationBlock: boolean;
  gpsAccuracyBufferMeter: number;
  useOsmFallbackTiles: boolean;
  aiTimeoutMs: number;
  // Sprint 4 (SRS4-06): nilai bawaan denda per keterlambatan dan toleransi menit,
  // dipakai bila lab yang bersangkutan belum mengatur field spesifiknya.
  dendaDefault?: number;
  gracePeriodDefault?: number;
  // Sprint 4 (SRS4-07): konfigurasi Snap Midtrans. Client key boleh dibaca praktikan;
  // Server Key TIDAK boleh disimpan di koleksi ini.
  midtransClientKey?: string;
  midtransSnapIsSandbox?: boolean;
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