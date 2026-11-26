# SRS Sistem Informasi Praktikum — Sprint 4

Melanjutkan pengembangan aplikasi mobile **HadirKu** (React Native + Expo + Firebase) dari Sprint 1, 2, dan 3 dengan fokus pada:

1. **Manajemen Laboratorium oleh Aslab** (role baru, di atas Asprak) — CRUD lab, bulk insert praktikan/asprak, **perpindahan praktikan antar kelas (top-down oleh Aslab, tanpa pengajuan)**, konfigurasi radius & toleransi keterlambatan. Melengkapi mekanisme *pengajuan pindah kelas* (praktikan→Asprak) yang sudah ada di akhir Sprint 3.
2. **Dashboard Keberlangsungan Laboratorium** — ringkasan statistik, histori keuangan denda, filter harian/mingguan/bulanan.
3. **Pengelolaan Sesi oleh Asprak** — buka/tutup sesi & pantau presensi pada lab tanggung jawabnya saja (tidak boleh mengelola distribusi praktikan).
4. **Perhitungan Keterlambatan & Pengelolaan Denda** — *grace period* konfigurabel, nominal denda tetap, 1 kejadian = 1 tagihan.
5. **Integrasi Payment Gateway (Midtrans Sandbox)** — melalui backend **Vercel Serverless Functions** (pivot dari Firebase Cloud Functions karena Blaze butuh kartu kredit yang tidak tersedia; keputusan PM 26 Nov 2026), webhook terverifikasi, status `pending`/`success`/`failed`.
6. **Notifikasi Pembayaran & Deep Linking** — notif tagihan/sukses/gagal, klik notif langsung masuk ke halaman spesifik, manajemen notifikasi (limit 3 di Profil + "Lihat Semua" + hapus).
7. **AI Analisis Sentimen Alasan Izin** — melanjutkan Sprint 2/3; AI menambah label sentimen (`positif` / `netral` / `negatif`) sebagai informasi pendukung Asprak.
8. **Perbaikan evaluasi Sprint 3** (lihat Bab 2).

- **PM:** Varissa Nabila Kifli (Fondasi, Kontrak Tipe, Role migration, Firebase Functions scaffolding, Build APK, Integrasi & QA — **tidak ngoding fitur**).
- **Programmer:**
  - **PIC A:** Yoas
  - **PIC B:** Annis Fakhiroh Akbar
  - **PIC C:** Yustinus Hendi Setyawan

> File pendamping: **`docs/Pembagian SRS Sprint 4.md`** (pembagian jobdesk per orang & kepemilikan berkas).

---

## 1. Tujuan Demo

Aplikasi harus dapat mendemonstrasikan **empat alur utama**:

### Alur 1 — Manajemen Lab & Distribusi oleh Aslab
1. Aslab login, membuka Dashboard, melihat total lab yang dikelola, jumlah praktikan, dan sesi yang sedang berlangsung.
2. Aslab menambah Lab baru secara *single insert* (`+ Tambah Lab`) dan secara *bulk insert* (unduh template CSV → isi → unggah → scroll view hasil parse untuk accept/deny/edit per baris) → data tersimpan di koleksi `labs`.
3. Aslab melakukan *bulk insert* praktikan ke kelas tertentu (misal `B1`) melalui template CSV, lalu melakukan *bulk insert* Asprak (ter-assign ke kelas tertentu) juga melalui template berbeda.
4. Aslab memindahkan 1 praktikan dari kelas `A1` ke kelas `B2` **langsung (top-down, tanpa pengajuan)** → `users.kelas` berubah + `sessions.pesertaIds` di sesi masa depan disinkron. Jadwal lama tidak otomatis ikut pindah (konsisten dgn spec Sprint 4).
5. Aslab mengubah radius presensi dan `gracePeriodMenit` di Lab tertentu melalui halaman Kelola Lab.

> **Catatan:** Jalur *pengajuan pindah kelas* (praktikan → Asprak) yang sudah dibuat di akhir Sprint 3 (koleksi `pengajuanKelas`, komponen `kartu-kelas-praktikan.tsx`, `pemeriksaan-kelas.tsx`) **tetap jalan di Sprint 4**. Aslab bertindak sebagai jalur paralel top-down; keduanya berdampingan.

### Alur 2 — Sesi oleh Asprak & Presensi + Denda
1. Asprak login, membuka Lab yang menjadi tanggung jawabnya, melihat jadwal, lalu membuka sesi praktikum (writeBatch: `sessions.status=dibuka` + `sessionSecrets.kodeSesi` + notifikasi `sesi_dibuka` ke peserta).
2. Praktikan login, menerima *push notification* "Sesi X dibuka", **mengetuk notifikasi → langsung masuk halaman presensi** (`/presensi/[sessionId]`) tanpa harus lewat Beranda.
3. Praktikan melakukan presensi (lokasi valid, radius lab terpenuhi) — sistem membandingkan `waktuPresensi` dengan `sessions.jamMulai + lab.gracePeriodMenit`:
   - Jika ≤ batas toleransi → presensi tepat waktu, **tidak ada denda**.
   - Jika > batas toleransi → presensi tetap tercatat (`Hadir`), **tetapi** sistem membuat dokumen `fines/{sessionId}_{uid}` berstatus `pending` dengan nominal denda sesuai konfigurasi.
4. Praktikan menerima *push notification* "Tagihan denda baru" → klik → masuk halaman detail tagihan.
5. Asprak menutup sesi (atau sesi tertutup otomatis lewat `jamSelesai + TOLERANSI_TUTUP_MENIT`); **dokumen `sessions` dihapus secara otomatis** setelah batas tsb, tetapi `attendances`, `fines`, dan `leaveRequests` yang terkait **tetap ada** untuk log historis.

