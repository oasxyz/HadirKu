// src/components/attendance-action.tsx
// SRS004 (PIC C — Varissa): presensi via kode manual ATAU scan QR.
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { doc, setDoc } from '@react-native-firebase/firestore';
import React, { useState } from 'react';
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
import { db, COLLECTIONS, attendanceDocId } from '@/services/firebase';
import type { Session } from '@/types';

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

  // === KONDISI 1: Sesi belum dibuka ===
  if (session.status === 'belum_dibuka') {
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Presensi belum dibuka oleh asisten</Text>
      </View>
    );
  }

  // === KONDISI 2: Sesi sudah ditutup ===
  if (session.status === 'ditutup') {
    return (
      <View style={[styles.banner, styles.closedBorder]}>
        <Text style={[styles.bannerText, { color: Palette.ink }]}>
          Sesi praktikum telah ditutup
        </Text>
      </View>
    );
  }

  // === KONDISI 3: Sudah hadir ===
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

  // === KONDISI 4: Sesi dibuka, belum hadir ===
  // PENTING: pakai arrow function, BUKAN function declaration, biar TypeScript
  // bisa narrow `session` dari null check di atas ke dalam closure ini.
  const submitPresensi = async (inputKode: string) => {
    setErrorMsg(null);
    const trimmed = inputKode.trim();

    if (!currentUser) {
      setErrorMsg('Pengguna belum masuk');
      return;
    }
    if (trimmed.length === 0) {
      setErrorMsg('Masukkan kode sesi terlebih dahulu');
      return;
    }
    if (trimmed.length !== 6) {
      setErrorMsg('Kode sesi harus 6 digit');
      return;
    }
    if (session.kodeSesi !== trimmed) {
      setErrorMsg('Kode sesi tidak sesuai');
      return;
    }
    if (!session.pesertaIds.includes(currentUserId)) {
      setErrorMsg('Anda bukan peserta sesi ini');
      return;
    }

    try {
      setSubmitting(true);
      const attId = attendanceDocId(sessionId, currentUserId);
      const attRef = doc(db, COLLECTIONS.attendances, attId);

      await setDoc(attRef, {
        sessionId,
        userId: currentUserId,
        waktuPresensi: new Date().toISOString(),
      });

      setKode('');
      setShowScanner(false);
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Gagal mencatat presensi:', err);
      if (err?.code === 'firestore/permission-denied') {
        setErrorMsg('Presensi ditolak. Pastikan sesi masih dibuka dan Anda peserta sesi ini.');
      } else {
        setErrorMsg(err?.message ?? 'Gagal mencatat presensi');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openScanner = async () => {
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
    setKode(data);
    submitPresensi(data);
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
        onPress={() => submitPresensi(kode)}
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

      {/* === Modal Scanner QR === */}
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
          {submitting && (
            <View style={styles.scannerLoading}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', marginTop: 8 }}>Menyimpan presensi...</Text>
            </View>
          )}
          <Pressable
            onPress={() => {
              setScanned(false);
              setShowScanner(false);
            }}
            style={({ pressed }) => [styles.closeScannerBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
            <Text style={styles.closeScannerText}>Tutup</Text>
          </Pressable>
        </View>
      </Modal>

      {/* === Modal Sukses === */}
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: Spacing.two,
  },
  codeField: { marginBottom: Spacing.two },
  hiddenInput: {
    bottom: 0,
    left: 0,
    opacity: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
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
  scanButtonText: {
    color: Palette.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  scannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
  },
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