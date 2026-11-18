# SRS Sistem Informasi Praktikum — Sprint 3

Melanjutkan pengembangan aplikasi mobile **HadirKu** (React Native + Expo + Firebase) dari Sprint 1 dan Sprint 2 dengan fokus pada **Presensi Berbasis Lokasi (Hard-Blocking Geolocation)**, **Peta Laboratorium Interaktif**, **Push Notification (Firebase Cloud Messaging)**, perbaikan catatan evaluasi Sprint 2 dari asisten praktikum, serta penerapan **standar arsitektur Production-Grade**.

- **PM:** Yustinus Hendi Setyawan (Fondasi, Kontrak Tipe, Komponen UI Baru, Feature Flags, Build APK, Integrasi & QA)
- **Programmer:**
  - **PIC A:** Yoas
  - **PIC B:** Annis Fakhiroh Akbar
  - **PIC C:** Varissa Nabila Kifli

---

## 1. Tujuan Demo

1. **Alur 1 — Presensi Berbasis Lokasi:** Asisten membuka sesi praktikum; praktikan membuka halaman khusus presensi yang terpisah dari detail sesi; aplikasi memeriksa lokasi perangkat terhadap titik koordinat dan radius laboratorium dari Firestore; presensi (via QR Code atau *fallback* kode 6 digit) hanya berhasil dicatat apabila seluruh ketentuan sesi dan radius lokasi terpenuhi; asisten melihat rekap kehadiran (*Hadir, Sakit, Izin, Alpha*) secara *real-time*.
2. **Alur 2 — Peta dan Informasi Laboratorium:** Pengguna membuka halaman Maps (Tab Peta); aplikasi menampilkan posisi pengguna yang bergerak *real-time* beserta marker seluruh laboratorium (**Gedung AP**, **Lab B**, **Lab C**, **Lab D**); pengguna memilih salah satu marker laboratorium; aplikasi menampilkan informasi praktikum yang sedang berlangsung dan praktikum berikutnya secara *real-time* berdasarkan data Firestore.
3. **Alur 3 — Notifikasi Kegiatan:** Asisten membuka sesi, mengubah jadwal praktikum, atau memberikan keputusan pengajuan izin (terima/tolak); sistem mendeteksi peristiwa tersebut dan mengirimkan *push notification* berbasis FCM kepada pengguna terkait; pengguna menerima pemberitahuan tersebut.

---

## 2. Perbaikan Evaluasi Sprint 2 & Pelunasan Tech Debt

1. **Form Tambah/Ubah Sesi Halaman Penuh (Bukan Pop-Up/Modal):**
   - Form pembuatan dan pengubahan sesi dilarang menggunakan pop-up (`Modal`), melainkan wajib berupa halaman layar penuh tersendiri (`src/app/jadwal/form.tsx`) tanpa tab bar.
2. **Pemilih Tanggal & Jam Interaktif (Tanpa Ketik Manual):**
   - Input tanggal (`YYYY-MM-DD`) dan jam (`HH:mm`) pada form sesi wajib menggunakan komponen pemilih tanggal dan waktu interaktif (`DateTimeField`), bukan diketik manual.
3. **Kalender Multi-Minggu & Expandable 30 Hari (Tidak Terkunci 1 Minggu):**
   - Kalender pada layar Beranda dan Buat Izin wajib mendukung navigasi lintas minggu (`<` Minggu Sebelumnya / Minggu Berikutnya `>`) serta fitur *expand/collapse* menjadi grid kalender bulanan penuh (30/35 hari) saat pil nama bulan diketuk.