### Alur 3 — Pengajuan Izin (AI Sentimen) & Dibebaskan dari Denda
1. Praktikan mengajukan izin untuk Sesi X dengan alasan tertulis.
2. Aplikasi memanggil layanan AI (Sprint 2/3) → mendapat **kategori** (`sakit` / `izin`) **dan** **label sentimen baru** (`positif` / `netral` / `negatif`).
3. Dokumen `leaveRequests/{sessionId}_{uid}` tersimpan dengan `kategoriAi` + `sentimenAi`; jika AI timeout/gagal, dokumen tetap tersimpan dengan `kategoriAi=null` / `sentimenAi=null`.
4. Asprak melihat pengajuan + hasil AI, memutuskan `diterima` → *push notification* ke praktikan.
5. **Jika izin diterima sebelum praktikan terlambat tercatat terlambat (atau setelahnya, sebelum pembayaran),** tagihan denda dibatalkan dalam transaksi atomik (status berubah menjadi `dibatalkan_izin`). Praktikan tetap dicatat *excused absence* (`sakit`/`izin`), **bukan** `Hadir`.

### Alur 4 — Pembayaran Denda via Midtrans Sandbox
1. Praktikan membuka halaman Tagihan → melihat daftar tagihan `pending` → memilih satu → ketuk **"Bayar Sekarang"**.
2. Aplikasi memanggil endpoint Vercel `POST /api/midtrans-create` (Authorization: Bearer <firebaseIdToken>) → backend memverifikasi ID token Firebase, memanggil Midtrans Snap Sandbox menggunakan Server Key → mengembalikan `snapToken` + `redirect_url`.
3. Aplikasi membuka halaman Snap (WebView `expo-web-browser` / `react-native-webview`) → praktikan menyelesaikan pembayaran dengan metode dummy Midtrans Sandbox.
4. Midtrans mengirim *webhook* ke endpoint Vercel `POST /api/midtrans-webhook`; endpoint memverifikasi *signature key*, lalu memperbarui `fines/{id}.status = success` / `failed` / `expired` via Firebase Admin SDK.
5. Praktikan menerima *push notification* "Pembayaran berhasil" atau "Pembayaran gagal"; klik notifikasi → masuk halaman riwayat.

---

## 2. Perbaikan Evaluasi Sprint 3 & Pelunasan Tech Debt

Daftar lengkap dari evaluasi pengajar praktikum, **wajib** diimplementasikan di Sprint 4:

1. **Data Dummy yang Banyak:** **Perluas** `scripts/seed-uji.mjs` (seeder Node + firebase-admin yang sudah ada di akhir Sprint 3) menjadi **200 praktikan terdistribusi ke kelas A1–F2 + 20 Asprak + 4 Aslab + 30 sesi tersebar dalam 2 bulan + 50 tagihan `fines` sampel (status campur `pending`/`success`/`expired`/`dibatalkan_izin`) + 10 `payments` sampel + 20 `notifications` contoh (semua tipe)**. Seeder dijalankan via `node scripts/seed-uji.mjs` oleh PM (bukan auto-trigger dari app). Seeder idempotent (cek dokumen sentinel sebelum tulis).
2. **Notifikasi Deep Linking:** Mengetuk push notification HARUS masuk ke halaman spesifik yang relevan, BUKAN Beranda. Mapping wajib:
   - `sesi_dibuka` → `/presensi/[sessionId]`
   - `jadwal_berubah` → `/(tabs)/jadwal/[id]`
   - `izin_diterima` / `izin_ditolak` → `/(tabs)/izin` (tab Riwayat)
   - `tagihan_baru` / `pembayaran_gagal` → `/tagihan/[fineId]`
   - `pembayaran_sukses` → `/(tabs)/profil/pembayaran` (riwayat)
3. **Notifikasi di Profil Dibatasi 3 + "Lihat Semua":** Kartu notifikasi di layar Profil hanya menampilkan 3 notif terbaru; tombol teks **"Lihat semua notifikasi"** navigasi ke `/notifikasi` (layar penuh dengan daftar semua notifikasi + pagination/infinite scroll).
4. **Hapus Notifikasi:** Setiap item notifikasi di layar `/notifikasi` memiliki swipe-to-delete atau ikon tempat sampah; menghapus TIDAK menghapus dokumen `notifications` (untuk audit) melainkan menambahkan `uid` ke array baru `hiddenFor` di dokumen tsb. Query pembaca menyaring dokumen yang `hiddenFor.includes(uid)`.
5. **Expand Tahun pada Pembuat Sesi:** `DateTimeField` saat memilih tanggal sesi harus memungkinkan navigasi bulan & tahun mundur-maju (bukan hanya 1 bulan ke depan). Gunakan native Date Picker yang mendukung `minimumDate` / `maximumDate` cukup lebar, atau `ExpandableCalendar` yang mendukung navigasi tahun.
6. **Aslab Bisa Menambah Lab Baru:** Tombol `+ Tambah Lab` pada halaman Kelola Lab tersedia **hanya untuk role Aslab**. Modal (bottom sheet) berisi form: `id` (auto generate dari nama), `namaLab`, `deskripsi`, `latitude`/`longitude` (pakai titik GPS saat ini atau ketuk peta), `radiusMeter`, `gracePeriodMenit`.
7. **KeyboardAvoidingView untuk Semua Form:** Semua layar dengan input (login, register, lengkapi-profil, jadwal-form, kelola-lab, pengajuan-izin) HARUS membungkus konten dengan `KeyboardAvoidingView` + `behavior="padding"` (iOS) / `"height"` (Android), sehingga field tidak tertutup keyboard. PM menyiapkan komponen pembantu `<FormScreen>` di `src/components/ui.tsx`.
8. **Dedicated Floating Button "Presensi Sekarang" di Tengah Tab Bar:** Tab bar praktikan memiliki tombol magenta bundar di tengah (mengambang di atas tab bar) yang langsung membuka kamera presensi untuk sesi yang sedang `dibuka` dan praktikan menjadi peserta. Jika tidak ada sesi aktif, tombol disabled dengan tooltip "Tidak ada sesi aktif".
9. **Klik Notifikasi Langsung Buka Absen:** Sudah tercakup di poin 2 (deep linking `sesi_dibuka` → `/presensi/[sessionId]`).
10. **Auto-Hapus Sesi Selesai, Log Dipertahankan:** endpoint Vercel `POST /api/cleanup-sessions` (dipanggil cron-job.org tiap 6 jam dengan header `x-cron-secret`) menghapus dokumen `sessions` yang `status=ditutup` **atau** `jamSelesai+TOLERANSI_TUTUP_MENIT` sudah lewat 24 jam. Koleksi `attendances`, `leaveRequests`, `fines`, `notifications` TIDAK ikut dihapus — data historis tetap bisa dibaca via field `sessionSnapshot` yang didenormalisasi (nama praktikum, tanggal, jam) langsung di dokumen `attendances`/`fines` saat mereka dibuat.

