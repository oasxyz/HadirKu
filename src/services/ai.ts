import type { LeaveCategory } from '@/types';

// Dibaca ULANG tiap kali fungsi dipanggil (bukan sekali saat modul di-import),
// supaya tidak "terjebak" undefined kalau env telat ke-load.
function getAiConfig() {
  return {
    baseUrl: process.env.EXPO_PUBLIC_AI_BASE_URL,
    apiKey: process.env.EXPO_PUBLIC_AI_API_KEY,
    model: process.env.EXPO_PUBLIC_AI_MODEL,
  };
}

const TIMEOUT_MS = 10000;

const SYSTEM_PROMPT = `Kamu adalah pembantu klasifikasi alasan izin praktikum.
Klasifikasikan alasan izin ke salah satu dari empat kategori berikut:
- sakit: kondisi kesehatan fisik atau mental yang membuat tidak bisa hadir
- keluarga: urusan keluarga seperti duka, pernikahan, atau mengurus anggota keluarga
- akademik: tabrakan dengan kegiatan akademik lain seperti ujian, kuliah tamu, atau lomba
- lainnya: alasan yang tidak masuk tiga kategori di atas

Jawab HANYA dengan satu kata kategori (sakit, keluarga, akademik, atau lainnya) tanpa tanda baca atau penjelasan.`;

const KATEGORI_VALID: LeaveCategory[] = ['sakit', 'keluarga', 'akademik', 'lainnya'];

export async function classifyLeaveReason(reason: string): Promise<LeaveCategory | null> {
  const { baseUrl, apiKey, model } = getAiConfig();
  if (!baseUrl || !apiKey || !model) {
    console.warn('[ai.ts] ENV AI belum lengkap, skip klasifikasi');
    return null;
  }

  const trimmed = reason.trim();
  if (trimmed.length === 0) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

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

    const kategori = raw.trim().toLowerCase() as LeaveCategory;
    if (!KATEGORI_VALID.includes(kategori)) {
      console.warn('[ai.ts] Kategori tidak dikenal:', raw);
      return null;
    }

    return kategori;
  } catch (err) {
    console.warn('[ai.ts] Error atau timeout:', err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}