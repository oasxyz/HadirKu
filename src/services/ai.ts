import type { LeaveCategory } from '@/types';

/**
 * Baca konfigurasi AI setiap kali dipanggil (bukan const modul) supaya
 * aman kalau env telat ter-load pada hot reload Expo.
 */
function getAiConfig() {
  return {
    baseUrl: process.env.EXPO_PUBLIC_AI_BASE_URL,
    apiKey: process.env.EXPO_PUBLIC_AI_API_KEY,
    model: process.env.EXPO_PUBLIC_AI_MODEL,
  };
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * SPRINT 3: kategori disederhanakan menjadi dua.
 * Semua alasan yang berhubungan dengan kondisi kesehatan fisik atau mental → 'sakit'.
 * Selain itu (keluarga, akademik, lainnya) → 'izin'.
 */
const SYSTEM_PROMPT = `Kamu adalah pembantu klasifikasi alasan izin praktikum di kampus.
Klasifikasikan alasan praktikan ke salah satu dari dua kategori berikut:
- sakit: kondisi kesehatan fisik atau mental yang membuat tidak bisa hadir
- izin: alasan lain di luar kondisi kesehatan, seperti urusan keluarga, akademik, atau alasan pribadi

Jawab HANYA dengan satu kata kategori (sakit atau izin) tanpa tanda baca atau penjelasan.`;

type Sprint3Category = 'sakit' | 'izin';
const KATEGORI_VALID: Sprint3Category[] = ['sakit', 'izin'];

/**
 * Klasifikasi alasan izin via API AI. Return 'sakit' / 'izin' / null (kalau gagal/timeout).
 * Dokumen izin tetap bisa disimpan meskipun fungsi ini return null (lihat SRS3 Sprint 3 R7).
 *
 * @param reason teks alasan praktikan
 * @param timeoutMs batas waktu dari appConfig.aiTimeoutMs (default 10000 ms)
 */
export async function classifyLeaveReason(
  reason: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<LeaveCategory | null> {
  const { baseUrl, apiKey, model } = getAiConfig();
  if (!baseUrl || !apiKey || !model) {
    console.warn('[ai.ts] ENV AI belum lengkap, lewati klasifikasi');
    return null;
  }

  const trimmed = reason.trim();
  if (trimmed.length === 0) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: trimmed },
        ],
        temperature: 0,
        max_tokens: 10,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn('[ai.ts] HTTP error', response.status);
      return null;
    }

    const data = await response.json();
    const raw: string | undefined = data?.choices?.[0]?.message?.content;
    if (!raw) return null;

    const normalized = raw.trim().toLowerCase() as Sprint3Category;
    if (!KATEGORI_VALID.includes(normalized)) {
      console.warn('[ai.ts] Kategori tidak dikenal:', raw);
      return null;
    }

    return normalized;
  } catch (err) {
    console.warn('[ai.ts] Error atau timeout:', err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}