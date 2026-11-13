import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  EmptyNote,
  GlassCard,
  Illustration,
  RoundButton,
  Screen,
  SectionTitle,
  shadow,
} from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useSessions } from '@/hooks/use-sessions';
import type { Attendance, Session } from '@/types';

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const STATUS_TEXT = {
  belum_dibuka: 'Belum dibuka',
  dibuka: 'Sedang dibuka',
  ditutup: 'Sudah ditutup',
} as const;

function toIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function weekOf(iso: string): string[] {
  const start = fromIso(iso);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return toIso(day);
  });
}

function openDetail(session: Session) {
  router.push({ pathname: '/jadwal/[id]', params: { id: session.id } });
}

export default function BerandaJadwalScreen() {
  const currentUser = useCurrentUser();
  const { sessions, attendances, loading, error } = useSessions();

  const isAsisten = currentUser?.role === 'asisten';

  // Urutkan sesi berdasarkan tanggal dan jam mulai
  const sortedSessions = [...sessions].sort((a, b) =>
    (a.tanggal + a.jamMulai).localeCompare(b.tanggal + b.jamMulai),
  );

  const featured = sortedSessions.find((session) => session.status !== 'ditutup') ?? sortedSessions[0];
  const anchor = featured?.tanggal ?? toIso(new Date());
  const [selectedDate, setSelectedDate] = useState(anchor);
  const week = weekOf(anchor);
  const sessionDates = new Set(sortedSessions.map((session) => session.tanggal));
  const daySessions = sortedSessions.filter((session) => session.tanggal === selectedDate);
  const anchorDate = fromIso(anchor);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <GlassCard style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={styles.loadingText}>Memuat jadwal praktikum…</Text>
          </GlassCard>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <GlassCard style={styles.loadingCard}>
            <Illustration icon="cloud-offline-outline" />
            <Text style={styles.loadingText}>{error}</Text>
          </GlassCard>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.topRow}>
        <View style={styles.greeting}>
          <Text style={styles.hello}>Halo,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {currentUser?.nama ?? '-'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {isAsisten ? (
            <RoundButton
              icon="add"
              onPress={() => router.push('/jadwal-form' as Href)}
            />
          ) : null}
          <Pressable onPress={() => router.push('/profil' as Href)}>
            <Avatar nama={currentUser?.nama ?? '?'} size={48} />
          </Pressable>
        </View>
      </View>

      <SectionTitle title="Sesi Terdekat" />
      {featured ? (
        <FeaturedCard session={featured} attendances={attendances} />
      ) : (
        <EmptyNote
          message={
            isAsisten
              ? 'Kamu belum membuat sesi praktikum mana pun. Tekan tombol + untuk menambahkan.'
              : 'Kamu belum terdaftar di sesi praktikum mana pun.'
          }
        />
      )}

      <SectionTitle
        title="Jadwal Praktikum"
        right={
          <View style={styles.monthPill}>
            <Text style={styles.monthText}>
              {BULAN[anchorDate.getMonth()]} {anchorDate.getFullYear()}
            </Text>
            <Ionicons name="chevron-down" size={13} color={Palette.text} />
          </View>
        }
      />
      <View style={styles.week}>
        {week.map((iso) => {
          const date = fromIso(iso);
          const selected = iso === selectedDate;
          return (
            <Pressable
              key={iso}
              onPress={() => setSelectedDate(iso)}
              style={[styles.day, selected && styles.daySelected]}>
              <Text style={[styles.dayName, selected && styles.dayTextSelected]}>
                {HARI[date.getDay()]}
              </Text>
              <Text style={[styles.dayNumber, selected && styles.dayTextSelected]}>
                {date.getDate()}
              </Text>
              <View
                style={[
                  styles.dayDot,
                  sessionDates.has(iso) && {
                    backgroundColor: selected ? '#FFFFFF' : Palette.primary,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title="Timeline" />
      {daySessions.length === 0 ? (
        <EmptyNote message="Tidak ada sesi pada tanggal ini." />
      ) : (
        <View style={styles.timeline}>
          {daySessions.map((session) => (
            <View key={session.id} style={styles.timelineRow}>
              <Text style={styles.timelineHour}>{session.jamMulai}</Text>
              <Pressable
                onPress={() => openDetail(session)}
                style={({ pressed }) => [styles.timelineChip, pressed && styles.pressed]}>
                <View style={styles.timelineText}>
                  <Text style={styles.timelineTitle} numberOfLines={1}>
                    {session.praktikum}
                  </Text>
                  <Text style={styles.timelineSub}>
                    {session.jamMulai}-{session.jamSelesai} · {session.kelasLab}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={Palette.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function FeaturedCard({
  session,
  attendances,
}: {
  session: Session;
  attendances: Attendance[];
}) {
  const hadir = attendances.filter((item) => item.sessionId === session.id).length;
  const total = session.pesertaIds.length;
  const ratio = total === 0 ? 0 : hadir / total;
  const tanggal = fromIso(session.tanggal);

  return (
    <GlassCard style={styles.featured}>
      <View style={styles.featuredText}>
        <View style={styles.statusLine}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  session.status === 'dibuka'
                    ? Palette.primary
                    : session.status === 'ditutup'
                      ? Palette.ink
                      : '#B9B5C6',
              },
            ]}
          />
          <Text style={styles.statusText}>{STATUS_TEXT[session.status]}</Text>
        </View>
        <Text style={styles.featuredTitle}>{session.praktikum}</Text>
        <Text style={styles.featuredMeta}>
          {session.kelasLab} · {tanggal.getDate()} {BULAN[tanggal.getMonth()]}
        </Text>
        <Text style={styles.progressLabel}>
          Hadir {hadir}/{total}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(ratio * 100, 6)}%` }]} />
        </View>
        <Pressable
          onPress={() => openDetail(session)}
          accessibilityLabel="Buka detail sesi"
          style={({ pressed }) => [styles.play, pressed && styles.pressed]}>
          <Ionicons name="play" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={styles.art}>
        <View style={[styles.artBlob, { backgroundColor: Palette.lavender, top: 6, right: 4 }]} />
        <View style={[styles.artBlob, styles.artBlobSmall, { backgroundColor: Palette.lilac }]} />
        <Ionicons name="easel" size={56} color={Palette.primary} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  greeting: {
    flex: 1,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  hello: {
    color: Palette.textMuted,
    fontSize: 13,
  },
  name: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  loadingCard: {
    alignItems: 'center',
    borderRadius: 24,
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  loadingText: {
    color: Palette.textSecondary,
    fontSize: 14,
  },
  featured: {
    flexDirection: 'row',
    gap: 8,
  },
  featuredText: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 6,
  },
  statusLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statusDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  statusText: {
    color: Palette.textMuted,
    fontSize: 11,
  },
  featuredTitle: {
    color: Palette.text,
    fontSize: 21,
    fontWeight: '600',
    lineHeight: 26,
  },
  featuredMeta: {
    color: Palette.text,
    fontSize: 13,
  },
  progressLabel: {
    color: Palette.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  progressTrack: {
    backgroundColor: 'rgba(226, 27, 208, 0.14)',
    borderRadius: 999,
    height: 5,
    width: '90%',
  },
  progressFill: {
    backgroundColor: Palette.primary,
    borderRadius: 999,
    height: 5,
  },
  play: {
    alignItems: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    marginTop: 8,
    width: 38,
  },
  art: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 112,
  },
  artBlob: {
    borderRadius: 999,
    height: 86,
    position: 'absolute',
    width: 86,
  },
  artBlobSmall: {
    bottom: 10,
    height: 48,
    left: 2,
    width: 48,
  },
  monthPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  monthText: {
    color: Palette.text,
    fontSize: 12,
  },
  week: {
    flexDirection: 'row',
    gap: 6,
  },
  day: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 18,
    boxShadow: shadow,
    flex: 1,
    gap: 4,
    paddingVertical: 10,
  },
  daySelected: {
    backgroundColor: Palette.primary,
  },
  dayName: {
    color: Palette.textMuted,
    fontSize: 10,
  },
  dayNumber: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dayDot: {
    borderRadius: 999,
    height: 4,
    width: 4,
  },
  timeline: {
    gap: 12,
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  timelineHour: {
    color: Palette.text,
    fontSize: 13,
    width: 42,
  },
  timelineChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 999,
    boxShadow: shadow,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingRight: 16,
    paddingVertical: 11,
  },
  timelineText: {
    flex: 1,
  },
  timelineTitle: {
    color: Palette.text,
    fontSize: 13,
    fontWeight: '600',
  },
  timelineSub: {
    color: Palette.textMuted,
    fontSize: 11,
  },
});