4. **Restrukturisasi Kategori Izin & 4 Status Kehadiran (`Hadir`, `Sakit`, `Izin`, `Alpha`):**
   - **Kategori Pengajuan Izin & AI (`leaveRequests.kategoriAi`):** disederhanakan menjadi dua kategori: **`sakit`** dan **`izin`** (atau `null` jika AI timeout/gagal). Data lama dari Sprint 2 dengan kategori `keluarga`, `akademik`, atau `lainnya` otomatis dinormalisasi di sisi pembacaan UI menjadi `izin`.
   - **Status Akhir Kehadiran di Rekap Asisten & Catatan Praktikan:** setiap praktikan pada suatu sesi dikelompokkan ke dalam 4 status:
     1. **`Hadir`**: tercatat di koleksi `attendances`.
     2. **`Sakit`**: memiliki dokumen `leaveRequests` berstatus `diterima` dengan kategori `sakit`.
     3. **`Izin`**: memiliki dokumen `leaveRequests` berstatus `diterima` dengan kategori `izin` (atau `null`).
     4. **`Alpha`**: tidak tercatat di `attendances` dan tidak memiliki izin `diterima` **setelah** sesi berstatus `ditutup` (atau telah melewati `jamSelesai` + `TOLERANSI_TUTUP_MENIT`). Selama sesi masih `belum_dibuka` atau sedang `dibuka`, praktikan yang belum presensi tetap berstatus **`Belum Hadir`**, bukan `Alpha`.
5. **Isolasi Rahasia Sesi (`sessionSecrets`) & Penghapusan `AppProvider` Dummy:**
   - `kodeSesi` dipindahkan dari dokumen publik `sessions/{sessionId}` ke koleksi `sessionSecrets/{sessionId}` yang hanya dapat dibaca oleh peran `asisten`.
   - Seluruh kode *state dummy* Sprint 1 (`AppProvider`) dihapus total.

---

## 3. Standar Rekayasa

### 3.1 Resilience, Idempotency, & Transaksi Atomik
- **Idempotent Document IDs:** Koleksi `attendances` dan `leaveRequests` wajib memakai ID dokumen komposit deterministik `sessionId_uid`. Koleksi `sessionSecrets` memakai ID `sessionId`.
- **Atomic Batch & Transaction (`writeBatch` / `runTransaction`):**
  - Membuka sesi wajib menulis status `sessions/{sessionId}` dan kode `sessionSecrets/{sessionId}` dalam satu `writeBatch`.
  - Mencatat presensi wajib berjalan secara atomik: memeriksa dokumen izin `leaveRequests/{sessionId_uid}` (jika ada izin berstatus `menunggu`, otomatis dibatalkan/dihapus dalam transaksi yang sama) lalu menyimpan `attendances/{sessionId_uid}`.
- **In-Flight Submission Lock:** Setiap aksi tulis (Buka/Tutup Sesi, Kirim Presensi, Ajukan/Putuskan Izin, Simpan Lab) wajib menggunakan kunci referensi sinkron (`isSubmittingRef.current = true`) untuk mencegah *race condition* akibat ketukan ganda (*double-tap*).
- **Graceful Degradation (Tahan Kegagalan Parsial):**
  - Kegagalan/timeout API AI (>10 detik) menyimpan pengajuan izin dengan `kategoriAi: null` tanpa memunculkan error yang memblokir pengguna.
  - Kegagalan pemuatan tile Google Maps otomatis memiliki lapisan cadangan `<UrlTile>` OpenStreetMap agar peta tidak pernah kosong atau *crash*.
  - Kegagalan jaringan pengiriman FCM diimbangi dengan penulisan dokumen ke koleksi `notifications` sebagai *in-app notification fallback*.

### 3.2 Operational Readiness & Remote Feature Flags
- Sistem membaca dokumen konfigurasi `appConfig/runtime` dari Firestore (dengan *fallback* nilai *default* di `src/constants/config.ts`) sehingga PM dapat mengendalikan perilaku aplikasi saat demo tanpa mem-build ulang APK:
  - `enforceMockLocationBlock` (boolean, default `true`): memblokir *Fake GPS*.
  - `gpsAccuracyBufferMeter` (number, default `10`): toleransi tambahan akurasi GPS di dalam gedung jika sinyal GPS perangkat meleset.
  - `useOsmFallbackTiles` (boolean, default `false`): sakelar pengalih tile peta jika kuota Google Maps bermasalah.
  - `aiTimeoutMs` (number, default `10000`): batas tunggu maksimum klasifikasi AI.

