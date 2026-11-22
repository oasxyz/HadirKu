// Ilustrasi datar sederhana untuk kartu-kartu HadirKu. Warnanya hanya dari palet tim
// (magenta, ungu muda, merah muda, hitam, putih) sesuai aturan warna seragam.
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { Palette } from '@/constants/theme';

const KULIT = '#F6D9EF';
const DAUN = '#C9B6E4';

/** Orang di depan laptop yang menampilkan tanda centang. Dipakai di kartu Sesi Terdekat. */
export function IlustrasiLaptop({ lebar = 112 }: { lebar?: number }) {
  return (
    <Svg width={lebar} height={(lebar * 100) / 120} viewBox="0 0 120 100" accessible={false}>
      <Ellipse cx={62} cy={92} rx={48} ry={6} fill={Palette.ink} opacity={0.1} />
      <Rect x={14} y={70} width={92} height={7} rx={3} fill={Palette.ink} />
      <Path d="M50 40c0-9 6-15 14-15s14 6 14 15v30H50z" fill={Palette.primary} />
      <Circle cx={64} cy={20} r={11} fill={KULIT} />
      <Path
        d="M52 19c0-9 6-13 12-13 8 0 13 5 13 12-4-4-9-5-14-4-4 1-8 3-11 5z"
        fill={Palette.ink}
      />
      <Rect x={30} y={50} width={40} height={20} rx={3} fill={Palette.ink} />
      <Rect x={33} y={53} width={34} height={14} rx={2} fill={Palette.infoMuted} />
      <Path
        d="M45 60l4 4 8-9"
        fill="none"
        stroke={Palette.primary}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M96 70c-6-8-6-20 0-28 4 9 4 19 0 28z" fill={DAUN} />
      <Path d="M100 70c2-10 8-16 14-18-1 9-6 15-14 18z" fill={DAUN} opacity={0.7} />
    </Svg>
  );
}

/** Tabung kimia dan orang membawa papan klip. Dipakai di kartu Detail Sesi. */
export function IlustrasiLab({ lebar = 104 }: { lebar?: number }) {
  return (
    <Svg width={lebar} height={(lebar * 100) / 120} viewBox="0 0 120 100" accessible={false}>
      <Ellipse cx={60} cy={93} rx={50} ry={5} fill={Palette.ink} opacity={0.1} />
      <Rect x={8} y={72} width={104} height={7} rx={3} fill={Palette.ink} />
      <Path d="M30 38h14v8l12 22a4 4 0 0 1-3.5 6h-31A4 4 0 0 1 18 68l12-22z" fill="#FFFFFF" />
      <Path d="M22 60h30l4 8a4 4 0 0 1-3.5 6h-31A4 4 0 0 1 18 68z" fill={Palette.primary} />
      <Rect x={28} y={33} width={18} height={6} rx={3} fill={Palette.ink} />
      <Circle cx={32} cy={54} r={2} fill={Palette.primary} opacity={0.5} />
      <Circle cx={38} cy={26} r={3} fill={Palette.primary} opacity={0.4} />
      <Circle cx={44} cy={18} r={2} fill={Palette.primary} opacity={0.3} />
      <Path d="M70 72c0-18 6-28 16-28s16 10 16 28z" fill={Palette.infoMuted} />
      <Circle cx={86} cy={32} r={11} fill={KULIT} />
      <Path
        d="M75 31c0-9 6-13 11-13 8 0 12 5 12 11-4-3-8-4-13-3-4 1-7 3-10 5z"
        fill={Palette.ink}
      />
      <Rect x={62} y={50} width={16} height={20} rx={3} fill="#FFFFFF" />
      <Rect x={66} y={47} width={8} height={5} rx={2} fill={Palette.ink} />
      <Path
        d="M65 58h10M65 63h7"
        stroke={Palette.ink}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.3}
      />
    </Svg>
  );
}

/** Orang dengan lencana centang. Dipakai di kartu "Sudah Hadir". */
export function IlustrasiHadir({ lebar = 120 }: { lebar?: number }) {
  return (
    <Svg width={lebar} height={(lebar * 90) / 120} viewBox="0 0 120 90" accessible={false}>
      <Ellipse cx={60} cy={84} rx={40} ry={5} fill={Palette.ink} opacity={0.08} />
      <Path d="M40 84c0-18 8-28 20-28s20 10 20 28z" fill={Palette.primary} />
      <Circle cx={60} cy={40} r={13} fill={KULIT} />
      <Path
        d="M46 38c0-10 7-15 14-15 9 0 15 6 15 14-5-4-10-5-16-4-5 1-9 3-13 5z"
        fill={Palette.ink}
      />
      <Circle cx={90} cy={30} r={14} fill={Palette.ink} />
      <Path
        d="M83 30l5 5 9-10"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={24} cy={26} r={4} fill={Palette.primary} opacity={0.5} />
      <Circle cx={32} cy={14} r={2.5} fill={Palette.primary} />
    </Svg>
  );
}