---

## 3. Standar Rekayasa (Lanjutan Sprint 3)

### 3.1 Resilience, Idempotency, & Transaksi Atomik
- **Idempotent Document IDs:** Semua koleksi antar-entitas memakai ID komposit deterministik:
  - `attendances/{sessionId}_{uid}`
  - `leaveRequests/{sessionId}_{uid}`
  - `fines/{sessionId}_{uid}`
  - `payments/{orderId}` (orderId = `fine_{sessionId}_{uid}_{epochMs}`)
  - `sessionSecrets/{sessionId}`
- **Atomic Batch & Transaction:**
  - Membuat presensi WAJIB atomik: dalam `runTransaction`, (1) baca `leaveRequests/{sessionId_uid}` — jika `menunggu` → hapus; (2) hitung keterlambatan; (3) tulis `attendances`; (4) jika terlambat → tulis `fines` sekaligus.
  - Memutuskan izin `diterima` WAJIB atomik: dalam `runTransaction`, baca `fines/{sessionId_uid}` — jika ada `pending` → ubah `status=dibatalkan_izin`.
  - Webhook Midtrans WAJIB idempotent: cek `payments/{orderId}.status` sebelum mengubah; webhook yang sama dapat masuk berkali-kali.
- **In-Flight Submission Lock:** `isSubmittingRef.current = true` pada semua aksi tulis (Buka/Tutup Sesi, Presensi, Ajukan/Putuskan Izin, Simpan Lab, Bulk Insert Commit, Bayar Sekarang).

### 3.2 Backend (Vercel Serverless Functions)
- Project directory baru: `backend-vercel/` (TypeScript, Node 20). PM menyiapkan scaffolding + deploy pertama ke Vercel Hobby plan.
- Autentikasi: setiap endpoint yang butuh user context memverifikasi Firebase ID token manual via `lib/auth.ts` (bukan `onCall` context seperti Firebase Functions).
- Akses Firestore: via Firebase Admin SDK (`lib/firebase-admin.ts`), credential dibaca dari env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) yang di-set di dashboard Vercel.
- Daftar endpoint yang harus ada di Sprint 4:
  | Nama Endpoint | Method | Deskripsi |
  |---|---|---|
  | `/api/midtrans-create` | `POST` (Bearer token) | Menerima `{fineId}`, memanggil Midtrans Snap API dengan Server Key, mengembalikan `{snapToken, redirectUrl}`. |
  | `/api/midtrans-webhook` | `POST` (no auth, signature verified) | Menerima notifikasi Midtrans, verifikasi `signature_key = sha512(order_id+status_code+gross_amount+ServerKey)`, update `fines/{id}` + buat `notifications`. |
  | `/api/refresh-fine-status` | `POST` (Bearer token) | Praktikan menekan "Perbarui Status" → poll `snap.transaction.status(orderId)` → sinkron ke Firestore. |
  | `/api/cleanup-sessions` | `POST` (header `x-cron-secret`) | Dipanggil cron-job.org tiap 6 jam. Menghapus `sessions` yang `ditutup`/lewat batas, selektif (tanpa menyentuh koleksi anak). |
- **Trigger notifikasi (`sesi_dibuka`, `izin_diterima`/`ditolak`, `tagihan_baru`, `pembayaran_sukses`) TIDAK pindah ke backend** — tetap dipanggil dari client aplikasi (pattern Sprint 1-3 pakai Expo Push), karena Vercel tidak punya Firestore triggers seperti Firebase Functions. Konsekuensi: setiap tempat yang menulis event di client WAJIB memanggil helper `kirimNotifPush()` secara eksplisit.
- **Secret keys** (`MIDTRANS_SERVER_KEY`, `FIREBASE_PRIVATE_KEY`, `CRON_SECRET`) di-set di dashboard Vercel Settings > Environment Variables untuk production, dan di `backend-vercel/.env.local` (di-ignore git) untuk testing lokal via `vercel dev`. **DILARANG** menaruh key apa pun di `.env.local` React Native kecuali Client Key Midtrans.

### 3.3 Graceful Degradation
- Midtrans timeout/5xx di `/api/midtrans-create` → kembalikan error yang ditampilkan sebagai `DeviceStatusCard` "Gagal membuat tagihan, coba lagi".
- Midtrans webhook gagal masuk → praktikan masih bisa melihat status pembayaran dengan menekan tombol "Perbarui Status" yang memanggil endpoint `/api/refresh-fine-status` (polling Midtrans Status API).
- AI sentimen timeout → `sentimenAi: null`, izin tetap tersimpan.
- FCM push gagal → fallback banner in-app via dokumen `notifications` (perilaku yang sudah ada di Sprint 3, dipertahankan).

