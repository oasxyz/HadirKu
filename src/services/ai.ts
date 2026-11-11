import type { LeaveCategory } from '@/types';

// Nilai diambil dari .env.local (lihat .env.local.example). Jangan menulis key langsung di kode.
export const AI_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_AI_BASE_URL,
  apiKey: process.env.EXPO_PUBLIC_AI_API_KEY,
  model: process.env.EXPO_PUBLIC_AI_MODEL,
};

// TODO (SRS007): kirim `reason` ke endpoint chat/completions dan petakan jawabannya ke LeaveCategory.
// Kontrak untuk pemanggil:
// - mengembalikan salah satu LeaveCategory, atau null jika AI gagal, timeout, atau jawabannya tidak valid;
// - tidak pernah melempar error ke layar; pengajuan izin tetap disimpan dengan kategoriAi = null;
// - hasilnya hanya informasi pendukung, bukan dasar menerima atau menolak izin.
export async function classifyLeaveReason(reason: string): Promise<LeaveCategory | null> {
  void reason;
  return null;
}