/** Papan klip berisi grafik batang dan orang di sebelahnya. Dipakai di kartu ringkasan kehadiran. */
export function IlustrasiPapanKlip({ lebar = 96 }: { lebar?: number }) {
  return (
    <Svg width={lebar} height={(lebar * 100) / 110} viewBox="0 0 110 100" accessible={false}>
      <Rect x={22} y={14} width={54} height={72} rx={8} fill="#FFFFFF" />
      <Rect x={36} y={8} width={26} height={12} rx={5} fill={Palette.ink} />
      <Rect x={32} y={66} width={8} height={12} rx={2} fill={Palette.primary} />
      <Rect x={45} y={56} width={8} height={22} rx={2} fill={Palette.ink} />
      <Rect x={58} y={46} width={8} height={32} rx={2} fill={Palette.primary} />
      <Rect x={32} y={28} width={34} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
      <Rect x={32} y={37} width={24} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
      <Circle cx={88} cy={34} r={12} fill={KULIT} />
      <Path
        d="M78 33c0-8 5-11 10-11 7 0 11 4 11 10-3-3-7-4-11-3-4 1-7 2-10 4z"
        fill={Palette.ink}
      />
      <Path d="M74 90c0-14 6-24 14-24s14 10 14 24z" fill={Palette.infoMuted} />
    </Svg>
  );
}

/** Surat dan pena. Dipakai di kartu Ajukan Izin. */
export function IlustrasiSurat({ lebar = 84 }: { lebar?: number }) {
  return (
    <Svg width={lebar} height={(lebar * 90) / 100} viewBox="0 0 100 90" accessible={false}>
      <Rect x={20} y={10} width={50} height={64} rx={8} fill="#FFFFFF" />
      <Rect x={28} y={22} width={34} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
      <Rect x={28} y={32} width={28} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
      <Rect x={28} y={42} width={32} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
      <Rect x={28} y={54} width={18} height={8} rx={4} fill={Palette.primary} />
      <Path d="M66 48l18-18 6 6-18 18-8 2z" fill={Palette.ink} />
      <Path d="M84 30l4-4 6 6-4 4z" fill={Palette.primary} />
      <Circle cx={22} cy={76} r={10} fill={DAUN} />
      <Circle cx={80} cy={78} r={6} fill={Palette.primary} opacity={0.45} />
    </Svg>
  );
}

/** Bukit, daun, dan orang melambai. Dipakai sebagai banner di belakang avatar Profil. */
export function IlustrasiSapaan({ lebar = 320 }: { lebar?: number }) {
  return (
    <Svg width={lebar} height={(lebar * 90) / 160} viewBox="0 0 160 90" accessible={false}>
      <Circle cx={30} cy={22} r={10} fill="#FFFFFF" opacity={0.7} />
      <Circle cx={136} cy={20} r={6} fill="#FFFFFF" opacity={0.7} />
      <Path d="M0 90c20-22 44-30 80-30s60 8 80 30z" fill="#FFFFFF" opacity={0.5} />
      <Path d="M112 90c0-14 5-22 12-22s12 8 12 22z" fill={Palette.primary} opacity={0.9} />
      <Circle cx={124} cy={58} r={9} fill={KULIT} />
      <Path d="M114 57c0-7 5-10 10-10 6 0 10 4 10 9-3-3-7-3-11-2-4 1-6 2-9 3z" fill={Palette.ink} />
      <Path d="M136 76l10-14" stroke={KULIT} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={147} cy={60} r={4} fill={KULIT} />
      <Path d="M14 90c4-14 10-20 16-20s12 6 16 20z" fill={DAUN} />
      <Path d="M30 72c-4-6-4-14 0-20 3 6 3 14 0 20z" fill={DAUN} opacity={0.8} />
    </Svg>
  );
}

