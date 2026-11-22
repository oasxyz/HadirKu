// Penyeragaman nilai waktu dari Firestore menjadi ISO string.
// Sprint 3 menulis waktu dengan serverTimestamp() (hasil baca: objek Timestamp), sedangkan data
// Sprint 2 berupa ISO string. Tipe di src/types memakai string, jadi semua hook pembaca
// memakai fungsi ini supaya layar tidak perlu tahu bentuk aslinya.

type TimestampLike = { toDate: () => Date };

function adalahTimestamp(nilai: unknown): nilai is TimestampLike {
  return (
    typeof nilai === 'object' &&
    nilai !== null &&
    typeof (nilai as Partial<TimestampLike>).toDate === 'function'
  );
}

/**
 * Timestamp / ISO string / epoch ms → ISO string, atau null bila tidak bisa dibaca.
 * Catatan: tepat setelah menulis serverTimestamp(), snapshot lokal bernilai null sampai
 * server menjawab; pemanggil yang butuh nilai pasti memakai `waktuIsoAtauSekarang`.
 */
export function waktuIso(nilai: unknown): string | null {
  if (typeof nilai === 'string') return nilai;
  if (typeof nilai === 'number') return new Date(nilai).toISOString();
  if (adalahTimestamp(nilai)) return nilai.toDate().toISOString();
  return null;
}

/** Seperti waktuIso, tetapi memakai waktu perangkat bila nilai belum tersedia. */
export function waktuIsoAtauSekarang(nilai: unknown): string {
  return waktuIso(nilai) ?? new Date().toISOString();
}
