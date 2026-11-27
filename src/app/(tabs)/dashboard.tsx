// SRS4-03 (PIC B — Annis): Dashboard Aslab (SRS 5.2), realtime dari Firestore.
// Dua tab di dalam halaman:
// - Hari Ini: sesi sedang berlangsung, ringkasan lab/praktikan/asprak, jadwal tiap lab hari ini.
// - Riwayat: denda belum dibayar, grafik keuangan denda, riwayat kegiatan dan pembayaran.
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { batangDenda, daftarAsprak, jadwalPerLab, jumlahHadir, labDikelola, ringkasDenda, ringkasLab, ringkasMingguIni, riwayatKegiatan, riwayatPembayaran, sesiBerlangsung, sesiDiLab, type Periode } from '@/components/dashboard/data-dashboard';
import { GrafikDenda } from '@/components/dashboard/grafik-denda';
import { JadwalLabHariIni, Pengalih } from '@/components/dashboard/jadwal-lab';
import { KartuBerlangsung, KartuDenda, KartuRingkas, KartuRiwayatRingkas } from '@/components/dashboard/kartu-dashboard';
import { LembarAsprak, LembarSesi } from '@/components/dashboard/lembar-bawah';
import { RiwayatDashboard, type JenisRiwayat } from '@/components/dashboard/riwayat-dashboard';
import { useDashboardAslab } from '@/components/dashboard/use-dashboard-aslab';
import { gradientStyle } from '@/components/screen-background';
import { Avatar, EmptyNote, GlassCard, Screen, SectionTitle, TAB_BAR_SPACE, TopBar } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import type { Session } from '@/types';

type Tab = 'hari' | 'riwayat';

/**
 * Sama dengan <Screen> (latar gradien, lebar maks 520, ruang tab bar), tetapi ScrollView-nya
 * bisa dirujuk supaya kartu denda bisa menggulir ke daftar pembayaran. Screen milik PM tidak
 * menerima ref, jadi tidak diubah.
 */
function LayarGulir({ scrollRef, children }: { scrollRef: RefObject<ScrollView | null>; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1 }, gradientStyle]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.isi,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + TAB_BAR_SPACE },
        ]}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Waktu sekarang yang diperbarui tiap 30 detik supaya status "berlangsung" ikut berganti. */
