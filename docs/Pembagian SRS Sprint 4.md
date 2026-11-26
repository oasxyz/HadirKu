# Pembagian SRS Sprint 4 — HadirKu

Panduan pembagian jobdesk programmer di Sprint 4. **Baca `docs/SRS Sprint 4.md` lebih dulu** — dokumen ini hanya membagi "siapa mengerjakan apa" dan "siapa butuh apa dari siapa", bukan mendefinisikan fitur.

- **PM Sprint 4:** Varissa Nabila Kifli (Mengatur pembagian ini, menyiapkan fondasi + stub, review PR, merge, tidak ngoding fitur).
- **Programmer:** PIC A Yoas, PIC B Annis Fakhiroh Akbar, PIC C Yustinus Hendi Setyawan.

> **Prinsip utama:** *Zero File Collision* + *Stub & Slot* (warisan dari Sprint 1). PM menyiapkan SEMUA kontrak tipe, komponen UI, stub Vercel API routes, dan seeder data dummy di H+1 → mulai H+2 ketiga programmer boleh jalan paralel tanpa harus menunggu satu sama lain.
>
> **Keputusan pivot 26 Nov 2026:** backend pindah dari Firebase Cloud Functions ke **Vercel Serverless Functions** karena upgrade Blaze terhambat verifikasi kartu kredit (`OR_CCREU_01`). Scheduler cleanup sesi pindah ke cron-job.org. Konsekuensi: trigger notifikasi FCM dikembalikan ke client-side (pattern Sprint 1-3), bukan server-side.

---

## 1. Riwayat PIC Antar Sprint (Rasional Pembagian)

| Nama | Sprint 1 | Sprint 2 | Sprint 3 | **Sprint 4 (sekarang)** |
|---|---|---|---|---|
| **Yoas** | PM | PIC A — Auth, CRUD sesi, rules | PIC A — Kelola Lab, Form Sesi, Rules | **PIC A — Manajemen Lab Aslab, Role, Rules** |
| **Annis** | F1 (Peran/Nav), F2 (Jadwal) | PM | PIC B — Peta, FCM Notif, Rekap, Pemeriksaan izin, Profil | **PIC B — Dashboard, Notifikasi, AI Sentimen** |
| **Yustinus** | F3 (Pengelolaan sesi), F5 (Rekap) | PIC B — Rekap, Pemeriksaan izin | PM | **PIC C — Sesi Asprak, Keterlambatan & Denda, Midtrans** |
| **Varissa** | F4 (Presensi), F6 (Catatan) | PIC C — Presensi, Ajukan izin, AI | PIC C — Presensi, Ajukan izin, AI | **PM** |

**Prinsip pembagian:** setiap PIC Sprint 4 melanjutkan area yang paling dekat dengan sprint sebelumnya, sehingga tiap orang dapat memakai ulang branch feature lama dan tidak belajar area baru dari nol.

---

## 2. Tabel SRS Sprint 4

| Kode | Fitur | PIC | Selesai jika |
|---|---|---|---|
| **SRS4-00** | **Fondasi: Role migration, Komponen UI baru, Cloud Functions scaffolding, Perluasan Seeder Node (`scripts/seed-uji.mjs`), Build APK, STUB untuk semua PIC** | **PM (Varissa)** | Role `aslab/asprak/praktikan` di-rilis + lazy migration `asisten→asprak`; `functions/` ter-init dgn stub `createMidtransTransaction`/`midtransWebhook`/`refreshFineStatus` (return dummy, agar PIC C bisa langsung panggil); `<FormScreen>` & floating absen button siap; `scripts/seed-uji.mjs` diperluas → 200 praktikan terdistribusi ke A1–F2 + 20 asprak + 4 aslab + 30 sesi + 50 fines contoh (campur `pending`/`success`/`expired`/`dibatalkan_izin`) + 10 payments + 20 notifications; APK Development Build terbagi. |
| **SRS4-01** | **Role Aslab & Manajemen Laboratorium (CRUD + Single/Bulk Insert + Perpindahan + Set Radius/Grace/Denda)** | **PIC A (Yoas)** | Lihat Bab 3 untuk detail; **tidak memblokir PIC B/C** karena mereka memakai lab seed dari PM. |
| **SRS4-02** | **Firestore Security Rules Sprint 4 + Form Sesi Expand Tahun + KeyboardAvoidingView di Semua Form** | **PIC A (Yoas)** | Rules awal (permisif + role check minimal) sudah di-push PM di SRS4-00 agar PIC B/C tidak terblokir; PIC A mengganti dengan rules final yang ketat. |
| **SRS4-03** | **Dashboard Keberlangsungan Lab (Aslab) + Pengelolaan Sesi Oleh Asprak + Floating "Presensi Sekarang" Button** | **PIC B (Annis)** | Dashboard memakai `fines`/`payments` dari seeder PM, sehingga PIC B tidak perlu menunggu PIC C selesai menulis dari runtime. |
| **SRS4-04** | **Push Notification Deep Linking + Notifikasi di Profil (Limit 3 + Lihat Semua + Hapus) + Layar /notifikasi + Auto-Delete Sesi** | **PIC B (Annis)** | Deep link ke `/tagihan/[fineId]` dapat memakai placeholder screen PM dulu, nanti saat PIC C merge, link langsung berfungsi tanpa perubahan di sisi PIC B. |
| **SRS4-05** | **AI Analisis Sentimen Alasan Izin + Pemeriksaan Izin Asprak dengan Badge Sentimen + Integrasi Izin ↔ Denda** | **PIC B (Annis)** | Transaksi "izin diterima membatalkan `fines.pending`" dapat ditulis PIC B sendiri (akses `fines` sudah ada di tipe PM); PIC B tidak perlu menunggu PIC C. |
| **SRS4-06** | **Halaman Presensi dengan Perhitungan Keterlambatan + Pembuatan `fines` Atomik + Dedicated Camera Button** | **PIC C (Yustinus)** | Membaca `lab.gracePeriodMenit` & `lab.dendaNominal` dari seeder PM; tidak menunggu PIC A selesai UI Kelola Lab. |
| **SRS4-07** | **Vercel API Routes Backend: `/api/midtrans-create` + `/api/midtrans-webhook` + `/api/refresh-fine-status`** | **PIC C (Yustinus)** | Mengganti stub PM dengan implementasi asli. Klien (PIC B/C) tidak perlu mengubah pemanggilan. Auth lewat verify Firebase ID token manual (helper di `backend-vercel/lib/auth.ts`). Trigger FCM `onFineCreated` TIDAK termasuk di sini — dipindah ke client-side oleh Annis di SRS4-04. |
| **SRS4-08** | **Halaman Tagihan `/tagihan/[fineId]` + Halaman Riwayat Pembayaran `/profil/pembayaran` + Integrasi Snap WebBrowser** | **PIC C (Yustinus)** | Halaman `/tagihan` sudah di-register PM di `_layout.tsx`; PIC C hanya mengisi layar. Deep link dari PIC B langsung berfungsi. |

