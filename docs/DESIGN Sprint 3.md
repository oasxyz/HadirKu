# DESIGN — HadirKu Sprint 3

Panduan tampilan dan pengalaman pengguna (UI/UX) untuk seluruh anggota tim di Sprint 3. Dokumen ini memperbarui `DESIGN.md` Sprint 2 untuk mengakomodasi **Halaman Presensi Berbasis Lokasi**, **Peta Laboratorium Interaktif**, **Pengelolaan Lokasi Lab**, **Push Notification**, serta seluruh perbaikan evaluasi Sprint 2 dari asisten praktikum.

- **Aturan Bisnis & Arsitektur:** `docs/SRS-Sprint-3.md`
- **Aturan Utama:** Gunakan token dari `src/constants/theme.ts` dan komponen bersama dari `src/components/ui.tsx` serta `src/components/expandable-calendar.tsx` yang telah disiapkan oleh PM.

---

## 1. Perbaikan UX Evaluasi Sprint 2 & Standar Visual Baru

1. **Form Tambah/Ubah Sesi Halaman Penuh (Bukan Pop-Up):**
   - Form Tambah/Ubah Sesi dilarang dirender di dalam `<Modal>` atau pop-up mengambang. Form wajib menggunakan halaman penuh (`<Screen withTabBar={false}>`) di rute `src/app/jadwal/form.tsx` agar leluasa digulir dan tidak tertutup *keyboard*.
2. **Pemilih Tanggal & Waktu Native (Tanpa Ketik Manual):**
   - Input tanggal dan jam pada form sesi menggunakan komponen `DateTimeField` yang langsung membuka *Native Calendar / Clock Picker* saat diketuk.
3. **Kalender Geser Mingguan + Expand Grid 30 Hari (`ExpandableCalendar`):**
   - Mengatasi masalah kalender Sprint 2 yang terkunci pada rentang 1 minggu.
   - **Tampilan Default (Kompak 7 Hari):** menampilkan 1 baris (7 hari) dengan tombol geser minggu sebelumnya (`<`) dan minggu berikutnya (`>`), ditambah chip `"Hari Ini"` (muncul otomatis jika pengguna sedang melihat minggu lain).
   - **Tampilan Terbuka (Expand Grid 30 Hari):** mengetuk pil bulan di kanan atas (`"November 2026 ▾"`) membuka grid 30/35 hari penuh dalam satu bulan lengkap dengan titik penanda hari bersesi. Memilih tanggal pada grid otomatis melipat kalender kembali agar daftar jadwal di bawahnya langsung terlihat.
4. **4 Status Kehadiran (`Hadir`, `Sakit`, `Izin`, `Alpha`) & Pembedaan Warna Semantik:**
   - Menambahkan token warna `warning` (kuning-amber) dan `danger` (merah-rose) untuk membedakan status `Sakit`, `Izin`, `Alpha`, dan `Di Luar Radius` secara instan tanpa merusak nuansa pastel utama.

---

## 2. Token Warna (`src/constants/theme.ts`)

| Token | Nilai | Dipakai Untuk |
|---|---|---|
| `Palette.primary` | `#E21BD0` | Tombol utama, tab aktif, status `Sedang Dibuka`, `Hadir`, `Diterima`, `Di Dalam Radius` |
| `Palette.primaryMuted` | `rgba(222,31,203,0.12)` | Latar aksen tipis, lingkaran radius laboratorium pada peta |
| `Palette.ink` | `#17151C` | Tombol berat (Tutup Sesi, Hapus, Keluar), status `Ditutup`, chip terpilih, marker lab standar |
| `Palette.info` | `#6D28D9` | Teks/aksen status `Izin` dan kategori `Izin` |
| `Palette.infoMuted` | `rgba(109,40,217,0.12)` | Latar badge `Izin` |
| `Palette.warning` | `#D97706` | Teks/ikon status `Sakit`, `Menunggu`, dan peringatan kondisi perangkat |
| `Palette.warningMuted` | `rgba(217,119,6,0.14)` | Latar badge `Sakit`, `Menunggu`, dan banner peringatan perangkat |
| `Palette.danger` | `#E11D48` | Pesan error form, status `Alpha`, `Ditolak`, `Di Luar Radius`, tepi input salah |
| `Palette.dangerMuted` | `rgba(225,29,72,0.12)` | Latar badge `Alpha`, `Ditolak`, dan kartu `Di Luar Radius` |
| `Palette.lavender` | `#E4DAF1` | Bulatan ilustrasi, batang grafik kedua |
| `Palette.lilac` | `#F4CFEF` | Bulatan ilustrasi kedua |
| `Palette.text` | `#131118` | Judul dan teks utama |
| `Palette.textSecondary` | `#5E586C` | Teks penjelas |
| `Palette.textMuted` | `#8F89A0` | Label kecil, subjudul, placeholder |
| `Palette.card` | `rgba(255,255,255,0.78)` | Latar `GlassCard` |
| `Palette.border` | `rgba(110,90,150,0.16)` | Garis pemisah, tepi input |
| `Gradient` | `linear-gradient(165deg, #EEF0F5, #E7E2EE, #E2CEE6)` | Latar layar |

