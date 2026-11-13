// SRS005 catatan (PIC C — Varissa): riwayat kehadiran milik pengguna yang login, dari Firestore.
import { ActivityIndicator, View } from 'react-native';

import { Chip, EmptyNote, GlassCard, ListRow, Screen, TopBar } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useSessions } from '@/hooks/use-sessions';
import { formatTanggal } from '@/utils/format';

export default function CatatanScreen() {
  const currentUser = useCurrentUser();
  const { sessions, attendances, loading } = useSessions();

  const currentUserId = currentUser?.id ?? '';
  const records = attendances
    .filter((item) => item.userId === currentUserId)
    .sort((a, b) => new Date(b.waktuPresensi).getTime() - new Date(a.waktuPresensi).getTime())
    .map((item) => ({ item, session: sessions.find((s) => s.id === item.sessionId) }));

  return (
    <Screen>
      <TopBar title="Catatan Kehadiran" />
      {loading ? (
        <GlassCard style={{ padding: 24, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </GlassCard>
      ) : records.length === 0 ? (
        <EmptyNote message="Kamu belum memiliki catatan kehadiran praktikum." />
      ) : (
        <View style={{ gap: 12 }}>
          {records.map(({ item, session }) => (
            <ListRow
              key={item.id}
              title={session?.praktikum ?? '-'}
              subtitle={session ? `${formatTanggal(session.tanggal)} · ${session.kelasLab}` : '-'}
              right={
                <Chip
                  label={new Date(item.waktuPresensi).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
