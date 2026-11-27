// SRS4-03 (PIC B — Annis): ilustrasi kecil kartu Dashboard Aslab, gaya sama dengan
// src/components/ilustrasi.tsx (palet tim, karakter yang sama, gerak ringan Reanimated).
// Setelan "Kurangi gerakan" di HP menghentikan gerak (ilustrasi tampil diam).
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
import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Palette } from '@/constants/theme';

const KULIT = '#F6D9EF';

type Gaya = (p: number, s: number) => Record<string, unknown>;

function Lapisan({
  vb,
  lebar,
  asal = [50, 50],
  gaya,
  durasi,
  jeda = 0,
  bolakBalik = false,
  children,
}: {
  vb: [number, number];
  lebar: number;
  asal?: [number, number];
  gaya: Gaya;
  durasi: number;
  jeda?: number;
  bolakBalik?: boolean;
  children: ReactNode;
}) {
  const kurangiGerak = useReducedMotion();
  const p = useSharedValue(0);
  const skala = lebar / vb[0];

  useEffect(() => {
    if (kurangiGerak) {
      p.set(0);
      return;
    }
    p.set(
      withDelay(
        jeda,
        withRepeat(withTiming(1, { duration: durasi, easing: Easing.inOut(Easing.ease) }), -1, bolakBalik),
      ),
    );
    return () => cancelAnimation(p);
  }, [kurangiGerak, p, durasi, jeda, bolakBalik]);

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

function Kanvas({ vb, lebar, dasar, children }: { vb: [number, number]; lebar: number; dasar: ReactNode; children?: ReactNode }) {
  return (
    <View
      style={{ width: lebar, height: (lebar * vb[1]) / vb[0] }}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <Svg width={lebar} height={(lebar * vb[1]) / vb[0]} viewBox={`0 0 ${vb[0]} ${vb[1]}`}>
        {dasar}
      </Svg>
      {children}
    </View>
  );
}

const gelembung: Gaya = (p, s) => {
  'worklet';
  return {
    opacity: interpolate(p, [0, 0.15, 1], [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: -14 * s * p }],
  };
};
const goyang: Gaya = (p) => {
  'worklet';
  return { transform: [{ rotate: `${interpolate(p, [0, 1], [0, -7])}deg` }] };
};
const angguk: Gaya = (p) => {
  'worklet';
  return { transform: [{ rotate: `${interpolate(p, [0, 1], [0, -5])}deg` }] };
};
const melayang: Gaya = (p, s) => {
  'worklet';
  return { transform: [{ translateY: interpolate(p, [0, 1], [0, -5]) * s }] };
};

/** Kepala karakter HadirKu (kulit + rambut hitam). */
function Kepala({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <>
      <Circle cx={x} cy={y} r={r} fill={KULIT} />
      <Path
        d={`M${x - r} ${y - r * 0.1}c0-${r * 0.85} ${r * 0.55}-${r * 1.2} ${r}-${r * 1.2} ${r * 0.75} 0 ${r} ${r * 0.45} ${r} ${r * 0.95}-${r * 0.4}-${r * 0.3}-${r * 0.85}-${r * 0.4}-${r * 1.3}-${r * 0.25}-${r * 0.35} ${r * 0.1}-${r * 0.6} ${r * 0.25}-${r * 0.7} ${r * 0.45}z`}
        fill={Palette.ink}
      />
    </>
  );
}

/** Labu kimia magenta, gelembung naik. */
export function MiniLab({ lebar = 46 }: { lebar?: number }) {
  const vb: [number, number] = [46, 38];
  return (
    <Kanvas
      vb={vb}
      lebar={lebar}
      dasar={
        <>
          <Path d="M17 6h10v7l8 14a3 3 0 0 1-2.6 4.5H11.6A3 3 0 0 1 9 27l8-14z" fill="#FFFFFF" stroke={Palette.ink} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M12.5 22h19l3.4 5.8a2.5 2.5 0 0 1-2.2 3.7H11.3a2.5 2.5 0 0 1-2.2-3.7z" fill={Palette.primary} />
          <Rect x={15} y={3} width={14} height={4} rx={2} fill={Palette.ink} />
        </>
      }>
      {[
        { cx: 20, r: 1.8, jeda: 0 },
        { cx: 25, r: 1.3, jeda: 700 },
      ].map((b) => (
        <Lapisan key={b.cx} vb={vb} lebar={lebar} gaya={gelembung} durasi={1800} jeda={b.jeda}>
          <Circle cx={b.cx} cy={27} r={b.r} fill="#FFFFFF" />
        </Lapisan>
      ))}
    </Kanvas>
  );
}

/** Tiga praktikan; yang tengah mengangguk. */
export function MiniPraktikan({ lebar = 50 }: { lebar?: number }) {
  const vb: [number, number] = [50, 38];
  return (
    <Kanvas
      vb={vb}
      lebar={lebar}
      dasar={
        <>
          <Path d="M4 37c0-8 4-12 9-12s9 4 9 12z" fill="#FFFFFF" stroke={Palette.ink} strokeWidth={1.6} />
          <Kepala x={13} y={17} r={5.5} />
          <Path d="M28 37c0-8 4-12 9-12s9 4 9 12z" fill="#FFFFFF" stroke={Palette.ink} strokeWidth={1.6} />
          <Kepala x={37} y={17} r={5.5} />
          <Path d="M14 38c0-10 5-15 11-15s11 5 11 15z" fill={Palette.primary} stroke={Palette.ink} strokeWidth={1.6} />
        </>
      }>
      <Lapisan vb={vb} lebar={lebar} asal={[50, 50]} gaya={angguk} durasi={1400} bolakBalik>
        <Kepala x={25} y={13} r={6.5} />
      </Lapisan>
    </Kanvas>
  );
}

/** Asprak ber-ID card memegang papan klip yang bergoyang. */
export function MiniAsprak({ lebar = 46 }: { lebar?: number }) {
  const vb: [number, number] = [46, 38];
  return (
    <Kanvas
      vb={vb}
      lebar={lebar}
      dasar={
        <>
          <Path d="M8 38c0-10 5-15 11-15s11 5 11 15z" fill="#FFFFFF" stroke={Palette.ink} strokeWidth={1.6} />
          <Kepala x={19} y={13} r={6.5} />
          <Path d="M19 23v7" stroke={Palette.primary} strokeWidth={2} />
          <Rect x={16.5} y={29} width={5} height={6} rx={1.2} fill={Palette.primary} />
        </>
      }>
      <Lapisan vb={vb} lebar={lebar} asal={[76, 82]} gaya={goyang} durasi={1300} bolakBalik>
        <Rect x={29} y={14} width={13} height={17} rx={2} fill="#FFFFFF" stroke={Palette.ink} strokeWidth={1.6} />
        <Rect x={32.5} y={12} width={6} height={3.5} rx={1.5} fill={Palette.ink} />
        <Path d="M32 22l2.4 2.4 4.6-5" fill="none" stroke={Palette.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Lapisan>
    </Kanvas>
  );
}

/** Struk tagihan dan karakter, koin Rp melayang. */
export function IlustrasiTagihan({ lebar = 92 }: { lebar?: number }) {
  const vb: [number, number] = [110, 100];
  return (
    <Kanvas
      vb={vb}
      lebar={lebar}
      dasar={
        <>
          <Ellipse cx={56} cy={94} rx={44} ry={5} fill={Palette.ink} opacity={0.1} />
          <Path d="M20 22h46v66l-6-4-6 4-6-4-6 4-6-4-6 4-6-4-4 3z" fill="#FFFFFF" stroke={Palette.ink} strokeWidth={2.2} strokeLinejoin="round" />
          <Rect x={28} y={32} width={22} height={5} rx={2.5} fill={Palette.ink} />
          <Rect x={28} y={44} width={30} height={4} rx={2} fill={Palette.lavender} />
          <Rect x={28} y={53} width={24} height={4} rx={2} fill={Palette.lavender} />
          <Rect x={28} y={64} width={30} height={8} rx={4} fill={Palette.primary} />
          <Path d="M76 88c0-15 5-24 13-24s13 9 13 24z" fill={Palette.lavender} />
          <Kepala x={89} y={54} r={9} />
        </>
      }>
      <Lapisan vb={vb} lebar={lebar} gaya={melayang} durasi={1200} bolakBalik>
        <Circle cx={74} cy={30} r={10} fill={Palette.primary} stroke={Palette.ink} strokeWidth={2} />
        <SvgText x={74} y={34} textAnchor="middle" fontFamily="Inter_800ExtraBold" fontSize={10} fill="#FFFFFF">
          Rp
        </SvgText>
      </Lapisan>
    </Kanvas>
  );
}
