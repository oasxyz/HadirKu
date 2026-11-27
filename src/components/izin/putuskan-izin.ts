// SRS4-05 (PIC B — Annis): keputusan izin oleh asprak, sekaligus membatalkan denda.
// Dalam satu runTransaction: bila izin DITERIMA dan ada denda `fines/{sessionId}_{uid}` yang
// masih `pending`, denda diubah ke `cancelled` bersama perubahan status izin (atomik).
// Tanpa denda pending, transaksi hanya mengubah izin sehingga perilaku Sprint 3 tidak berubah.
import { doc, runTransaction } from '@react-native-firebase/firestore';

import { COLLECTIONS, db, fineDocId } from '@/services/firebase';

export const ALASAN_BATAL_DENDA = 'Izin diterima otomatis membatalkan denda.';

export type HasilPutuskanIzin = {
  /** Denda yang ikut dibatalkan (untuk notifikasi `tagihan_dibatalkan`), atau null. */
  dendaDibatalkan: { id: string; userId: string; sessionId: string; nominal: number } | null;
};

/** Status denda yang ikut dibatalkan saat izin diterima (SRS4-05: hanya yang masih pending). */
export function dendaPerluDibatalkan(status: unknown): boolean {
  return status === 'pending';
}

export async function putuskanIzin(params: {
  izinId: string;
  sessionId: string;
  userId: string;
  keputusan: 'diterima' | 'ditolak';
  asistenId: string;
  asistenNama: string;
}): Promise<HasilPutuskanIzin> {
  const { izinId, sessionId, userId, keputusan, asistenId, asistenNama } = params;
  const izinRef = doc(db, COLLECTIONS.leaveRequests, izinId);
  const dendaRef = doc(db, COLLECTIONS.fines, fineDocId(sessionId, userId));
  const sekarang = new Date().toISOString();

  return runTransaction(db, async (tx) => {
    // Semua pembacaan transaksi harus sebelum penulisan.
    let dendaDibatalkan: HasilPutuskanIzin['dendaDibatalkan'] = null;
    if (keputusan === 'diterima') {
      const denda = await tx.get(dendaRef);
      const data = denda.exists() ? denda.data() : undefined;
      if (data && dendaPerluDibatalkan(data.status)) {
        dendaDibatalkan = {
          id: dendaRef.id,
          userId,
          sessionId,
          nominal: typeof data.nominal === 'number' ? data.nominal : 0,
        };
      }
    }

    tx.update(izinRef, { status: keputusan, diputuskanOleh: asistenNama, diputuskanAt: sekarang });
    if (dendaDibatalkan) {
      tx.update(dendaRef, {
        status: 'cancelled',
        cancelledReason: ALASAN_BATAL_DENDA,
        cancelledBy: asistenId,
        updatedAt: sekarang,
      });
    }
    return { dendaDibatalkan };
  });
}
