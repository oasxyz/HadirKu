// SRS003 (PIC B — Yustinus): buka/tutup sesi, pindahkan ke Firestore dengan listener realtime.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { DigitBoxes } from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useSessions } from '@/hooks/use-sessions';
// QR Component is commented out pending PM APK build with react-native-svg and QR package
// import QRCode from 'react-native-qrcode-svg';

type Confirmation = 'open' | 'close' | null;

export default function SessionControls({ sessionId }: { sessionId: string }) {
  const { sessions, attendances, updateSession } = useSessions();
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [copied, setCopied] = useState(false);
  
  const session = sessions.find((item) => item.id === sessionId);

  if (!session) {
    return null;
  }

  async function handleShareOrCopy() {
    if (!session?.kodeSesi) return;
    try {
      await Share.share({
        message: session.kodeSesi,
        title: `Kode Sesi Praktikum: ${session.kodeSesi}`,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (_) {}
  }

  const attendanceCount = attendances.filter(
    (attendance) => attendance.sessionId === sessionId,
  ).length;

  async function confirmAction() {
    try {
      if (confirmation === 'open') {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        await updateSession(sessionId, {
          status: 'dibuka',
          kodeSesi: generatedCode,
        });
      } else if (confirmation === 'close') {
        await updateSession(sessionId, {
          status: 'ditutup',
        });
      }
    } catch (error) {
      console.error('Gagal memperbarui status sesi:', error);
    } finally {
      setConfirmation(null);
    }
  }

  if (session.status === 'ditutup') {
    return (
      <View style={[styles.card, styles.closedCard]}>
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
          <View style={styles.statusCopy}>
            <Text style={styles.cardTitle}>Sesi sedang dibuka</Text>
            <Text style={styles.cardDescription}>
              Minta praktikan memindai QR ini. Kalau kameranya bermasalah, bacakan kode di bawahnya.
            </Text>
          </View>

          <View style={styles.qrContainer}>
             {/* <QRCode value={session.kodeSesi ?? ''} size={150} color={Palette.ink} /> */}
             <Text style={styles.qrPlaceholderText}>[QR CODE BELUM TERPASANG DI APK]</Text>
          </View>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>ATAU KETIK KODE</Text>
            <DigitBoxes value={session.kodeSesi ?? ''} color={Palette.primary} />

            {/* Kode teks yang bisa ditekan lama (long-press) untuk copy langsung */}
            <Text selectable={true} style={styles.rawCodeText}>
              {session.kodeSesi}
            </Text>

            {/* Tombol Bagikan / Salin ke Clipboard */}
            <Pressable
              onPress={handleShareOrCopy}
              style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}>
              <Ionicons
                name={copied ? 'checkmark-circle-outline' : 'copy-outline'}
                size={16}
                color={Palette.primary}
              />
              <Text style={styles.copyBtnText}>
                {copied ? 'Kode Siap Dibagikan' : 'Salin / Bagikan Kode'}
              </Text>
            </Pressable>
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
        <View style={styles.statusCopy}>
          <Text style={styles.cardTitle}>Sesi belum dibuka</Text>
          <Text style={styles.cardDescription}>
            Buka sesi untuk membuat kode presensi dan menerima kehadiran praktikan.
          </Text>
        </View>
        <Pressable
          onPress={() => setConfirmation('open')}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
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
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
    boxShadow: '0 8px 24px rgba(110, 70, 160, 0.10)',
  },
  openCard: {
    borderColor: Palette.primary,
  },
  closedCard: {
    borderColor: 'rgba(23, 21, 28, 0.3)',
  },
  statusCopy: {
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
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: Spacing.three,
    justifyContent: 'center',
    alignSelf: 'center',
    width: 200,
    height: 200,
  },
  qrPlaceholderText: {
    color: Palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  codeBox: {
    alignItems: 'center',
    backgroundColor: Palette.cardMuted,
    borderColor: Palette.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
  },
  rawCodeText: {
    color: Palette.textMuted,
    fontSize: 12,
    letterSpacing: 2,
    marginTop: Spacing.one,
  },
  copyBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(226, 27, 208, 0.08)',
    borderColor: 'rgba(226, 27, 208, 0.25)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.two,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  copyBtnText: {
    color: Palette.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  codeLabel: {
    color: Palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.two,
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
    borderRadius: 999,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
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
    backgroundColor: 'rgba(30, 20, 50, 0.4)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    width: '100%',
    boxShadow: '0 8px 24px rgba(110, 70, 160, 0.10)',
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
    borderRadius: 999,
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
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  confirmDanger: {
    backgroundColor: Palette.ink,
  },
});