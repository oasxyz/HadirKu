// SRS005 rekap (PIC B — Yustinus): daftar sesi untuk direkap, kehadiran realtime dari Firestore.
import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { EmptyNote, ListRow, Screen, TopBar } from '@/components/ui';
import { useAppContext } from '@/context/app-context';
import { formatTanggal } from '@/utils/format';

export default function RekapScreen() {
  const { state } = useAppContext();
  const sessions = state.sessions
    .filter((session) => session.asistenId === state.currentUserId)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  return (
    <Screen>
      <TopBar title="Rekap Kehadiran" />
      {sessions.length === 0 ? (
        <EmptyNote message="Belum ada sesi praktikum untuk direkap." />
      ) : (
        <View style={{ gap: 12 }}>
          {sessions.map((session) => {
            const hadir = state.attendances.filter((item) => item.sessionId === session.id).length;
            return (
              <ListRow
                key={session.id}
                title={session.praktikum}
                subtitle={`${formatTanggal(session.tanggal)} · Hadir ${hadir}/${session.pesertaIds.length}`}
                right={<StatusBadge status={session.status} />}
                onPress={() => router.push(`/rekap/${session.id}` as Href)}
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}