---

## 3. Komponen Siap Pakai & Pemetaan Status 

### 3.1 Komponen Baru di Sprint 3

| Komponen | Lokasi | Fungsi & Props Utama |
|---|---|---|
| `SelectField` | `@/components/ui` | Dropdown berbentuk pil untuk memilih Laboratorium (`Gedung AP`, `Lab B`, `Lab C`, `Lab D`); membuka *bottom sheet* pilihan saat diketuk (`label`, `value`, `options`, `onSelect`, `error`) |
| `DateTimeField` | `@/components/ui` | Input pil pembuka *Native Date/Time Picker* tanpa ketik manual (`label`, `value`, `mode: 'date' \| 'time'`, `onChange`, `error`) |
| `ExpandableCalendar` | `@/components/expandable-calendar` | Kalender mingguan dengan tombol geser `<` `>` yang dapat dibuka-tutup menjadi grid 30 hari penuh (`selectedDate`, `onSelectDate`, `markedDates: Set<string>`) |
| `DeviceStatusCard` | `@/components/ui` | Kartu kondisi izin perangkat, GPS mati, lokasi palsu, atau offline beserta tombol aksi pemulihan (`title`, `message`, `tone`, `actionLabel`, `onAction`, `icon`) |
| `ErrorBoundary` | `@/components/error-boundary` | Pembungkus layar *production-grade* yang menangkap crash *runtime* (seperti kamera/peta) dan menampilkan kartu *"Muat Ulang Layar"* |

### 3.2 Pemetaan `Badge` (`tone`)

| Konteks | Nilai Data | `tone` | Label Tampilan |
|---|---|---|---|
| **Status Sesi** | `belum_dibuka` | `muted` | Belum Dibuka |
| | `dibuka` | `primary` | Sedang Dibuka |
| | `ditutup` | `dark` | Ditutup |
| **Status Kehadiran (Rekap & Catatan)** | `hadir` | `primary` | Hadir |
| | `sakit` | `warning` | Sakit |
| | `izin` | `info` | Izin |
| | `alpha` | `danger` | Alpha |
| | `belum_hadir` (saat sesi belum ditutup) | `muted` | Belum Hadir |
| **Status Lokasi Presensi** | `jarak <= radius` | `primary` | Di Dalam Radius |
| | `jarak > radius` | `danger` | Di Luar Radius |
| | `memeriksa` | `warning` | Memeriksa Lokasi… |
| **Status Pengajuan Izin** | `menunggu` | `warning` | Menunggu |
| | `diterima` | `primary` | Diterima |
| | `ditolak` | `danger` | Ditolak |
| **Kategori AI Izin** | `sakit` | `warning` | Sakit |
| | `izin` | `info` | Izin |
| | `null` | `muted` | Belum terklasifikasi |

---

## 4. Navigasi Bawah (`floating-tab-bar.tsx`)

Tab bar melayang terdiri atas **5 tab** per peran:
- **Asisten:** `Beranda` (`jadwal`) · `Peta` (`peta`) · `Rekap` (`rekap`) · `Izin` (`izin`) · `Profil` (`profil`)
- **Praktikan:** `Beranda` (`jadwal`) · `Peta` (`peta`) · `Catatan` (`catatan`) · `Izin` (`izin`) · `Profil` (`profil`)