function useSekarang(): Date {
  const [sekarang, setSekarang] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setSekarang(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return sekarang;
}

export default function DashboardAslabScreen() {
  const currentUser = useCurrentUser();
  const data = useDashboardAslab();
  const sekarang = useSekarang();

  const [tab, setTab] = useState<Tab>('hari');
  const [periode, setPeriode] = useState<Periode>('hari');
  const [jenisRiwayat, setJenisRiwayat] = useState<JenisRiwayat>('kegiatan');
  const [lembarAsprak, setLembarAsprak] = useState(false);
  const [sesiDetail, setSesiDetail] = useState<Session | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const [posisiRiwayat, setPosisiRiwayat] = useState(0);

  const hitung = useMemo(() => {
    const labs = labDikelola(data.labs, data.labIdsSaya);
    const semuaLab = !data.labIdsSaya || data.labIdsSaya.length === 0;
    const sessions = sesiDiLab(data.sessions, labs, semuaLab);
    const labIds = new Set(labs.map((l) => l.id));
    const sessionIds = new Set(sessions.map((s) => s.id));
    const fines = semuaLab
      ? data.fines
      : data.fines.filter((f) => (f.labId ? labIds.has(f.labId) : sessionIds.has(f.sessionId)));
    const fineIds = new Set(fines.map((f) => f.id));
    const payments = semuaLab ? data.payments : data.payments.filter((p) => fineIds.has(p.fineId));
    const berlangsung = sesiBerlangsung(sessions, sekarang);
    const namaLabMap = new Map(data.labs.map((l) => [l.id, l.namaLab]));

    return {
      labs,
      fines,
      berlangsung,
      ringkas: ringkasLab(labs, data.users, berlangsung),
      jadwal: jadwalPerLab(labs, sessions, sekarang),
      asprak: daftarAsprak(data.users, sessions, data.labs, sekarang),
      denda: ringkasDenda(fines),
      kegiatan: riwayatKegiatan(sessions),
      pembayaran: riwayatPembayaran(payments),
      minggu: ringkasMingguIni(sessions, payments, sekarang),
      users: new Map(data.users.map((u) => [u.id, u])),
      fineMap: new Map(data.fines.map((f) => [f.id, f])),
      namaLab: (labId?: string) => (labId ? namaLabMap.get(labId) : undefined) ?? 'Lab belum diatur',
      hadir: (sessionId: string) => jumlahHadir(data.attendances, sessionId),
    };
  }, [data, sekarang]);

  const batang = useMemo(() => batangDenda(hitung.fines, periode, sekarang), [hitung.fines, periode, sekarang]);

  // Aturan keras Sprint 4: layar khusus aslab.
  if (currentUser?.role !== 'aslab') {
    return (
      <Screen header={<TopBar title="Dashboard" />}>
        <EmptyNote icon="lock-closed-outline" message="Dashboard hanya untuk akun Aslab." />
      </Screen>
    );
  }

  if (data.loading) {
    return (
      <Screen>
        <GlassCard style={styles.muat}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={styles.muatTeks}>Memuat dashboard…</Text>
        </GlassCard>
      </Screen>
    );
  }

  if (data.gagal) {
    return (
      <Screen header={<TopBar title="Dashboard" />}>
        <EmptyNote icon="cloud-offline-outline" message="Dashboard belum bisa dimuat. Periksa koneksi internet lalu coba lagi." />
      </Screen>
    );
  }

  function keDaftarPembayaran() {
    setJenisRiwayat('pembayaran');
    scrollRef.current?.scrollTo({ y: Math.max(posisiRiwayat - 12, 0), animated: true });
  }

  return (
    <LayarGulir scrollRef={scrollRef}>
      <View style={styles.sapa}>
        <View style={{ flex: 1 }}>
          <Text style={styles.halo}>Halo,</Text>
          <Text style={styles.nama} numberOfLines={1}>
            {currentUser.nama}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/profil' as Href)} accessibilityRole="button" accessibilityLabel="Buka profil">
          <Avatar nama={currentUser.nama} size={48} />
        </Pressable>
      </View>

      <Pengalih
        opsi={[
          { nilai: 'hari', label: 'Hari Ini' },
          { nilai: 'riwayat', label: 'Riwayat' },
        ]}
        nilai={tab}
        onPilih={(t: Tab) => {
          setTab(t);
          scrollRef.current?.scrollTo({ y: 0, animated: false });
        }}
      />

      {tab === 'hari' ? (
        <>
          <SectionTitle title="Sedang Berlangsung" />
          {hitung.berlangsung.length === 0 ? (
            <EmptyNote icon="flask-outline" message="Belum ada sesi yang berlangsung di lab yang kamu kelola." />
          ) : (
            <KartuBerlangsung
              sessions={hitung.berlangsung}
              hadir={hitung.hadir}
              namaLab={hitung.namaLab}
              onTekan={setSesiDetail}
            />
          )}

          <SectionTitle title="Ringkasan Lab" />
          <KartuRingkas
            ringkas={hitung.ringkas}
            onLab={() => router.push('/kelola-lab' as Href)}
            onPraktikan={() => router.push('/distribusi-praktikan' as Href)}
            onAsprak={() => setLembarAsprak(true)}
          />

          <SectionTitle title="Jadwal Lab Hari Ini" />
          <JadwalLabHariIni jadwal={hitung.jadwal} sekarang={sekarang} />
        </>
      ) : (
        <>
          <KartuDenda ringkas={hitung.denda} onTekan={keDaftarPembayaran} />

          <SectionTitle title="Keuangan Denda" />
          <GrafikDenda periode={periode} onPeriode={setPeriode} batang={batang} />

          <View onLayout={(e) => setPosisiRiwayat(e.nativeEvent.layout.y)} style={{ gap: 12 }}>
            <SectionTitle title="Riwayat Terakhir" />
            <KartuRiwayatRingkas sesiSelesai={hitung.minggu.sesiSelesai} dendaLunas={hitung.minggu.dendaLunas} />
            <RiwayatDashboard
              jenis={jenisRiwayat}
              onJenis={setJenisRiwayat}
              kegiatan={hitung.kegiatan}
              pembayaran={hitung.pembayaran}
              hadir={hitung.hadir}
              namaLab={hitung.namaLab}
              users={hitung.users}
              fines={hitung.fineMap}
              sekarang={sekarang}
            />
          </View>
        </>
      )}

      <LembarAsprak terbuka={lembarAsprak} onTutup={() => setLembarAsprak(false)} daftar={hitung.asprak} />
      <LembarSesi
        session={sesiDetail}
        onTutup={() => setSesiDetail(null)}
        attendances={data.attendances}
        users={hitung.users}
        namaLab={hitung.namaLab}
      />
    </LayarGulir>
  );
}

const styles = StyleSheet.create({
  isi: { alignSelf: 'center', gap: 18, maxWidth: 520, paddingHorizontal: 20, width: '100%' },
  muat: { alignItems: 'center', gap: 12, padding: 24 },
  muatTeks: { color: Palette.textSecondary, fontSize: 14 },
  sapa: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  halo: { color: Palette.textMuted, fontSize: 13 },
  nama: { color: Palette.text, fontSize: 22, fontWeight: '600' },
});
