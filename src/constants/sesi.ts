/**
 * Toleransi penutupan otomatis sesi, dalam menit setelah `jamSelesai`.
 * Praktikum sering molor, jadi sesi tidak ditutup tepat di jam selesai.
 * Setelah batas ini presensi ditolak walaupun status di Firestore belum berubah ke `ditutup`.
 * Ubah angka di sini saja; jangan menulis 15 langsung di layar.
 */
export const TOLERANSI_TUTUP_MENIT = 15;
