# DESIGN — HadirKu Sprint 2

Panduan tampilan untuk semua anggota tim. Tujuannya: layar baru Sprint 2 (login, kelola sesi, izin, dll.) terlihat seragam dengan layar yang sudah ada, dan tiap PIC tahu layar serta kondisi apa saja yang harus dibuat.

- Contoh gambar tiap layar (mockup): https://claude.ai/artifact/6hjLAT4YaG2R3ibtb2Bk2N
- Fungsi dan aturan bisnis: `docs/SRS-Sprint-2.md`. Dokumen ini hanya mengatur bentuk tampilan.

**Aturan utama:** jangan membuat warna, bayangan, atau komponen dasar sendiri. Pakai yang ada di `src/constants/theme.ts` dan `src/components/ui.tsx`. Butuh komponen baru yang dipakai banyak layar: kabari PM.

---

## 1. Gaya visual

Pastel lembut dengan kartu kaca (putih semi-transparan) dan sudut sangat membulat.

- **Hanya empat keluarga warna: magenta, ungu muda, hitam, putih.** Tidak ada hijau, kuning, oranye, atau biru.
- Merah hanya untuk pesan error di form dan tepi input yang salah.
- Latar: gradien lavender ke pink lembut (`Screen` sudah menggambarnya).
- Tombol, chip, dan baris daftar berbentuk pil (`borderRadius: 999`).
- **Tanpa ikon hiasan di samping teks.** Baris daftar, chip, kartu status, dialog, dan daftar hadir tidak memakai ikon. Ikon hanya untuk hal yang bisa ditekan atau penanda navigasi: tab bar, tombol kembali/tambah, ikon mata di kata sandi, panah di tombol utama.
- Gambar dipakai bila menggantikan bacaan, bukan menghias: lihat bagian 6.
- Hanya tema terang.

## 2. Token (`src/constants/theme.ts`)

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `Palette.primary` | `#E21BD0` | tombol utama, tab aktif, status aktif/berhasil, kode sesi |
| `Palette.primaryMuted` | `rgba(222,31,203,0.12)` | latar aksen tipis |
| `Palette.ink` | `#17151C` | tombol berat (Tutup Sesi, Hapus, Keluar), status selesai/ditolak, chip terpilih |
| `Palette.lavender` | `#E4DAF1` | bulatan ilustrasi, bidang lembut |
| `Palette.lilac` | `#F4CFEF` | bulatan ilustrasi kedua |
| `Palette.text` | `#131118` | judul dan teks utama |
| `Palette.textSecondary` | `#5E586C` | teks penjelas |
| `Palette.textMuted` | `#8F89A0` | label kecil, subjudul, placeholder |
| `Palette.danger` | `#E11D48` | **hanya** pesan error dan tepi input salah |
| `Palette.card` | `rgba(255,255,255,0.72)` | latar kartu |
| `Palette.border` | `rgba(110,90,150,0.16)` | garis pemisah, tepi input |
| `Gradient` | `linear-gradient(165deg, #EEF0F5, #E7E2EE, #E2CEE6)` | latar layar |

`Palette.success` masih ada supaya kode lama tidak rusak, tetapi nilainya sama dengan `primary`. Untuk kode baru pakai `Palette.primary`.

Selalu impor dari `@/constants/theme`; jangan menulis kode warna baru di layar.

## 3. Tipografi

Font sistem bawaan, tanpa font tambahan.

| Peran | Ukuran | Berat |
|---|---|---|
| Judul hero / nama besar | 30 | 400, kata kunci 600–700 |
| Judul layar besar (mis. nama praktikum di rekap) | 26 | 600 |
| Judul layar (`TopBar`) | 19 | 600 |
| Judul bagian (`SectionTitle`) | 17 | 600 |
| Judul baris daftar | 15 | 600 |
| Teks isi / tombol | 13–15 | 400–700 |
| Subjudul, label kecil, pesan error | 12–13 | 400 |
| Badge | 10 | 600 |

## 4. Jarak dan bentuk

- Padding horizontal layar 20; lebar konten maksimum 520. Diatur `Screen`.
- Jarak antar blok dalam layar 18 (diatur `Screen`); antar elemen dalam kartu 10–16.
- Radius: kartu 28, kartu status 24, sheet besar 36, pil/tombol/chip/avatar 999, kotak digit 14, input multibaris 18.
- Bayangan: `shadow` dari `ui.tsx` lewat `boxShadow` (bukan `shadowColor`/`elevation`).
- Ruang bawah untuk tab bar melayang otomatis lewat `<Screen>`.
- Target sentuh minimal 44; tombol utama tinggi 56.

