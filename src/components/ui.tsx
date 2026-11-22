import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Modal, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker'; // Tambahkan ini di package.json jika belum ada

import { gradientStyle } from '@/components/screen-background';
import { Palette } from '@/constants/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export const TAB_BAR_SPACE = 104;

export const tints = [
  { bg: Palette.lavender, fg: Palette.text },
  { bg: Palette.lilac, fg: Palette.text },
] as const;

export const shadow = '0 10px 30px rgba(90, 70, 130, 0.10)';

export function initials(nama: string): string {
  return nama.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((kata) => kata[0]?.toUpperCase() ?? '').join('');
}

export function Screen({
  children,
  header,
  withTabBar = true,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  withTabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, gradientStyle]}>
      {header ? (
        <View style={[styles.fixedHeader, { paddingTop: insets.top + 14 }]}>
          {header}
        </View>
      ) : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: header ? 14 : insets.top + 18,
            paddingBottom: insets.bottom + (withTabBar ? TAB_BAR_SPACE : 32),
          },
        ]}>
        {children}
      </ScrollView>
    </View>
  );
}

export function RoundButton({ icon, onPress, size = 48 }: { icon: IconName; onPress?: () => void; size?: number }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.roundButton, { width: size, height: size }, pressed && styles.pressed]}>
      <Ionicons name={icon} size={size * 0.42} color={Palette.text} />
    </Pressable>
  );
}

export function TopBar({ title, back = false, fallback = '/jadwal', right }: { title: string; back?: boolean; fallback?: string; right?: React.ReactNode }) {
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(fallback as Href);
  }
  return (
    <View style={styles.topBar}>
      {back ? <RoundButton icon="chevron-back" onPress={goBack} /> : <View style={styles.topBarSide} />}
      <Text style={styles.topBarTitle} numberOfLines={1}>{title}</Text>
      {right ?? <View style={styles.topBarSide} />}
    </View>
  );
}

export function GlassCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

export function Chip({ label, selected = false, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      {icon && <Ionicons name={icon} size={13} color={selected ? '#FFFFFF' : Palette.textSecondary} />}
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function IconCircle({ icon, tint = 0, size = 50 }: { icon: IconName; tint?: number; size?: number }) {
  const color = tints[tint % tints.length];
  return (
    <View style={[styles.iconCircle, { width: size, height: size, backgroundColor: color.bg }]}>
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

// Sprint 3: BadgeTone disesuaikan dengan kebutuhan semantik baru
export type BadgeTone = 'primary' | 'dark' | 'muted' | 'outline' | 'info' | 'warning' | 'danger';

const BADGE_BACKGROUND: Record<BadgeTone, string> = {
  primary: Palette.primary,
  dark: Palette.ink,
  info: Palette.infoMuted,
  warning: Palette.warningMuted,
  danger: Palette.ink,
  muted: '#B9B5C6',
  outline: '#FFFFFF',
};

const BADGE_TEXT_COLOR: Record<BadgeTone, string> = {
  primary: '#FFFFFF',
  dark: '#FFFFFF',
  info: Palette.ink,
  warning: Palette.warning,
  // Aturan warna seragam: status "bahaya" (Alpha, Ditolak, Di Luar Radius) tampil hitam.
  danger: '#FFFFFF',
  muted: '#FFFFFF',
  outline: Palette.ink,
};

export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const outline = tone === 'outline';
  return (
    <View style={[styles.badge, { backgroundColor: BADGE_BACKGROUND[tone] }, outline && styles.badgeOutline]}>
      <Text style={[styles.badgeText, { color: BADGE_TEXT_COLOR[tone] }]}>{label}</Text>
    </View>
  );
}

export function ListRow({ icon, tint, title, subtitle, right, onPress }: { icon?: IconName; tint?: number; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.listRow, !icon && styles.listRowPlain, pressed && styles.pressed]}>
      {icon && <IconCircle icon={icon} tint={tint} />}
      <View style={styles.listRowText}>
        <Text style={styles.listRowTitle} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.listRowSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled = false, icon = 'arrow-forward', style }: { label: string; onPress: () => void; disabled?: boolean; icon?: IconName | null; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primaryButton, disabled && styles.primaryButtonDisabled, pressed && styles.pressed, style]}>
      <Text style={styles.primaryButtonLabel}>{label}</Text>
      {icon && <Ionicons name={icon} size={18} color="#FFFFFF" />}
    </Pressable>
  );
}