### 3.3 Observability, Error Boundary, & Zero-Trust Security
- **Screen Error Boundary:** Komponen `ErrorBoundary` (`src/components/error-boundary.tsx`) membungkus modul kamera QR dan kanvas Peta agar error *runtime native* tidak menjatuhkan seluruh aplikasi, melainkan menampilkan kartu pemulihan dengan tombol *"Muat Ulang Layar"*.
- **Structured Logging (`src/utils/logger.ts`):** Setiap kegagalan tangkapan (`catch`) dicatat dengan format terstruktur `[DOMAIN][ACTION] message` (domain: `AUTH`, `GEO`, `MAP`, `FCM`, `FIRESTORE`, `AI`) untuk memudahkan *debugging* saat integrasi, sedangkan pengguna selalu menerima pesan bahasa Indonesia yang ramah.
- **Zero-Trust Security & Waktu Server:**
  - Seluruh pencatatan waktu kritis (`waktuPresensi`, `createdAt`, `updatedAt`, `diputuskanAt`) wajib menggunakan `serverTimestamp()`.
  - `firestore.rules` memvalidasi peran pengguna (`role`), kepemilikan dokumen, serta memastikan `jarakMeter <= radiusSaatPresensi` pada setiap pembuatan dokumen `attendances`.

### 3.4 Maintainability & Mobile Lifecycle Hygiene
- **Sensor & Listener Cleanup:** Pemantauan lokasi *real-time* (`Location.watchPositionAsync`) pada halaman Peta wajib dikelola di dalam `useFocusEffect` sehingga GPS otomatis berhenti memantau saat pengguna berpindah tab atau menutup layar.
- **Strict TypeScript & Linting:** Kode wajib lulus `npx tsc --noEmit` dan `npx expo lint` tanpa *warning* atau tipe `any`.

---

## 4. Skema Data Cloud Firestore

| Koleksi | ID Dokumen | Field |
| --- | --- | --- |
| `users` | `uid` | `nama`, `nim`, `role` (`asisten` / `praktikan`), `email`, `pushTokens` (array string, opsional) |
| `labs` | `labId` (`gedung-ap`, `lab-b`, `lab-c`, `lab-d`) | `namaLab`, `deskripsi` (opsional), `latitude` (number), `longitude` (number), `radiusMeter` (number), `updatedBy`, `updatedAt` |
| `classes` | `auto ID` | `praktikum`, `labId`, `kelasLab`, `asistenId`, `pesertaIds` (array `uid`) |
| `sessions` | `auto ID` | `kelasId`, `praktikum`, `labId`, `kelasLab`, `tanggal` (`YYYY-MM-DD`), `jamMulai` (`HH:mm`), `jamSelesai` (`HH:mm`), `asistenId`, `asistenNama`, `pesertaIds`, `status` (`belum_dibuka` / `dibuka` / `ditutup`), `updatedAt` |
| `sessionSecrets` | `sessionId` | `kodeSesi` (6 digit string), `asistenId`, `updatedAt` |
| `attendances` | `sessionId_uid` | `sessionId`, `userId`, `waktuPresensi` (Timestamp/ISO), `jarakMeter` (number), `radiusSaatPresensi` (number), `metode` (`qr` / `kode`) |
| `leaveRequests` | `sessionId_uid` | `sessionId`, `userId`, `alasan`, `kategoriAi` (`sakit` / `izin` / `null`), `status` (`menunggu` / `diterima` / `ditolak`), `createdAt`, `diputuskanOleh`, `diputuskanAt` |
| `notifications` | `auto ID` | `targetUserIds` (array `uid`), `title`, `body`, `type` (`sesi_dibuka` / `jadwal_berubah` / `izin_diterima` / `izin_ditolak`), `sessionId`, `createdAt`, `readBy` (array `uid`) |
| `appConfig` | `runtime` | `enforceMockLocationBlock`, `gpsAccuracyBufferMeter`, `useOsmFallbackTiles`, `aiTimeoutMs` |

---

## 5. Aturan Bisnis Sprint 3