**Total:** 1 SRS PM + 8 SRS programmer, 2–3 SRS per programmer.

---

## 3. Fondasi yang Disiapkan PM di H+1 (Supaya Semua Bisa Paralel)

Agar ketiga programmer tidak saling menunggu, PM **wajib** merge SRS4-00 di H+1 berisi:

### 3.1 Kontrak Tipe Lengkap (`src/types/index.ts`)
Semua tipe untuk Sprint 4 — Lab, Fine, Payment, Notification baru, Role — sudah lengkap. Programmer tinggal impor.

### 3.2 Seeder Data Dummy Banyak (`scripts/seed-uji.mjs` — PERLUASAN, bukan dari nol)
Akhir Sprint 3 sudah menambahkan `scripts/seed-uji.mjs` (Node + `firebase-admin`). PM **memperluas** script ini (bukan bikin baru di `firebase.ts`). Dijalankan manual: `node scripts/seed-uji.mjs`.
- 4 akun `aslab` default (termasuk 1 untuk tiap anggota tim, pakai email mereka)
- 20 akun `asprak` ter-assign ke `labIds` dan `kelas`
- 200 akun `praktikan` terdistribusi ke kelas `A1–F2` (field `users.kelas` wajib terisi)
- 4 lab dengan field baru `gracePeriodMenit=15`, `dendaNominal=10000` variatif, `subKelas` (mis. Lab B = `['B1','B2']`)
- 30 sesi tersebar 2 bulan (campur `belum_dibuka`/`dibuka`/`ditutup`), `pesertaIds` di-derive dari `users.kelas == sessions.kelasLab`
- **50 dokumen `fines` contoh** (campur `pending`/`success`/`expired`/`dibatalkan_izin`) — **PIC B langsung bisa render Dashboard & grafik keuangan tanpa menunggu PIC C**
- **10 dokumen `payments` contoh** — **PIC C bisa test UI riwayat tanpa harus run Midtrans Sandbox dulu**
- 20 notifikasi contoh (semua tipe termasuk `kelas_dipindah_aslab` + `tagihan_baru` + `pembayaran_*` dengan `payload` lengkap)
- Catatan: seeder **idempotent** — cek dokumen sentinel `seed-praktikan-001` sebelum tulis.

### 3.3 Stub Backend Vercel (`backend-vercel/api/*.ts`)
Endpoint yang **return dummy** tapi sudah ada signature-nya di folder `backend-vercel/`:
```ts
// Stub v0 di backend-vercel/api/midtrans-create.ts, PIC C akan ganti isinya di SRS4-07
export default async function handler(req, res) {
  const uid = await verifyIdToken(req);
  const { fineId } = req.body;
  return res.status(200).json({
    token: 'STUB-TOKEN-' + Date.now(),
    redirectUrl: 'https://app.sandbox.midtrans.com/snap/v4/redirection/STUB',
    orderId: `stub-${fineId}`,
  });
}
// backend-vercel/api/midtrans-webhook.ts → return 200 OK
// backend-vercel/api/refresh-fine-status.ts → return { status: 'pending' }
// backend-vercel/api/cleanup-sessions.ts → verify x-cron-secret, return { deleted: 0 }
```
→ **PIC C (SRS4-08) bisa build UI tagihan + tombol "Bayar" tanpa menunggu SRS4-07 selesai.** PIC B (SRS4-04) bisa test deep link ke `/tagihan/[id]` karena route sudah ada.

### 3.4 Komponen UI Baru (`src/components/ui.tsx` + tambahan)
Komponen shared yang sudah ada di akhir Sprint 3 (jangan di-dup):
- `src/components/toast.tsx` — Toast provider global (pakai untuk feedback pembayaran, bulk insert, dsb.)
- `src/components/ilustrasi.tsx` — koleksi ilustrasi bergerak (Reanimated)
- `src/components/splash-hadirku.tsx` — splash kalender bergerak
- `src/app/perkenalan.tsx` — intro screen onboarding

PM **menambahkan** komponen Sprint 4 di `src/components/ui.tsx`:
- `<FormScreen>` — `KeyboardAvoidingView` wrapper (dipakai semua form)
- `<BulkInsertRow>` — baris di scroll view bulk insert, dgn accept/deny/edit (dipakai PIC A, tapi PM yang bikin shell-nya biar konsisten)
- `<SentimentBadge>` — tone primary/muted/danger (dipakai PIC B di pemeriksaan izin)
- `<FineStatusBadge>` — tone untuk pending/success/failed/expired/dibatalkan_izin (dipakai PIC B di Dashboard & PIC C di /tagihan)
- `<DashboardCard>` — shell kartu statistik (dipakai PIC B)

