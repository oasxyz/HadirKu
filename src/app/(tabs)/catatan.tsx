// SRS005 catatan (PIC C — Varissa): riwayat kehadiran milik pengguna yang login, dari Firestore.
import { View } from 'react-native';

import { Chip, EmptyNote, ListRow, Screen, TopBar } from '@/components/ui';
import { useAppContext } from '@/context/app-context';
import { formatTanggal } from '@/utils/format';

export default function CatatanScreen() {
  const { state } = useAppContext();
  const records = state.attendances
    .filter((item) => item.userId === state.currentUserId)
    .map((item) => ({ item, session: state.sessions.find((s) => s.id === item.sessionId) }));

  return (
    <Screen>
      <TopBar title="Catatan Kehadiran" />
      {records.length === 0 ? (
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
