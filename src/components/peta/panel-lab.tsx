// SRS3-03 (PIC B — Annis): panel aktivitas laboratorium yang muncul saat marker/lab dipilih.
// Isinya realtime karena dihitung ulang dari data sesi Firestore setiap kali berubah.
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  aktivitasLab,
  jarakMeter,
  namaGrup,
  type GrupLab,
  type Titik,
} from '@/components/peta/aktivitas-lab';
import { StatusBadge } from '@/components/status-badge';
import { Badge, GlassCard } from '@/components/ui';
import { Palette } from '@/constants/theme';
import type { Attendance, Role, Session } from '@/types';
import { formatRentangJam, formatTanggal } from '@/utils/format';

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
  const lab = grup.labs.find((item) => item.id === labId) ?? grup.labs[0];
  const { berlangsung, berikutnya } = aktivitasLab(sessions, lab.id, sekarang);
  const hariIni = tanggalHariIni(sekarang);
  const milikmu = role === 'praktikan' ? 'praktikummu' : 'sesimu';

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.labName} numberOfLines={1}>
            {namaGrup(grup)}
          </Text>
          <Badge label={`Radius ${lab.radiusMeter} m`} tone="outline" />
        </View>
        {grup.labs.length === 1 && lab.deskripsi ? (
          <Text style={styles.subtle}>{lab.deskripsi}</Text>
        ) : null}
        <Text style={styles.subtle}>{jarak}</Text>

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
                  <Text style={[styles.segmentText, aktif && styles.segmentTextActive]}>
                    {item.namaLab}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.blockLabel}>SEDANG BERLANGSUNG</Text>
          {berlangsung.length === 0 ? (
            <Text style={styles.empty}>
              Tidak ada {milikmu} yang sedang berlangsung di lab ini.
            </Text>
          ) : (
            berlangsung.map((session) => (
              <View key={session.id} style={styles.session}>
                <View style={styles.sessionTitleRow}>
                  <Text style={styles.sessionTitle}>{session.praktikum}</Text>
                  <StatusBadge status={session.status} />
                </View>
                <Text style={styles.subtle}>
                  Kelas {session.kelasLab} · {waktu(session)}
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
          <Text style={styles.blockLabel}>BERIKUTNYA</Text>
          {berikutnya ? (
            <View style={styles.session}>
              <View style={styles.sessionTitleRow}>
                <Text style={styles.sessionTitle}>{berikutnya.praktikum}</Text>
                <StatusBadge status={berikutnya.status} />
              </View>
              <Text style={styles.subtle}>
                Kelas {berikutnya.kelasLab} · {waktu(berikutnya)}
              </Text>
            </View>
          ) : (
            <Text style={styles.empty}>Belum ada jadwal {milikmu} berikutnya di lab ini.</Text>
          )}
        </View>
      </ScrollView>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  content: {
    gap: 12,
    padding: 18,
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
  blockLabel: {
    color: Palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  session: {
    gap: 4,
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
  presensiButton: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.primary,
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
