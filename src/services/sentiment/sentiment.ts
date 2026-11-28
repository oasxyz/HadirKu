// SRS4-05 (PIC B — Annis): klasifikasi sentimen on-device (Opsi B SRS 5.7).
// Diadaptasi ke TypeScript dari referensi asprak:
// https://github.com/Doctor3131/ppk-rn-expo-58/tree/main/ai (sentiment.js + model-edom.json).
// Model LinearSVC dilatih dari dataset EDOM (komentar evaluasi dosen, lisensi MIT,
// https://github.com/samfch/edom-sentiment), belum divalidasi untuk alasan izin praktikum.
// Murni JavaScript: tanpa internet dan tanpa modul native.

export type LabelSentimen = 'positif' | 'netral' | 'negatif';

export type ModelSentimen = {
  schema_version: number;
  status: string;
  algorithm: string;
  labels: string[];
  aliases: Record<string, string>;
  vocabulary: Record<string, number>;
  idf: number[];
  weights: number[][];
  bias: number[];
  preprocessing: string;
};

export type HasilSentimen = {
  /** null bila teks kosong atau tidak ada kata yang dikenal model. */
  label: LabelSentimen | null;
  status: 'predicted' | 'unknown_vocabulary' | 'empty_input';
  scores: number[] | null;
};

const PRA_PROSES = [
  'ascii_lowercase_words_unigram_bigram_sublinear_tf_l2_v1',
  'unicode_nfkd_ascii_words_unigram_bigram_sublinear_tf_l2_v1',
];

const LABEL_VALID: LabelSentimen[] = ['positif', 'netral', 'negatif'];

export function createSentimentClassifier(model: ModelSentimen): (text: string) => HasilSentimen {
  if (model.schema_version !== 1 || !PRA_PROSES.includes(model.preprocessing)) {
    throw new Error('Format model sentimen tidak didukung');
  }
  const punya = (obj: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

  return function classify(text: string): HasilSentimen {
    const normal = model.preprocessing.startsWith('unicode_')
      ? text.replace(/<[^>]*>/g, ' ').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
      : text.toLowerCase();
    const kata = (normal.match(/[a-z0-9]+/g) ?? []).map((w) => (punya(model.aliases, w) ? model.aliases[w] : w));
    const gram = kata.concat(kata.slice(1).map((w, i) => `${kata[i]} ${w}`));

    const hitung = new Map<number, number>();
    for (const g of gram) {
      if (punya(model.vocabulary, g)) {
        const i = model.vocabulary[g];
        hitung.set(i, (hitung.get(i) ?? 0) + 1);
      }
    }
    if (hitung.size === 0) {
      return { label: null, status: kata.length ? 'unknown_vocabulary' : 'empty_input', scores: null };
    }

    // TF sublinear × IDF, dinormalisasi L2, lalu skor linear per kelas.
    const nilai = Array.from(hitung, ([i, n]) => [i, (1 + Math.log(n)) * model.idf[i]] as const);
    const norma = Math.sqrt(nilai.reduce((s, [, v]) => s + v ** 2, 0));
    const scores = model.weights.map((w, c) => nilai.reduce((s, [i, v]) => s + (w[i] * v) / norma, model.bias[c]));
    const terbaik = model.labels[scores.indexOf(Math.max(...scores))];
    const label = LABEL_VALID.find((l) => l === terbaik) ?? null;
    return { label, status: 'predicted', scores };
  };
}
