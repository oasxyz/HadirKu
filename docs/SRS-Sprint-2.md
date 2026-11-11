# SRS Sistem Informasi Praktikum — Sprint 2

Melanjutkan HadirKu (Sprint 1) dengan data dinamis: Firebase Authentication, Cloud Firestore, dan klasifikasi alasan izin lewat API AI.

PM: Annis. Programmer: PIC A (Yoas), PIC B (Yustinus Hendi Setyawan), PIC C (Varissa Nabila Kifli). Pembagian mengikuti pemegang area yang sama di Sprint 1, jadi tiap orang melanjutkan kode yang sudah dikenal.

## Tujuan Demo

1. Asisten login, buka sesi, praktikan login, presensi, data tersimpan di Firestore, asisten melihat rekap secara real time, asisten menutup sesi.
2. Praktikan login, mengajukan izin, AI mengklasifikasi alasan, asisten memeriksa dan memutuskan, praktikan melihat status pengajuannya.

## Aturan Teknis

- Expo SDK 57. Firebase memakai React Native Firebase (modul native), jadi aplikasi dijalankan di development build, bukan Expo Go.
- Identitas dari Firebase Authentication (email dan password). Data utama di Cloud Firestore, dibaca dengan listener `onSnapshot`.
- Tanggal dan jam disimpan sebagai string (`tanggal` `YYYY-MM-DD`, `jamMulai`/`jamSelesai` `HH:mm`); `waktuPresensi`, `createdAt`, dan `diputuskanAt` berupa ISO string dari jam perangkat.
- Key API AI hanya di `.env.local` (tidak di-commit). Semua panggilan AI lewat `src/services/ai.ts`.
- Setiap layar menangani kondisi: belum login, memuat, daftar kosong, koneksi gagal, dan AI tidak merespons.

## Asumsi (tertulis karena tidak ada di user story)

- Pengguna mendaftar sendiri dan memilih peran (asisten atau praktikan) saat registrasi. Peran tidak bisa diubah setelahnya (dijaga di rules).
- Satu project Firebase bersama untuk seluruh tim.
- Kategori AI: `sakit`, `keluarga`, `akademik`, `lainnya`. Status izin: `menunggu`, `diterima`, `ditolak`. Nilai ini tidak boleh ditambah sendiri.
- Praktikan hanya melihat kelas, sesi, dan data yang memuat dirinya di `pesertaIds`.

## Data Firestore

| Koleksi | Dokumen | Field |
| --- | --- | --- |
| `users` | ID = uid | nama, nim, role, email |
| `classes` | auto ID | praktikum, kelasLab, asistenId, pesertaIds |
| `sessions` | auto ID | kelasId, praktikum, kelasLab, tanggal, jamMulai, jamSelesai, asistenId, pesertaIds, kodeSesi, status |
| `attendances` | ID = `sessionId_uid` | sessionId, userId, waktuPresensi |
| `leaveRequests` | auto ID | sessionId, userId, alasan, kategoriAi, status, createdAt, diputuskanOleh, diputuskanAt |

Tipe TypeScript ada di `src/types/index.ts`; nama koleksi dan ID presensi di `src/services/firebase.ts`.

## Aturan Bisnis

- Sesi dibuka dari `belum_dibuka` dan ditutup dari `dibuka`; sesi `ditutup` tidak bisa dibuka lagi.
- `kodeSesi` 6 digit dibuat saat sesi dibuka dan tidak boleh terbaca praktikan.
- Presensi hanya diterima saat sesi `dibuka`, kode benar, dan pengguna ada di `pesertaIds`. Satu praktikan satu presensi per sesi (ID dokumen `sessionId_uid`).
- Pengajuan izin dibuat dengan status `menunggu`. Hasil AI hanya informasi pendukung; hanya asisten yang mengubah status.
- Jika AI gagal atau timeout, pengajuan tetap tersimpan dengan `kategoriAi = null`.
- Perubahan status sesi, presensi, dan izin langsung tampil ke pengguna terkait tanpa reload, dan tetap ada setelah aplikasi dibuka ulang.

