import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';

type Confirmation = 'open' | 'close' | null;

export default function SessionControls({ sessionId }: { sessionId: string }) {
  const { state, dispatch } = useAppContext();
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const session = state.sessions.find((item) => item.id === sessionId);

  if (!session) {
    return null;
  }

  const attendanceCount = state.attendances.filter(
    (attendance) => attendance.sessionId === sessionId,
  ).length;

  function confirmAction() {
    if (confirmation === 'open') {
      dispatch({ type: 'OPEN_SESSION', sessionId });
    } else if (confirmation === 'close') {
      dispatch({ type: 'CLOSE_SESSION', sessionId });
    }
    setConfirmation(null);
  }

  if (session.status === 'ditutup') {
    return (
      <View style={[styles.card, styles.closedCard]}>
        <View style={styles.statusIcon}>
          <Ionicons name="lock-closed-outline" size={22} color={Palette.danger} />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.cardTitle}>Sesi telah berakhir</Text>
          <Text style={styles.cardDescription}>
            Sesi ini sudah ditutup dan tidak dapat dibuka kembali.
          </Text>
        </View>
      </View>
    );
  }

  if (session.status === 'dibuka') {
    return (
      <>
        <View style={[styles.card, styles.openCard]}>
          <View style={styles.openHeader}>
            <View style={styles.statusIcon}>
              <Ionicons name="key-outline" size={22} color={Palette.success} />
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.cardTitle}>Sesi sedang dibuka</Text>
              <Text style={styles.cardDescription}>
                Bagikan kode ini kepada praktikan untuk melakukan presensi.
              </Text>
            </View>
          </View>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>KODE SESI</Text>
            <Text style={styles.code}>{session.kodeSesi}</Text>
          </View>

          <View style={styles.attendanceSummary}>
            <Ionicons name="people-outline" size={18} color={Palette.textSecondary} />
            <Text style={styles.attendanceText}>
              {attendanceCount} praktikan sudah hadir
            </Text>
          </View>

          <Pressable
            onPress={() => setConfirmation('close')}
            style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}>
            <Ionicons name="stop-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Tutup Sesi</Text>
          </Pressable>
        </View>
        <ConfirmationModal
          visible={confirmation === 'close'}
          title="Tutup sesi praktikum?"
          message={`Sebanyak ${attendanceCount} praktikan sudah tercatat hadir. Setelah ditutup, sesi tidak dapat dibuka kembali.`}
          confirmLabel="Tutup Sesi"
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmAction}
          destructive
        />
      </>
    );
  }

  return (
    <>
      <View style={styles.card}>
        <View style={styles.statusIcon}>
          <Ionicons name="lock-open-outline" size={22} color={Palette.primary} />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.cardTitle}>Sesi belum dibuka</Text>
          <Text style={styles.cardDescription}>
            Buka sesi untuk membuat kode presensi dan menerima kehadiran praktikan.
          </Text>
        </View>
        <Pressable
          onPress={() => setConfirmation('open')}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Ionicons name="play-outline" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Buka Sesi</Text>
        </Pressable>
      </View>
      <ConfirmationModal
        visible={confirmation === 'open'}
        title="Buka sesi praktikum?"
        message="Kode sesi 6 digit akan dibuat dan praktikan dapat mulai melakukan presensi."
        confirmLabel="Buka Sesi"
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmAction}
      />
    </>
  );
}

function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  destructive = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={[styles.modalIcon, destructive && styles.modalIconDanger]}>
            <Ionicons
              name={destructive ? 'warning-outline' : 'lock-open-outline'}
              size={24}
              color={destructive ? Palette.danger : Palette.primary}
            />
          </View>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.confirmButton, destructive && styles.confirmDanger]}>
              <Text style={styles.buttonText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderColor: Palette.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  openCard: {
    borderColor: 'rgba(34, 197, 94, 0.55)',
  },
  closedCard: {
    borderColor: 'rgba(235, 4, 0, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  openHeader: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: Palette.primaryMuted,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  statusCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  cardTitle: {
    color: Palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardDescription: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  codeBox: {
    alignItems: 'center',
    backgroundColor: Palette.cardMuted,
    borderColor: Palette.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: Spacing.three,
  },
  codeLabel: {
    color: Palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.one,
  },
  code: {
    color: Palette.success,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 8,
  },
  attendanceSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  attendanceText: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: Palette.danger,
    borderRadius: 12,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    backgroundColor: Palette.card,
    borderColor: Palette.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.four,
    width: '100%',
  },
  modalIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Palette.primaryMuted,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    marginBottom: Spacing.three,
    width: 48,
  },
  modalIconDanger: {
    backgroundColor: 'rgba(235, 4, 0, 0.14)',
  },
  modalTitle: {
    color: Palette.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalMessage: {
    color: Palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: Palette.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: Palette.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  confirmDanger: {
    backgroundColor: Palette.danger,
  },
});