### 3.4 Observability & Zero-Trust
- `Logger` di `src/utils/logger.ts` ditambah domain baru: `PAY` (payment) dan `AI_SENTIMEN`.
- `firestore.rules` diperluas untuk:
  - Role `aslab`: boleh CRUD `labs`, `users` (set role), `classes`, `appConfig/runtime`; TIDAK boleh menulis `attendances`, `fines`, `payments`.
  - Role `asprak` (dulu `asisten`): boleh update `sessions` (hanya sesi miliknya), `leaveRequests` (hanya field status/decision), baca `fines` (semua di lab yang dia pegang); TIDAK boleh mengubah `labs` atau `users`.
  - Role `praktikan`: hanya baca data miliknya + sesi yang memuat `pesertaIds`.
  - `fines`: `create` boleh dari client praktikan (ownership check di rules + validasi menitTerlambat > 0), karena di arsitektur Vercel tidak ada Firestore trigger otomatis. Backend Vercel bypass rules via Admin SDK untuk update status pembayaran. `update` ke `paid`/`failed`/`cancelled` HANYA via endpoint Vercel (Admin SDK).
- Semua waktu kritis (`waktuPresensi`, `createdAt`, `paidAt`, `issuedAt`) memakai `serverTimestamp()`.

### 3.5 Maintainability
- `useFocusEffect` untuk watchPositionAsync di Peta (sudah ada di Sprint 3).
- `npx tsc --noEmit` dan `npx expo lint` wajib 0 error / 0 warning.
- Tipe `any` dilarang total — gunakan `unknown` + type guard.

---

## 4. Skema Data Cloud Firestore (Revisi Sprint 4)

> Perubahan dari Sprint 3 ditandai 🆕 (baru) / 🔄 (berubah) / ❌ (dihapus).

| Koleksi | ID | Field |
|---|---|---|
| `users` | `uid` | 🔄 `nama`, `nim`, `role` (`aslab`/`asprak`/`praktikan`), `email`, `pushTokens` (array), `kelas` (A1–F2, khusus praktikan — sudah ada dari sprint 3), 🆕 `labIds` (array `labId` — khusus `aslab`/`asprak`: lab yang dia kelola/pegang), 🆕 `aslabParentId` (uid aslab yang mengangkatnya, khusus `asprak`) |
| `labs` | `labId` | `namaLab`, `deskripsi`, `latitude`, `longitude`, `radiusMeter`, 🆕 `gracePeriodMenit` (default 15), 🆕 `dendaNominal` (default 10000), 🆕 `aslabId` (uid aslab pemilik), 🆕 `subKelas` (array string — subkelas valid di lab ini, misal `['B1','B2']`), `updatedBy`, `updatedAt` |
| `classes` | auto | `praktikum`, `labId`, `kelasLab` (`'A1'..'F2'`), 🆕 `asprakId` (uid asprak pengampu), `pesertaIds` (derived dari `users.kelas`) |
| `pengajuanKelas` | `uid` praktikan | `userId`, `nama`, `nim`, `kelasLama`, `kelasBaru`, `alasan`, `asistenIds`, `status`, `createdAt`, `diputuskanOleh`, `diputuskanAt` — **sudah ada dari sprint 3 akhir, dipertahankan** |
| `sessions` | auto | `kelasId`, `praktikum`, `labId`, `kelasLab`, `tanggal`, `jamMulai`, `jamSelesai`, 🔄 `asprakId` (dulu `asistenId`), `asprakNama`, `pesertaIds`, `status`, `updatedAt` |
| `sessionSecrets` | `sessionId` | `kodeSesi`, `asprakId`, `updatedAt` |
| `attendances` | `sessionId_uid` | `sessionId`, `userId`, `waktuPresensi`, `jarakMeter`, `radiusSaatPresensi`, `metode`, 🆕 `terlambat` (boolean), 🆕 `menitTerlambat` (number), 🆕 `sessionSnapshot` ({praktikum, tanggal, jamMulai, jamSelesai, labNama}) |
| `leaveRequests` | `sessionId_uid` | `sessionId`, `userId`, `alasan`, `kategoriAi` (`sakit`/`izin`/null), 🆕 `sentimenAi` (`positif`/`netral`/`negatif`/null), `status`, `createdAt`, `diputuskanOleh`, `diputuskanAt` |
| 🆕 `fines` | `sessionId_uid` | `sessionId`, `userId`, `nominal`, `status` (`pending`/`success`/`failed`/`expired`/`dibatalkan_izin`), `issuedAt`, `paidAt` (nullable), `orderId` (nullable), `sessionSnapshot`, `dibatalkanAlasan` (nullable) |
| 🆕 `payments` | `orderId` | `fineId`, `userId`, `nominal`, `provider` (`midtrans`), `snapToken`, `redirectUrl`, `transactionStatus` (`pending`/`settlement`/`cancel`/`expire`/`deny`/`failure`), `transactionId` (dari Midtrans), `paymentType` (`gopay`/`bank_transfer`/...), `createdAt`, `updatedAt`, `rawCallback` (map, log webhook terakhir) |
| `notifications` | auto | `targetUserIds`, `title`, `body`, `type` (lihat 4.1), 🆕 `payload` (map — misal `{sessionId}`/`{fineId}`), `sessionId`, `createdAt`, `readBy`, 🆕 `hiddenFor` (array uid — notifikasi yang sudah dihapus tiap user) |
| `appConfig` | `runtime` | `enforceMockLocationBlock`, `gpsAccuracyBufferMeter`, `useOsmFallbackTiles`, `aiTimeoutMs`, 🆕 `dendaDefault` (fallback bila lab tidak set), 🆕 `gracePeriodDefault`, 🆕 `midtransClientKey` (Client key saja, aman di client) |

### 4.1 Daftar `notifications.type` yang didukung (dengan deep link target)
| `type` | Target screen | Payload wajib |
|---|---|---|
| `sesi_dibuka` | `/presensi/[sessionId]` | `{sessionId}` |
| `jadwal_berubah` | `/(tabs)/jadwal/[id]` | `{sessionId}` |
| `izin_diterima` | `/(tabs)/izin` (tab Riwayat) | `{leaveRequestId}` |
| `izin_ditolak` | `/(tabs)/izin` (tab Riwayat) | `{leaveRequestId}` |
| `kelas_diputuskan` | `/(tabs)/profil` (section pengajuan) | `{pengajuanId}` — existing sprint 3 |
| 🆕 `kelas_dipindah_aslab` | `/(tabs)/profil` | `{kelasLama, kelasBaru}` |
| `tagihan_baru` | `/tagihan/[fineId]` | `{fineId}` |
| `pembayaran_sukses` | `/profil/pembayaran` | `{fineId, orderId}` |
| `pembayaran_gagal` | `/tagihan/[fineId]` | `{fineId, orderId}` |