### 3.5 Shell Route Non-Tab (`src/app/_layout.tsx`)
PM mendaftarkan SEMUA `Stack.Screen` baru dengan placeholder berisi `EmptyNote`:
```tsx
<Stack.Screen name="tagihan/[fineId]" />           {/* PIC C isi */}
<Stack.Screen name="notifikasi" />                  {/* PIC B isi */}
<Stack.Screen name="profil/pembayaran" />          {/* PIC C isi */}
<Stack.Screen name="distribusi-praktikan" />       {/* PIC A isi */}
<Stack.Screen name="bulk-insert/[tipe]" />         {/* PIC A isi */}
<Stack.Screen name="(tabs)/dashboard" />           {/* PIC B isi */}
```
→ Deep link dari notifikasi tidak error walau layarnya belum diisi (muncul "Halaman sedang disiapkan").

### 3.6 Floating Tab Bar Siap Pakai (`src/components/floating-tab-bar.tsx`)
PM menambahkan:
- Logika tampil `dashboard` tab hanya untuk `aslab`, `catatan` tab hanya untuk `praktikan`.
- Tombol bundar magenta di tengah untuk praktikan. **Perilaku tombol di-delegasikan via prop** `onPressAbsen` — PIC B mengisi handler.

### 3.7 Rules Awal (Permisif + Role Check Minimal)
`firestore.rules` sudah di-update di akhir Sprint 3 (termasuk aturan `pengajuanKelas` dan `users.kelas` dari `docs/usulan-rules-kelas.md`). PM **menambahkan draft Sprint 4** di atas yang sudah ada:
- Mengganti cek `role=='asisten'` menjadi `role in ['asprak','asisten']` sementara (kompatibel mundur selama migrasi).
- Menambah `isAslab()` helper.
- Mengizinkan `aslab` CRUD `labs`/`users` (termasuk ubah `kelas` praktikan top-down).
- Memaksa `request.auth.uid === resource.data.userId` di `fines`/`payments` write.
→ PIC A akan mengganti dengan rules ketat di SRS4-02. Selama *draft*, PIC B/C bisa test tulis tanpa ter-block rules yang terlalu ketat.

### 3.8 Dependency Terpasang
PM `npx expo install` + `npm i` di root & di `backend-vercel/`:
- `expo-web-browser`, `expo-linking` (klien)
- `papaparse` + `@types/papaparse` (parser CSV di `src/utils/csv.ts` — dipakai PIC A)
- `midtrans-client`, `firebase-admin`, `@vercel/node` (backend Vercel)
- `firebase-admin` SUDAH terpasang di root (akhir sprint 3, untuk `scripts/seed-uji.mjs`); di `backend-vercel/` ditambah terpisah.

### 3.10 Setup Environment & Akun Eksternal (SEMUA oleh PM)
Agar programmer tidak perlu bikin akun/setup apapun di luar coding, PM **wajib** menyelesaikan ini di H+1:

| Item | Yang PM Kerjakan | Hasil untuk Programmer |
|---|---|---|
| **Firebase Plan** | **Tetap Spark (gratis).** Upgrade Blaze tidak dilakukan karena verifikasi kartu kredit terhambat (`OR_CCREU_01`). Backend pindah ke Vercel. | Tidak ada setup; tinggal pakai. |
| **Vercel Account** | Daftar di https://vercel.com/signup via GitHub (Hobby plan gratis). Install `vercel` CLI + `vercel login`. | Programmer tidak perlu daftar sendiri; PM share base URL `https://hadirku-backend.vercel.app` di grup. |
| **Midtrans Sandbox Account** | Daftar di https://dashboard.sandbox.midtrans.com/ dengan akun tim; ambil **Server Key** + **Client Key** | Tidak perlu daftar sendiri; PM share Client Key di grup (aman untuk klien) + simpan Server Key di env var Vercel (private). |
| **Midtrans Webhook URL** | Setelah stub di-deploy, PM daftarkan URL `https://hadirku-backend.vercel.app/api/midtrans-webhook` ke dashboard Midtrans → Settings → Payment Configuration | PIC C tidak perlu ubah apapun di dashboard Midtrans. |
| **Vercel Env Vars** | Set 8 env vars di dashboard Vercel: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `CRON_SECRET`, `ALLOWED_ORIGIN` | PIC C tinggal `cd backend-vercel && vercel deploy --prod`. |
| **cron-job.org (untuk cleanup sesi)** | Daftar akun di https://cron-job.org, buat cronjob yang panggil `/api/cleanup-sessions` tiap 6 jam dengan header `x-cron-secret` | Tidak perlu setup; cron otomatis jalan setelah PM aktifkan. |
| **Firestore Composite Indexes** | Pre-create indexes yang akan dipakai query baru di Sprint 4 (mis. `fines` di-order by `createdAt` filter by `userId`, `payments` filter by `userId`) lewat `firestore.indexes.json` | Programmer tidak akan melihat error "The query requires an index" saat test. |
| **Firestore Rules Deploy** | PM deploy rules **draft** di H+1 (`firebase deploy --only firestore:rules`); PIC A deploy versi ketat saat SRS4-02 selesai | Programmer tidak perlu Firebase CLI auth. |
| **Vercel Deploy Awal (Stub)** | PM deploy stub endpoints di H+1 (`cd backend-vercel && vercel deploy --prod`) | PIC C tinggal push kode asli → redeploy `vercel deploy --prod` di H+3. |
| **Google Services JSON** | Sudah ada di repo sejak sprint 2 (`google-services.json` di root) | Programmer tinggal clone, file sudah ter-commit (sesuai policy project). |
| **EAS Build Config** | `eas.json` sudah ada; PM yang menjalankan `eas build --profile development --platform android` | Programmer menerima link APK → pasang di HP. |
| **APK Dev Build** | PM build 1x di H+1 (saat SRS4-00 merge), share link di grup. Rebuild kalau ada native dependency baru. | Programmer pasang sekali, tidak perlu Xcode/Android Studio. |
| **ENV Template** | PM commit `.env.local.example` baru berisi `EXPO_PUBLIC_VERCEL_BASE_URL`, `EXPO_PUBLIC_MIDTRANS_CLIENT_KEY`, `EXPO_PUBLIC_MIDTRANS_IS_PRODUCTION` + variabel sprint 2 (`EXPO_PUBLIC_AI_*`) | Programmer `cp .env.local.example .env.local`, isi Client Key AI + Midtrans dari PM, selesai. |
| **Firebase CLI Access** | PM jadi satu-satunya yang `firebase login` ke project ini. Deploy rules/indexes lewat PM (atau delegate ke PIC A). | Programmer biasa **tidak perlu** Firebase CLI. |
| **Vercel CLI Access** | PIC C `vercel login` dengan akun GitHub-nya + diberi akses ke project Vercel oleh PM (Settings > Members > Invite) | PIC C bisa `vercel deploy --prod` di laptopnya sendiri. |
| **Node & SDK Version** | PM pastikan `AGENTS.md` dan `package.json` mencantumkan Node 20+, Expo SDK 57. | Programmer cukup `nvm use 20` (atau install Node 20). |

