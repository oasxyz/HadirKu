// SRS004 (PIC C — Varissa): presensi via kode manual ATAU scan QR.
// Kode sesi TIDAK dibaca client (dipindah ke koleksi sessionCodes yang praktikan tidak bisa akses).
// Validasi kode benar/salah sepenuhnya dilakukan oleh Firestore rules saat create.
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from '@react-native-firebase/firestore';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DigitBoxes, Illustration } from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useSessions } from '@/hooks/use-sessions';
import { COLLECTIONS, attendanceDocId, db } from '@/services/firebase';
import type { Coordinates, Session } from '@/types';
import { getAuthErrorMessage } from '@/utils/auth-error';
import { sesiSudahBerakhir } from '@/utils/sesi';

// Jarak lingkaran besar haversine dalam meter antara dua titik lat/lng.
function haversineMeter(a: Coordinates, b: Coordinates): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Ambil jarak praktikan ke asisten. Return null kalau izin ditolak, GPS gagal, atau coords tidak ada.
// TIDAK PERNAH throw — presensi harus tetap bisa jalan walau lokasi gagal.
async function hitungJarakAman(
  asistenCoords: Coordinates | null | undefined,
): Promise<number | null> {
  if (!asistenCoords) return null;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const praktikanCoords: Coordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    return Math.round(haversineMeter(asistenCoords, praktikanCoords));
  } catch {
    return null;
  }
}

