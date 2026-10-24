import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import type { SessionStatus } from '@/types';

const LABELS: Record<SessionStatus, string> = {
  belum_dibuka: 'Belum Dibuka',
  dibuka: 'Dibuka',
  ditutup: 'Ditutup',
};

const COLORS: Record<SessionStatus, { background: string; text: string }> = {
  belum_dibuka: { background: Palette.cardMuted, text: Palette.textSecondary },
  dibuka: { background: 'rgba(34, 197, 94, 0.16)', text: Palette.success },
  ditutup: { background: 'rgba(235, 4, 0, 0.14)', text: Palette.danger },
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  const color = COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: color.background }]}>
      <Text style={[styles.text, { color: color.text }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
