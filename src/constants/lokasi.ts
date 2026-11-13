/**
 * Batas jarak presensi dari lokasi asisten, dalam meter.
 * Presensi dengan `jarakMeter` di atas batas ini ditandai di rekap, tetapi tetap diterima.
 * GPS di dalam gedung sering meleset belasan meter, jadi tanda ini hanya petunjuk untuk asisten.
 * Ubah angka di sini saja; jangan menulis 60 langsung di layar.
 */
export const BATAS_JARAK_METER = 60;