### 4.2 Role & Migrasi
- `User.role` di-perluas menjadi `'aslab' | 'asprak' | 'praktikan'`.
- Semua dokumen `users` lama yang `role='asisten'` dimigrasi menjadi `role='asprak'` pada aplikasi pertama kali startup via **lazy write-through** (jika pembaca mendeteksi `role==='asisten'`, otomatis `updateDoc` menjadi `'asprak'` — selama aturan rules mengizinkan user mengubah role sendiri HANYA dari `asisten`→`asprak`).
- Role `aslab` TIDAK dapat diperoleh via self-registration — hanya via *promosi* dari Aslab yang sudah ada, atau via setup awal dengan Firestore Console. Seeder PM dapat membuat satu akun `aslab` default dengan email tertentu.

---

## 5. Aturan Bisnis Sprint 4

### 5.1 Manajemen Lab oleh Aslab (Kebutuhan 1)
- **Konsep kelas:** Satu Lab fisik (misal **Lab B**) menampung beberapa sub-kelas (`B1`, `B2`). Praktikan ter-assign ke satu `users.kelas` (misal `B1`); peserta sesi diturunkan dari `users.kelas === sessions.kelasLab`. Daftar kelas valid ada di `src/constants/kelas.ts` (A1–F2).
- **CRUD Lab:**
  - **Create single:** Aslab menekan `+ Tambah Lab` di halaman Kelola Lab → bottom sheet form (nama, lokasi, radius, grace, denda, `subKelas`) → simpan ke `labs/{slug}`.
  - **Create bulk:** Aslab mengunduh template CSV (`template_lab.csv` kolom: `id,namaLab,deskripsi,latitude,longitude,radiusMeter,gracePeriodMenit,dendaNominal,subKelas`), mengisi, mengunggah → aplikasi parse CSV → tampilkan **scroll view hasil parse** di mana tiap baris memiliki badge valid/invalid, tombol *Accept* / *Deny*, dan field editable untuk melengkapi data kosong → tombol "Simpan X Lab Terpilih" (writeBatch).
  - **Update / Delete:** Aslab mengubah koordinat/radius/grace dengan aturan **DITOLAK** jika ada sesi `dibuka` pada lab tsb (perilaku Sprint 3 dipertahankan). Delete dilarang jika lab masih dirujuk sesi masa depan.
- **Bulk Insert Praktikan:**
  - Template `template_praktikan.csv`: kolom `nama,nim,email,kelas` (kelas wajib valid A1–F2).
  - Setelah di-parse dan di-accept, Aslab memasukkan data ke koleksi `users` dengan `role='praktikan'` + `kelas`. Karena praktikan belum login, `uid` dibuat deterministik dari `nim` (`praktikan-{nim}`); saat praktikan tsb login dengan Google/email, aplikasi melakukan rekonsiliasi (lookup by `nim` → merge `uid`).
- **Bulk Insert Asprak:**
  - Template `template_asprak.csv`: kolom `nama,nim,email,kelas,labId`.
  - Sama seperti praktikan, dengan `role='asprak'` + `aslabParentId=<uid aslab yang mengunggah>` + `labIds` berisi lab yang dipegang.
- **Pindah Praktikan (Jalur Aslab — top-down, tanpa pengajuan):**
  - Halaman "Distribusi Praktikan" — Aslab memilih praktikan → tombol "Pindahkan ke Kelas…" → pilih `kelasBaru` → `writeBatch`:
    1. `users/{uid}.kelas = kelasBaru`;
    2. Untuk setiap sesi masa depan `status='belum_dibuka'` yang `kelasLab==kelasLama` → remove uid dari `pesertaIds`;
    3. Untuk setiap sesi masa depan `status='belum_dibuka'` yang `kelasLab==kelasBaru` → add uid ke `pesertaIds`;
    4. Tulis `notifications` tipe `kelas_dipindah_aslab` ke praktikan tsb.
  - **Jadwal/sesi lama (yang sudah berlangsung atau ditutup) tidak diubah** — konsisten dengan spec Sprint 4 "tidak perlu ada perpindahan jadwal praktikum".
  - **Berbeda dari jalur praktikan→asprak (koleksi `pengajuanKelas`, existing):** tidak butuh approval, tidak membuat dokumen `pengajuanKelas`. Keduanya berdampingan — Aslab bisa pakai jalur manapun.
- **Set Radius & Grace:** via halaman Kelola Lab yang sudah ada (ditambah field `gracePeriodMenit` dan `dendaNominal`).

### 5.2 Dashboard Keberlangsungan Lab (Kebutuhan 2)
- Halaman `/(tabs)/dashboard` tab utama khusus Aslab.
- Konten minimum (semua real-time via `onSnapshot`, difilter oleh `labIds` yang dikelola Aslab tsb):
  - **Kartu Statistik Atas:** Jumlah Lab · Jumlah Praktikan · Jumlah Asprak · Sesi Sedang Berlangsung.
  - **Grafik Keuangan:** Total denda `pending` vs `success` vs `expired`, dalam rupiah, filter tombol pil **Hari Ini / Minggu Ini / Bulan Ini**.
  - **Status Kegiatan per Lab:** List Lab + indikator (hijau=ada sesi berlangsung, kuning=sesi berikutnya hari ini, abu=kosong).
  - **Jadwal Sedang Berlangsung & Yang Akan Datang:** 2 bagian di bawah list lab, menampilkan sesi `dibuka` dan sesi `belum_dibuka` terdekat.
  - **Riwayat Kegiatan:** 10 sesi terakhir yang statusnya `ditutup` (dibaca dari `attendances.sessionSnapshot` karena dokumen `sessions` sudah dihapus).
  - **Riwayat Keuangan Denda:** 10 transaksi `fines.status=success` terbaru.

