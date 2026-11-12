export function getAuthErrorMessage(error: any): string {
  const code = error?.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau kata sandi salah';
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar';
    case 'auth/weak-password':
      return 'Kata sandi minimal 6 karakter';
    case 'auth/invalid-email':
      return 'Format email tidak valid';
    case 'auth/network-request-failed':
      return 'Tidak ada koneksi internet';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan gagal. Silakan coba lagi nanti';
    default:
      return error?.message || 'Terjadi kesalahan, coba lagi';
  }
}