---

## 5. Komponen siap pakai (`@/components/ui`)

| Komponen | Fungsi | Props penting |
|---|---|---|
| `Screen` | Pembungkus layar: gradien, scroll, safe area, jarak bawah tab bar | `withTabBar` (false untuk layar tanpa tab) |
| `TopBar` | Judul layar + tombol kembali bulat | `title`, `back`, `fallback`, `right` |
| `GlassCard` | Kartu kaca | `style` |
| `SectionTitle` | Judul bagian + aksi di kanan | `title`, `right` |
| `ListRow` | Baris daftar pil, **tanpa ikon** | `title`, `subtitle`, `right`, `onPress` |
| `Chip` | Pilihan / keterangan berbentuk pil, tanpa ikon | `label`, `selected`, `onPress` |
| `Badge` | Label status kecil | `label`, `tone` (lihat 5.1) |
| `Avatar` | Lingkaran inisial nama | `nama`, `size` |
| `PrimaryButton` | Tombol utama magenta | `label`, `onPress`, `disabled`, `icon` |
| `RoundButton` | Tombol ikon bulat | `icon`, `onPress`, `size` |
| `EmptyNote` | Keadaan kosong: ilustrasi + pesan | `message`, `icon` |
| `Illustration` | Ikon magenta di atas dua bulatan ungu | `icon` |
| `DigitBoxes` | Deret kotak digit kode sesi | `value`, `length`, `color`, `error` |
| `StatusBadge` | Badge status sesi (`components/status-badge.tsx`) | `status` |

`ListRow` dan `Chip` masih menerima prop `icon`, tetapi jangan dipakai kecuali ikon itu benar-benar menambah arti.

### 5.1 Pemetaan status ke tampilan

| `tone` | Tampilan | Arti |
|---|---|---|
| `primary` | magenta | aktif / berhasil |
| `dark` | hitam | selesai / ditolak |
| `muted` | abu keunguan | belum / menunggu |
| `outline` | putih bergaris, teks hitam | keterangan netral |

| Data | Nilai | `tone` | Label |
|---|---|---|---|
| Status sesi | `belum_dibuka` | `muted` | Belum Dibuka |
| | `dibuka` | `primary` | Sedang Dibuka |
| | `ditutup` | `dark` | Ditutup |
| Status izin | `menunggu` | `muted` | Menunggu |
| | `diterima` | `primary` | Diterima |
| | `ditolak` | `dark` | Ditolak |
| Kategori AI | `sakit` / `keluarga` / `akademik` / `lainnya` | `outline` | Sakit / Keluarga / Akademik / Lainnya |
| | `null` | `muted` | Belum terklasifikasi |
| Peran | asisten / praktikan | `outline` | Asisten Laboratorium / Praktikan |
| Catatan | izin diterima | `primary` | Izin diterima |

Status sesi selalu lewat `StatusBadge`, jangan membuat label sendiri.

### 5.2 Tombol

| Jenis | Tampilan | Contoh |
|---|---|---|
| Utama | pil magenta, teks putih | Masuk, Simpan, Buka Sesi, Kirim Presensi, Terima |
| Berat | pil hitam, teks putih | Tutup Sesi, Hapus, Keluar |
| Sekunder | pil putih, teks hitam | Tolak, Batal |

Tidak ada tombol merah.

### 5.3 Kolom input (belum ada komponen bersama)

PIC A membuat `src/components/text-field.tsx` saat mengerjakan login dan mengabari PM; PIC lain memakainya.

```tsx
const input = {
  backgroundColor: 'rgba(255,255,255,0.85)',
  borderColor: Palette.border,
  borderRadius: 999,        // 18 jika multiline
  borderWidth: 1,
  color: Palette.text,
  fontSize: 15,
  height: 52,               // multiline: minHeight 110, paddingTop 14
  paddingHorizontal: 18,
};
// placeholderTextColor={Palette.textMuted}
```

Label di atas input: 12, `Palette.textMuted`. Pesan error di bawah input: 12, `Palette.danger`. Input yang salah: `borderColor: Palette.danger`.