Rute halaman penuh non-tab (`withTabBar={false}`) di `src/app/_layout.tsx`:
- `src/app/jadwal/form.tsx` (Form Tambah / Ubah Sesi — halaman penuh, bukan pop-up)
- `src/app/kelola-lab.tsx` (Halaman Kelola Lokasi & Radius Laboratorium)
- `src/app/presensi/[sessionId].tsx` (Halaman Khusus Presensi Berbasis Lokasi)
- `src/app/rekap/[id].tsx` (Halaman Detail Rekap Kehadiran Sesi)

---

## 5. Spesifikasi Layar Sprint 3

### 5.1 Beranda, Form Sesi Full-Screen, & Kelola Lab (PIC A)

#### A. Beranda (`src/app/(tabs)/jadwal/index.tsx`)
- Mengganti kalender 7-hari statis menjadi **`ExpandableCalendar`**:
  - Pengguna dapat menekan `<` dan `>` untuk berpindah minggu, menekan `"Hari Ini"` untuk kembali ke tanggal sekarang, atau mengetuk pil `"November 2026 ▾"` untuk membuka grid 30 hari penuh.
  - Titik magenta di bawah angka tanggal menandai adanya sesi pada tanggal tersebut di seluruh minggu/bulan.
- Tombol `+` (`RoundButton icon="add"`) pada Beranda Asisten melakukan navigasi `router.push('/jadwal/form')` (membuka layar penuh, **bukan modal pop-up**).

#### B. Form Tambah / Ubah Sesi (`src/app/jadwal/form.tsx`, Halaman Penuh Tanpa Tab Bar)
1. **`TopBar`**: judul `"Tambah Sesi Praktikum"` (atau `"Ubah Sesi Praktikum"`), tombol kembali bulat di kiri.
2. **`GlassCard` Informasi Praktikum & Waktu**:
   - `TextField` **Nama Praktikum** (contoh: `"Pemrograman Perangkat Bergerak"`).
   - `SelectField` **Laboratorium**: dropdown pil berisi daftar dari koleksi `labs` (**Gedung AP**, **Lab B**, **Lab C**, **Lab D**). Menampilkan sub-keterangan radius aktif (`"Radius presensi: 50 m"`) dan tautan `"Kelola lokasi lab"`.
   - `DateTimeField` **Tanggal Pelaksanaan** (`mode="date"`): mengetuk pil langsung membuka kalender pemilih tanggal, tanpa ketik manual.
   - Dua `DateTimeField` berdampingan: **Jam Mulai** dan **Jam Selesai** (`mode="time"`): mengetuk pil membuka pemilih jam/menit interaktif.
3. **`GlassCard` Peserta Praktikum**:
   - Judul bagian `"Peserta"` dengan tombol aksi teks `"Pilih Semua"` / `"Reset"` di kanan.
   - `TextField` pencarian cepat (`"Cari nama atau NIM praktikan…"`).
   - Deret `Chip` peserta yang terfilter.
4. **`PrimaryButton` "Simpan Sesi"**: dilengkapi proteksi *in-flight lock* dan indikator `"Menyimpan…"`.

#### C. Kelola Lokasi Laboratorium (`src/app/kelola-lab.tsx`, Halaman Penuh Tanpa Tab Bar)
1. **`TopBar`**: `"Kelola Lokasi Laboratorium"`, tombol kembali.
2. **Pemilih Lab**: deret `Chip` (`Gedung AP`, `Lab B`, `Lab C`, `Lab D`, serta `+ Tambah Lab`).
3. **Kartu Peta Pemilih Titik (`GlassCard` berisi `MapView` tinggi 250, radius 24)**:
   - Menampilkan pin laboratorium terpilih beserta lingkaran preview radius.
   - Asisten dapat **mengetuk peta** untuk memindahkan titik koordinat lab atau menekan tombol pil putih **"Gunakan Lokasi Saya Saat Ini"**.
4. **Kartu Pengaturan Radius (`GlassCard`)**:
   - `TextField` angka `"Radius Presensi (meter)"` (rentang 20–200 m) beserta chip cepat (`30 m`, `50 m`, `75 m`, `100 m`).
   - `PrimaryButton` `"Simpan Lokasi Lab"`.

---

### 5.2 Peta Laboratorium Interaktif & Aktivitas Lab (PIC B)

