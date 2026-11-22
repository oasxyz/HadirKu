// Ilustrasi datar sederhana untuk kartu-kartu HadirKu, dengan gerak ringan.
// Warnanya hanya dari palet tim (magenta, ungu muda, merah muda, hitam, putih).
//
// Cara kerja gerak: bagian yang diam digambar di satu <Svg>, bagian yang bergerak digambar di
// <Lapisan> sendiri (Svg berukuran sama, ditumpuk) yang dibungkus Animated.View. Transform View
// dijalankan Reanimated di thread UI, jadi tidak perlu animasi atribut SVG.
// Setelan "Kurangi gerakan" di HP menghentikan semua gerak (ilustrasi tampil diam).
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { Palette } from '@/constants/theme';

const KULIT = '#F6D9EF';
const DAUN = '#C9B6E4';

// ---------------------------------------------------------------------------
// Mesin gerak
// ---------------------------------------------------------------------------

/** p = kemajuan 0→1, s = piksel per satuan viewBox. Harus worklet karena dijalankan di thread UI. */
type FungsiGaya = (p: number, s: number) => Record<string, unknown>;

type OpsiGerak = {
  durasi: number;
  /** Berulang terus (default) atau sekali saja (mis. lencana muncul). */
  ulang?: boolean;
  /** Bolak-balik 0→1→0 saat berulang. */
  bolakBalik?: boolean;
  jeda?: number;
  linear?: boolean;
};