Kode sesi tidak memakai input biasa, tetapi `DigitBoxes` dengan `TextInput` transparan di atasnya (contoh: `attendance-action.tsx`).

### 5.4 Pemilih bagian dan filter

| Pola | Tampilan | Dipakai di |
|---|---|---|
| Pemilih dua bagian | wadah pil putih transparan (padding 5); tiap bagian `flex: 1`, teks 13/600; yang aktif pil hitam berteks putih | Izin praktikan: "Izin saya / Buat izin" |
| Pilihan cara | dua `Chip`, terpilih = hitam | Presensi: "Pindai QR / Ketik kode" |
| Filter | deret `Chip`, terpilih = hitam | Pemeriksaan izin: "Hari ini / Minggu ini / Semua" |
| Kotak ringkasan | tiga `GlassCard` kecil sejajar (radius 22): angka 24/700 di atas, label 12 di bawah | Izin saya |

Pemilih dua bagian belum ada komponennya. PIC C membuatnya saat mengerjakan SRS006; kalau dipakai di layar lain, pindahkan ke `ui.tsx` lewat PM.

---

## 6. Ilustrasi

Dipakai hanya bila gambar membuat keadaan lebih cepat ditangkap daripada teks. Semua memakai magenta, ungu muda, dan putih.

| Ilustrasi | Status | Dipakai di | Pembuat |
|---|---|---|---|
| `Illustration` (ikon di atas dua bulatan) | sudah ada | keadaan kosong, Sudah Hadir, koneksi gagal, tidak punya akses | tinggal pakai |
| `DigitBoxes` (kotak digit) | sudah ada | kode sesi asisten, input kode praktikan | tinggal pakai |
| Kartu sesi terdekat (bulatan + papan) | sudah ada | beranda | — |
| Diagram batang hadir / belum | sudah ada | rekap detail | — |
| Cincin kehadiran "9/10" + deret titik per pertemuan | **belum ada** | Catatan (ringkasan di atas daftar) | PIC C |
| Pelacak tiga langkah: Diajukan, Diperiksa, Diputuskan | **belum ada** | detail pengajuan izin | PIC C |
| QR kode sesi | **belum ada** | kartu sesi dibuka (asisten) | PIC B |
| Bingkai pindai QR (kamera) | **belum ada** | presensi praktikan | PIC C |

Pelacak langkah cukup dari `View` biasa. Tiga lainnya butuh paket native, jadi **lapor PM dulu** dan jangan memasang sendiri:

| Kebutuhan | Paket | Akibat |
|---|---|---|
| Cincin kehadiran | `react-native-svg` | perlu dipastikan sudah ada di APK |
| Menampilkan QR | pembuat QR di atas `react-native-svg` | sama |
| Memindai QR | `expo-camera` + izin kamera di `app.json` | **build ulang APK** oleh PM, lalu semua memasang APK baru |

Sampai APK baru dibagikan, QR dan pindai tidak bisa dijalankan; kerjakan dulu jalur ketik kode.

Form (login, register, tambah sesi, ajukan izin) tidak diberi ilustrasi tambahan.

---

## 7. Kerangka layar baru

```tsx
import { GlassCard, PrimaryButton, Screen, SectionTitle, TopBar } from '@/components/ui';

export default function ContohScreen() {
  return (
    <Screen>
      <TopBar title="Judul Layar" back />
      <SectionTitle title="Bagian" />
      <GlassCard>{/* isi */}</GlassCard>
      <PrimaryButton label="Simpan" onPress={() => {}} />
    </Screen>
  );
}
```

Layar tanpa tab bar (login, register, form penuh): `<Screen withTabBar={false}>`.

## 8. Lima kondisi wajib tiap layar

| Kondisi | Tampilan |
|---|---|
| Belum login | Arahkan ke `login` (`router.replace`), jangan tampilkan layar kosong |
| Memuat | `GlassCard` berisi `ActivityIndicator` warna `Palette.primary` dan teks "Memuat…" |
| Daftar kosong | `EmptyNote` dengan pesan spesifik per layar |
| Koneksi / Firestore gagal | `EmptyNote`-serupa: `Illustration icon="cloud-offline-outline"`, pesan jelas, tombol "Coba lagi" |
| AI tidak merespons (SRS007) | Pengajuan tetap tersimpan; `Badge` "Belum terklasifikasi" (`muted`), bukan error merah |