### 5.3 Pengelolaan Sesi oleh Asprak (Kebutuhan 3)
- Hanya sesi dengan `asprakId === currentUser.id` yang muncul di daftar milik Asprak.
- Asprak TIDAK dapat mengakses halaman `/kelola-lab` (tombol tidak muncul), TIDAK dapat melihat Dashboard Aslab.
- Buka/tutup sesi, pantau presensi real-time — tetap mengikuti perilaku Sprint 3 + menyimpan `sessionSnapshot` di `attendances` saat presensi dibuat.

### 5.4 Keterlambatan & Denda (Kebutuhan 4)
- **Perhitungan:**
  ```ts
  menitTerlambat = Math.max(
    0,
    Math.floor((waktuPresensi - sessionJamMulai) / 60000) - lab.gracePeriodMenit
  );
  terlambat = menitTerlambat > 0;
  ```
- Jika `terlambat === true`, dalam transaksi atomik yang sama dengan pembuatan `attendances`, buat `fines/{sessionId_uid}`:
  ```ts
  {
    sessionId, userId,
    nominal: lab.dendaNominal ?? appConfig.dendaDefault,
    status: 'pending',
    issuedAt: serverTimestamp(),
    orderId: null, paidAt: null,
    sessionSnapshot: { praktikum, tanggal, jamMulai, labNama }
  }
  ```
- **Satu kejadian = satu tagihan:** `fines` ber-ID `sessionId_uid` menjamin idempotensi; `set` dengan `{merge:false}` dan di-guard oleh `if(!existing)` di transaksi.
- **Izin diterima membatalkan denda:** `onLeaveRequestDecided` + transaksi klien asprak melihat `fines/{sessionId_uid}` — jika `pending`, ubah `status=dibatalkan_izin`. Jika sudah `success`, denda TIDAK dikembalikan (praktikan sudah bayar; keputusan bisnis).
- **Batas keputusan izin H+3 (dari sprint 3 akhir, dipertahankan):** Asprak hanya dapat memutuskan izin dalam 3 hari sejak `sessions.tanggal`. Setelah H+3, pengajuan `menunggu` otomatis dibekukan (tidak bisa `diterima`/`ditolak`), dan denda yang sudah tercipta **tetap valid** (tidak otomatis dibatalkan).
- Praktikan dengan izin `diterima` → tetap `excused absence`, TIDAK pernah `Hadir`.

### 5.5 Payment Gateway Midtrans Sandbox (Kebutuhan 5)
- **Alur:**
  1. Halaman `/tagihan/[fineId]` — tombol "Bayar Sekarang" memanggil `POST ${EXPO_PUBLIC_VERCEL_BASE_URL}/api/midtrans-create` dengan header `Authorization: Bearer <firebaseIdToken>` dan body `{fineId}`.
  2. Endpoint Vercel memverifikasi ID token via Firebase Admin Auth, memvalidasi `fines.userId === auth.uid` dan `fines.status === 'pending'`, menghitung `orderId = fine_{sessionId}_{uid}_{Date.now()}`, memanggil `POST https://app.sandbox.midtrans.com/snap/v1/transactions` dengan `transaction_details.order_id`, `gross_amount`, `customer_details`.
  3. Endpoint menulis dokumen `payments/{orderId}` dengan `transactionStatus=pending` + `snapToken` + `redirectUrl` (via Admin SDK — bypass firestore.rules).
  4. Endpoint mengembalikan JSON `{snapToken, redirectUrl, orderId}` ke klien.
  5. Klien membuka `redirectUrl` via `expo-web-browser` `openBrowserAsync()` (bukan `WebBrowser` menggunakan WebView; Midtrans Snap memerlukan browser penuh untuk VA/QR flow).
  6. Praktikan menyelesaikan pembayaran di Midtrans Sandbox.
  7. Midtrans memanggil webhook `POST ${EXPO_PUBLIC_VERCEL_BASE_URL}/api/midtrans-webhook` → verifikasi `signature_key = sha512(order_id + status_code + gross_amount + ServerKey)`.
  8. Webhook mengupdate `payments/{orderId}` + `fines/{fineId}` sesuai mapping:
     | Midtrans `transaction_status` | `fines.status` |
     |---|---|
     | `capture` / `settlement` | `success` |
     | `pending` | `pending` |
     | `cancel` / `deny` / `expire` | `failed` / `expired` |
     | `refund` | (tidak terjadi di sandbox) |
  9. Webhook membuat dokumen `notifications` (tipe `pembayaran_sukses`/`pembayaran_gagal`). Push ke device TIDAK ditangani webhook — client aplikasi yang listen perubahan `notifications` akan trigger push via Expo Push (pattern Sprint 1-3).
- **Tombol "Perbarui Status":** Jika webhook belum masuk, klien memanggil `POST ${EXPO_PUBLIC_VERCEL_BASE_URL}/api/refresh-fine-status` dengan `{fineId}` → endpoint memanggil `GET /v2/{order_id}/status` Midtrans dan sinkronisasi manual.

### 5.6 Notifikasi & Riwayat Pembayaran (Kebutuhan 6)
- Setiap event `fines.status` berubah → webhook Vercel tulis `notifications`; client aplikasi listen koleksi `notifications` dan kirim Expo Push (pattern Sprint 1-3).
- Halaman `/profil/pembayaran` menampilkan daftar `fines` + `payments` milik praktikan (semua status), dengan filter `success` / `pending` / `failed`.
- Persistensi: data berasal dari Firestore, otomatis tersimpan.