**Yang programmer harus kerjakan sendiri (minimal, sekali saja):**
1. `git clone` repo + `git checkout feature/s4-<srs>-...`
2. `nvm use 20` (atau install Node 20 LTS)
3. `npm install` di root + `cd functions && npm install` (hanya kalau mau test Functions lokal)
4. `cp .env.local.example .env.local` → isi `EXPO_PUBLIC_AI_API_KEY` dari PM
5. Pasang APK dev yang PM share
6. `npx expo start --dev-client` → scan QR / pilih server di HP
7. **Ngoding**.

Setelah 7 langkah ini, programmer tidak perlu menyentuh konfigurasi Firebase, Midtrans, atau EAS lagi. Kalau ada yang error di lingkungan (bukan di kode), lapor PM.

### 3.9 Infrastruktur Testing Existing
Akhir Sprint 3 sudah menambahkan:
- `__tests__/` (Jest) — sudah ada 6 file test (`aktivitas-lab-test.ts`, `bentrok-lab-test.ts`, `format-test.ts`, `kelas-test.ts`, `status-kehadiran-test.ts`, `waktu-sesi-test.ts`). **Jangan hapus/duplikasi**.
- `.maestro/` — 6 flow Maestro (`asisten-pemeriksaan-izin.yaml`, `asisten-rekap.yaml`, `praktikan-beranda.yaml`, `praktikan-izin-pelacak.yaml`, `praktikan-presensi-kode.yaml`, `subflows/masuk.yaml`).
- Setiap PIC WAJIB menambah minimal 1 Jest test + 1 Maestro flow untuk fitur barunya.

---

## 4. Matrix Dependensi Antar PIC

Baca sbg "**Baris butuh dari Kolom**":

| Butuh↓ \ Dari→ | **PM** | **PIC A (Yoas)** | **PIC B (Annis)** | **PIC C (Yustinus)** |
|---|---|---|---|---|
| **PIC A** | ✅ Semua tipe, komponen UI, seed lab, CSV library | — | ⚪ Tidak ada | ⚪ Tidak ada |
| **PIC B** | ✅ Semua tipe, seed `fines`/`payments`/`notifications`, komponen Dashboard/Badge | 🟡 Lab schema final (`gracePeriodMenit`, `dendaNominal`) — tapi PM sudah seed, jadi non-blocking | — | 🟡 Tipe `notifications.type` untuk `tagihan_*`/`pembayaran_*` — sudah di PM, jadi non-blocking |
| **PIC C** | ✅ Semua tipe (`Fine`, `Payment`), stub Vercel API routes, seed `fines`/`payments`, Midtrans dep | 🟡 `lab.gracePeriodMenit`/`dendaNominal` — sudah di seed, jadi non-blocking | 🟡 Deep link handler `tagihan_*` — PIC C bisa test manual deep link sambil menunggu | — |

**Legenda:**
- ✅ = **blocker keras** — tanpa ini tidak bisa mulai. PM wajib selesaikan di H+1.
- 🟡 = **soft dependency** — bisa dikerjakan dgn stub/seed, nanti tinggal sinkron.
- ⚪ = tidak ada ketergantungan.

**Kesimpulan:** Setelah SRS4-00 merge di H+1, **tidak ada dependensi keras antar programmer**. Semua 🟡 sudah di-decouple via seed/stub.

---

## 5. Kebutuhan & Hasil Kerja per PIC

### 5.1 PIC A (Yoas) — Manajemen Lab, Rules, UX Fixes

**Yang PIC A butuhkan sebelum mulai:**
- Dari **PM** (sudah ada di SRS4-00 setelah H+1):
  - `src/types/index.ts` — tipe `Lab` (dgn `subKelas`), `Role` extended
  - `src/services/firebase.ts` — `COLLECTIONS.labs`, seeder lab (via `scripts/seed-uji.mjs`)
  - `src/components/ui.tsx` — `FormScreen`, `BulkInsertRow` shell
  - Paket `papaparse` + helper CSV scaffold di `src/utils/csv.ts` (PM install paket & scaffold, PIC A yang isi logika parse + template downloader)