Pesan ditulis bahasa Indonesia, bukan kode mentah Firebase:

| Kode Firebase | Pesan |
|---|---|
| `auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found` | Email atau kata sandi salah |
| `auth/email-already-in-use` | Email sudah terdaftar |
| `auth/weak-password` | Kata sandi minimal 6 karakter |
| `auth/invalid-email` | Format email tidak valid |
| `auth/network-request-failed` | Tidak ada koneksi internet |
| `permission-denied` | Kamu tidak punya akses ke data ini |
| lainnya | Terjadi kesalahan, coba lagi |

---

## 9. Spesifikasi layar per SRS

**ada** = sudah ada dari Sprint 1 dan sudah mengikuti desain ini; tinggal disambung ke Firestore. **ubah** = layar lama yang perlu tambahan. **baru** = dibuat di Sprint 2. Gambar tiap layar ada di mockup.

### SRS001 — Autentikasi dan profil (PIC A)

- **Login** (`login.tsx`, baru, tanpa tab bar). Susunan sama dengan layar pilih identitas sekarang (`src/app/index.tsx`): tiga busur ungu + lencana, lalu `GlassCard` besar (radius 36) berisi judul "Selamat Datang di **HadirKu**", Email, Kata sandi (ikon mata), `PrimaryButton` "Masuk", tautan "Belum punya akun? Daftar". Saat proses: tombol `disabled`, label "Memproses…".
- **Masuk dengan Google** (tambahan SRS001). Di login dan register, di bawah tombol utama: garis pemisah dengan teks "atau", lalu tombol pil **putih bertulisan hitam** (tinggi 56, bayangan standar): "Masuk dengan Google" di login, "Daftar dengan Google" di register. Teks saja, tanpa ikon. Tombol `disabled` selama proses.
  - Pengguna lama (dokumen `users/{uid}` sudah ada): langsung ke `/jadwal`.
  - Pengguna baru: ke **Lengkapi Profil** dulu.
  - Membatalkan pilih akun Google **bukan error**: tidak ada pesan, layar tetap di login.
  - Email sudah terdaftar dengan kata sandi: pesan merah di atas form, "Email ini sudah terdaftar dengan kata sandi. Masuk memakai email dan kata sandi."
- **Lengkapi Profil** (baru, tanpa tab bar, hanya untuk pengguna Google baru). `TopBar` "Lengkapi Profil" tanpa tombol kembali. `GlassCard`: `Avatar` 72 dan "Masuk sebagai <email Google>", Nama lengkap (terisi dari akun Google, boleh diedit), NIM, Peran dengan dua `Chip` (Praktikan bawaan) dan keterangan "Peran tidak bisa diubah setelah disimpan.", `PrimaryButton` "Simpan", tautan "Batal, keluar dari akun" (keluar dari Firebase dan Google). Validasi sama dengan Register ("NIM wajib diisi", dst.). Simpan membuat `users/{uid}` lalu ke `/jadwal`.
- **Register** (`register.tsx`, baru, tanpa tab bar). `TopBar` "Daftar Akun" + `GlassCard`: Nama lengkap, NIM, Email, Kata sandi, Peran dengan dua `Chip` (terpilih = hitam) dan keterangan "Peran tidak bisa diubah setelah mendaftar.", `PrimaryButton` "Daftar". Tautan "Sudah punya akun? Masuk".
- **Profil** (`(tabs)/profil.tsx`, ubah). `Avatar` 104, nama, `Badge` peran (`outline`), tiga `ListRow` tanpa ikon (NIM, Email, Versi Aplikasi), tombol hitam "Keluar". Email diambil dari akun Firebase. Keluar memakai dialog konfirmasi "Keluar dari akun?" lalu kembali ke `login`.
- **`src/app/index.tsx`** pemeriksa sesi login: belum login ke `login`; sudah login dan punya dokumen `users` ke `/jadwal`; sudah login tetapi **belum punya dokumen `users`** (pengguna Google baru) ke Lengkapi Profil. Jangan kirim pengguna tanpa dokumen `users` ke `/jadwal`, karena `currentUser` kosong.
- **Keluar** harus keluar dari Firebase **dan** dari Google; kalau tidak, pemilih akun Google langsung memakai akun terakhir.

