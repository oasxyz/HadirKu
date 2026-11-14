export function getAuthErrorMessage(error: any): string {
  const code = error?.code || '';

  switch (code) {
    // Auth errors
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau kata sandi salah';
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar';
    case 'auth/account-exists-with-different-credential':
    case 'auth/credential-already-in-use':
      return 'Email ini sudah terdaftar dengan kata sandi. Masuk pakai email dan kata sandi.';
    case 'auth/weak-password':
      return 'Kata sandi minimal 6 karakter';
    case 'auth/invalid-email':
      return 'Format email tidak valid';
    case 'auth/network-request-failed':
      return 'Tidak ada koneksi internet';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan gagal. Silakan coba lagi nanti';

    // Firestore & permission errors (SRS009)
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'Kamu tidak punya akses ke data ini';
    case 'unavailable':
    case 'firestore/unavailable':
      return 'Layanan sedang tidak tersedia, periksa koneksi internetmu';

    default:
      // Jangan tampilkan error.message mentah ke pengguna (bisa bocor detail internal).
      if (typeof error?.message === 'string' && error.message.includes('permission-denied')) {
        return 'Kamu tidak punya akses ke data ini';
      }
      return 'Terjadi kesalahan, coba lagi';
  }
}