#### Layar Tab Peta (`src/app/(tabs)/peta.tsx`, Dengan Tab Bar)
Dibungkus dengan `<ErrorBoundary>` agar kegagalan render peta dapat dipulihkan:
1. **Header Mengambang (`GlassCard` di atas peta)**:
   - Judul `"Peta Laboratorium Informatika"`.
   - Di kanan: `RoundButton icon="locate-outline"` (pusatkan ke lokasi pengguna) dan khusus Asisten `RoundButton icon="settings-outline"` (menuju `/kelola-lab`).
   - Deret `Chip` laboratorium (`Gedung AP`, `Lab B`, `Lab C`, `Lab D`); mengetuk chip menggerakkan kamera peta ke marker laboratorium tersebut.
2. **Kanvas Peta (`MapView`)**:
   - Menampilkan marker lokasi pengguna yang bergerak mengikuti perubahan lokasi perangkat selama halaman digunakan.
   - Menampilkan marker setiap laboratorium beserta lingkaran radiusnya (`Circle`). Marker berwarna **magenta (`Palette.primary`)** jika sedang ada praktikum berlangsung, dan **hitam (`Palette.ink`)** jika tidak ada.
3. **Panel Aktivitas Laboratorium (`GlassCard` di bagian bawah saat marker lab dipilih)**:
   - **Header Lab:** Nama Laboratorium (mis. `"Gedung AP"`), `Badge outline` `"Radius 50 m"`, dan jarak pengguna saat ini (`"Jarak Anda: 22 m"`).
   - **Blok 1 — Praktikum Sedang Berlangsung:**
     - Menampilkan Nama Praktikum, Kelas, Waktu Pelaksanaan (`"13:00 – 15:00"`), dan `StatusBadge` (`Sedang Dibuka`).
     - Jika pengguna adalah praktikan peserta sesi tersebut dan belum presensi, tampilkan tombol pil magenta **"Presensi Sekarang"** menuju `/presensi/[sessionId]`.
     - Jika kosong: teks `Palette.textMuted` *"Tidak ada praktikum yang sedang berlangsung."*
   - **Blok 2 — Praktikum Berikutnya:**
     - Menampilkan Nama Praktikum, Kelas, Tanggal & Waktu Pelaksanaan, serta `StatusBadge` (`Belum Dibuka`).
     - Jika kosong: teks `Palette.textMuted` *"Belum ada jadwal praktikum berikutnya."*

---

### 5.3 Halaman Khusus Presensi & Validasi Lokasi (PIC C)

#### A. Detail Sesi Praktikan (`src/app/(tabs)/jadwal/[id].tsx`)
- Menampilkan informasi sesi, lokasi laboratorium, status kehadiran/izin saat ini, dan tombol utama **"Buka Halaman Presensi"** (mengarahkan ke `/presensi/[sessionId]`).

#### B. Halaman Presensi (`src/app/presensi/[sessionId].tsx`, Tanpa Tab Bar)
Dibungkus dengan `<ErrorBoundary>`:
1. **`TopBar`**: `"Presensi Praktikum"`, tombol kembali.
2. **Kartu Informasi Sesi (`GlassCard`)**:
   - Nama Praktikum, Kelas & Nama Laboratorium (`Badge outline`), Waktu Pelaksanaan, dan `StatusBadge`.
3. **Kartu Pemeriksaan Lokasi (`GlassCard`)**:
   - **Di Dalam Radius (`jarakMeter <= lab.radiusMeter`):** `Badge tone="primary"` `"Di Dalam Radius"`, angka jarak `"Jarak Anda ke <Nama Lab>: 14 m"`, subteks `"Batas radius maksimal: 50 m"`, tombol `"Perbarui Lokasi"`.
   - **Di Luar Radius (`jarakMeter > lab.radiusMeter`):** `Badge tone="danger"` `"Di Luar Radius"`, angka jarak `"Jarak Anda: 138 m (Maks. 50 m)"`, pesan merah *"Anda berada di luar radius laboratorium. Dekati area praktikum lalu tekan Perbarui Lokasi."*, tombol `"Perbarui Lokasi"`.
   - **Izin Ditolak / GPS Mati / Koordinat Belum Tersedia / Lokasi Palsu:** menampilkan `DeviceStatusCard` sesuai tabel bagian 6.
