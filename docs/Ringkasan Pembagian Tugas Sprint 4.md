# Pembagian Tugas Sprint 4 — HadirKu

**PM:** Varissa Nabila Kifli
**Programmer:** Yoas (PIC A), Annis Fakhiroh Akbar (PIC B), Yustinus Hendi Setyawan (PIC C)

---

## Varissa (PM) — SRS4-00
Menyusun pembagian SRS, menyiapkan fondasi tipe & komponen UI bersama, memperluas seeder data uji, setup environment (Vercel + cron-job.org + Midtrans Sandbox, scaffolding backend-vercel/, deploy Firestore rules/indexes, APK Development Build), review PR, handle merge, QA akhir. Tidak ngoding fitur. Catatan: backend awalnya direncanakan Firebase Cloud Functions, tapi dipivot ke Vercel karena upgrade Blaze terhambat verifikasi kartu kredit.

---

## Yoas (PIC A)

### SRS4-01 — Manajemen Laboratorium oleh Aslab
Membangun halaman Kelola Lab (tambah/edit lab + set radius/grace period/denda), halaman Bulk Insert 3 tipe (lab, praktikan, asprak) via CSV dengan scroll view accept/deny/edit per baris, dan halaman Distribusi Praktikan (Aslab pindahkan praktikan antar kelas secara top-down).

### SRS4-02 — Firestore Security Rules + UX Fixes
Memperluas `firestore.rules` untuk role baru (aslab/asprak/praktikan) dan proteksi koleksi `fines`/`payments`. Memperbaiki `DateTimeField` supaya bisa pilih tahun bebas, dan membungkus semua form dengan KeyboardAvoidingView.

---

## Annis (PIC B)

### SRS4-03 — Dashboard Aslab + Sesi Asprak + Floating Absen Button
Membangun tab Dashboard khusus Aslab (statistik lab/praktikan/sesi, grafik keuangan denda filter Hari/Minggu/Bulan, riwayat kegiatan & pembayaran). Memastikan Asprak hanya melihat sesi lab tanggung jawabnya. Menambahkan floating button magenta di tengah tab bar praktikan untuk langsung buka kamera presensi.

### SRS4-04 — Push Notification Deep Linking + Manajemen Notifikasi + Auto-Delete Sesi
Mengimplementasikan deep linking supaya klik notifikasi langsung buka halaman spesifik (bukan Beranda). Membatasi notifikasi di Profil jadi 3 terbaru + tombol "Lihat semua" ke layar `/notifikasi` penuh dengan swipe delete. Trigger push Expo dilakukan client-side di setiap event (sesi dibuka, izin diputuskan, tagihan baru, pembayaran selesai) karena backend Vercel tidak punya Firestore triggers. Mengisi endpoint `backend-vercel/api/cleanup-sessions.ts` yang dipanggil cron-job.org tiap 6 jam untuk hapus sesi selesai >24 jam (log presensi/denda tetap tersimpan).

### SRS4-05 — AI Analisis Sentimen + Integrasi Izin ↔ Denda
Menambahkan analisis sentimen alasan izin (`positif`/`netral`/`negatif`) sebagai informasi pendukung Asprak di halaman Pemeriksaan Izin. Transaksi "izin diterima" otomatis membatalkan tagihan denda yang masih `pending`.

---

## Yustinus (PIC C)

### SRS4-06 — Presensi dengan Keterlambatan + Pembuatan Tagihan Denda
Menambahkan perhitungan keterlambatan pada halaman presensi berdasarkan `grace period` lab. Dalam satu transaksi atomik: tulis `attendances` + jika terlambat, tulis `fines` sekali per sesi per praktikan.

### SRS4-07 — Vercel API Routes (Midtrans Backend)
Membangun backend serverless di Vercel (pengganti Firebase Cloud Functions): endpoint `POST /api/midtrans-create` (bikin tagihan via Midtrans Snap Sandbox + verify Firebase ID token), `POST /api/midtrans-webhook` (terima callback + verifikasi signature sha512 + update status via Firebase Admin SDK), `POST /api/refresh-fine-status` (polling manual Midtrans status). Trigger push notifikasi tidak termasuk tanggung jawab di sini — dikembalikan ke client-side (pattern Sprint 1-3), Annis handle di SRS4-04.

### SRS4-08 — Halaman Tagihan + Riwayat Pembayaran
Membangun halaman `/tagihan/[fineId]` (detail tagihan + tombol Bayar Sekarang yang membuka Midtrans Snap via WebBrowser) dan halaman `/profil/pembayaran` (riwayat semua tagihan + pembayaran praktikan, dengan filter status).
