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

Seluruh data berada di memori aplikasi sebagai data dummy. Tidak ada backend, sehingga data
kembali ke kondisi awal setiap aplikasi dibuka. Perilaku ini disengaja agar aplikasi dapat
didemokan tanpa infrastruktur.

## TechStack

| Lapisan | Teknologi |
| --- | --- |
| Framework | Expo SDK 57 |
| UI | React Native 0.86 + React 19 |
| Navigasi | Expo Router (Stack + Tabs) |
| Bahasa | TypeScript (strict) |
| State | Context + `useReducer` |
| Styling | `StyleSheet` + Flexbox |
| Data | Dummy in-memory |

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
│   ├── types/        # Tipe entitas dan state
│   └── utils/        # Format tanggal/jam, generator kode sesi
├── assets/
├── app.json
└── tsconfig.json     # Path alias @/* → src/*
```

Setiap berkas di dalam `src/app/` adalah layar. Kode non-route (komponen, hook, context, tipe)
diletakkan di luar folder tersebut.

## Menjalankan

### Prasyarat

- Node.js LTS (20 atau lebih baru) beserta npm
- Expo Go di perangkat, atau emulator Android / simulator iOS

### Instalasi

```bash
git clone https://github.com/oasxyz/HadirKu.git
cd HadirKu
npm install
```

### Menjalankan aplikasi

```bash
npm start            # buka Metro bundler dan tampilkan pilihan target
npm run android      # ke emulator/perangkat Android
npm run ios          # ke simulator iOS (macOS)
npm run web          # versi web di browser
```

Setelah Metro berjalan, pindai QR code dengan Expo Go, atau tekan `a` untuk Android dan `i` untuk
iOS pada terminal.

### Perintah pendukung

```bash
npx tsc --noEmit         # cek tipe TypeScript
npx expo-doctor          # periksa konfigurasi dan dependency
npx expo install --fix   # selaraskan versi paket dengan SDK
npm run lint             # jalankan ESLint
npx expo start --clear   # mulai ulang dengan cache bersih
```

## Spesifikasi

Rincian sistem — fitur, pemilik fitur, model data, aturan bisnis, kontrak teknis, pembagian berkas,
dan alur kerja Git — ada pada **SRS Sprint 1** di `../SRS.md` (folder induk proyek).

## Lisensi

Dikembangkan untuk keperluan Praktikum Pemrograman dan Pengembangan Kualitas Perangkat Lunak.
Lihat berkas [LICENSE](./LICENSE).