export function Illustration({ icon }: { icon: IconName }) {
  return (
    <View style={styles.illustration}>
      <Ionicons name={icon} size={42} color={Palette.primary} />
    </View>
  );
}

export function DigitBoxes({ value, length = 6, color = Palette.text, error = false }: { value: string; length?: number; color?: string; error?: boolean }) {
  return (
    <View style={styles.digits}>
      {Array.from({ length }, (_, index) => (
        <View key={index} style={[styles.digitBox, error && styles.digitBoxError]}>
          <Text style={[styles.digitText, { color }]}>{value[index] ?? ''}</Text>
        </View>
      ))}
    </View>
  );
}

export function EmptyNote({ message, icon = 'file-tray-outline' }: { message: string; icon?: IconName }) {
  return (
    <GlassCard style={styles.emptyNote}>
      <Illustration icon={icon} />
      <Text style={styles.emptyNoteText}>{message}</Text>
    </GlassCard>
  );
}

/* =========================================================
   SPRINT 3: KOMPONEN BARU (SelectField, DateTimeField, StatusCard)
========================================================= */

type SelectOption = { label: string; value: string; subtitle?: string };

export function SelectField({ label, value, options, onSelect, error }: { label: string; value?: string; options: SelectOption[]; onSelect: (val: string) => void; error?: boolean }) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label || 'Pilih...';

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={[styles.pillInput, error && styles.inputError]} onPress={() => setModalVisible(true)}>
        <Text style={[styles.pillInputText, !value && { color: Palette.textMuted }]}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={20} color={Palette.textSecondary} />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih {label}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map((opt) => (
                <Pressable key={opt.value} style={styles.modalOption} onPress={() => { onSelect(opt.value); setModalVisible(false); }}>
                  <View>
                    <Text style={[styles.modalOptionText, value === opt.value && { color: Palette.ink, fontWeight: '700' }]}>{opt.label}</Text>
                    {opt.subtitle && <Text style={styles.modalOptionSubtitle}>{opt.subtitle}</Text>}
                  </View>
                  {value === opt.value && <Ionicons name="checkmark-circle" size={24} color={Palette.ink} />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setModalVisible(false)} style={({ pressed }) => [styles.tombolTutup, pressed && styles.pressed]}>
              <Text style={styles.tombolTutupTeks}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function DateTimeField({ label, value, mode = 'date', onChange, error }: { label: string; value?: Date; mode?: 'date' | 'time'; onChange: (date: Date) => void; error?: boolean }) {
  const [isPickerVisible, setPickerVisibility] = useState(false);
  
  const displayValue = value ? (mode === 'date' ? value.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })) : 'Pilih...';

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={[styles.pillInput, error && styles.inputError]} onPress={() => setPickerVisibility(true)}>
        <Text style={[styles.pillInputText, !value && { color: Palette.textMuted }]}>{displayValue}</Text>
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={20} color={Palette.textSecondary} />
      </Pressable>
      
      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode={mode}
        date={value || new Date()}
        onConfirm={(date: Date) => { setPickerVisibility(false); onChange(date); }}
        onCancel={() => setPickerVisibility(false)}
      />
    </View>
  );
}

