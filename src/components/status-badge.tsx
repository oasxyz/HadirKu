import { StyleSheet, Text, View } from 'react-native';

import type { SessionStatus } from '@/types';

const LABELS: Record<SessionStatus, string> = {
  belum_dibuka: 'Belum Dibuka',
  dibuka: 'Dibuka',
  ditutup: 'Ditutup',
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '600',
  },
});
