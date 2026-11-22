const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
const BULAN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/** Format "2026-10-27" -> "Selasa, 27 Okt 2026" */
export function formatTanggal(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${HARI[date.getDay()]}, ${day} ${BULAN[month - 1]} ${year}`;
}

const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/** Format ringkas untuk chip/kartu: "2026-11-19" -> "Kam, 19 Nov" */
export function formatTanggalSingkat(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return isoDate;
  return `${HARI_SINGKAT[date.getDay()]}, ${day} ${BULAN[month - 1]}`;
}

/** Gabungkan "08:00" dan "10:00" -> "08:00 - 10:00" */
export function formatRentangJam(jamMulai: string, jamSelesai: string): string {
  return `${jamMulai} - ${jamSelesai}`;
}
