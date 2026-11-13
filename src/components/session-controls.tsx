// SRS003 (PIC B — Yustinus): buka/tutup sesi, pindahkan ke Firestore dengan listener realtime.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import QRCode from 'react-native-qrcode-svg';

import { DigitBoxes } from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useSessions } from '@/hooks/use-sessions';
import { getBatasTutupSesi, sesiSudahBerakhir } from '@/utils/sesi';

type Confirmation = 'open' | 'close' | null;

export default function SessionControls({ sessionId }: { sessionId: string }) {
  const { sessions, attendances, updateSession } = useSessions();
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [processing, setProcessing] = useState(false);

  const session = sessions.find((item) => item.id === sessionId);

  const tutupSesi = useCallback(async () => {
    await updateSession(sessionId, {
      status: 'ditutup',
      asistenCoords: null,
    });
  }, [sessionId, updateSession]);

  useEffect(() => {
    if (!session || session.status !== 'dibuka') return;

    if (sesiSudahBerakhir(session)) {
      tutupSesi().catch((error) => {
        console.error('Gagal menutup sesi otomatis:', error);
      });
      return;
    }

    const batasTutup = getBatasTutupSesi(session);
    const sisaWaktu = Math.max(0, batasTutup.getTime() - Date.now());
    const timer = setTimeout(() => {
      tutupSesi().catch((error) => {
        console.error('Gagal menutup sesi otomatis:', error);
      });
    }, sisaWaktu);

    return () => clearTimeout(timer);
  }, [session, tutupSesi]);

  if (!session) return null;

  const attendanceCount = attendances.filter(
    (attendance) => attendance.sessionId === sessionId,
  ).length;

  async function confirmAction() {
    if (processing) return;
    try {
      setProcessing(true);
      if (confirmation === 'open') {
        let asistenCoords: { lat: number; lng: number } | null = null;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            asistenCoords = {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            };
          }
        } catch (locErr) {
          console.warn('Gagal mendapatkan lokasi asisten:', locErr);
        }

        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        await updateSession(sessionId, {
          status: 'dibuka',
          kodeSesi: generatedCode,
          asistenCoords,
        });
      } else if (confirmation === 'close') {
        await tutupSesi();
      }
    } catch (error) {
      console.error('Gagal memperbarui status sesi:', error);
    } finally {
      setProcessing(false);
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

          {session.kodeSesi ? (
            <View style={styles.qrContainer}>
              <QRCode
                value={session.kodeSesi}
                size={160}
                color={Palette.ink}
                backgroundColor="#FFFFFF"
                quietZone={16}
              />
            </View>
          ) : null}

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>ATAU KETIK KODE</Text>
            <DigitBoxes value={session.kodeSesi ?? ''} color={Palette.primary} />
          </View>

          <View style={styles.attendanceSummary}>
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
          processing={processing}
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
        processing={processing}
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
  processing = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
  processing?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={onCancel} disabled={processing} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={processing}
              style={[styles.confirmButton, destructive && styles.confirmDanger]}>
              {processing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{confirmLabel}</Text>
              )}
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
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  codeBox: {
    alignItems: 'center',
    backgroundColor: Palette.primaryMuted,
    borderColor: Palette.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
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