### 5.1 Pengelolaan Lokasi Laboratorium (Kebutuhan 3)
- Setiap laboratorium disimpan di koleksi `labs` dengan informasi nama, koordinat (`latitude`, `longitude`), dan `radiusMeter`.
- Saat inisialisasi awal, sistem menyediakan 4 laboratorium default: **Gedung AP**, **Lab B**, **Lab C**, dan **Lab D** dengan radius default `50` meter.
- Asisten dapat mengubah titik lokasi laboratorium (dengan mengetuk peta atau menekan tombol *"Gunakan Lokasi Saya Saat Ini"*) dan mengatur radius presensi (`20` s/d `200` meter) melalui halaman **Kelola Laboratorium** (`src/app/kelola-lab.tsx`).
- Perubahan lokasi atau radius laboratorium **ditolak** apabila sedang ada sesi berstatus `dibuka` pada laboratorium tersebut.
- Pada halaman Tambah/Ubah Sesi (`src/app/jadwal/form.tsx`), pemilihan laboratorium menggunakan komponen **Dropdown (`SelectField`)** yang terhubung langsung ke koleksi `labs`.

### 5.2 Halaman Presensi & Validasi Lokasi Hard-Blocking (Kebutuhan 1 & 2)
- Halaman presensi praktikan dipisahkan dari halaman Detail Sesi menjadi halaman khusus `src/app/presensi/[sessionId].tsx`.
- Di halaman presensi, aplikasi memeriksa secara berurutan:
  1. Status sesi wajib `dibuka` dan belum melewati `jamSelesai` + `TOLERANSI_TUTUP_MENIT` (15 menit).
  2. Pengguna terdaftar di `pesertaIds`, belum tercatat di `attendances`, dan tidak memiliki izin berstatus `diterima` pada sesi tersebut.
  3. Izin lokasi perangkat diberikan dan layanan lokasi (GPS) aktif.
  4. Lokasi perangkat bukan berasal dari *Mock Location / Fake GPS* (`location.mocked === false` bila flag `enforceMockLocationBlock` aktif).
  5. Jarak Haversine dari koordinat perangkat ke koordinat `labs/{session.labId}` berada di dalam radius yang diizinkan (`jarakMeter <= lab.radiusMeter`).
- **Hard-Blocking:**
  - Aplikasi wajib menampilkan kartu hasil pemeriksaan lokasi secara *real-time* (jarak pengguna saat ini, batas radius lab, dan status apakah di dalam atau di luar radius).
  - Apabila praktikan berada di luar radius, lokasi gagal diperoleh, GPS nonaktif, atau izin ditolak, fitur presensi (baik Pindai QR maupun Ketik Kode) **dikunci sepenuhnya** dan tidak boleh dicatat ke Firestore.
- **Eksekusi Presensi:**
  - Saat seluruh syarat terpenuhi, pemindai **QR Code** aktif sebagai metode utama, didampingi opsi sekunder *"Kamera bermasalah? Ketik kode 6 digit"* (`DigitBoxes`).

### 5.3 Peta Laboratorium Interaktif & Aktivitas Lab (Kebutuhan 4 & 5)
- Halaman Peta tersedia pada tab utama **Peta** (`src/app/(tabs)/peta.tsx`) untuk kedua peran.
- Menampilkan marker lokasi pengguna yang diperbarui mengikuti pergerakan perangkat selama halaman Peta aktif, serta marker untuk setiap laboratorium di koleksi `labs` beserta lingkaran radiusnya.
- Memilih salah satu marker laboratorium akan menampilkan panel informasi laboratorium secara *real-time* (`onSnapshot`):
  1. **Praktikum Sedang Berlangsung:** sesi pada lab tersebut yang berstatus `dibuka`, atau sesi hari ini yang berada pada rentang waktu pelaksanaan (menampilkan Nama Praktikum, Kelas, Waktu Pelaksanaan, dan Status Sesi).
  2. **Praktikum Berikutnya:** sesi terdekat berikutnya pada lab tersebut yang berstatus `belum_dibuka` dengan waktu mulai >= waktu sekarang (menampilkan Nama Praktikum, Kelas, Waktu Pelaksanaan, dan Status Sesi).
  3. Setiap perubahan jadwal atau status sesi di Firestore langsung tercermin pada panel informasi peta tanpa *reload*.

