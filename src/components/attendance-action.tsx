import { Ionicons } from '@expo/vector-icons';
import {
  doc,
  getFirestore,
  runTransaction,
} from '@react-native-firebase/firestore';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ErrorBoundary } from '@/components/error-boundary';
import { useToast } from '@/components/toast';
import { DigitBoxes, Illustration } from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { COLLECTIONS, getCompositeId } from '@/services/firebase';
import type { AttendanceMethod, Session } from '@/types';
import { Logger, toUserErrorMessage } from '@/utils/logger';

/** Grace period sebelum scan QR diproses setelah kamera siap (ms). */
const SCANNER_GRACE_MS = 1500;

interface AttendanceActionProps {
  sessionId: string;
  session: Session;
  jarakMeter: number | null;
  radiusMeter: number | null;
  locked: boolean;
  onSuccess?: () => void;
}

export function AttendanceAction({
  sessionId,
  session,
  jarakMeter,
  radiusMeter,
  locked,
  onSuccess,
}: AttendanceActionProps) {
  const currentUser = useCurrentUser();

  const [kode, setKode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  // Lock sinkron (ref) untuk cegah double-submit dan auto-scan sebelum grace period.
  // Dipakai di dalam handler scan, bukan di state, supaya tidak memicu re-render
  // yang bisa bikin onBarcodeScanned sempat undefined.
  const isSubmittingRef = useRef<boolean>(false);
  const { tampilkanToast } = useToast();
  const scanLockRef = useRef<boolean>(false);
  const scanReadyAtRef = useRef<number>(Number.POSITIVE_INFINITY);
  const permissionRequestedRef = useRef<boolean>(false);

  const currentUserId = currentUser?.id ?? '';

  // Auto-minta izin kamera sekali saat komponen mount.
  useEffect(() => {
    if (permissionRequestedRef.current) return;
    if (!permission) return;
    permissionRequestedRef.current = true;
    if (permission.granted) return;
    if (permission.canAskAgain) {
      requestPermission().then((result) => {
        if (!result.granted) setPermissionDenied(true);
      });
    } else {
      Promise.resolve().then(() => setPermissionDenied(true));
    }
  }, [permission, requestPermission]);

  const submitPresensi = useCallback(
    async (inputKode: string, metode: AttendanceMethod) => {
      const setError = metode === 'qr' ? setScannerError : setErrorMsg;
      setError(null);

      const trimmed = inputKode.trim();
      if (!currentUser) {
        setError('Pengguna belum masuk');
        scanLockRef.current = false;
        return;
      }
      if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
        setError('Kode sesi harus 6 digit angka');
        scanLockRef.current = false;
        return;
      }
      if (!session.pesertaIds.includes(currentUserId)) {
        setError('Anda bukan peserta sesi ini');
        scanLockRef.current = false;
        return;
      }
      if (locked) {
        setError('Presensi terkunci. Pastikan Anda di dalam radius lab.');
        scanLockRef.current = false;
        return;
      }

      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setSubmitting(true);

      try {
        const firestore = getFirestore();
        const attRef = doc(firestore, COLLECTIONS.attendances, getCompositeId(sessionId, currentUserId));

        await runTransaction(firestore, async (tx) => {
          const existing = await tx.get(attRef);
          if (existing.exists()) {
            throw new Error('ALREADY_ATTENDED');
          }

          const payload: Record<string, unknown> = {
            sessionId,
            userId: currentUserId,
            waktuPresensi: new Date().toISOString(),
            kode: trimmed,
            metode,
          };
          if (jarakMeter !== null) payload.jarakMeter = jarakMeter;
          if (radiusMeter !== null) payload.radiusSaatPresensi = radiusMeter;

          tx.set(attRef, payload);
        });

        Logger.info('FIRESTORE', 'AttendanceWrite', 'Presensi tersimpan', {
          sessionId,
          metode,
          jarakMeter,
        });

        setKode('');
        setShowManual(false);
        tampilkanToast('Kehadiranmu sudah tersimpan dan terlihat oleh asisten.', 'sukses', 'Presensi tercatat');
        onSuccess?.();
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        const msg = (err as Error).message ?? '';

        const pesan =
          msg === 'ALREADY_ATTENDED'
            ? 'Anda sudah presensi di sesi ini'
            : code === 'firestore/permission-denied'
              ? 'Kode sesi tidak sesuai atau sesi sudah ditutup'
              : toUserErrorMessage(err);
        setError(pesan);
        tampilkanToast(pesan, 'error', 'Presensi gagal');
        Logger.error('FIRESTORE', 'AttendanceWrite', err, { sessionId });
        // Reset lock supaya user bisa coba lagi via tombol "Coba Lagi" / scan ulang.
        scanLockRef.current = false;
      } finally {
        isSubmittingRef.current = false;
        setSubmitting(false);
      }
    },
    [currentUser, currentUserId, sessionId, session.pesertaIds, jarakMeter, radiusMeter, locked, onSuccess, tampilkanToast],
  );

  const retryPermission = useCallback(async () => {
    setPermissionDenied(false);
    const result = await requestPermission();
    if (!result.granted) setPermissionDenied(true);
  }, [requestPermission]);

  const handleCameraReady = useCallback(() => {
    scanReadyAtRef.current = Date.now() + SCANNER_GRACE_MS;
    scanLockRef.current = false;
    setCameraReady(true);
  }, []);

  // Handler selalu terpasang (onBarcodeScanned tidak pernah undefined), supaya
  // expo-camera 57 benar-benar mengaktifkan barcode scanner native di mount pertama.
  // Semua gate (grace period, dedupe) dicek di dalam handler lewat ref.
  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanLockRef.current || isSubmittingRef.current) return;
      if (Date.now() < scanReadyAtRef.current) return;
      scanLockRef.current = true;
      submitPresensi(data, 'qr');
    },
    [submitPresensi],
  );

  const scanAgain = useCallback(() => {
    setScannerError(null);
    scanLockRef.current = false;
  }, []);

  const switchToManual = useCallback(() => {
    scanLockRef.current = true;
    setShowManual(true);
  }, []);

  const backToScanner = useCallback(() => {
    setShowManual(false);
    setKode('');
    setErrorMsg(null);
    // Kamera akan remount saat kembali ke tampilan scanner; reset gate scan.
    scanReadyAtRef.current = Number.POSITIVE_INFINITY;
    scanLockRef.current = false;
    setCameraReady(false);
  }, []);

  if (locked) {
    return (
      <View style={[styles.banner, styles.lockedBorder]}>
        <Ionicons name="lock-closed" size={24} color={Palette.textSecondary} />
        <Text style={[styles.bannerText, { color: Palette.textSecondary }]}>
          Presensi terkunci sampai syarat lokasi terpenuhi
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Komponen Presensi Bermasalah">
      <View style={styles.container}>
        {!showManual ? (
          <>
            {permission?.granted ? (
              <View style={styles.scannerFrame}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onCameraReady={handleCameraReady}
                  onBarcodeScanned={handleBarCodeScanned}
                />
                <View style={styles.scannerCornerTL} />
                <View style={styles.scannerCornerTR} />
                <View style={styles.scannerCornerBL} />
                <View style={styles.scannerCornerBR} />

                {!cameraReady && !submitting && (
                  <View style={styles.scannerLoading}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.scannerLoadingText}>Menyiapkan kamera...</Text>
                  </View>
                )}

                {submitting && (
                  <View style={styles.scannerLoading}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.scannerLoadingText}>Menyimpan presensi...</Text>
                  </View>
                )}

                {scannerError && (
                  <View style={styles.scannerErrorCard}>
                    <Text style={styles.scannerErrorText}>{scannerError}</Text>
                    <Pressable onPress={scanAgain} style={styles.scanAgainBtn}>
                      <Text style={styles.scanAgainText}>Coba Lagi</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : permissionDenied ? (
              <View style={styles.scannerPermFrame}>
                <Illustration icon="camera-outline" />
                <Text style={styles.scannerPermTitle}>Izin Kamera Diperlukan</Text>
                <Text style={styles.scannerPermSubtitle}>
                  Berikan izin kamera untuk scan QR, atau gunakan kode manual.
                </Text>
                <TouchableOpacity style={styles.permButton} onPress={retryPermission}>
                  <Text style={styles.permButtonText}>Coba Lagi</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.scannerPermFrame}>
                <ActivityIndicator size="large" color={Palette.primary} />
                <Text style={styles.scannerPermSubtitle}>Menyiapkan kamera...</Text>
              </View>
            )}

            <Pressable onPress={switchToManual} style={styles.fallbackButton}>
              <Text style={styles.fallbackButtonText}>
                Kamera bermasalah? Ketik kode 6 digit
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.manualContainer}>
            <Text style={styles.manualLabel}>Masukkan Kode Sesi</Text>

            <View style={styles.codeField}>
              <DigitBoxes value={kode} error={errorMsg !== null} />
              <TextInput
                style={styles.hiddenInput}
                value={kode}
                onChangeText={(text) => {
                  setKode(text.replace(/\D/g, ''));
                  if (errorMsg) setErrorMsg(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                caretHidden
                accessibilityLabel="Kode sesi 6 digit"
                editable={!submitting}
                autoFocus
              />
            </View>

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.6 }]}
              onPress={() => submitPresensi(kode, 'kode')}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Kirim Presensi</Text>
              )}
            </TouchableOpacity>

            <Pressable onPress={backToScanner} style={styles.fallbackButton}>
              <Text style={styles.fallbackButtonText}>Kembali ke Pindai QR</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  banner: {
    backgroundColor: '#F7F6FB',
    borderWidth: 1,
    borderColor: 'rgba(23, 21, 28, 0.3)',
    padding: Spacing.three,
    borderRadius: 24,
    alignItems: 'center',
    gap: Spacing.two,
  },
  lockedBorder: { borderColor: 'rgba(23, 21, 28, 0.3)' },
  bannerText: { fontSize: 14, textAlign: 'center' },
  scannerFrame: {
    height: 260,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  scannerCornerTL: {
    position: 'absolute', top: 12, left: 12, width: 28, height: 28,
    borderTopWidth: 3, borderLeftWidth: 3, borderColor: Palette.primary,
    borderTopLeftRadius: 8,
  },
  scannerCornerTR: {
    position: 'absolute', top: 12, right: 12, width: 28, height: 28,
    borderTopWidth: 3, borderRightWidth: 3, borderColor: Palette.primary,
    borderTopRightRadius: 8,
  },
  scannerCornerBL: {
    position: 'absolute', bottom: 12, left: 12, width: 28, height: 28,
    borderBottomWidth: 3, borderLeftWidth: 3, borderColor: Palette.primary,
    borderBottomLeftRadius: 8,
  },
  scannerCornerBR: {
    position: 'absolute', bottom: 12, right: 12, width: 28, height: 28,
    borderBottomWidth: 3, borderRightWidth: 3, borderColor: Palette.primary,
    borderBottomRightRadius: 8,
  },
  scannerLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scannerLoadingText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  scannerErrorCard: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 10,
  },
  scannerErrorText: {
    color: Palette.danger, fontSize: 14, fontWeight: '600', textAlign: 'center',
  },
  scanAgainBtn: {
    backgroundColor: Palette.ink,
    paddingVertical: 10, paddingHorizontal: 24, borderRadius: 999,
  },
  scanAgainText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  scannerPermFrame: {
    height: 260, borderRadius: 24, backgroundColor: '#F7F6FB',
    borderWidth: 1, borderColor: Palette.border,
    alignItems: 'center', justifyContent: 'center', gap: 10, padding: Spacing.three,
  },
  scannerPermTitle: {
    color: Palette.text, fontSize: 16, fontWeight: '700', textAlign: 'center',
  },
  scannerPermSubtitle: {
    color: Palette.textSecondary, fontSize: 13, textAlign: 'center',
  },
  permButton: {
    backgroundColor: Palette.ink,
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, marginTop: 6,
  },
  permButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  // Tombol sekunder: putih solid bergaris, teks hitam (seragam dengan tombol Kembali).
  fallbackButton: {
    alignItems: 'center', paddingVertical: 12, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Palette.border,
  },
  fallbackButtonText: {
    color: Palette.text, fontSize: 14, fontWeight: '600',
  },
  manualContainer: { gap: Spacing.two },
  manualLabel: {
    fontSize: 14, fontWeight: '600', color: Palette.text, textAlign: 'center',
  },
  codeField: { marginVertical: Spacing.two },
  hiddenInput: {
    bottom: 0, left: 0, opacity: 0, position: 'absolute', right: 0, top: 0,
  },
  errorText: {
    color: Palette.danger, fontSize: 13, textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Palette.ink,
    padding: 14, borderRadius: 999, alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF', fontSize: 16, fontWeight: '600',
  },
});