- Dari **existing sprint 3** (sudah di main):
  - `src/constants/kelas.ts` (A1–F2) dan `src/constants/praktikum.ts` — dipakai di dropdown dan validasi CSV praktikan
  - `docs/usulan-rules-kelas.md` — baseline aturan `pengajuanKelas` dan `users.kelas` yang harus dipertahankan saat PIC A menulis rules Sprint 4
  - `src/utils/bentrok-lab.ts` — validasi bentrok jadwal (sudah jalan, PIC A tinggal reuse untuk form sesi)
- Dari **PIC B/C:** tidak ada.

**Yang PIC A hasilkan untuk tim:**
- Koleksi `labs` siap tulis (meski seed sudah ada, PIC A yang handle write runtime)
- `firestore.rules` final — **berpengaruh ke semua PIC**: setelah PIC A merge SRS4-02, PIC B/C wajib menguji tulis mereka lolos rules yang ketat.
- Template CSV di `assets/templates/` — dipakai bila Aslab bulk insert.
- `<FormScreen>` wrapper di-apply ke semua form (termasuk form milik PIC B/C).

**Catatan koordinasi:**
- Saat merge SRS4-02 (rules ketat), PIC A **wajib tag di grup** supaya PIC B/C pull lalu re-test tulisannya. Kalau ada permission-denied di sisi B/C, lapor ke PIC A untuk sesuaikan rules.
- Untuk KeyboardAvoiding: PIC A hanya wajib wrap form miliknya; PIC B/C wrap form miliknya sendiri pakai `<FormScreen>`.
- **Jalur Aslab vs jalur pengajuan kelas existing:** PIC A hanya menangani jalur Aslab top-down (writeBatch langsung ubah `users.kelas` + `sessions.pesertaIds`). Koleksi `pengajuanKelas` dan komponen `pemeriksaan-kelas.tsx` (milik Annis dari sprint 3) **tidak disentuh** PIC A.

---

### 5.2 PIC B (Annis) — Dashboard, Notifikasi, AI Sentimen

**Yang PIC B butuhkan sebelum mulai:**
- Dari **PM** (sudah ada di SRS4-00):
  - Seeder `fines`/`payments`/`notifications` — langsung bisa render Dashboard.
  - Tipe `FinalAttendanceStatus`, `Fine`, `Payment`, `Notification.type` (termasuk `tagihan_*`/`pembayaran_*`).
  - `<DashboardCard>`, `<SentimentBadge>`, `<FineStatusBadge>`.
  - Stub route `/tagihan/[fineId]` — deep link bisa dites walau layarnya belum diisi PIC C.
  - AI service dari Sprint 3 — tinggal menambah `classifySentiment` di file yang sama.
- Dari **PIC A:** `labs` bisa dibaca via `useLabs()` (dari seed). Lab ID pasti ada untuk 4 lab default.
- Dari **PIC C:** tidak perlu menunggu — Dashboard pakai seed data; deep link `/tagihan/[id]` pakai stub route.

**Yang PIC B hasilkan untuk tim:**
- **Deep link router** di `src/services/notifications.ts` — **penting untuk PIC C**: setelah PIC C bikin layar `/tagihan/[id]`, tap notifikasi `tagihan_baru` otomatis masuk ke sana tanpa PIC C mengubah apa pun.
- **Transaksi "izin diterima → `fines` dibatalkan"** — saat Asprak memutuskan izin, PIC B yang menulis transaction ini (karena file `pemeriksaan-izin.tsx` milik PIC B). PIC C hanya menyediakan tipe `Fine`.
- Hook `use-notifications.ts` dgn filter `hiddenFor` — PM & PIC C mungkin reuse untuk badge jumlah notif unread.

**Catatan koordinasi:**
- Saat testing Dashboard, pakai akun `aslab` default dari seeder (PM kirim kredensialnya di grup).
- PIC B yang menambah `Tabs.Screen name="dashboard"` di `(tabs)/_layout.tsx` di blok `===== PIC B =====` (PM sudah siapkan blok komentarnya).
- Jika PIC B butuh `notifications.type` baru di luar daftar, **lapor PM** supaya ditambahkan ke `src/types/index.ts` + ke deep link router (bukan tambah sendiri — menyebabkan konflik dgn PIC C).

---

### 5.3 PIC C (Yustinus) — Presensi+Denda, Vercel Backend, Pembayaran

**Yang PIC C butuhkan sebelum mulai:**
- Dari **PM** (sudah ada di SRS4-00):
  - Tipe `Fine`, `Payment`, `Attendance` (dgn `menitTerlambat`, `fineId`).
  - Seeder `labs` dgn `gracePeriodMenit=15` & `dendaNominal` — langsung bisa hitung keterlambatan.
  - Stub Vercel API (`/api/midtrans-create` return dummy token) — UI tagihan bisa jalan walau belum konek Midtrans.
  - Scaffold `backend-vercel/api/*.ts` + dependency `midtrans-client`/`firebase-admin`/`@vercel/node` sudah terpasang.
  - Helper `backend-vercel/lib/auth.ts` (verify Firebase ID token) dan `backend-vercel/lib/firebase-admin.ts` (init Admin SDK dari env var) sudah siap.
  - Route `/tagihan/[fineId]` & `/pembayaran` sudah di-register.
- Dari **PIC A:** tidak perlu menunggu — pakai lab dari seed.
- Dari **PIC B:** tidak perlu menunggu — UI tagihan + /pembayaran bisa dibuat dulu, deep link dari notif otomatis bekerja begitu SRS4-04 PIC B merge.

**Yang PIC C hasilkan untuk tim:**
- **Koleksi `fines` dari runtime presensi** — berpengaruh ke **PIC B Dashboard**: setelah PIC C merge SRS4-06, grafik keuangan Dashboard menampilkan denda yang di-generate otomatis saat presensi terlambat, bukan hanya dari seed.
- **Vercel API Routes asli (SRS4-07)** — menggantikan stub PM. **Klien (PIC B/C) tidak perlu mengubah apa pun** karena signature + response shape sama.
- **Tipe `payments.status`** — jika PIC C butuh field baru di `Payment`, **lapor PM** untuk diupdate di `src/types/index.ts`.

