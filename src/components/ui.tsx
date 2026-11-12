import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gradientStyle } from '@/components/screen-background';
import { Palette } from '@/constants/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

/** Ruang di bawah konten agar tidak tertutup tab bar melayang. */
export const TAB_BAR_SPACE = 104;

/** Warna lembut untuk ikon bulat pada daftar, dipakai bergiliran. */
export const tints = [
  { bg: '#F3DDCD', fg: '#C4855A' },
  { bg: '#D2EAE2', fg: '#4F9C88' },
  { bg: '#EBD3DF', fg: '#B3688A' },
  { bg: '#D6E4F2', fg: '#5F8AB8' },
] as const;

export const shadow = '0 10px 30px rgba(90, 70, 130, 0.10)';

export function initials(nama: string): string {
  return nama
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((kata) => kata[0]?.toUpperCase() ?? '')
    .join('');
}

export function Screen({
  children,
  withTabBar = true,
}: {
  children: ReactNode;
  withTabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, gradientStyle]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 18,
            paddingBottom: insets.bottom + (withTabBar ? TAB_BAR_SPACE : 32),
          },
        ]}>
        {children}
      </ScrollView>
    </View>
  );
}

export function RoundButton({
  icon,
  onPress,
  size = 48,
}: {
  icon: IconName;
  onPress?: () => void;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.roundButton,
        { width: size, height: size },
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={size * 0.42} color={Palette.text} />
    </Pressable>
  );
}

export function TopBar({
  title,
  back = false,
  fallback = '/jadwal',
  right,
}: {
  title: string;
  back?: boolean;
  fallback?: string;
  right?: ReactNode;
}) {
  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as Href);
    }
  }

  return (
    <View style={styles.topBar}>
      {back ? <RoundButton icon="chevron-back" onPress={goBack} /> : <View style={styles.topBarSide} />}
      <Text style={styles.topBarTitle} numberOfLines={1}>
        {title}
      </Text>
      {right ?? <View style={styles.topBarSide} />}
    </View>
  );
}

export function GlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      {icon ? (
        <Ionicons name={icon} size={13} color={selected ? '#FFFFFF' : Palette.textSecondary} />
      ) : null}
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function IconCircle({
  icon,
  tint = 0,
  size = 50,
}: {
  icon: IconName;
  tint?: number;
  size?: number;
}) {
  const color = tints[tint % tints.length];
  return (
    <View
      style={[
        styles.iconCircle,
        { width: size, height: size, backgroundColor: color.bg },
      ]}>
      <Ionicons name={icon} size={size * 0.44} color={color.fg} />
    </View>
  );
}

export function Avatar({ nama, size = 48 }: { nama: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials(nama)}</Text>
    </View>
  );
}

export function Badge({ label, tone }: { label: string; tone: 'green' | 'red' | 'grey' | 'pink' }) {
  const background =
    tone === 'green' ? '#1FAF6B' : tone === 'red' ? '#F0303C' : tone === 'pink' ? Palette.primary : '#B9B5C6';
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function ListRow({
  icon,
  tint,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon: IconName;
  tint?: number;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}>
      <IconCircle icon={icon} tint={tint} />
      <View style={styles.listRowText}>
        <Text style={styles.listRowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.listRowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  icon = 'arrow-forward',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IconName | null;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && styles.pressed,
      ]}>
      <Text style={styles.primaryButtonLabel}>{label}</Text>
      {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
    </Pressable>
  );
}

export function EmptyNote({ message }: { message: string }) {
  return (
    <GlassCard style={styles.emptyNote}>
      <Ionicons name="file-tray-outline" size={26} color={Palette.textMuted} />
      <Text style={styles.emptyNoteText}>{message}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: 18,
    maxWidth: 520,
    paddingHorizontal: 20,
    width: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
  roundButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: shadow,
    justifyContent: 'center',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  topBarSide: {
    height: 48,
    width: 48,
  },
  topBarTitle: {
    color: Palette.text,
    flex: 1,
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.66)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    borderWidth: 1,
    boxShadow: shadow,
    padding: 18,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: Palette.text,
    fontSize: 17,
    fontWeight: '600',
  },
  chip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: '#17151C',
  },
  chipLabel: {
    color: Palette.text,
    fontSize: 13,
    fontWeight: '500',
  },
  chipLabelSelected: {
    color: '#FFFFFF',
  },
  iconCircle: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#F6D9EF',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2,
    boxShadow: shadow,
    justifyContent: 'center',
  },
  avatarText: {
    color: '#A3148F',
    fontWeight: '700',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  listRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: shadow,
    flexDirection: 'row',
    gap: 12,
    padding: 8,
    paddingRight: 16,
  },
  listRowText: {
    flex: 1,
    gap: 2,
  },
  listRowTitle: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  listRowSubtitle: {
    color: Palette.textMuted,
    fontSize: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 999,
    boxShadow: '0 12px 24px rgba(226, 27, 208, 0.28)',
    flexDirection: 'row',
    gap: 8,
    height: 56,
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyNote: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  emptyNoteText: {
    color: Palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
