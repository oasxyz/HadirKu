// SRS3-03 (PIC B — Annis): panel aktivitas laboratorium yang muncul saat marker/lab dipilih.
// Isinya realtime karena dihitung ulang dari data sesi Firestore setiap kali berubah.
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  aktivitasLab,
  jadwalLabPadaTanggal,
  jarakMeter,
  namaGrup,
  namaLabSingkat,
  type GrupLab,
  type Titik,
} from '@/components/peta/aktivitas-lab';
import { StatusBadge } from '@/components/status-badge';
import { Badge, GlassCard } from '@/components/ui';
import { Palette } from '@/constants/theme';
import type { Attendance, Role, Session, SessionStatus } from '@/types';
import { formatRentangJam, formatTanggal } from '@/utils/format';
import { isStafLab } from '@/types';

// Label status versi pendek supaya baris jadwal muat satu baris (warna sama dengan StatusBadge).
const LABEL_STATUS_SINGKAT: Record<SessionStatus, string> = {
  belum_dibuka: 'Belum',
  dibuka: 'Dibuka',
  ditutup: 'Selesai',
};
const WARNA_STATUS_SINGKAT: Record<SessionStatus, string> = {
  belum_dibuka: Palette.textMuted,
  dibuka: Palette.primary,
  ditutup: Palette.ink,
};