Masuk dengan Google butuh modul native (`@react-native-google-signin/google-signin`, sudah dipasang PM) dan **APK baru**. Sebelum APK dibagikan, jalur email dan kata sandi tetap dipakai untuk pengujian. `webClientId` diambil dari `google-services.json`; tanyakan PM bila perlu.

### SRS002 — Jadwal dan kelola sesi (PIC A)

- **Beranda** (`(tabs)/jadwal/index.tsx`, ada). Sapaan + avatar, kartu "Sesi Terdekat" (titik status, nama praktikum, lab dan tanggal, "Hadir x/y" dengan garis progres, tombol buka), "Jadwal Praktikum" dengan kalender mingguan (hari terpilih magenta, titik menandai hari bersesi), "Timeline" berisi baris sesi tanpa ikon. Praktikan hanya melihat sesi yang memuat dirinya.
- **Beranda asisten** (ubah). Tambah `RoundButton icon="add"` di sebelah avatar untuk membuka form tambah sesi.
- **Form tambah / ubah sesi** (baru, tanpa tab bar). `GlassCard`: Praktikum, Kelas lab, Tanggal (`YYYY-MM-DD`), Jam mulai dan selesai (`HH:mm`), Peserta sebagai `Chip` pilih-ganda, `PrimaryButton` "Simpan". Validasi di bawah field: wajib diisi, format benar, jam selesai setelah jam mulai, minimal satu peserta.
- **Detail sesi** (`(tabs)/jadwal/[id].tsx`, ubah). Nama asisten + avatar, kartu pink berisi jam, nama praktikum, chip tanggal dan lab, `StatusBadge`. Asisten mendapat `RoundButton icon="create-outline"` di `TopBar right`. Hapus lewat dialog "Hapus sesi ini?" dengan tombol hitam "Hapus".

### SRS003 — Buka / tutup sesi (PIC B)

`SessionControls` (ada). Kartu status tanpa ikon:

- `belum_dibuka`: "Sesi belum dibuka" + tombol magenta "Buka Sesi" (dengan dialog konfirmasi).
- `dibuka` (ubah): tepi kartu magenta, "Sesi sedang dibuka", **QR** di kotak putih (QR hitam, di tengah), lalu kotak "ATAU KETIK KODE" berisi `DigitBoxes` magenta sebagai cadangan, "x praktikan sudah hadir", tombol hitam "Tutup Sesi" (dengan dialog konfirmasi). Keterangan: "Minta praktikan memindai QR ini. Kalau kameranya bermasalah, bacakan kode di bawahnya."
- `ditutup`: "Sesi telah berakhir", tanpa tombol.

Isi QR adalah kode sesi 6 digit yang sama, jadi aturan presensi tidak berubah. QR dan kode hanya dirender untuk asisten. Perubahan status tampil di semua layar tanpa reload.

Saat ini kode hanya menampilkan `DigitBoxes`; QR adalah tambahan Sprint 2 dan butuh paket pembuat QR (lihat bagian 6).

### SRS004 — Presensi (PIC C)

`AttendanceAction` (ada, ubah untuk QR). Saat sesi `dibuka` dan belum presensi, ada dua cara yang dipilih lewat dua `Chip` di atas: **Pindai QR** (bawaan) dan **Ketik kode**.

- **Pindai QR** (baru): bingkai kamera gelap bersudut membulat (radius 24, tinggi sekitar 250) dengan empat siku putih dan garis pindai magenta, teks "Arahkan kamera ke QR di layar asisten.", tautan "Kamera bermasalah? Ketik kode". QR terbaca langsung mengirim presensi tanpa tombol tambahan.
- **Kamera tidak bisa dipakai** (baru): izin ditolak atau kamera rusak menampilkan `Illustration`, "Kamera tidak bisa diakses. Izinkan kamera di pengaturan, atau ketik kode sesi.", dan tombol "Ketik kode". Jangan biarkan layar hitam kosong.
- **Ketik kode** (ada): "Masukkan Kode Sesi", `DigitBoxes` (tepi merah saat salah), pesan error merah di bawahnya, tombol "Kirim Presensi". Pesan: "Masukkan kode sesi terlebih dahulu", "Kode sesi harus 6 digit", "Kode sesi tidak sesuai", "Anda bukan peserta sesi ini".
- QR yang bukan milik sesi ini memakai pesan yang sama: "Kode sesi tidak sesuai".
- **Lokasi** (tanpa tampilan sendiri). Saat presensi, aplikasi meminta izin lokasi, menghitung jarak ke `session.asistenCoords`, dan menyimpan `jarakMeter`. Jangan tampilkan apa pun ke praktikan: tidak ada pesan "di luar lab", tidak ada error. Izin ditolak, GPS gagal, atau `asistenCoords` kosong: presensi tetap berhasil seperti biasa. Hanya jarak yang disimpan, bukan koordinat praktikan.
- Sudah presensi: kartu bertepi magenta, `Illustration icon="checkmark"`, "Sudah Hadir", "Tercatat pukul …".
- `belum_dibuka`: kartu teks "Presensi belum dibuka oleh asisten".
- `ditutup`: kartu teks "Sesi praktikum telah ditutup".