### 5.7 AI Analisis Sentimen (Kebutuhan 7)
- **Tetap** pakai klasifikasi kategori (`sakit`/`izin`) dari Sprint 2/3 di `src/services/ai.ts` (endpoint HTTP `EXPO_PUBLIC_AI_BASE_URL`).
- **Tambahan:** label sentimen `positif`/`netral`/`negatif` sebagai informasi pendukung Asprak.
  - **Opsi A (direkomendasikan jika asprak praktikum memberikan endpoint HTTP):** panggil endpoint sentimen yang sama / tambahan dengan prompt berbeda; hasil disimpan di `leaveRequests.sentimenAi`.
  - **Opsi B (fallback jika asprak tidak menyediakan HTTP):** gunakan model on-device dari referensi https://github.com/Doctor3131/ppk-rn-expo-58/tree/main/ai — LinearSVC on-device (file `sentiment.js` + `model-edom.json` dibundel di `src/services/sentiment/`). Keuntungan: tidak perlu API key, latency rendah. Kekurangan: label `netral` lemah, status `experimental`.
  - Sketsa Opsi B (JS murni, tanpa network call):
    ```js
    import {createSentimentClassifier} from '@/services/sentiment/sentiment';
    import model from '@/services/sentiment/model-edom.json';
    const prediksi = createSentimentClassifier(model);
    const hasil = prediksi(alasan);
    // hasil = {label: 'positif'|'netral'|'negatif'|null, status, scores, experimental}
    ```
- Hasil AI (kategori + sentimen) hanya *advisory*; keputusan izin tetap tanggung jawab Asprak.
- Timeout tetap 10 detik (dari `appConfig.aiTimeoutMs`), hasil `null` tidak memblokir penyimpanan.

### 5.8 Penanganan Izin Perangkat & Perbaikan UX (Kebutuhan 7 sprint 3 + eval sprint 3)
- Semua kondisi perangkat (`DeviceStatusCard`) dari Sprint 3 dipertahankan.
- **KeyboardAvoidingView wajib** di semua layar form (lihat Bab 2 poin 7).
- **Floating action button "Presensi Sekarang"** di tab bar praktikan (lihat Bab 2 poin 8) — PM menyiapkan modifikasi `floating-tab-bar.tsx`.

---

## 6. Prasyarat & Setup

### 6.1 Prasyarat Node/Firebase/Vercel
- Node.js 20+ (sama di sisi React Native dan backend Vercel).
- Firebase CLI terbaru: `npm i -g firebase-tools` (untuk deploy `firestore:rules` + `firestore:indexes`).
- Vercel CLI terbaru: `npm i -g vercel` (untuk deploy backend).
- Akun Vercel (Hobby plan gratis via GitHub login) + akun cron-job.org (gratis).
- Project Firebase **TIDAK PERLU** upgrade Blaze karena backend pindah ke Vercel. Spark plan cukup untuk Auth + Firestore + FCM.

### 6.2 Setup Midtrans Sandbox
1. Daftar di https://dashboard.sandbox.midtrans.com/
2. Ambil **Server Key** dan **Client Key** dari Settings → Access Keys.
3. Server Key: set di dashboard Vercel Settings > Environment Variables sebagai `MIDTRANS_SERVER_KEY` (atau simpan di `backend-vercel/.env.local` untuk testing lokal via `vercel dev`).
4. Client Key disimpan di `appConfig/runtime.midtransClientKey` (dibaca aplikasi) — aman untuk dibaca praktikan.
5. Set Payment Notification URL di dashboard Midtrans → `https://hadirku-backend.vercel.app/api/midtrans-webhook`.

### 6.3 Instalasi Paket Baru
```bash
# React Native side
npx expo install expo-web-browser expo-linking
# (expo-notifications sudah ada dari sprint 3)

# Backend Vercel side
cd backend-vercel
npm install   # firebase-admin, midtrans-client, @vercel/node
```

### 6.4 ENV Baru di `.env.local` (React Native)
```
EXPO_PUBLIC_AI_BASE_URL=https://aotianzz.xyz/v1       # tetap, dari sprint 2
EXPO_PUBLIC_AI_API_KEY=...                            # tetap
EXPO_PUBLIC_AI_MODEL=gpt-5.4-mini                     # tetap
EXPO_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx     # BARU
EXPO_PUBLIC_MIDTRANS_IS_PRODUCTION=false              # BARU
EXPO_PUBLIC_VERCEL_BASE_URL=https://hadirku-backend.vercel.app  # BARU
```

### 6.5 ENV Baru di Dashboard Vercel (production) & `backend-vercel/.env.local` (lokal)
```
MIDTRANS_SERVER_KEY=SB-Mid-server-xxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
MIDTRANS_IS_PRODUCTION=false
FIREBASE_PROJECT_ID=hadirku-8aa3e
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@hadirku-8aa3e.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n
CRON_SECRET=<random 48 char string>
ALLOWED_ORIGIN=*
```

---

## 7. Deep Linking Konfigurasi
Tambahkan `scheme: "hadirku"` sudah ada di `app.json`. Konfigurasi ekstra di `src/services/notifications.ts`:
```ts
Notifications.addNotificationResponseReceivedListener((response) => {
  const {type, payload} = response.notification.request.content.data;
  switch(type) {
    case 'sesi_dibuka':      router.push(`/presensi/${payload.sessionId}`); break;
    case 'jadwal_berubah':   router.push(`/(tabs)/jadwal/${payload.sessionId}`); break;
    case 'tagihan_baru':
    case 'pembayaran_gagal': router.push(`/tagihan/${payload.fineId}`); break;
    case 'pembayaran_sukses':router.push(`/profil/pembayaran`); break;
    case 'izin_diterima':
    case 'izin_ditolak':     router.push(`/(tabs)/izin`); break;
  }
});
```
Payload WAJIB disertakan di push message `data` oleh client aplikasi yang trigger notifikasi (pattern Sprint 1-3 pakai Expo Push). Webhook Vercel hanya menulis dokumen `notifications` di Firestore; client yang listen dan kirim push.

