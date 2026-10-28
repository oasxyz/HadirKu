import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import { formatRentangJam, formatTanggal } from '@/utils/format';

export default function SesiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAppContext();

  const session = state.sessions.find((item) => item.id === id);
  const currentUser = state.users.find((user) => user.id === state.currentUserId);
  const asisten = session ? state.users.find((user) => user.id === session.asistenId) : undefined;

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <EmptyState message="Sesi tidak ditemukan." />
        </View>
      </View>
    );
  }

  const isAsisten = currentUser?.role === 'asisten';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <StatusBadge status={session.status} />
        </View>

        <Text style={styles.title}>{session.praktikum}</Text>

        <View style={styles.metaCard}>
          <MetaRow icon="location-outline" label={session.kelasLab} />
          <MetaRow icon="calendar-outline" label={formatTanggal(session.tanggal)} />
          <MetaRow
            icon="time-outline"
            label={formatRentangJam(session.jamMulai, session.jamSelesai)}
          />
          <MetaRow icon="person-outline" label={`Asisten: ${asisten?.nama ?? '-'}`} />
        </View>

        <View style={styles.actionWrapper}>
          {isAsisten ? (
            <EmptyState message="Kontrol buka/tutup sesi, kode presensi, dan log kehadiran dikerjakan di fitur F3 (Yustinus)." />
          ) : (
            <EmptyState message="Form presensi dikerjakan di fitur F4 (Varissa)." />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function MetaRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metaRowItem}>
      <Ionicons name={icon} size={16} color={Palette.textSecondary} />
      <Text style={styles.metaRowText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: Spacing.two,
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: '800',
    fontStyle: 'italic',
    marginBottom: Spacing.three,
  },
  metaCard: {
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  metaRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  metaRowText: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  actionWrapper: {
    flex: 1,
    minHeight: 200,
  },
});
