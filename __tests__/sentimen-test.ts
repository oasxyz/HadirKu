// SRS4-05: sentimen alasan izin (model on-device) dan aturan denda ikut dibatalkan.
import { classifySentiment } from '@/services/ai';
import { createSentimentClassifier, type ModelSentimen } from '@/services/sentiment/sentiment';
import modelEdom from '@/services/sentiment/model-edom.json';

// putuskan-izin.ts mengimpor Firestore native; cukup uji fungsi murninya dengan mock modul.
jest.mock('@react-native-firebase/firestore', () => ({ doc: jest.fn(), runTransaction: jest.fn() }));
jest.mock('@/services/firebase', () => ({
  COLLECTIONS: { leaveRequests: 'leaveRequests', fines: 'fines' },
  db: {},
  fineDocId: (s: string, u: string) => `${s}_${u}`,
}));
// eslint-disable-next-line import/first
import { dendaPerluDibatalkan } from '@/components/izin/putuskan-izin';

describe('createSentimentClassifier', () => {
  const klasifikasi = createSentimentClassifier(modelEdom as ModelSentimen);

  it('teks kosong → label null (empty_input)', () => {
    expect(klasifikasi('   ')).toMatchObject({ label: null, status: 'empty_input' });
  });

  it('kata yang tidak dikenal → label null (unknown_vocabulary)', () => {
    expect(klasifikasi('qwzx vbnm')).toMatchObject({ label: null, status: 'unknown_vocabulary' });
  });

  it('kalimat jelas positif dan negatif terbaca', () => {
    expect(klasifikasi('Penjelasannya sangat jelas dan mudah dipahami, terima kasih').label).toBe('positif');
    expect(klasifikasi('Kurang jelas dan membosankan').label).toBe('negatif');
  });

  it('selalu salah satu dari tiga label bila terbaca', () => {
    const hasil = klasifikasi('Saya sakit demam sejak semalam jadi tidak bisa hadir');
    expect(['positif', 'netral', 'negatif', null]).toContain(hasil.label);
  });

  it('format model lain ditolak', () => {
    expect(() => createSentimentClassifier({ ...(modelEdom as ModelSentimen), schema_version: 2 })).toThrow();
  });
});

describe('classifySentiment', () => {
  it('alasan kosong → null tanpa error', () => {
    expect(classifySentiment('')).toBeNull();
  });

  it('memakai model yang sama dengan klasifikasi langsung', () => {
    expect(classifySentiment('Penjelasannya sangat jelas dan mudah dipahami, terima kasih')).toBe('positif');
  });
});

describe('dendaPerluDibatalkan', () => {
  it('hanya denda pending yang dibatalkan saat izin diterima', () => {
    expect(dendaPerluDibatalkan('pending')).toBe(true);
    expect(dendaPerluDibatalkan('paid')).toBe(false);
    expect(dendaPerluDibatalkan('processing')).toBe(false);
    expect(dendaPerluDibatalkan('cancelled')).toBe(false);
    expect(dendaPerluDibatalkan(undefined)).toBe(false);
  });
});
