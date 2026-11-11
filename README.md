# HadirKu

**Sistem Informasi Praktikum — Presensi Praktikum Berbasis Mobile**

![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-blue)

Aplikasi mobile untuk mencatat kehadiran praktikum di laboratorium.

## Tentang

HadirKu memindahkan proses presensi praktikum manual ke satu aplikasi mobile. Asisten membuka
sesi, praktikan melakukan presensi dengan kode sesi, lalu asisten melihat rekap dan menutup sesi.

```
Asisten membuka sesi  →  Praktikan presensi dengan kode  →  Asisten melihat rekap  →  Asisten menutup sesi
```

Aplikasi mendukung dua peran dalam satu perangkat:

| Peran | Tab | Kegiatan utama |
| --- | --- | --- |
| **Asisten** | Jadwal, Rekap, Profil | Membuka dan menutup sesi, membagikan kode sesi, melihat rekap kehadiran |
| **Praktikan** | Jadwal, Catatan, Profil | Melihat jadwal, melakukan presensi, melihat riwayat kehadiran sendiri |

Peran dipilih pada layar awal dan dapat diganti kapan saja dari tab Profil. Status sesi
(`belum_dibuka`, `dibuka`, `ditutup`) tersinkron ke seluruh layar, dan perubahan langsung terlihat
tanpa memuat ulang.

Sprint 1 memakai data dummy di memori aplikasi. Sprint 2 memindahkan data ke Firebase
(Authentication dan Cloud Firestore) agar tersinkron real time antar pengguna, dan menambah
pengajuan izin praktikan dengan klasifikasi alasan lewat API AI. Selama migrasi berlangsung,
layar yang belum dimigrasi masih memakai data dummy. Rincian ada di
[SRS Sprint 2](docs/SRS-Sprint-2.md).

## TechStack

| Lapisan | Teknologi |
| --- | --- |
| Framework | Expo SDK 57 |
| UI | React Native 0.86 + React 19 |
| Navigasi | Expo Router (Stack + Tabs) |
| Bahasa | TypeScript (strict) |
| State | Context + `useReducer` (Sprint 1), listener Firestore (Sprint 2) |
| Styling | `StyleSheet` + Flexbox |
| Autentikasi | Firebase Authentication (React Native Firebase) |
| Data | Cloud Firestore (migrasi dari dummy in-memory) |
| AI | API model dari pengajar, lewat `src/services/ai.ts` |

## Struktur Proyek

```
HadirKu/
├── src/
│   ├── app/          # Route dan layar (Expo Router)
│   ├── components/   # Komponen bersama
│   ├── constants/    # Tema, warna, spasi
│   ├── context/      # Provider dan reducer state global
│   ├── data/         # Data dummy
│   ├── hooks/        # Hook turunan
│   ├── services/     # Firebase (firebase.ts) dan klien AI (ai.ts)
│   ├── types/        # Tipe entitas dan state
│   └── utils/        # Format tanggal/jam, generator kode sesi
├── docs/             # SRS Sprint 2
├── plugins/          # Config plugin Expo (Firebase BoM)
├── assets/
├── app.json
├── firestore.rules   # Draft security rules
├── .env.local.example
└── tsconfig.json     # Path alias @/* → src/*
```

Setiap berkas di dalam `src/app/` adalah layar. Kode non-route (komponen, hook, context, tipe)
diletakkan di luar folder tersebut.

## Menjalankan

### Prasyarat

- Node.js LTS (22.11 atau lebih baru) beserta npm
- Akun Expo (gratis) untuk build EAS
- Perangkat Android untuk development build. Sprint 2 memakai modul native Firebase, jadi **tidak
  bisa dijalankan di Expo Go maupun di web**.

### Instalasi

```bash
git clone https://github.com/oasxyz/HadirKu.git
cd HadirKu
npm install
```

### Konfigurasi sekali di awal

1. Pastikan `google-services.json` (project Firebase bersama) ada di root project. PM yang
   meng-commit-nya, seperti di proyek contoh. Jangan diganti dengan project Firebase milik sendiri.
2. Salin `.env.local.example` menjadi `.env.local`, lalu isi `EXPO_PUBLIC_AI_API_KEY` dari asprak.
   `.env.local` tidak boleh di-commit.
3. Pasang APK development client. PM membagikan linknya, atau build sendiri:

```bash
npx eas-cli@latest build --profile development --platform android
```

### Menjalankan aplikasi

```bash
npx expo start --dev-client   # buka aplikasi development client di HP, lalu pilih server atau scan QR
npx expo start --dev-client --tunnel   # jika HP tidak tersambung
```

Build ulang APK development hanya perlu jika paket native atau `app.json` berubah.

### Perintah pendukung

```bash
npx tsc --noEmit         # cek tipe TypeScript
npx expo-doctor          # periksa konfigurasi dan dependency
npx expo install --fix   # selaraskan versi paket dengan SDK
npm run lint             # jalankan ESLint
npx expo start --clear   # mulai ulang dengan cache bersih
```

## Spesifikasi

Rincian sistem Sprint 2 — fitur, PIC, model data Firestore, aturan bisnis, dan pembagian berkas —
ada di [docs/SRS-Sprint-2.md](docs/SRS-Sprint-2.md). Spesifikasi Sprint 1 ada di `../SRS.md`.

## Aturan Tim

- Setiap fitur dikerjakan di branch `feature/<nama-fitur>`. Jangan push ke `main` atau `dev`.
- Format commit: `git commit -m "feat(scope): deskripsi" -m "penjelasan detail"`. Satu commit satu
  perubahan, tanpa co-author.
- Kerjakan hanya berkas milik PIC masing-masing (lihat "Pembagian Berkas" di SRS). Di
  `src/app/_layout.tsx`, edit hanya di blok komentar SRS sendiri, dan taruh `import` di paling atas.
- Butuh tipe data, koleksi Firestore, atau paket baru: lapor PM dulu. Pasang paket hanya dengan
  `npx expo install nama-paket`.
- Jangan menamai komponen `Text`, `View`, `Image`, atau `Button`.
- Jangan commit `.env.local`, `node_modules/`, atau key apa pun.

## Lisensi

Dikembangkan untuk keperluan Praktikum Pemrograman dan Pengembangan Kualitas Perangkat Lunak.
Lihat berkas [LICENSE](./LICENSE).