**Catatan koordinasi:**
- Test pembayaran butuh Midtrans Sandbox key — PM yang set di dashboard Vercel Settings > Environment Variables. PIC C tinggal `cd backend-vercel && vercel deploy --prod`.
- Saat `/api/cleanup-sessions` dipanggil cron-job.org (setup PM), PIC C harus memastikan `attendances` + `fines` sudah denormalisasi info sesi (praktikum, kelasLab, tanggal) langsung di dokumen, karena dokumen `sessions` akan hilang 24 jam setelah ditutup.
- Trigger push notifikasi `tagihan_baru` **TIDAK** di endpoint Vercel — Annis handle di SRS4-04 lewat client-side listener pada koleksi `notifications` (webhook Vercel hanya menulis dokumen `notifications`, client yang kirim push). PIC C hanya memastikan dokumen `notifications` tertulis saat webhook/create dipanggil.

---

### 5.4 PM (Varissa) — Fondasi, Setup, Integrasi

**Yang PM kerjakan di H+1 (SRS4-00) — semua setup non-coding ditanggung PM:**
- Semua dari Bab 3 (fondasi code + stub)
- **Semua dari Bab 3.10** (setup Vercel + cron-job.org + Midtrans Sandbox, webhook config, APK build, ENV templates)
- Share di grup: link APK, Client Key Midtrans, base URL Vercel, `EXPO_PUBLIC_AI_API_KEY`, kredensial 4 akun aslab default

**Yang PM pantau selama sprint (H+2..H+6):**
- Review setiap PR, merge berurutan sesuai Bab 6.1
- Handle konflik merge (programmer tidak perlu rebase sendiri — lapor PM kalau ada konflik)
- Respon pertanyaan "kenapa permission-denied?" / "env var X tidak kebaca" dalam 30 menit jam kerja
- Rebuild APK hanya kalau native dependency bertambah (mis. `midtrans-client` di klien — tidak terjadi karena semua Midtrans di backend Vercel)

**Yang PM hasilkan di H+7 (Integration):**
- Merge semua branch ke `main`.
- Build APK Production.
- Jalankan checklist QA (`docs/SRS Sprint 4.md` Bab 8).
- Siapkan skenario demo + akun demo per role.

**Yang PM BUKAN kerjakan:** fitur apa pun. Jika ada permintaan "PM, bikinkan X", PM teruskan ke PIC area terkait. PM juga **tidak** meng-handle code review mendalam di area domain (role check, business logic) — itu tugas PIC lain sesuai Bab 8 (PR review).

---

## 6. Workflow Paralel

### 6.1 Diagram Timeline

```
H+1 ─ PM       ████████████████ SRS4-00 (fondasi + stub + seeder)
H+2 ─ PIC A    │  ██████ SRS4-02 rules draft siap, mulai SRS4-01 lab
      PIC B    │  ██████ mulai SRS4-03 Dashboard (pakai seed)
      PIC C    │  ██████ mulai SRS4-06 presensi+denda (pakai stub func)
H+3 ─ PIC A    │       ████████ SRS4-01 CRUD + bulk insert
      PIC B    │       ████████ SRS4-03 lanjut + SRS4-05 AI sentimen
      PIC C    │       ████████ SRS4-07 Vercel API Routes asli (replace stub)
H+4 ─ PIC A    │              ████ SRS4-02 rules ketat (replace draft)  ← butuh koordinasi
      PIC B    │              ████████ SRS4-04 deep link + notifikasi
      PIC C    │              ████████ SRS4-08 /tagihan + /pembayaran
H+5 ─ semua    │                    ████ cross-testing antar PIC
H+6 ─ PM       │                         ████ final merge
H+7 ─ semua    │                              ████ QA + demo
```

### 6.2 Sinkronisasi Wajib di 2 Titik

**Titik 1 — H+4: PIC A merge SRS4-02 (rules ketat)**
- **Aksi:** PIC A tag grup → PIC B/C pull → jalankan `npx expo start` → test tulis fitur masing-masing.
- **Bila error `permission-denied`:** PIC B/C screenshot + lapor PIC A → PIC A patch rules.
- **Jangan di-skip** — kalau rules longgar di-biarkan sampai demo, data bisa bocor antar role.

**Titik 2 — H+5: Cross-testing antar PIC**
- **Flow test A→B:** Aslab (PIC A) tambah lab baru → verifikasi muncul di Dashboard PIC B.
- **Flow test B→C:** Praktikan terima notif `tagihan_baru` (dari client-side trigger PIC B saat dokumen `fines` baru muncul dari PIC C) → tap → masuk ke layar `/tagihan/[id]` (PIC C) via deep link handler (PIC B).
- **Flow test C→B:** Praktikan presensi terlambat (PIC C) → `fines` tercipta → Dashboard PIC B otomatis update grafik.
- **Flow test lengkap:** praktikan ajukan izin (PIC C's existing code dari Sprint 3) → AI sentimen (PIC B SRS4-05) → Asprak terima izin (PIC B) → `fines` pending otomatis `dibatalkan_izin` (PIC B's transaction) → notif ke praktikan.

### 6.3 Kalau Ada PIC Terlambat