### 5.4 Push Notification (Kebutuhan 6)
- Menggunakan Firebase Cloud Messaging (FCM) terintegrasi dengan `expo-notifications`.
- Token notifikasi perangkat disimpan ke `users/{uid}.pushTokens` saat login dan **wajib dihapus** saat pengguna logout.
- Push notification dikirim secara otomatis kepada pengguna yang berkepentingan ketika:
  1. **Sesi praktikum dibuka oleh asisten** (dikirim ke seluruh peserta sesi).
  2. **Jadwal praktikum mengalami perubahan** (tanggal, jam, atau laboratorium diubah oleh asisten; dikirim ke seluruh peserta sesi).
  3. **Pengajuan izin diterima oleh asisten** (dikirim ke praktikan pemohon).
  4. **Pengajuan izin ditolak oleh asisten** (dikirim ke praktikan pemohon).

### 5.5 Penanganan Izin & Kondisi Perangkat (Kebutuhan 7)
Aplikasi wajib mendeteksi dan menampilkan kartu informasi (`DeviceStatusCard`) yang jelas beserta tombol pemulihan untuk kondisi:
1. Pengguna menolak izin akses lokasi atau notifikasi.
2. Layanan lokasi (GPS) perangkat tidak aktif.
3. Koordinat lokasi belum tersedia / *timeout*.
4. Koneksi jaringan mengalami gangguan.
5. Notifikasi tidak dapat diterima (disertai *fallback* banner pemberitahuan in-app dari koleksi `notifications`).

---

## 6. Pembagian Tugas

| SRS | Fitur & Cakupan | PIC | Selesai jika |
| --- | --- | --- | --- |
| **SRS3-00** | **Fondasi Native, Skema Tipe, Komponen UI Baru, Logger, ErrorBoundary, & Build APK** | **PM (Yustinus)** | Paket native terpasang; `types/index.ts`, `firebase.ts` (seed 4 lab & runtime config), `logger.ts`, `error-boundary.tsx`, `theme.ts`, `ui.tsx` (`SelectField`, `DateTimeField`, `ExpandableCalendar`, `DeviceStatusCard`), dan rute tab `peta` siap dipakai; APK Development Build ter-install di semua tim. |
| **SRS3-01** | **Pengelolaan Lokasi Lab, Form Sesi Full-Screen, & Kalender Multi-Minggu/Bulanan** | **PIC A (Yoas)** | Layar `kelola-lab.tsx` bisa mengubah koordinat & radius lab (20–200m); form tambah/ubah sesi menjadi layar penuh (`jadwal/form.tsx`) dengan Dropdown Lab & DateTimePicker; kalender di Beranda bisa digeser lintas minggu & di-expand 30 hari; buka sesi menyimpan kode di `sessionSecrets` secara atomik (`writeBatch`) dan memicu notifikasi; ubah jadwal memicu notifikasi. |
| **SRS3-02** | **Firestore Security Rules & Pembersihan Tech Debt** | **PIC A (Yoas)** | `firestore.rules` memproteksi `labs`, `sessionSecrets` (khusus asisten), `attendances` (`jarakMeter <= radiusSaatPresensi`), dan `leaveRequests` (`sessionId_uid`); `AppProvider` dummy Sprint 1 dihapus bersih. |
| **SRS3-03** | **Peta Laboratorium Interaktif & Aktivitas Lab Real-time** | **PIC B (Annis)** | Tab Peta menampilkan marker pengguna *real-time* (dengan *cleanup* `useFocusEffect`) dan marker 4 lab; klik marker lab menampilkan sesi berlangsung dan sesi berikutnya secara akurat dan *real-time*; perubahan jadwal/status langsung memperbarui panel peta. |
| **SRS3-04** | **Push Notification (FCM) & Rekap 4 Status (`Hadir`, `Sakit`, `Izin`, `Alpha`)** | **PIC B (Annis)** | Registrasi & pencabutan token FCM saat login/logout berjalan; 4 peristiwa penting berhasil mengirim push notification; layar Rekap Asisten dan Pemeriksaan Izin mendukung kategori `sakit`/`izin` serta menampilkan 4 ringkasan status (`Hadir`, `Sakit`, `Izin`, `Alpha`). |
| **SRS3-05** | **Halaman Presensi Terpisah, Validasi Lokasi Hard-Blocking, & Catatan 4 Status** | **PIC C (Varissa)** | Halaman `presensi/[sessionId].tsx` terpisah dari detail sesi; memvalidasi radius `labs/{labId}` dan menolak *Fake GPS*; memblokir presensi di luar radius/GPS mati; Pindai QR (utama) & Ketik Kode (fallback) berjalan atomik dengan rekonsiliasi izin; Buat Izin memakai `ExpandableCalendar` dan AI menghasilkan kategori `sakit`/`izin`; layar Catatan menampilkan 4 status (`Hadir`, `Sakit`, `Izin`, `Alpha`). |