function Lapisan({
  vb,
  lebar,
  asal = [50, 50],
  gaya,
  durasi,
  ulang = true,
  bolakBalik = false,
  jeda = 0,
  linear = false,
  children,
}: OpsiGerak & {
  vb: [number, number];
  lebar: number;
  /** Titik pusat putar/skala dalam persen kotak ilustrasi. */
  asal?: [number, number];
  gaya: FungsiGaya;
  children: ReactNode;
}) {
  const kurangiGerak = useReducedMotion();
  const p = useSharedValue(0);
  const skala = lebar / vb[0];

  useEffect(() => {
    if (kurangiGerak) {
      // Diam di keadaan istirahat: awal untuk gerak berulang, akhir untuk gerak sekali.
      p.set(ulang ? 0 : 1);
      return;
    }
    const satuPutaran = withTiming(1, {
      duration: durasi,
      easing: linear ? Easing.linear : Easing.inOut(Easing.ease),
    });
    p.set(0);
    p.set(withDelay(jeda, ulang ? withRepeat(satuPutaran, -1, bolakBalik) : satuPutaran));
    return () => cancelAnimation(p);
  }, [kurangiGerak, p, durasi, ulang, bolakBalik, jeda, linear]);

  const gayaAnimasi = useAnimatedStyle(() => gaya(p.get(), skala));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { transformOrigin: `${asal[0]}% ${asal[1]}%` }, gayaAnimasi]}>
      <Svg width={lebar} height={(lebar * vb[1]) / vb[0]} viewBox={`0 0 ${vb[0]} ${vb[1]}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

function Kanvas({ vb, lebar, children }: { vb: [number, number]; lebar: number; children: ReactNode }) {
  return (
    <View
      style={{ width: lebar, height: (lebar * vb[1]) / vb[0] }}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      {children}
    </View>
  );
}

function Dasar({ vb, lebar, children }: { vb: [number, number]; lebar: number; children: ReactNode }) {
  return (
    <Svg width={lebar} height={(lebar * vb[1]) / vb[0]} viewBox={`0 0 ${vb[0]} ${vb[1]}`}>
      {children}
    </Svg>
  );
}

// Fungsi gaya (worklet) yang dipakai ulang.
const angguk: FungsiGaya = (p) => {
  'worklet';
  return { transform: [{ rotate: `${interpolate(p, [0, 1], [0, -6])}deg` }] };
};
const goyang: FungsiGaya = (p) => {
  'worklet';
  return { transform: [{ rotate: `${interpolate(p, [0, 1], [0, 5])}deg` }] };
};
const muncul: FungsiGaya = (p) => {
  'worklet';
  // Membesar memantul sekali: 0 → 1,18 → 0,94 → 1.
  return { transform: [{ scale: interpolate(p, [0, 0.6, 0.8, 1], [0, 1.18, 0.94, 1]) }] };
};
const kedip: FungsiGaya = (p) => {
  'worklet';
  return { opacity: interpolate(p, [0, 1], [1, 0.25]) };
};
function naikMemudar(jarak: number): FungsiGaya {
  return (p, s) => {
    'worklet';
    return {
      opacity: interpolate(p, [0, 0.15, 1], [0, 0.9, 0], Extrapolation.CLAMP),
      transform: [{ translateY: -jarak * s * p }],
    };
  };
}

// ---------------------------------------------------------------------------
// Ilustrasi
// ---------------------------------------------------------------------------

/** Orang di depan laptop. Kepala mengangguk, centang di layar muncul, daun bergoyang. */
export function IlustrasiLaptop({ lebar = 112 }: { lebar?: number }) {
  const vb: [number, number] = [120, 100];
  return (
    <Kanvas vb={vb} lebar={lebar}>
      <Dasar vb={vb} lebar={lebar}>
        <Ellipse cx={62} cy={92} rx={48} ry={6} fill={Palette.ink} opacity={0.1} />
        <Rect x={14} y={70} width={92} height={7} rx={3} fill={Palette.ink} />
        <Path d="M50 40c0-9 6-15 14-15s14 6 14 15v30H50z" fill={Palette.primary} />
        <Rect x={30} y={50} width={40} height={20} rx={3} fill={Palette.ink} />
        <Rect x={33} y={53} width={34} height={14} rx={2} fill={Palette.infoMuted} />
      </Dasar>
      <Lapisan vb={vb} lebar={lebar} asal={[53, 30]} gaya={angguk} durasi={1300} bolakBalik>
        <Circle cx={64} cy={20} r={11} fill={KULIT} />
        <Path d="M52 19c0-9 6-13 12-13 8 0 13 5 13 12-4-4-9-5-14-4-4 1-8 3-11 5z" fill={Palette.ink} />
      </Lapisan>
      <Lapisan vb={vb} lebar={lebar} asal={[42, 60]} gaya={muncul} durasi={600} ulang={false} jeda={400}>
        <Path
          d="M45 60l4 4 8-9"
          fill="none"
          stroke={Palette.primary}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Lapisan>
      <Lapisan vb={vb} lebar={lebar} asal={[85, 70]} gaya={goyang} durasi={1700} bolakBalik>
        <Path d="M96 70c-6-8-6-20 0-28 4 9 4 19 0 28z" fill={DAUN} />
        <Path d="M100 70c2-10 8-16 14-18-1 9-6 15-14 18z" fill={DAUN} opacity={0.7} />
      </Lapisan>
    </Kanvas>
  );
}

/** Tabung kimia dan orang membawa papan klip. Gelembung naik dari tabung. */
export function IlustrasiLab({ lebar = 104 }: { lebar?: number }) {
  const vb: [number, number] = [120, 100];
  const gelembung = naikMemudar(30);
  return (
    <Kanvas vb={vb} lebar={lebar}>
      <Dasar vb={vb} lebar={lebar}>
        <Ellipse cx={60} cy={93} rx={50} ry={5} fill={Palette.ink} opacity={0.1} />
        <Rect x={8} y={72} width={104} height={7} rx={3} fill={Palette.ink} />
        <Path d="M30 38h14v8l12 22a4 4 0 0 1-3.5 6h-31A4 4 0 0 1 18 68l12-22z" fill="#FFFFFF" />
        <Path d="M22 60h30l4 8a4 4 0 0 1-3.5 6h-31A4 4 0 0 1 18 68z" fill={Palette.primary} />
        <Rect x={28} y={33} width={18} height={6} rx={3} fill={Palette.ink} />
        <Path d="M70 72c0-18 6-28 16-28s16 10 16 28z" fill={Palette.infoMuted} />
        <Circle cx={86} cy={32} r={11} fill={KULIT} />
        <Path d="M75 31c0-9 6-13 11-13 8 0 12 5 12 11-4-3-8-4-13-3-4 1-7 3-10 5z" fill={Palette.ink} />
        <Rect x={62} y={50} width={16} height={20} rx={3} fill="#FFFFFF" />
        <Rect x={66} y={47} width={8} height={5} rx={2} fill={Palette.ink} />
        <Path d="M65 58h10M65 63h7" stroke={Palette.ink} strokeWidth={2} strokeLinecap="round" opacity={0.3} />
      </Dasar>
      {[
        { cx: 34, r: 3, jeda: 0 },
        { cx: 40, r: 2.2, jeda: 800 },
        { cx: 36, r: 2.6, jeda: 1600 },
      ].map((b) => (
        <Lapisan key={b.jeda} vb={vb} lebar={lebar} gaya={gelembung} durasi={2400} jeda={b.jeda} linear>
          <Circle cx={b.cx} cy={30} r={b.r} fill={Palette.primary} />
        </Lapisan>
      ))}
    </Kanvas>
  );
}

const lompatSekali: FungsiGaya = (p, s) => {
  'worklet';
  return { transform: [{ translateY: interpolate(p, [0, 0.4, 0.6, 1], [0, -8, 0, 0]) * s }] };
};
function konfeti(dx: number, dy: number): FungsiGaya {
  return (p, s) => {
    'worklet';
    return {
      opacity: interpolate(p, [0, 0.2, 1], [0, 1, 0]),
      transform: [{ translateX: dx * s * p }, { translateY: dy * s * p }],
    };
  };
}

/** Orang dengan lencana centang. Lencana muncul memantul, orang melompat, konfeti menyebar (sekali). */
export function IlustrasiHadir({ lebar = 120 }: { lebar?: number }) {
  const vb: [number, number] = [120, 90];
  return (
    <Kanvas vb={vb} lebar={lebar}>
      <Dasar vb={vb} lebar={lebar}>
        <Ellipse cx={60} cy={84} rx={40} ry={5} fill={Palette.ink} opacity={0.08} />
      </Dasar>
      <Lapisan vb={vb} lebar={lebar} gaya={lompatSekali} durasi={800} ulang={false} jeda={750}>
        <Path d="M40 84c0-18 8-28 20-28s20 10 20 28z" fill={Palette.primary} />
        <Circle cx={60} cy={40} r={13} fill={KULIT} />
        <Path d="M46 38c0-10 7-15 14-15 9 0 15 6 15 14-5-4-10-5-16-4-5 1-9 3-13 5z" fill={Palette.ink} />
      </Lapisan>
      <Lapisan vb={vb} lebar={lebar} asal={[75, 33]} gaya={muncul} durasi={600} ulang={false} jeda={200}>
        <Circle cx={90} cy={30} r={14} fill={Palette.ink} />
        <Path
          d="M83 30l5 5 9-10"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Lapisan>
      {[
        { dx: -22, dy: -14, warna: Palette.primary },
        { dx: 18, dy: -18, warna: Palette.primary },
        { dx: 20, dy: 12, warna: DAUN },
        { dx: -16, dy: 16, warna: Palette.primary },
        { dx: 4, dy: -24, warna: DAUN },
      ].map((k) => (
        <Lapisan
          key={`${k.dx},${k.dy}`}
          vb={vb}
          lebar={lebar}
          gaya={konfeti(k.dx, k.dy)}
          durasi={900}
          ulang={false}
          jeda={550}>
          <Circle cx={90} cy={30} r={2.5} fill={k.warna} />
        </Lapisan>
      ))}
    </Kanvas>
  );
}

const lambai: FungsiGaya = (p) => {
  'worklet';
  return {
    transform: [
      {
        rotate: `${interpolate(p, [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1], [0, -22, 10, -22, 10, -22, 0, 0])}deg`,
      },
    ],
  };
};

/** Bukit, daun, dan orang melambai. Banner di belakang avatar Profil dan halaman Daftar. */
export function IlustrasiSapaan({ lebar = 320 }: { lebar?: number }) {
  const vb: [number, number] = [160, 90];
  return (
    <Kanvas vb={vb} lebar={lebar}>
      <Dasar vb={vb} lebar={lebar}>
        <Circle cx={30} cy={22} r={10} fill="#FFFFFF" opacity={0.7} />
        <Circle cx={136} cy={20} r={6} fill="#FFFFFF" opacity={0.7} />
        <Path d="M0 90c20-22 44-30 80-30s60 8 80 30z" fill="#FFFFFF" opacity={0.5} />
        <Path d="M112 90c0-14 5-22 12-22s12 8 12 22z" fill={Palette.primary} opacity={0.9} />
        <Circle cx={124} cy={58} r={9} fill={KULIT} />
        <Path d="M114 57c0-7 5-10 10-10 6 0 10 4 10 9-3-3-7-3-11-2-4 1-6 2-9 3z" fill={Palette.ink} />
      </Dasar>
      <Lapisan vb={vb} lebar={lebar} asal={[85, 84]} gaya={lambai} durasi={2800} linear>
        <Path d="M136 76l10-14" stroke={KULIT} strokeWidth={5} strokeLinecap="round" />
        <Circle cx={147} cy={60} r={4} fill={KULIT} />
      </Lapisan>
      <Lapisan vb={vb} lebar={lebar} asal={[19, 100]} gaya={goyang} durasi={1700} bolakBalik>
        <Path d="M14 90c4-14 10-20 16-20s12 6 16 20z" fill={DAUN} />
        <Path d="M30 72c-4-6-4-14 0-20 3 6 3 14 0 20z" fill={DAUN} opacity={0.8} />
      </Lapisan>
    </Kanvas>
  );
}

const batangNaikTurun: FungsiGaya = (p) => {
  'worklet';
  return { transform: [{ scaleY: interpolate(p, [0, 1], [1, 0.6]) }] };
};

/** Papan klip berisi grafik batang dan orang di sebelahnya. Batang naik turun bergantian. */
export function IlustrasiPapanKlip({ lebar = 96 }: { lebar?: number }) {
  const vb: [number, number] = [110, 100];
  return (
    <Kanvas vb={vb} lebar={lebar}>
      <Dasar vb={vb} lebar={lebar}>
        <Rect x={22} y={14} width={54} height={72} rx={8} fill="#FFFFFF" />
        <Rect x={36} y={8} width={26} height={12} rx={5} fill={Palette.ink} />
        <Rect x={32} y={28} width={34} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
        <Rect x={32} y={37} width={24} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
        <Circle cx={88} cy={34} r={12} fill={KULIT} />
        <Path d="M78 33c0-8 5-11 10-11 7 0 11 4 11 10-3-3-7-4-11-3-4 1-7 2-10 4z" fill={Palette.ink} />
        <Path d="M74 90c0-14 6-24 14-24s14 10 14 24z" fill={Palette.infoMuted} />
      </Dasar>
      {/* Pusat skala di dasar batang (y = 78) supaya batang tumbuh dari bawah. */}
      {[
        { x: 32, y: 66, h: 12, warna: Palette.primary, jeda: 0 },
        { x: 45, y: 56, h: 22, warna: Palette.ink, jeda: 300 },
        { x: 58, y: 46, h: 32, warna: Palette.primary, jeda: 600 },
      ].map((b) => (
        <Lapisan
          key={b.x}
          vb={vb}
          lebar={lebar}
          asal={[50, 78]}
          gaya={batangNaikTurun}
          durasi={900}
          jeda={b.jeda}
          bolakBalik>
          <Rect x={b.x} y={b.y} width={8} height={b.h} rx={2} fill={b.warna} />
        </Lapisan>
      ))}
    </Kanvas>
  );
}

const penaMenulis: FungsiGaya = (p, s) => {
  'worklet';
  return {
    transform: [
      { translateX: interpolate(p, [0, 0.25, 0.5, 0.75, 1], [0, -3, 0, 3, 0]) * s },
      { translateY: interpolate(p, [0, 0.25, 0.5, 0.75, 1], [0, 2, 3, 1, 0]) * s },
      { rotate: `${interpolate(p, [0, 0.25, 0.5, 0.75, 1], [0, -4, 0, 4, 0])}deg` },
    ],
  };
};
const barisMuncul: FungsiGaya = (p) => {
  'worklet';
  return { transform: [{ scaleX: interpolate(p, [0, 0.6, 1], [0, 1, 1]) }] };
};

/** Surat dan pena. Pena bergoyang seperti menulis, baris teks muncul satu per satu. */
export function IlustrasiSurat({ lebar = 84 }: { lebar?: number }) {
  const vb: [number, number] = [100, 90];
  return (
    <Kanvas vb={vb} lebar={lebar}>
      <Dasar vb={vb} lebar={lebar}>
        <Rect x={20} y={10} width={50} height={64} rx={8} fill="#FFFFFF" />
        <Rect x={28} y={54} width={18} height={8} rx={4} fill={Palette.primary} />
        <Circle cx={22} cy={76} r={10} fill={DAUN} />
        <Circle cx={80} cy={78} r={6} fill={Palette.primary} opacity={0.45} />
      </Dasar>
      {/* Baris tumbuh dari tepi kiri teks (x = 28). */}
      {[
        { y: 22, w: 34, jeda: 0 },
        { y: 32, w: 28, jeda: 400 },
        { y: 42, w: 32, jeda: 800 },
      ].map((b) => (
        <Lapisan
          key={b.y}
          vb={vb}
          lebar={lebar}
          asal={[28, 50]}
          gaya={barisMuncul}
          durasi={2200}
          jeda={b.jeda}>
          <Rect x={28} y={b.y} width={b.w} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
        </Lapisan>
      ))}
      <Lapisan vb={vb} lebar={lebar} gaya={penaMenulis} durasi={1100} linear>
        <Path d="M66 48l18-18 6 6-18 18-8 2z" fill={Palette.ink} />
        <Path d="M84 30l4-4 6 6-4 4z" fill={Palette.primary} />
      </Lapisan>
    </Kanvas>
  );
}

const ayun: FungsiGaya = (p) => {
  'worklet';
  return { transform: [{ rotate: `${interpolate(p, [0, 1], [-8, 8])}deg` }] };
};

/** Gembok di depan pintu kelas. Dipakai untuk "Sesi Sudah Ditutup". Gembok berayun pelan. */
export function IlustrasiDitutup({ lebar = 120 }: { lebar?: number }) {
  const vb: [number, number] = [120, 90];
  return (
    <Kanvas vb={vb} lebar={lebar}>
      <Dasar vb={vb} lebar={lebar}>
        <Ellipse cx={60} cy={84} rx={44} ry={5} fill={Palette.ink} opacity={0.08} />
        <Rect x={30} y={10} width={44} height={72} rx={6} fill={Palette.infoMuted} />
        <Rect x={36} y={16} width={32} height={60} rx={4} fill="#FFFFFF" />
        <Circle cx={62} cy={48} r={2.5} fill={Palette.ink} />
        <Circle cx={108} cy={18} r={3} fill={Palette.primary} />
      </Dasar>
      {/* Berayun dari puncak lengkung gembok (x 88, y 28). */}
      <Lapisan vb={vb} lebar={lebar} asal={[73, 31]} gaya={ayun} durasi={1100} bolakBalik>
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
      </Lapisan>
      <Lapisan vb={vb} lebar={lebar} gaya={kedip} durasi={800} bolakBalik>
        <Circle cx={18} cy={24} r={4} fill={Palette.primary} opacity={0.5} />
      </Lapisan>
    </Kanvas>
  );
}

/** Surat dengan stempel centang. Dipakai untuk "Izin Diterima". Stempel muncul memantul. */
export function IlustrasiIzinDiterima({ lebar = 120 }: { lebar?: number }) {
  const vb: [number, number] = [120, 90];
  return (
    <Kanvas vb={vb} lebar={lebar}>
      <Dasar vb={vb} lebar={lebar}>
        <Ellipse cx={60} cy={84} rx={44} ry={5} fill={Palette.ink} opacity={0.08} />
        <Rect x={30} y={8} width={52} height={68} rx={8} fill="#FFFFFF" />
        <Rect x={38} y={20} width={36} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
        <Rect x={38} y={30} width={28} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
        <Rect x={38} y={40} width={32} height={4} rx={2} fill={Palette.ink} opacity={0.18} />
        <Circle cx={20} cy={70} r={8} fill={DAUN} />
        <Circle cx={104} cy={22} r={4} fill={Palette.primary} opacity={0.45} />
      </Dasar>
      <Lapisan vb={vb} lebar={lebar} asal={[68, 67]} gaya={muncul} durasi={600} ulang={false} jeda={300}>
        <Circle cx={82} cy={60} r={17} fill={Palette.primary} />
        <Path
          d="M74 60l6 6 10-12"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Lapisan>
    </Kanvas>
  );
}

const balikJamPasir: FungsiGaya = (p) => {
  'worklet';
  // Diam selama pasir turun, lalu berbalik 180° di akhir putaran.
  return { transform: [{ rotate: `${interpolate(p, [0, 0.88, 1], [0, 0, 180])}deg` }] };
};

/** Jam pasir. Dipakai untuk menunggu: pasir mengalir, lalu jam pasir berbalik. */
export function IlustrasiMenunggu({ lebar = 120 }: { lebar?: number }) {
  const vb: [number, number] = [120, 90];
  return (
    <Kanvas vb={vb} lebar={lebar}>
      <Dasar vb={vb} lebar={lebar}>
        <Ellipse cx={60} cy={84} rx={40} ry={5} fill={Palette.ink} opacity={0.08} />
        <Circle cx={22} cy={30} r={5} fill={Palette.infoMuted} />
        <Circle cx={98} cy={56} r={6} fill={Palette.infoMuted} />
        <Circle cx={100} cy={20} r={3} fill={Palette.primary} opacity={0.5} />
      </Dasar>
      {/* Bentuk jam pasir simetris, jadi setelah berbalik 180° tampak sama dan bisa mengulang. */}
      <Lapisan vb={vb} lebar={lebar} asal={[50, 48]} gaya={balikJamPasir} durasi={5000} linear>
        <Rect x={38} y={8} width={44} height={7} rx={3} fill={Palette.ink} />
        <Rect x={38} y={72} width={44} height={7} rx={3} fill={Palette.ink} />
        <Path d="M44 15h32c0 18-10 22-10 29s10 11 10 28H44c0-17 10-21 10-28S44 33 44 15z" fill="#FFFFFF" />
        <Path d="M50 22h20c-2 9-8 12-10 16-2-4-8-7-10-16z" fill={Palette.primary} />
        <Path d="M48 72c2-9 8-12 12-14 4 2 10 5 12 14z" fill={Palette.primary} />
      </Lapisan>
      <Lapisan vb={vb} lebar={lebar} gaya={kedip} durasi={500} bolakBalik>
        <Rect x={59} y={38} width={2} height={20} rx={1} fill={Palette.primary} />
      </Lapisan>
    </Kanvas>
  );
}

const tutupTerangkat: FungsiGaya = (p, s) => {
  'worklet';
  return {
    transform: [{ translateY: interpolate(p, [0, 1], [0, -4]) * s }, { rotate: `${interpolate(p, [0, 1], [0, -3])}deg` }],
  };
};

/** Kotak terbuka yang kosong. Dipakai untuk pesan "Belum ada …". Tutup terangkat, titik berkedip. */
export function IlustrasiKosong({ lebar = 84 }: { lebar?: number }) {
  const vb: [number, number] = [120, 80];
  return (
    <Kanvas vb={vb} lebar={lebar}>
      <Dasar vb={vb} lebar={lebar}>
        <Ellipse cx={60} cy={72} rx={44} ry={5} fill={Palette.ink} opacity={0.08} />
        <Path d="M30 40h60l-6 30H36z" fill={Palette.infoMuted} />
        <Path d="M50 52h20" stroke={Palette.ink} strokeWidth={3} strokeLinecap="round" opacity={0.3} />
      </Dasar>
      <Lapisan vb={vb} lebar={lebar} asal={[30, 50]} gaya={tutupTerangkat} durasi={1300} bolakBalik>
        <Path d="M30 40l10-14h40l10 14z" fill="#FFFFFF" />
      </Lapisan>
      <Lapisan vb={vb} lebar={lebar} gaya={kedip} durasi={800} bolakBalik>
        <Circle cx={88} cy={18} r={5} fill={Palette.primary} opacity={0.5} />
      </Lapisan>
      <Lapisan vb={vb} lebar={lebar} gaya={kedip} durasi={800} jeda={800} bolakBalik>
        <Circle cx={28} cy={16} r={3} fill={Palette.primary} />
      </Lapisan>
    </Kanvas>
  );
}