**Prioritas penyelamatan:**
1. **SRS4-07 (Vercel API Routes asli)** paling kritis — kalau PIC C tidak selesai di H+3, demo pembayaran tidak jalan. Kalau terancam molor, PM bantu review + pair.
2. **SRS4-04 (deep linking)** — kalau tidak selesai, notif tetap jalan tapi klik hanya buka Beranda (regression dari sprint 3). PM akan push minimal deep link `sesi_dibuka` saja.
3. **SRS4-01 (bulk insert)** — kalau tidak selesai, single insert saja jalan. Demo tunjukkan single insert, dan bilang bulk insert "work in progress".

---

## 7. Kepemilikan Berkas

> Setiap programmer hanya mengubah berkas di baris miliknya. Jika butuh ubah berkas orang lain, lapor PM via grup.

| Pemilik | Berkas |
|---|---|
| **PM (Varissa)** | `package.json`, `app.json`, `src/types/index.ts`, `src/services/firebase.ts` (role enum + COLLECTIONS baru — `fines`,`payments`,`bulkImports`), `scripts/seed-uji.mjs` (perluas seeder existing dgn aslab/fines/payments), `src/services/notifications.ts` (dasar listener + registrasi FCM — PIC B isi handler deep link), `src/constants/theme.ts`, `src/constants/config.ts`, `src/components/ui.tsx` (`FormScreen`, `BulkRowCard`, `SentimentBadge`, `MoneyText`, `StatTile`), `src/components/error-boundary.tsx`, `src/components/floating-tab-bar.tsx` (menambahkan `FloatingAbsenButton` + Dashboard tab Aslab), `src/app/_layout.tsx` (register semua Stack.Screen baru), `src/app/(tabs)/_layout.tsx` (register Tabs.Screen baru dalam blok komentar per PIC), `src/app/notifikasi.tsx` (shell kosong — PIC B isi), route stub `/tagihan/[fineId]`, `/pembayaran`, `/distribusi-praktikan`, `/bulk-import`, `/(tabs)/dashboard` (semua dengan konten placeholder `EmptyNote`), `backend-vercel/package.json`, `backend-vercel/tsconfig.json`, `backend-vercel/vercel.json`, `backend-vercel/api/*.ts` (scaffold + stub Vercel API routes), `backend-vercel/lib/firebase-admin.ts`, `backend-vercel/lib/auth.ts`, `backend-vercel/README.md`, `firebase.json`, `firestore.indexes.json`, `.firebaserc`, `README.md`, `docs/` |
| **PIC A (Yoas)** | `src/app/kelola-lab.tsx` (perluas untuk Aslab bisa tambah lab), `src/app/distribusi-praktikan.tsx` (isi shell PM — jalur top-down Aslab), `src/app/bulk-insert/[tipe].tsx` (isi shell PM — tipe: `lab`/`praktikan`/`asprak`), `src/hooks/use-labs.ts` (perluas: create, delete, bulk, `subKelas`), `src/hooks/use-users.ts` (perluas: bulk insert, pindah kelas top-down), `src/utils/csv.ts` (BARU — parser & template downloader), `src/components/bulk-insert-scroll.tsx` (BARU — host `BulkInsertRow` dari PM), `firestore.rules` (role aslab/asprak/praktikan + `fines`/`payments` + tetap pertahankan rules `pengajuanKelas` existing), `assets/templates/*.csv` (BARU — 3 file template) |
| **PIC B (Annis)** | `src/app/(tabs)/dashboard.tsx` (isi shell PM — hanya untuk Aslab), `src/app/notifikasi.tsx` (isi shell PM — daftar penuh + swipe delete), `src/app/(tabs)/profil.tsx` (perluas: kartu notif limit 3 + lihat semua), `src/services/notifications.ts` (isi deep link handler — PM biarkan kosong), `src/services/ai.ts` (tambah `classifySentiment`), `src/components/izin/pemeriksaan-izin.tsx` (tambah badge sentimen + transaction reconcile denda), `src/components/izin/pemeriksaan-kelas.tsx` (existing — hanya tambahkan badge dan sinkron ke rules baru bila perlu), `src/hooks/use-notifications.ts` (BARU — read dgn filter `hiddenFor`), `src/hooks/use-pengajuan-kelas.ts` (existing — hanya tambah/ubah bila ada integrasi notifikasi deep link baru), `src/components/dashboard/*` (BARU — kartu statistik, grafik, baris lab) |
| **PIC C (Yustinus)** | `src/app/presensi/[sessionId].tsx` (perluas: hitung terlambat + buat fines atomik), `src/app/tagihan/[fineId].tsx` (isi shell PM), `src/app/pembayaran.tsx` (isi shell PM — riwayat), `src/hooks/use-fines.ts` (BARU), `src/hooks/use-payments.ts` (BARU), `src/components/attendance-action.tsx` (perluas: logic transaksi `attendances`+`fines`), `src/components/session-controls.tsx` (perluas: tampilkan status denda peserta di sisi asprak), `src/services/payment.ts` (BARU — klien ke endpoint Vercel), `src/utils/keterlambatan.ts` (BARU), `backend-vercel/api/midtrans-create.ts` (isi stub PM), `backend-vercel/api/midtrans-webhook.ts` (isi stub PM), `backend-vercel/api/refresh-fine-status.ts` (isi stub PM) |

### 7.1 Batasan tambahan
- `src/app/_layout.tsx`, `(tabs)/_layout.tsx`, `floating-tab-bar.tsx` → **hanya PM** yang menambahkan `Stack.Screen`/`Tabs.Screen` baru, di blok komentar `===== PIC X =====`. Programmer menulis route-nya sendiri di berkas layar, PM mendaftarkan.
- `src/services/firebase.ts` → **hanya PM** (untuk seeder, nama koleksi, helper ID). Programmer boleh import, dilarang edit.
- `backend-vercel/api/*.ts` → **PM** scaffold stub; **PIC C** mengisi tiga file (`midtrans-create.ts`, `midtrans-webhook.ts`, `refresh-fine-status.ts`) tanpa mengubah signature request/response. `cleanup-sessions.ts` adalah tanggung jawab **PIC B** (SRS4-04).