## Fitur dan PIC

Urutan merge dari atas ke bawah; 009 dikerjakan paling akhir setelah bentuk data stabil. Setiap fitur di branch baru dari `main` terbaru dengan nama `feature/s2-<nama-fitur>` (branch Sprint 1 sudah ter-merge).

| SRS | Fitur | PIC | Selesai jika |
| --- | --- | --- | --- |
| 001 | Autentikasi dan profil | A | Registrasi, login, logout berjalan; sesi login pulih setelah aplikasi dibuka ulang; layar lain memakai `useCurrentUser()` (disediakan PIC A), bukan `state.currentUserId`; tab mengikuti peran akun |
| 009 | Rules, validasi, dan error | A | `firestore.rules` terpasang; input tidak valid dan kegagalan login/Firestore menampilkan pesan jelas; praktikan tidak bisa membaca atau mengubah data milik orang lain |
| 002 | CRUD kelas, peserta, jadwal, sesi (asisten) | A | Asisten bisa tambah, lihat, ubah, hapus; praktikan hanya melihat sesi yang memuat dirinya |
| 003 | Pengelolaan sesi realtime | B | Buka/tutup sesi mengubah status di semua layar tanpa reload; kode sesi hanya terlihat asisten |
| 005 | Rekap kehadiran (asisten) | B | Daftar hadir bertambah real time saat praktikan presensi; tetap terlihat setelah sesi ditutup |
| 008 | Pemeriksaan izin | B | Asisten melihat alasan dan kategori AI, menerima atau menolak; keputusan tersimpan dan terlihat praktikan |
| 004 | Presensi | C | Presensi tersimpan di Firestore; presensi kedua pada sesi yang sama ditolak; sesi belum dibuka atau sudah ditutup tidak bisa diisi |
| 005 | Catatan kehadiran (praktikan) | C | Hanya catatan milik praktikan yang login yang tampil |
| 006 | Pengajuan izin | C | Praktikan mengisi alasan untuk sesi tertentu dan memantau status; tidak bisa mengajukan dua kali untuk sesi yang sama saat masih `menunggu` |
| 007 | Klasifikasi AI | C | Alasan dikirim ke API AI; kategori ditampilkan dan disimpan bersama pengajuan; gagal atau timeout tidak menghalangi pengajuan |

## Pembagian Berkas

| Pemilik | Berkas |
| --- | --- |
| PM | `src/types/index.ts`, `src/services/firebase.ts`, `package.json`, `app.json`, `src/app/_layout.tsx` dan `src/app/(tabs)/_layout.tsx` (struktur), README, `docs/` |
| PIC A | `src/app/login.tsx`, `src/app/register.tsx`, `src/app/(tabs)/profil.tsx`, `src/app/(tabs)/jadwal/`, `firestore.rules`, konteks/hook autentikasi |
| PIC B | `src/app/(tabs)/rekap/`, `src/app/rekap/`, `src/components/session-controls.tsx`, `src/components/izin/pemeriksaan-izin.tsx` |
| PIC C | `src/components/attendance-action.tsx`, `src/app/(tabs)/catatan.tsx`, `src/components/izin/pengajuan-izin.tsx`, `src/services/ai.ts` |

`src/app/(tabs)/jadwal/[id].tsx` milik PIC A. PIC B dan PIC C hanya mengubah komponen mereka sendiri (`session-controls.tsx`, `attendance-action.tsx`) yang ditampilkan di layar itu.

Mengubah `src/app/_layout.tsx` hanya di blok komentar SRS sendiri. Butuh tipe, paket, atau koleksi baru: lapor PM dulu.

## Migrasi dari Sprint 1

`AppProvider` dengan data dummy tetap ada sampai SRS001 selesai. Fitur baru membaca Firestore lewat hook di `src/hooks/` (misalnya `useSessions`), lalu menghapus ketergantungan pada `state.sessions` dan `state.attendances` di layar miliknya.

## Di Luar Sprint Ini

Notifikasi, upload bukti izin, reset password, dan perubahan peran akun.