---

## 7. Pembagian Kepemilikan Berkas

| Pemilik | Berkas |
| --- | --- |
| **PM (Yustinus)** | `package.json`, `app.json`, `src/types/index.ts`, `src/services/firebase.ts`, `src/constants/theme.ts`, `src/constants/config.ts`, `src/utils/logger.ts`, `src/components/error-boundary.tsx`, `src/components/ui.tsx`, `src/components/expandable-calendar.tsx`, `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `src/components/floating-tab-bar.tsx`, `README.md`, `docs/` |
| **PIC A (Yoas)** | `src/hooks/useLabs.ts`, `src/app/kelola-lab.tsx`, `src/app/jadwal/form.tsx`, `src/app/(tabs)/jadwal/`, `src/components/session-controls.tsx`, `firestore.rules` |
| **PIC B (Annis)** | `src/app/(tabs)/peta.tsx`, `src/components/peta/`, `src/services/notifications.ts`, `src/components/izin/pemeriksaan-izin.tsx`, `src/app/(tabs)/rekap/`, `src/app/rekap/`, `src/app/(tabs)/profil.tsx` |
| **PIC C (Varissa)** | `src/app/presensi/[sessionId].tsx`, `src/hooks/useLocationValidation.ts`, `src/components/attendance-action.tsx`, `src/components/izin/pengajuan-izin.tsx`, `src/services/ai.ts`, `src/app/(tabs)/catatan.tsx` |

---

## 8. Checklist QA

1. **Uji Hard-Blocking Radius & Fake GPS:** Berada di luar radius (`jarak > radiusMeter`) atau aktifkan *Mock Location* → tombol presensi dan scanner QR wajib terkunci rapat disertai kartu penjelasan.
2. **Uji Transisi Status `Belum Hadir` ke `Alpha`:** Saat sesi sedang `dibuka`, praktikan yang belum presensi tampil sebagai `Belum Hadir` di Rekap. Begitu asisten menutup sesi (`ditutup`), praktikan yang tidak presensi dan tidak memiliki izin `diterima` otomatis dihitung sebagai **`Alpha`**.
3. **Uji Persetujuan Izin Terlambat (Post-Close Approval):** Sesi sudah `ditutup` (praktikan sementara tercatat `Alpha`), lalu asisten menyetujui izin praktikan tersebut yang berstatus `menunggu` (kategori `sakit`) → status praktikan di Rekap dan Catatan otomatis berubah dari `Alpha` menjadi **`Sakit`**.
4. **Uji Kalender Lintas Minggu & Expand 30 Hari:** Buat sesi untuk 2 minggu ke depan → geser kalender di Beranda atau buka grid 30 hari → titik penanda sesi wajib muncul di tanggal tersebut dan sesi dapat dipilih di halaman Buat Izin.
5. **Uji Idempotency & Double-Tap Lock:** Ketuk tombol *"Kirim Presensi"* atau *"Ajukan Izin"* berkali-kali secara cepat pada koneksi lambat → hanya 1 operasi tulis yang dieksekusi tanpa error atau duplikasi dokumen.
6. **Uji Lifecycle Sensor GPS:** Buka tab Peta (indikator GPS sistem aktif), lalu pindah ke tab Profil atau Rekap → pemantauan `watchPositionAsync` wajib berhenti secara otomatis.
7. **Uji Pembersihan Token FCM Saat Ganti Akun:** Logout dari akun Praktikan lalu login sebagai Asisten di perangkat yang sama → token perangkat telah dicabut dari dokumen Praktikan sehingga perangkat tidak menerima notifikasi salah sasaran.