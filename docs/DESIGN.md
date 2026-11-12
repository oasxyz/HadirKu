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
| Pelacak tiga langkah: Diajukan, Diperiksa, Diputuskan | **belum ada** | status pengajuan izin | PIC C |

Cincin kehadiran butuh `react-native-svg`. Lapor PM sebelum memakainya, karena bisa memerlukan build ulang APK. Pelacak langkah cukup dari `View` biasa.

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
- **Register** (`register.tsx`, baru, tanpa tab bar). `TopBar` "Daftar Akun" + `GlassCard`: Nama lengkap, NIM, Email, Kata sandi, Peran dengan dua `Chip` (terpilih = hitam) dan keterangan "Peran tidak bisa diubah setelah mendaftar.", `PrimaryButton` "Daftar". Tautan "Sudah punya akun? Masuk".
- **Profil** (`(tabs)/profil.tsx`, ubah). `Avatar` 104, nama, `Badge` peran (`outline`), tiga `ListRow` tanpa ikon (NIM, Email, Versi Aplikasi), tombol hitam "Keluar". Email diambil dari akun Firebase. Keluar memakai dialog konfirmasi "Keluar dari akun?" lalu kembali ke `login`.
- **`src/app/index.tsx`** berubah menjadi pemeriksa sesi login: sudah login ke `/jadwal`, belum ke `login`.

### SRS002 — Jadwal dan kelola sesi (PIC A)

- **Beranda** (`(tabs)/jadwal/index.tsx`, ada). Sapaan + avatar, kartu "Sesi Terdekat" (titik status, nama praktikum, lab dan tanggal, "Hadir x/y" dengan garis progres, tombol buka), "Jadwal Praktikum" dengan kalender mingguan (hari terpilih magenta, titik menandai hari bersesi), "Timeline" berisi baris sesi tanpa ikon. Praktikan hanya melihat sesi yang memuat dirinya.
- **Beranda asisten** (ubah). Tambah `RoundButton icon="add"` di sebelah avatar untuk membuka form tambah sesi.
- **Form tambah / ubah sesi** (baru, tanpa tab bar). `GlassCard`: Praktikum, Kelas lab, Tanggal (`YYYY-MM-DD`), Jam mulai dan selesai (`HH:mm`), Peserta sebagai `Chip` pilih-ganda, `PrimaryButton` "Simpan". Validasi di bawah field: wajib diisi, format benar, jam selesai setelah jam mulai, minimal satu peserta.
- **Detail sesi** (`(tabs)/jadwal/[id].tsx`, ubah). Nama asisten + avatar, kartu pink berisi jam, nama praktikum, chip tanggal dan lab, `StatusBadge`. Asisten mendapat `RoundButton icon="create-outline"` di `TopBar right`. Hapus lewat dialog "Hapus sesi ini?" dengan tombol hitam "Hapus".

### SRS003 — Buka / tutup sesi (PIC B)

`SessionControls` (ada). Kartu status tanpa ikon:

- `belum_dibuka`: "Sesi belum dibuka" + tombol magenta "Buka Sesi" (dengan dialog konfirmasi).
- `dibuka`: tepi kartu magenta, "Sesi sedang dibuka", kotak "KODE SESI" berisi `DigitBoxes` magenta, "x praktikan sudah hadir", tombol hitam "Tutup Sesi" (dengan dialog konfirmasi).
- `ditutup`: "Sesi telah berakhir", tanpa tombol.

Kode sesi hanya dirender untuk asisten. Perubahan status tampil di semua layar tanpa reload.

### SRS004 — Presensi (PIC C)

`AttendanceAction` (ada):

- `dibuka`, belum presensi: "Masukkan Kode Sesi", `DigitBoxes` (tepi merah saat salah), pesan error merah di bawahnya, tombol "Kirim Presensi". Pesan: "Masukkan kode sesi terlebih dahulu", "Kode sesi harus 6 digit", "Kode sesi tidak sesuai", "Anda bukan peserta sesi ini".
- Sudah presensi: kartu bertepi magenta, `Illustration icon="checkmark"`, "Sudah Hadir", "Tercatat pukul …".
- `belum_dibuka`: kartu teks "Presensi belum dibuka oleh asisten".
- `ditutup`: kartu teks "Sesi praktikum telah ditutup".

### SRS005 — Rekap (PIC B) dan catatan (PIC C)

- **Rekap daftar** (`(tabs)/rekap/index.tsx`, ada). `ListRow` per sesi: nama praktikum, "tanggal · Hadir x/y", `StatusBadge`.
- **Rekap detail** (`rekap/[id].tsx`, ada, tanpa tab bar). Nama praktikum besar, chip tanggal dan jam, `StatusBadge`, "Praktikan Hadir x / y", dua batang (Hadir pink-ungu, Belum hadir ungu muda), kartu "Daftar Kehadiran" berisi baris nama, NIM, dan chip jam.
- **Catatan** (`(tabs)/catatan.tsx`, ubah). Baris per sesi: nama praktikum, "tanggal · lab", chip jam presensi. Tambahan Sprint 2: kartu ringkasan (cincin kehadiran + deret titik, bagian 6) di atas daftar, dan baris izin dengan `Badge` "Izin diterima".

### SRS006 — Pengajuan izin (PIC C)

`components/izin/pengajuan-izin.tsx` (baru), tab Izin untuk praktikan.

- `GlassCard` form: Sesi (deret `Chip`), Alasan (input multibaris), `PrimaryButton` "Ajukan izin".
- Sesi yang sudah punya pengajuan `menunggu`: `Chip` redup dan keterangan "… sudah diajukan, menunggu keputusan."
- Alasan kosong: "Alasan wajib diisi".
- `SectionTitle` "Pengajuan saya" + `ListRow` per pengajuan: nama praktikum, "tanggal · kategori", `Badge` status.
- Kartu detail pengajuan: alasan, "Kategori AI" + `Badge`, pelacak tiga langkah, keterangan pemutus dan waktu.

### SRS007 — Klasifikasi AI (PIC C)

Tidak punya layar sendiri:

- Saat mengirim: tombol `disabled`, label "Mengirim…".
- Berhasil: kategori tampil sebagai `Badge outline`.
- Gagal atau timeout (batas 10 detik): pengajuan tetap tersimpan, `Badge muted` "Belum terklasifikasi". Jangan tampilkan error ke praktikan.
- Sisi asisten: tulis "Saran AI" di samping badge supaya jelas ini bukan keputusan.

### SRS008 — Pemeriksaan izin (PIC B)

`components/izin/pemeriksaan-izin.tsx` (baru), tab Izin untuk asisten.

- Daftar `GlassCard`, yang `menunggu` di atas. Isi: `Avatar` + nama, "sesi · tanggal", `Badge` status, alasan lengkap, "Saran AI" + `Badge`.
- Dua tombol berdampingan: "Tolak" (sekunder) dan "Terima" (utama). Keputusan lewat dialog konfirmasi singkat.
- Setelah diputuskan: tombol hilang, tampil "Diputuskan <nama> · <waktu>".
- Kosong: `EmptyNote` "Belum ada pengajuan izin".

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