4. **Kartu Aksi Presensi (`GlassCard`)**:
   - **Terkunci (di luar radius / GPS bermasalah / sesi tidak dibuka / sudah izin):** tampilkan kartu terkunci dengan pesan jelas mengapa presensi tidak dapat dilakukan.
   - **Terbuka (sesi `dibuka` DAN `Di Dalam Radius`):**
     - Tampilan utama: **Bingkai Kamera Pindai QR** (radius 24, tinggi 250) yang langsung mencatat presensi saat QR asisten terbaca.
     - Tombol sekunder di bawah kamera: **"Kamera bermasalah? Ketik kode 6 digit"** yang membuka input `DigitBoxes` + tombol `"Kirim Presensi"`.

---

### 5.4 Rekap Asisten, Catatan Praktikan, & Izin (`Hadir`, `Sakit`, `Izin`, `Alpha`)

#### A. Detail Rekap Asisten (`src/app/rekap/[id].tsx` — PIC B)
- **Kotak Ringkasan 4 Status:** Empat kartu kecil sejajar di bawah informasi sesi yang menampilkan jumlah: **Hadir** (angka magenta), **Sakit** (angka kuning-amber), **Izin** (angka ungu), dan **Alpha / Belum Hadir** (angka merah saat sesi `ditutup`, atau abu-abu `"Belum Hadir"` saat sesi masih berjalan).
- **Daftar Peserta Sesi:** Menampilkan seluruh praktikan di `pesertaIds` beserta `Badge` statusnya masing-masing (`Hadir` + jam & jarak meter, `Sakit`, `Izin`, atau `Alpha` / `Belum Hadir`).

#### B. Catatan Kehadiran Praktikan (`src/app/(tabs)/catatan.tsx` — PIC C)
- **Kartu Ringkasan Atas:** Cincin kehadiran disertai 4 indikator jumlah: **Hadir**, **Sakit**, **Izin**, dan **Alpha**.
- **Daftar Riwayat Sesi:** Setiap baris sesi menampilkan nama praktikum, `"tanggal · laboratorium"`, serta `Badge` status akhir praktikan pada sesi tersebut (`Hadir` + jam presensi, `Sakit`, `Izin`, atau `Alpha`).

#### C. Pengajuan & Pemeriksaan Izin (`pengajuan-izin.tsx` & `pemeriksaan-izin.tsx` — PIC C & PIC B)
- Pada tab **Buat Izin**, pemilih tanggal menggunakan **`ExpandableCalendar`** sehingga praktikan dapat memilih jadwal praktikum di minggu depan atau bulan depan.
- Klasifikasi AI (`src/services/ai.ts`) mengklasifikasikan alasan izin ke dalam kategori **`Sakit`** (`tone="warning"`) atau **`Izin`** (`tone="info"`), atau **`Belum terklasifikasi`** (`tone="muted"`) bila AI tidak merespons dalam 10 detik.

---

## 6. Standar Pesan Kondisi Perangkat (Kebutuhan 7)

| Kondisi | Judul `DeviceStatusCard` | Pesan Informasi | Tombol Aksi |
|---|---|---|---|
| Izin Lokasi Ditolak | Akses Lokasi Ditolak | HadirKu memerlukan izin akses lokasi untuk memastikan Anda berada di dalam radius laboratorium. | Buka Pengaturan |
| Layanan Lokasi (GPS) Nonaktif | Layanan Lokasi Nonaktif | Aktifkan GPS pada perangkat Anda agar posisi terhadap laboratorium dapat diperiksa. | Coba Lagi |
| Koordinat Belum Tersedia | Mencari Titik Koordinat… | Koordinat lokasi perangkat belum tersedia. Pastikan Anda berada di area dengan sinyal GPS memadai. | Muat Ulang Lokasi |
| Lokasi Palsu (*Mock GPS*) | Lokasi Palsu Terdeteksi | Matikan aplikasi pemalsu lokasi (Fake GPS) di perangkat Anda untuk melanjutkan presensi. | Periksa Ulang |
| Izin Notifikasi Ditolak | Notifikasi Belum Aktif | Aktifkan izin notifikasi agar Anda menerima pemberitahuan saat sesi dibuka, jadwal berubah, atau izin diputuskan. | Buka Pengaturan |
| Gangguan Jaringan | Koneksi Jaringan Bermasalah | Tidak dapat menyinkronkan data dengan server. Periksa koneksi internet Anda. | Coba Lagi |