### 7.2 Mengapa route-shell PM, isi PIC?
Kalau PIC C bikin route `/tagihan/[fineId]` di H+3, tapi PIC B butuh deep link ke route itu di H+2, akan ada dependency keras. **Solusinya:** PM register route dengan placeholder di H+1, deep link PIC B langsung berfungsi (walau konten placeholder). Begitu PIC C merge SRS4-08, deep link otomatis membuka konten asli tanpa perubahan di sisi PIC B.

---

## 8. Branch & Commit

- **Branching:** `feature/s4-<srs-code>-<deskripsi-singkat>`, misal `feature/s4-01-manajemen-lab-aslab`, `feature/s4-07-midtrans-cloud-functions`.
- **Dasar branch:** dari `main` yang sudah ter-merge dengan SRS4-00. Setelah SRS4-00 merge, PM akan `git merge main` ke setiap branch tim (atau PIC rebase sendiri).
- **Commit:** `git commit -m "feat(s4-<code>): <ringkasan>" -m "<detail>"`. Satu commit satu perubahan logis.
- **Co-author:** Dilarang. Setiap PIC commit atas namanya sendiri.
- **PR Title:** `[SRS4-<code>] <ringkasan>`. PR Body: checklist dari "Selesai jika" di Bab 2.

---

## 9. Aturan Tim

1. **Dilarang keras** memodifikasi berkas di luar daftar kepemilikan (Bab 7). Butuh? Lapor PM dulu.
2. **Dilarang keras** memasang paket baru (`expo install`/`npm i`) tanpa izin PM. PM yang menambah dependency ke `package.json` / `backend-vercel/package.json`.
3. **Dilarang keras** menambah koleksi/field Firestore baru tanpa izin PM. Semua perubahan skema melalui PR SRS4-00 (butuh approval PM).
4. **Dilarang keras** menaruh secret Midtrans Server Key di `.env.local` React Native. Hanya di `backend-vercel/.env.local` (lokal) atau dashboard Vercel (production).
5. **Role check wajib** di setiap layar: pakai `useCurrentUser()` + guard `if (currentUser?.role !== 'aslab') return <Forbidden/>;`.
6. **Role check wajib** di `firestore.rules` sebelum fitur masuk: setiap koleksi baru atau field baru harus punya rule.
7. **Tidak ada `any`**: pakai `unknown` + type guard. PM akan reject PR dengan `any`.
8. **TypeScript & Lint 0 error** sebelum submit PR: `npx tsc --noEmit && npx expo lint && cd backend-vercel && npx tsc --noEmit`.
9. **Commit `.env.local`, `node_modules/`, `backend-vercel/node_modules/`, `backend-vercel/.env.local`, `backend-vercel/.vercel/`, service account JSON, `google-services.json` (opsional — sesuai policy sprint 2)** dilarang.
10. **Update AGENTS.md / README.md** oleh PM saja.
11. **Jangan ubah stub PM tanpa approval.** PM akan refactor stub menjadi real pada PR SRS4-00 lanjutan; kalau stub rusak, lapor PM.
12. **Jika ada "butuh dari PIC lain yang belum merge":** PM boleh kasih izin PIC mem-pull branch feature PIC lain yang masih WIP (lewat `git fetch origin feature/s4-xx` + `git merge FETCH_HEAD`) — tapi TIDAK boleh commit di branch orang lain.

---

## 10. Milestone Harian (Sprint 7 Hari)

| Hari | PM | PIC A | PIC B | PIC C |
|---|---|---|---|---|
| **H+1** | **MERGE SRS4-00** | Baca spec + setup env | Baca spec + setup env | Baca spec + setup env |
| **H+2** | Pull semua branch, review awal | Mulai SRS4-02 rules draft + SRS4-01 CRUD lab | Mulai SRS4-03 Dashboard dari seed data | Mulai SRS4-06 presensi+fines (pakai stub func) |
| **H+3** | Review PR awal, bantu blocker | SRS4-01 lanjut (single insert → bulk) | SRS4-03 lanjut + mulai SRS4-05 AI sentimen | SRS4-07 Vercel API Routes asli (replace stub) |
| **H+4** | Merge SRS4-02 dulu, lalu yang lain | **SRS4-02 rules ketat merge** (tag grup!) | SRS4-04 deep link + /notifikasi | SRS4-08 /tagihan + /profil/pembayaran |
| **H+5** | Koordinasi cross-testing | SRS4-01 selesai | SRS4-04 + SRS4-05 selesai | SRS4-06 + SRS4-07 + SRS4-08 selesai |
| **H+6** | **Final merge + build APK** | Siap demo bagian lab | Siap demo dashboard + notif | Siap demo presensi+bayar |
| **H+7** | Jalankan QA checklist, latihan demo | Dampingi demo lab | Dampingi demo dashboard/notif | Dampingi demo bayar |

---

## 11. Kontak & Eskalasi

- **PM:** Varissa — tag di grup WhatsApp untuk ambiguitas spec, konflik merge, permintaan paket/koleksi baru, permission-denied rules.
- **Daily standup:** 10 menit setiap jam 20:00 WIB, format "kemarin / hari ini / blocker".
- **PR review:** PM wajib review setiap PR sebelum merge; minimal satu PIC lain approve untuk kode di area shared (`ui.tsx`, `firebase.ts`, `_layout.tsx`).
- **Darurat (production bug jam 23:00):** tag `@all` di grup.

---

**Jalankan Sprint 4 dengan rapi — kita semua sudah bergantian jadi PM, jadi tolong hargai putusan pembagian ini seperti kita berharap orang lain menghargai putusan kita dulu.**

— Varissa (PM Sprint 4)