---

## 8. Checklist QA (Wajib Lolos Sebelum Demo)

1. **Role Aslab vs Asprak vs Praktikan:** Login dengan 3 akun berbeda → tab bar, menu, permission, dan Firestore access sesuai rules; Asprak tidak bisa mengubah Lab; Praktikan tidak melihat Dashboard.
2. **Bulk Insert:** Unggah CSV 20-baris berisi data valid+invalid → scroll view menampilkan tiap baris dengan status; hanya baris yang di-*accept* tersimpan ke Firestore.
3. **Perpindahan Praktikan:** Praktikan A di Lab 1 → dipindahkan ke Lab 2 → cek `users/A.labIds` dan kedua `labs.pesertaIds`; jadwal lama tidak otomatis ikut.
4. **Grace Period & Denda:** Presensi tepat waktu → no `fines`. Presensi 1 menit lewat batas → `fines` otomatis tercipta dengan nominal sesuai lab. Dua presensi berurutan di sesi yang sama tidak membuat dua `fines`.
5. **Pembayaran:** Midtrans Sandbox → finish payment → webhook hit → `fines.status=success` + push notification. Simulasikan webhook 2x (replay) → `fines` tetap `success`, tidak duplikat `notifications`.
6. **Deep Linking:** Dari status bar HP, tap notifikasi `sesi_dibuka` saat app di background → app terbuka langsung di `/presensi/[sessionId]`, bukan `/(tabs)/jadwal`.
7. **Limit 3 di Profil + Hapus:** Profil menampilkan 3 notif; swipe delete menambahkan uid ke `notifications.hiddenFor`; layar `/notifikasi` menampilkan sisa + yang dihapus tidak tampil.
8. **Expand Tahun:** Buat sesi tanggal 6 bulan ke depan → DateTimeField bisa navigasi tahun; sesi muncul di kalender Beranda bulan tsb.
9. **Keyboard:** Di layar pengajuan izin, fokus ke field alasan saat keyboard terbuka → field tetap terlihat, tidak tertutup.
10. **Floating Button Absen:** Tap tombol tengah saat ada sesi `dibuka` di mana user adalah peserta → langsung buka kamera presensi.
11. **Auto-Delete Sesi:** Jalankan Cloud Scheduler manual (`firebase functions:shell` → `cleanupFinishedSessions()`) → sesi `ditutup` 25 jam lalu hilang; tapi daftar `attendances` tetap bisa dilihat di Catatan Praktikan dengan `sessionSnapshot` menampilkan info sesi.
12. **AI Sentimen Timeout:** Matikan WiFi → ajukan izin → setelah 10 detik, dokumen `leaveRequests` tersimpan dengan `sentimenAi=null`; tidak error ke user.
13. **TypeScript & Lint:** `npx tsc --noEmit` dan `npx expo lint` di root + `cd functions && npm run build` wajib 0 error.

---

## 9. Yang DI LUAR Sprint 4

- Refund otomatis setelah izin disetujui pasca-pembayaran (keputusan bisnis: denda sudah dibayar tidak dikembalikan).
- Multi-currency.
- Push notification iOS (project ini target Android development build; iOS best-effort).
- Chat/komunikasi Aslab ↔ Asprak ↔ Praktikan.
- Backup & restore manual via aplikasi.
- OTA update (akan di-handle via EAS Update terpisah).

---

## 10. Infrastruktur Testing (Sudah Ada, Pertahankan)

Akhir Sprint 3 menambahkan infrastruktur testing yang WAJIB dipakai di Sprint 4:
- **Jest unit tests** di `__tests__/` — setiap fungsi utility baru (`keterlambatan.ts`, `csv.ts`, dsb.) WAJIB punya minimal 1 unit test.
- **Maestro flow tests** di `.maestro/` — setiap alur demo baru (bayar denda, perpindahan aslab, bulk insert) WAJIB punya minimal 1 flow Maestro.
- Perintah: `npm test` (Jest), `maestro test .maestro/<flow>.yaml`.

---

## 11. Referensi

- **Sprint 1:** `docs/SRS-Sprint-1.md` (studi kasus awal + kontrak tipe)
- **Sprint 2:** `docs/SRS-Sprint-2.md` (Firebase, AI klasifikasi izin)
- **Sprint 3:** `docs/SRS Sprint 3.md` (lokasi hard-blocking, FCM, peta)
- **DESIGN Sprint 3:** `docs/DESIGN Sprint 3.md`, `docs/DESIGN.md` (token tema, komponen UI)
- **Midtrans Snap Docs:** https://docs.midtrans.com/reference/getting-started-snap
- **Midtrans Signature Verification:** https://docs.midtrans.com/reference/http-notification
- **Vercel Serverless Functions (TypeScript / Node):** https://vercel.com/docs/functions
- **Vercel Environment Variables:** https://vercel.com/docs/projects/environment-variables
- **cron-job.org (external scheduler):** https://docs.cron-job.org/en/rest-api.html
- **Firebase Admin SDK (verify ID token):** https://firebase.google.com/docs/auth/admin/verify-id-tokens
- **Expo WebBrowser:** https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/
- **Expo Notifications (deep linking):** https://docs.expo.dev/versions/v57.0.0/sdk/notifications/#handling-incoming-notifications
- **Push Notification Rich (referensi sprint 3):** https://medium.com/@silverskytechnology/rich-push-notifications-in-react-native-a-complete-guide-797dd9747366
- **AI Sentimen On-Device (opsional):** https://github.com/Doctor3131/ppk-rn-expo-58/tree/main/ai — `sentiment.js` + `model-edom.json` (LinearSVC, 3 kelas: positif/netral/negatif, status `research_baseline`).

---

**Pelajari dokumen ini sampai paham, baru mulai ngoding. Setiap keraguan tanyakan ke PM (Varissa) sebelum PR dibuat.**