// Aturan warna seragam: kartu kondisi perangkat putih dengan judul dan tombol hitam, tanpa ikon
// hiasan. `tone` dan `icon` tetap diterima supaya pemanggil lama tidak perlu diubah.
// `ilustrasi` opsional: bila diisi, gambar tampil di atas dan teks dirata tengah.
export function DeviceStatusCard({ title, message, actionLabel, onAction, ilustrasi }: { title: string; message: string; tone?: 'warning' | 'danger'; actionLabel?: string; onAction?: () => void; icon?: IconName; ilustrasi?: React.ReactNode }) {
  return (
    <View style={[styles.statusCard, ilustrasi ? styles.statusCardIlustrasi : null]}>
      {ilustrasi}
      <Text style={[styles.statusCardTitle, ilustrasi ? styles.teksTengah : null]}>{title}</Text>
      <Text style={[styles.statusCardMessage, ilustrasi ? styles.teksTengah : null]}>{message}</Text>
      {onAction && actionLabel && (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.statusCardButton, pressed && styles.pressed]}>
          <Text style={styles.statusCardButtonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixedHeader: {
    alignSelf: 'center',
    maxWidth: 520,
    paddingHorizontal: 20,
    width: '100%',
    zIndex: 100,
    paddingBottom: 8,
  },
  content: { alignSelf: 'center', gap: 18, maxWidth: 520, paddingHorizontal: 20, width: '100%' },
  pressed: { opacity: 0.7 },
  roundButton: { alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.78)', borderColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 999, borderWidth: 1, boxShadow: shadow, justifyContent: 'center' },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  topBarSide: { height: 48, width: 48 },
  topBarTitle: { color: Palette.text, flex: 1, fontSize: 19, fontWeight: '600', textAlign: 'center' },
  glassCard: { backgroundColor: 'rgba(255, 255, 255, 0.66)', borderColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 28, borderWidth: 1, boxShadow: shadow, padding: 18 },
  sectionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: Palette.text, fontSize: 17, fontWeight: '600' },
  // Garis tepi tipis supaya chip tetap terlihat di atas kartu putih maupun latar gradien.
  chip: { alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.85)', borderColor: Palette.border, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  chipSelected: { backgroundColor: Palette.ink },
  chipLabel: { color: Palette.text, fontSize: 13, fontWeight: '500' },
  chipLabelSelected: { color: '#FFFFFF' },
  iconCircle: { alignItems: 'center', borderColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 999, borderWidth: 2, justifyContent: 'center' },
  avatar: { alignItems: 'center', backgroundColor: '#F6D9EF', borderColor: '#FFFFFF', borderRadius: 999, borderWidth: 2, boxShadow: shadow, justifyContent: 'center' },
  avatarText: { color: '#A3148F', fontWeight: '700' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeOutline: { borderColor: 'rgba(110, 90, 150, 0.3)', borderWidth: 1, paddingVertical: 4 },
  listRowPlain: { paddingLeft: 24, paddingVertical: 13 },
  illustration: { alignItems: 'center', backgroundColor: Palette.lavender, borderRadius: 999, height: 76, justifyContent: 'center', width: 76 },
  digits: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  digitBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: Palette.border, borderRadius: 14, borderWidth: 1, flexShrink: 1, height: 54, justifyContent: 'center', width: 44 },
  digitBoxError: { borderColor: Palette.danger },
  digitText: { fontSize: 24, fontWeight: '800' },
  listRow: { alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 999, borderWidth: 1, boxShadow: shadow, flexDirection: 'row', gap: 12, padding: 8, paddingRight: 16 },
  listRowText: { flex: 1, gap: 2 },
  listRowTitle: { color: Palette.text, fontSize: 15, fontWeight: '600' },
  listRowSubtitle: { color: Palette.textMuted, fontSize: 12 },
  primaryButton: { alignItems: 'center', backgroundColor: Palette.primary, borderRadius: 999, boxShadow: '0 12px 24px rgba(226, 27, 208, 0.28)', flexDirection: 'row', gap: 8, height: 56, justifyContent: 'center' },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  emptyNote: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyNoteText: { color: Palette.textMuted, fontSize: 13, textAlign: 'center' },
  
  // Sprint 3 Styles
  inputContainer: { gap: 6, marginBottom: 12 },
  inputLabel: { color: Palette.textSecondary, fontSize: 12, marginLeft: 16 },
  pillInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderColor: Palette.border, borderWidth: 1, borderRadius: 999, height: 52, paddingHorizontal: 20 },
  pillInputText: { color: Palette.text, fontSize: 15, fontWeight: '500' },
  inputError: { borderColor: Palette.danger },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Palette.ink, marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Palette.border },
  modalOptionText: { fontSize: 16, color: Palette.text },
  modalOptionSubtitle: { fontSize: 12, color: Palette.textMuted, marginTop: 4 },
  statusCard: { backgroundColor: '#F7F6FB', borderColor: Palette.border, borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 },
  statusCardIlustrasi: { alignItems: 'center', paddingVertical: 22 },
  teksTengah: { textAlign: 'center' },
  tombolTutup: { alignItems: 'center', backgroundColor: Palette.ink, borderRadius: 999, height: 52, justifyContent: 'center', marginTop: 16 },
  tombolTutupTeks: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  statusCardTitle: { color: Palette.text, fontSize: 15, fontWeight: '700' },
  statusCardMessage: { fontSize: 13, color: Palette.textSecondary, lineHeight: 18 },
  statusCardButton: { alignSelf: 'flex-start', backgroundColor: Palette.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
  statusCardButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600' }
});