### SRS005 — Rekap (PIC B) dan catatan (PIC C)

- **Rekap daftar** (`(tabs)/rekap/index.tsx`, ada). `ListRow` per sesi: nama praktikum, "tanggal · Hadir x/y", `StatusBadge`.
- **Rekap detail** (`rekap/[id].tsx`, ada, tanpa tab bar). Nama praktikum besar, chip tanggal dan jam, `StatusBadge`, "Praktikan Hadir x / y", dua batang (Hadir pink-ungu, Belum hadir ungu muda), kartu "Daftar Kehadiran" berisi baris nama, NIM, dan chip jam. Presensi dengan `jarakMeter` di atas `BATAS_JARAK_METER` (`src/constants/lokasi.ts`) diberi `Badge tone="dark"` "Di luar lab · 123 m" di bawah nama. Tanpa `jarakMeter` tidak ada badge. Jangan memakai warna lain atau tulisan "mencurigakan": ini petunjuk, bukan tuduhan.
- **Catatan** (`(tabs)/catatan.tsx`, ubah). Baris per sesi: nama praktikum, "tanggal · lab", chip jam presensi. Tambahan Sprint 2: kartu ringkasan (cincin kehadiran + deret titik, bagian 6) di atas daftar, dan baris izin dengan `Badge` "Izin diterima".

Presensi lewat QR dan lewat ketik kode tercatat sama, jadi rekap dan catatan tidak membedakannya.

### SRS006 — Pengajuan izin (PIC C)

`components/izin/pengajuan-izin.tsx` (baru), tab Izin untuk praktikan. Di bawah `TopBar` "Izin" ada pemilih dua bagian (lihat 5.4): **Izin saya** (bawaan) dan **Buat izin**.

**Izin saya**

- Tiga kotak ringkasan sejajar: jumlah Menunggu, Diterima (angka magenta), Ditolak.
- `SectionTitle` "Pengajuan saya" + `ListRow` per pengajuan: nama praktikum, "hari, tanggal · kategori AI", `Badge` status.
- Mengetuk satu baris membuka **Detail Izin** (`TopBar` dengan tombol kembali): nama praktikum + `Badge` status, tanggal, jam, dan lab, alasan lengkap, "Kategori AI" + `Badge`, pelacak tiga langkah, "Diputuskan <nama> · <waktu>".
- Kosong: `EmptyNote` "Kamu belum pernah mengajukan izin."

**Buat izin**

Satu `GlassCard`, urut dari atas:

1. **Tanggal**: kalender mingguan yang sama dengan beranda (hari terpilih magenta, titik menandai hari yang ada praktikumnya) dengan pil bulan di kanan label.
2. **Praktikum pada <hari, tanggal>**: deret `Chip` berisi praktikum praktikan pada tanggal itu ("Basis Data · 13:00"), terpilih = hitam.
   - Sudah punya pengajuan `menunggu`: `Chip` redup dan keterangan "… sudah diajukan, menunggu keputusan."
   - Tidak ada praktikum: teks "Tidak ada praktikum pada tanggal ini. Pilih tanggal yang bertitik."
3. **Alasan**: input multibaris. Kosong saat kirim: "Alasan wajib diisi".
4. `PrimaryButton` "Ajukan izin", `disabled` sampai praktikum dipilih.

Pilih tanggal hanya cara mencari sesi. Yang disimpan tetap `sessionId`, jadi struktur `leaveRequests` tidak berubah. Setelah berhasil, pindah ke "Izin saya".