function tanggalHariIni(sekarang: Date): string {
  const y = sekarang.getFullYear();
  const m = String(sekarang.getMonth() + 1).padStart(2, '0');
  const d = String(sekarang.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function PanelLab({
  grup,
  labId,
  onPilihLab,
  sessions,
  attendances,
  role,
  userId,
  titikPengguna,
  keteranganLokasi,
  sekarang,
  maxHeight,
}: {
  grup: GrupLab;
  labId: string;
  onPilihLab: (labId: string) => void;
  sessions: Session[];
  attendances: Attendance[];
  role: Role;
  userId: string;
  titikPengguna: Titik | null;
  keteranganLokasi: string;
  sekarang: Date;
  maxHeight: number;
}) {
  const [terlipat, setTerlipat] = useState(false);
  const [jadwalTerbuka, setJadwalTerbuka] = useState(false);

  // Gestur tarik di bagian atas panel. Ambang 30 px supaya ketukan biasa tidak terbaca tarikan.
  const geser = useMemo(() => {
    const ubah = (lipat: boolean | ((sebelum: boolean) => boolean)) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTerlipat(lipat);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6,
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 30) ubah(true);
        else if (g.dy < -30) ubah(false);
        else if (Math.abs(g.dy) < 6 && Math.abs(g.dx) < 6) ubah((sebelum) => !sebelum);
      },
    });
  }, []);

  const lab = grup.labs.find((item) => item.id === labId) ?? grup.labs[0];
  const { berlangsung, berikutnya } = aktivitasLab(sessions, lab.id, sekarang);
  const hariIni = tanggalHariIni(sekarang);
  const jadwalHariIni = isStafLab(role) ? jadwalLabPadaTanggal(sessions, lab.id, hariIni) : [];
  const jumlahSesi = jadwalHariIni.filter((baris) => baris.jenis === 'sesi').length;
  const jumlahKosong = jadwalHariIni.length - jumlahSesi;
  const ringkasanJadwal =
    jumlahKosong > 0 ? `${jumlahSesi} sesi · ${jumlahKosong} slot kosong` : `${jumlahSesi} sesi`;
  // Praktikan hanya melihat praktikum yang diikutinya; asisten melihat semua sesi di lab.
  const kosongBerlangsung =
    role === 'praktikan'
      ? 'Tidak ada praktikummu yang sedang berlangsung di lab ini.'
      : 'Tidak ada praktikum yang sedang berlangsung di lab ini.';
  const kosongBerikutnya =
    role === 'praktikan'
      ? 'Belum ada jadwal praktikummu berikutnya di lab ini.'
      : 'Belum ada jadwal praktikum berikutnya di lab ini.';

  // Untuk asisten: tandai sesi milik asisten lain supaya tidak tertukar dengan sesinya sendiri.
  function keteranganPemilik(session: Session): string {
    if (!isStafLab(role) || session.asistenId === userId) return '';
    return session.asistenNama ? ` · Bukan sesimu (${session.asistenNama})` : ' · Bukan sesimu';
  }

  const jarak = titikPengguna
    ? `Jarak Anda: ${Math.round(jarakMeter(titikPengguna, lab))} m`
    : keteranganLokasi;

  function waktu(session: Session): string {
    const jam = formatRentangJam(session.jamMulai, session.jamSelesai);
    return session.tanggal === hariIni ? `Hari ini · ${jam}` : `${formatTanggal(session.tanggal)} · ${jam}`;
  }

  // DESIGN 5.2: tombol hanya untuk praktikan peserta yang belum presensi, saat sesi dibuka.
  function bisaPresensi(session: Session): boolean {
    if (role !== 'praktikan' || session.status !== 'dibuka') return false;
    if (!session.pesertaIds.includes(userId)) return false;
    return !attendances.some((item) => item.sessionId === session.id && item.userId === userId);
  }

  return (
    <GlassCard style={[styles.card, { maxHeight }]}>
      {/* Bagian atas bisa ditarik: ke bawah untuk melipat panel (peta terlihat penuh),
          ke atas untuk membuka lagi. Ketuk untuk berganti. */}
      <View
        {...geser.panHandlers}
        style={styles.handleArea}
        accessible
        accessibilityRole="button"
        accessibilityLabel={terlipat ? 'Buka panel laboratorium' : 'Lipat panel laboratorium'}
        accessibilityHint="Tarik atau ketuk untuk membuka atau melipat panel">
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.labName} numberOfLines={1}>
            {namaGrup(grup)}
          </Text>
          <Badge label={`Radius ${lab.radiusMeter} m`} tone="outline" />
        </View>
        {grup.labs.length === 1 && lab.deskripsi && !terlipat ? (
          <Text style={styles.subtle}>{lab.deskripsi}</Text>
        ) : null}
        <Text style={styles.subtle}>
          {jarak}
          {terlipat && berlangsung.length > 0 ? ` · ${berlangsung.length} praktikum berlangsung` : ''}
        </Text>
      </View>

      {terlipat ? null : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {grup.labs.length > 1 ? (
          <View style={styles.segment} accessibilityRole="tablist">
            {grup.labs.map((item) => {
              const aktif = item.id === lab.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onPilihLab(item.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: aktif }}
                  style={[styles.segmentItem, aktif && styles.segmentItemActive]}>
                  <Text
                    style={[styles.segmentText, aktif && styles.segmentTextActive]}
                    numberOfLines={1}>
                    {namaLabSingkat(item.namaLab)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.blockLabel}>Sedang berlangsung</Text>
          {berlangsung.length === 0 ? (
            <Text style={styles.empty}>{kosongBerlangsung}</Text>
          ) : (
            berlangsung.map((session) => (
              <View key={session.id} style={styles.session}>
                <View style={styles.sessionTitleRow}>
                  <Text style={styles.sessionTitle}>{session.praktikum}</Text>
                  <StatusBadge status={session.status} />
                </View>
                <Text style={styles.subtle}>
                  Kelas {session.kelasLab} · {waktu(session)}
                  {keteranganPemilik(session)}
                </Text>
                {bisaPresensi(session) ? (
                  <Pressable
                    onPress={() => router.push(`/presensi/${session.id}` as Href)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.presensiButton, pressed && styles.pressed]}>
                    <Text style={styles.presensiText}>Presensi Sekarang</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>Berikutnya</Text>
          {berikutnya ? (
            <View style={styles.session}>
              <View style={styles.sessionTitleRow}>
                <Text style={styles.sessionTitle}>{berikutnya.praktikum}</Text>
                <StatusBadge status={berikutnya.status} />
              </View>
              <Text style={styles.subtle}>
                Kelas {berikutnya.kelasLab} · {waktu(berikutnya)}
                {keteranganPemilik(berikutnya)}
              </Text>
            </View>
          ) : (
            <Text style={styles.empty}>{kosongBerikutnya}</Text>
          )}
        </View>

        {/* Khusus asisten (melihat semua sesi): jadwal lab hari ini beserta jeda kosongnya. */}
        {isStafLab(role) ? (
          <View style={styles.block}>
            <View style={styles.jadwalHeader}>
              <Text style={styles.blockLabel}>Jadwal hari ini</Text>
              {jadwalHariIni.length > 0 ? (
                <Pressable
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setJadwalTerbuka((sebelum) => !sebelum);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.jadwalToggleBtn, pressed && styles.pressed]}>
                  <Text style={styles.jadwalToggle}>
                    {jadwalTerbuka ? 'Sembunyikan' : 'Lihat semua'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {jadwalHariIni.length === 0 ? (
              <Text style={styles.empty}>Belum ada jadwal di lab ini hari ini.</Text>
            ) : !jadwalTerbuka ? (
              // Ringkas secara bawaan: sesi berlangsung dan berikutnya sudah tampil di atas.
              <Text style={styles.subtle}>{ringkasanJadwal}</Text>
            ) : (
              jadwalHariIni.map((baris) =>
                baris.jenis === 'kosong' ? (
                  <View key={`kosong-${baris.mulai}`} style={styles.jadwalRow}>
                    <Text style={styles.jadwalJam}>{formatRentangJam(baris.mulai, baris.selesai)}</Text>
                    <Text style={styles.jadwalKosong}>Kosong</Text>
                  </View>
                ) : (
                  <View key={baris.session.id} style={styles.jadwalRow}>
                    <Text style={styles.jadwalJam}>
                      {formatRentangJam(baris.session.jamMulai, baris.session.jamSelesai)}
                    </Text>
                    <View style={styles.jadwalIsi}>
                      <Text
                        style={[
                          styles.jadwalNama,
                          baris.session.asistenId === userId && styles.jadwalNamaMilikku,
                        ]}
                        numberOfLines={1}>
                        {baris.session.praktikum} · {baris.session.kelasLab}
                      </Text>
                      {baris.session.asistenId !== userId ? (
                        <Text style={styles.jadwalPemilik} numberOfLines={1}>
                          Bukan sesimu{baris.session.asistenNama ? ` (${baris.session.asistenNama})` : ''}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.kotakStatus,
                        { backgroundColor: WARNA_STATUS_SINGKAT[baris.session.status] },
                      ]}>
                      <Text style={styles.kotakStatusTeks}>
                        {LABEL_STATUS_SINGKAT[baris.session.status]}
                      </Text>
                    </View>
                  </View>
                ),
              )
            )}
          </View>
        ) : null}
      </ScrollView>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    // Solid (tidak transparan) supaya tidak bercampur dengan peta; warna sama dengan kartu lain.
    backgroundColor: '#F7F6FB',
    padding: 0,
  },
  handleArea: {
    gap: 6,
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(23, 21, 28, 0.18)',
    borderRadius: 999,
    height: 5,
    marginBottom: 6,
    width: 44,
  },
  content: {
    gap: 12,
    paddingBottom: 18,
    paddingHorizontal: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  labName: {
    color: Palette.text,
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
  },
  subtle: {
    color: Palette.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  segment: {
    backgroundColor: 'rgba(23, 21, 28, 0.06)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 2,
    padding: 3,
  },
  segmentItem: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    paddingVertical: 8,
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 6px rgba(60, 40, 90, 0.12)',
  },
  segmentText: {
    color: Palette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: Palette.ink,
  },
  block: {
    borderTopColor: Palette.border,
    borderTopWidth: 1,
    gap: 6,
    paddingTop: 12,
  },
  // Judul bagian biasa (bukan huruf kapital berjarak) supaya terbaca seperti judul bagian lain.
  blockLabel: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  // Tiap sesi jadi kartu putih solid di dalam panel.
  session: {
    backgroundColor: '#FFFFFF',
    borderColor: Palette.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  sessionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sessionTitle: {
    color: Palette.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  empty: {
    color: Palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  jadwalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jadwalToggleBtn: {
    backgroundColor: Palette.lavender,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  jadwalToggle: {
    color: Palette.text,
    fontSize: 12,
    fontWeight: '700',
  },
  kotakStatus: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kotakStatusTeks: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  jadwalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  jadwalJam: {
    color: Palette.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    width: 92,
  },
  jadwalIsi: {
    flex: 1,
    minWidth: 0,
  },
  jadwalNama: {
    color: Palette.text,
    fontSize: 12,
    fontWeight: '600',
  },
  // Sesi milik sendiri cukup ditebalkan (teks tetap hitam).
  jadwalNamaMilikku: {
    fontWeight: '800',
  },
  jadwalPemilik: {
    color: Palette.textMuted,
    fontSize: 10,
  },
  jadwalKosong: {
    color: Palette.textMuted,
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
  },
  presensiButton: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    marginTop: 6,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  presensiText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