/** Gembok di depan pintu kelas. Dipakai untuk "Sesi Sudah Ditutup". */
export function IlustrasiDitutup({ lebar = 120 }: { lebar?: number }) {
  return (
    <Svg width={lebar} height={(lebar * 90) / 120} viewBox="0 0 120 90" accessible={false}>
      <Ellipse cx={60} cy={84} rx={44} ry={5} fill={Palette.ink} opacity={0.08} />
      <Rect x={30} y={10} width={44} height={72} rx={6} fill={Palette.infoMuted} />
      <Rect x={36} y={16} width={32} height={60} rx={4} fill="#FFFFFF" />
      <Circle cx={62} cy={48} r={2.5} fill={Palette.ink} />
      <Path
        d="M78 46v-8a10 10 0 0 1 20 0v8"
        fill="none"
        stroke={Palette.ink}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Rect x={72} y={44} width={32} height={28} rx={6} fill={Palette.ink} />
      <Circle cx={88} cy={56} r={4} fill="#FFFFFF" />
      <Rect x={86.5} y={57} width={3} height={8} rx={1.5} fill="#FFFFFF" />
      <Circle cx={18} cy={24} r={4} fill={Palette.primary} opacity={0.5} />
      <Circle cx={108} cy={18} r={3} fill={Palette.primary} />
    </Svg>
  );
}

/** Surat dengan stempel centang. Dipakai untuk "Izin Diterima". */
export function IlustrasiIzinDiterima({ lebar = 120 }: { lebar?: number }) {
  return (
    <Svg width={lebar} height={(lebar * 90) / 120} viewBox="0 0 120 90" accessible={false}>
      <Ellipse cx={60} cy={84} rx={44} ry={5} fill={Palette.ink} opacity={0.08} />
      <Rect x={30} y={8} width={52} height={68} rx={8} fill="#FFFFFF" />
      <Rect x={38} y={20} width={36} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
      <Rect x={38} y={30} width={28} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
      <Rect x={38} y={40} width={32} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
      <Circle cx={82} cy={60} r={17} fill={Palette.primary} />
      <Path
        d="M74 60l6 6 10-12"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={20} cy={70} r={8} fill={DAUN} />
      <Circle cx={104} cy={22} r={4} fill={Palette.primary} opacity={0.45} />
    </Svg>
  );
}

/** Jam pasir. Dipakai untuk menunggu: "Sesi Belum Dibuka" atau izin yang sedang diproses. */
export function IlustrasiMenunggu({ lebar = 120 }: { lebar?: number }) {
  return (
    <Svg width={lebar} height={(lebar * 90) / 120} viewBox="0 0 120 90" accessible={false}>
      <Ellipse cx={60} cy={84} rx={40} ry={5} fill={Palette.ink} opacity={0.08} />
      <Rect x={38} y={8} width={44} height={7} rx={3} fill={Palette.ink} />
      <Rect x={38} y={72} width={44} height={7} rx={3} fill={Palette.ink} />
      <Path d="M44 15h32c0 18-10 22-10 29s10 11 10 28H44c0-17 10-21 10-28S44 33 44 15z" fill="#FFFFFF" />
      <Path d="M50 22h20c-2 9-8 12-10 16-2-4-8-7-10-16z" fill={Palette.primary} />
      <Path d="M48 72c2-9 8-12 12-14 4 2 10 5 12 14z" fill={Palette.primary} />
      <Circle cx={22} cy={30} r={5} fill={Palette.infoMuted} />
      <Circle cx={98} cy={56} r={6} fill={Palette.infoMuted} />
      <Circle cx={100} cy={20} r={3} fill={Palette.primary} opacity={0.5} />
    </Svg>
  );
}

/** Kotak terbuka yang kosong. Dipakai untuk pesan "Belum ada …". */
export function IlustrasiKosong({ lebar = 84 }: { lebar?: number }) {
  return (
    <Svg width={lebar} height={(lebar * 80) / 120} viewBox="0 0 120 80" accessible={false}>
      <Ellipse cx={60} cy={72} rx={44} ry={5} fill={Palette.ink} opacity={0.08} />
      <Path d="M30 40h60l-6 30H36z" fill={Palette.infoMuted} />
      <Path d="M30 40l10-14h40l10 14z" fill="#FFFFFF" />
      <Path
        d="M50 52h20"
        stroke={Palette.ink}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.3}
      />
      <Circle cx={88} cy={18} r={5} fill={Palette.primary} opacity={0.5} />
      <Circle cx={28} cy={16} r={3} fill={Palette.primary} />
    </Svg>
  );
}