### SRS007 — Klasifikasi AI (PIC C)

Tidak punya layar sendiri:

- Saat mengirim: tombol `disabled`, label "Mengirim…".
- Berhasil: kategori tampil sebagai `Badge outline`.
- Gagal atau timeout (batas 10 detik): pengajuan tetap tersimpan, `Badge muted` "Belum terklasifikasi". Jangan tampilkan error ke praktikan.
- Sisi asisten: tulis "Saran AI" di samping badge supaya jelas ini bukan keputusan.

### SRS008 — Pemeriksaan izin (PIC B)

`components/izin/pemeriksaan-izin.tsx` (baru), tab Izin untuk asisten.

- **Filter waktu** di bawah `TopBar`: tiga `Chip` "Hari ini" (bawaan), "Minggu ini", "Semua"; terpilih = hitam. Filter memakai tanggal pengajuan (`createdAt`).
- Hasil dikelompokkan per hari pengajuan. Tiap kelompok punya baris judul: tanggal di kiri ("Kamis, 12 Nov 2026"), keterangan di kanan ("2 menunggu" atau "selesai"). Kelompok yang masih punya pengajuan `menunggu` di atas.
- Tiap pengajuan satu `GlassCard`: `Avatar` + nama, "praktikum · tanggal sesi", `Badge` status, alasan lengkap, "Saran AI" + `Badge`.
- Dua tombol berdampingan: "Tolak" (sekunder) dan "Terima" (utama). Keputusan lewat dialog konfirmasi singkat.
- Setelah diputuskan: tombol hilang, tampil "Diputuskan <nama> · <waktu>".
- Kosong, pesannya mengikuti filter: "Tidak ada pengajuan izin hari ini." / "… minggu ini." / "Belum ada pengajuan izin."

### SRS009 — Rules, validasi, dan error (PIC A)

Tidak punya layar sendiri, tetapi memastikan:

- Semua form mengikuti bagian 5.3 dan 8.
- Aksi yang ditolak rules menampilkan "Kamu tidak punya akses ke data ini", bukan crash.
- Tombol yang tidak boleh dipakai suatu peran disembunyikan, tidak hanya mengandalkan rules.

---

## 10. Dialog konfirmasi

Kartu putih opak di atas latar gelap transparan, **tanpa ikon**: judul 18 tebal, pesan 14, dua tombol berdampingan ("Batal" sekunder di kiri, aksi di kanan). Aksi biasa magenta; aksi berat (Tutup Sesi, Hapus) hitam. Contoh: `ConfirmationModal` di `session-controls.tsx`.

## 11. Tab bar dan navigasi

- Tab bar melayang (`floating-tab-bar.tsx`): tab aktif pil magenta berlabel, tab lain ikon bulat putih.
- Tab: Beranda (`jadwal`), Rekap, Catatan, Izin, Profil. Asisten tidak melihat Catatan; praktikan tidak melihat Rekap.
- Layar non-tab didaftarkan di `src/app/_layout.tsx` pada blok komentar SRS masing-masing.
- Jangan mengubah `floating-tab-bar.tsx` dan `(tabs)/_layout.tsx` tanpa izin PM.

## 12. Hal yang harus dihindari

- Warna di luar magenta, ungu muda, hitam, putih. Merah di luar pesan error.
- Ikon atau emoji hiasan di samping teks, di kartu, dan di dialog.
- Warna, radius, atau bayangan hard-coded di luar token.
- `shadowColor` / `elevation` (pakai `boxShadow`).
- Latar solid penuh pada layar. Dialog boleh putih opak `#FFFFFF`.
- Library UI baru (NativeWind, Paper, dll.).
- Kode error mentah Firebase atau stack trace ke pengguna.
- Menyentuh berkas milik PIC lain (tabel kepemilikan di `docs/SRS-Sprint-2.md`).

## 13. Cek sebelum push

1. `npx tsc --noEmit` dan `npx expo lint` bersih.
2. Dicek di HP lewat dev client, bukan hanya web.
3. Lima kondisi bagian 8 sudah dicoba (matikan internet untuk menguji gagal koneksi).
4. Teks tidak terpotong di layar kecil; konten tidak tertutup tab bar.
5. Dicoba dengan akun asisten **dan** praktikan.
6. Dibandingkan dengan mockup layar yang sama.
