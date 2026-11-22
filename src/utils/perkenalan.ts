// Penanda "halaman perkenalan sudah dilihat", disimpan sebagai berkas kecil di penyimpanan
// aplikasi (expo-file-system sudah ikut di dalam paket expo, jadi tidak perlu build ulang).
// Bila berkas tidak bisa dibaca/ditulis, perkenalan dianggap belum dilihat: paling buruk
// perkenalan muncul lagi, aplikasi tetap jalan.
import { File, Paths } from 'expo-file-system';

import { Logger } from '@/utils/logger';

const NAMA_BERKAS = 'hadirku-perkenalan.json';

function berkas(): File {
  return new File(Paths.document, NAMA_BERKAS);
}

export function sudahLihatPerkenalan(): boolean {
  try {
    return berkas().exists;
  } catch (error) {
    Logger.warn('UI', 'perkenalan', 'Penanda perkenalan tidak bisa dibaca', { error: String(error) });
    return false;
  }
}

export function tandaiPerkenalanDilihat(): void {
  try {
    const f = berkas();
    if (!f.exists) f.create();
    f.write(JSON.stringify({ dilihatPada: new Date().toISOString() }));
  } catch (error) {
    Logger.warn('UI', 'perkenalan', 'Penanda perkenalan tidak bisa disimpan', { error: String(error) });
  }
}
