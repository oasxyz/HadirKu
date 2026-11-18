export type LogDomain = 'AUTH' | 'GEO' | 'MAP' | 'FCM' | 'FIRESTORE' | 'AI' | 'UI';

function formatPrefix(domain: LogDomain, action: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}][${domain}][${action}]`;
}

export const Logger = {
  info(domain: LogDomain, action: string, message: string, meta?: Record<string, unknown>) {
    if (__DEV__) {
      console.log(formatPrefix(domain, action), message, meta ?? '');
    }
  },

  warn(domain: LogDomain, action: string, message: string, meta?: Record<string, unknown>) {
    console.warn(formatPrefix(domain, action), message, meta ?? '');
  },

  error(domain: LogDomain, action: string, error: unknown, meta?: Record<string, unknown>) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(formatPrefix(domain, action), errMessage, meta ?? '');
  },
};

/**
 * Memetakan error Firebase / jaringan ke pesan bahasa Indonesia yang bersih sesuai DESIGN.md.
 */
export function toUserErrorMessage(error: unknown): string {
  const rawCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error);
  const combined = `${rawCode} ${rawMessage}`.toLowerCase();

  if (
    combined.includes('auth/invalid-credential') ||
    combined.includes('auth/wrong-password') ||
    combined.includes('auth/user-not-found')
  ) {
    return 'Email atau kata sandi salah';
  }
  if (combined.includes('auth/email-already-in-use')) {
    return 'Email sudah terdaftar';
  }
  if (combined.includes('auth/weak-password')) {
    return 'Kata sandi minimal 6 karakter';
  }
  if (combined.includes('auth/invalid-email')) {
    return 'Format email tidak valid';
  }
  if (combined.includes('network-request-failed') || combined.includes('unavailable')) {
    return 'Tidak ada koneksi internet';
  }
  if (combined.includes('permission-denied')) {
    return 'Kamu tidak punya akses ke data ini';
  }

  return 'Terjadi kesalahan, coba lagi';
}