export default function AttendanceAction({
  sessionId,
  session: propSession,
}: {
  sessionId: string;
  session?: Session;
}) {
  const currentUser = useCurrentUser();
  const { sessions, attendances } = useSessions();

  const [kode, setKode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  const session = propSession ?? sessions.find((s) => s.id === sessionId);
  const currentUserId = currentUser?.id ?? '';

  const existingAttendance = attendances.find(
    (a) => a.sessionId === sessionId && a.userId === currentUserId,
  );

  if (!session) return null;

  // Sesi yang sudah lewat jamSelesai + TOLERANSI (walau status masih 'dibuka') diperlakukan ditutup.
  const sesiBerakhir = sesiSudahBerakhir(session);

  if (session.status === 'belum_dibuka') {
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Presensi belum dibuka oleh asisten</Text>
      </View>
    );
  }

  if (session.status === 'ditutup' || sesiBerakhir) {
    return (
      <View style={[styles.banner, styles.closedBorder]}>
        <Text style={[styles.bannerText, { color: Palette.ink }]}>
          Sesi praktikum telah ditutup
        </Text>
      </View>
    );
  }

  if (existingAttendance) {
    const waktu = new Date(existingAttendance.waktuPresensi);
    const jam = waktu.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return (
      <View style={[styles.banner, styles.successBorder]}>
        <Illustration icon="checkmark" />
        <Text style={[styles.bannerText, { color: Palette.primary, fontWeight: '600' }]}>
          Sudah Hadir
        </Text>
        <Text style={{ fontSize: 13, color: Palette.textSecondary }}>
          Tercatat pukul {jam}
        </Text>
      </View>
    );
  }

  const submitPresensi = async (inputKode: string, fromScanner = false) => {
    const setError = fromScanner ? setScannerError : setErrorMsg;
    setError(null);
    const trimmed = inputKode.trim();

    if (!currentUser) {
      setError('Pengguna belum masuk');
      return;
    }
    if (trimmed.length === 0) {
      setError('Masukkan kode sesi terlebih dahulu');
      return;
    }
    if (trimmed.length !== 6) {
      setError('Kode sesi harus 6 digit');
      return;
    }
    // Tidak ada lagi cek session.kodeSesi di sini — kode sesi tidak dibaca client.
    // Kode dikirim apa adanya ke server, dan rules yang akan memvalidasi cocok/tidaknya.
    if (!session.pesertaIds.includes(currentUserId)) {
      setError('Anda bukan peserta sesi ini');
      return;
    }
    // Cek ulang kalau sesi baru saja berakhir antara render dan submit
    if (sesiSudahBerakhir(session)) {
      setError('Sesi praktikum telah ditutup');
      return;
    }

    try {
      setSubmitting(true);

      // Hitung jarak dulu (opsional, tidak menghalangi presensi kalau gagal)
      const jarakMeter = await hitungJarakAman(session.asistenCoords);

      const attId = attendanceDocId(sessionId, currentUserId);
      const attRef = doc(db, COLLECTIONS.attendances, attId);

      const payload: {
        sessionId: string;
        userId: string;
        waktuPresensi: string;
        kode: string;
        jarakMeter?: number;
      } = {
        sessionId,
        userId: currentUserId,
        waktuPresensi: new Date().toISOString(),
        kode: trimmed,
      };
      if (jarakMeter !== null) payload.jarakMeter = jarakMeter;

      await setDoc(attRef, payload);

      setKode('');
      setShowScanner(false);
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Gagal mencatat presensi:', err);
      // Rules yang memvalidasi kode benar/salah. Tidak ada info granular dari Firestore
      // soal alasan spesifik penolakan, jadi permission-denied di sini paling sering
      // berarti kode salah (skenario paling umum setelah validasi lain lolos di atas).
      if (err?.code === 'firestore/permission-denied') {
        setError('Kode sesi tidak sesuai');
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openScanner = async () => {
    setScannerError(null);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setErrorMsg('Izin kamera diperlukan untuk scan QR');
        return;
      }
    }
    setScanned(false);
    setErrorMsg(null);
    setShowScanner(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || submitting) return;
    setScanned(true);
    submitPresensi(data, true);
  };

  const scanAgain = () => {
    setScannerError(null);
    setScanned(false);
  };

  return (
    <View>
      <Text style={styles.label}>Masukkan Kode Sesi</Text>

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
        />
      </View>

      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      <TouchableOpacity
        style={[styles.submitButton, submitting && { opacity: 0.7 }]}
        onPress={() => submitPresensi(kode, false)}
        disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Kirim Presensi</Text>
        )}
      </TouchableOpacity>

      <Pressable
        onPress={openScanner}
        disabled={submitting}
        style={({ pressed }) => [
          styles.scanButton,
          pressed && { opacity: 0.7 },
          submitting && { opacity: 0.5 },
        ]}>
        <Ionicons name="qr-code-outline" size={18} color={Palette.primary} />
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </Pressable>

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerTitle}>Arahkan ke QR Code</Text>
            <Text style={styles.scannerSubtitle}>
              Scan QR yang ditampilkan asisten di layarnya
            </Text>
          </View>

          {scannerError && (
            <View style={styles.scannerErrorCard}>
              <Text style={styles.scannerErrorText}>{scannerError}</Text>
              <Pressable
                onPress={scanAgain}
                style={({ pressed }) => [styles.scanAgainBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.scanAgainText}>Coba Lagi</Text>
              </Pressable>
            </View>
          )}

          {submitting && (
            <View style={styles.scannerLoading}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', marginTop: 8 }}>Menyimpan presensi...</Text>
            </View>
          )}

          <Pressable
            onPress={() => {
              setScanned(false);
              setScannerError(null);
              setShowScanner(false);
            }}
            style={({ pressed }) => [styles.closeScannerBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
            <Text style={styles.closeScannerText}>Tutup</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccess(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Illustration icon="checkmark" />
            <Text style={[styles.modalTitle, { marginTop: 12 }]}>Presensi Berhasil Dicatat!</Text>
            <Text style={styles.modalSubtitle}>Kehadiran Anda telah tercatat.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSuccess(false)}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    padding: Spacing.three,
    borderRadius: 24,
    alignItems: 'center',
    gap: Spacing.one,
    boxShadow: '0 8px 24px rgba(110, 70, 160, 0.10)',
  },
  closedBorder: { borderColor: 'rgba(23, 21, 28, 0.3)' },
  successBorder: { borderColor: 'rgba(226, 27, 208, 0.45)' },
  bannerText: { fontSize: 14, color: Palette.textSecondary, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: Palette.text, marginBottom: Spacing.two },
  codeField: { marginBottom: Spacing.two },
  hiddenInput: { bottom: 0, left: 0, opacity: 0, position: 'absolute', right: 0, top: 0 },
  errorText: { color: Palette.danger, fontSize: 13, marginBottom: Spacing.two },
  submitButton: {
    backgroundColor: Palette.primary,
    padding: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.two,
    borderWidth: 1,
    borderColor: Palette.primary,
    borderRadius: 999,
    paddingVertical: 12,
  },
  scanButtonText: { color: Palette.primary, fontSize: 14, fontWeight: '600' },
  scannerContainer: { flex: 1, backgroundColor: '#000000' },
  scannerOverlay: { position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center' },
  scannerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  scannerSubtitle: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, marginTop: 4 },
  scannerErrorCard: {
    position: 'absolute',
    bottom: 140,
    left: 24,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  scannerErrorText: {
    color: Palette.danger,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  scanAgainBtn: {
    backgroundColor: Palette.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  scanAgainText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  scannerLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeScannerBtn: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  closeScannerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30,20,50,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Palette.primary,
    padding: Spacing.four,
    width: '80%',
    alignItems: 'center',
    boxShadow: '0 8px 24px rgba(110, 70, 160, 0.10)',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Palette.text, marginBottom: Spacing.two },
  modalSubtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  modalButton: {
    backgroundColor: Palette.primary,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  modalButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});