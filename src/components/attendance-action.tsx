// SRS004 (PIC C — Varissa): presensi; simpan ke Firestore dengan ID dokumen sessionId_uid.
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { DigitBoxes, Illustration } from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';

export default function AttendanceAction({ sessionId }: { sessionId: string }) {
  const { state, dispatch } = useAppContext();
  const [kode, setKode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const session = state.sessions.find((s) => s.id === sessionId);
  const currentUserId = state.currentUserId;

  const existingAttendance = state.attendances.find(
    (a) => a.sessionId === sessionId && a.userId === currentUserId
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
  const handleSubmit = () => {
    setErrorMsg(null);
    const trimmed = kode.trim();

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

    dispatch({
      type: 'SUBMIT_ATTENDANCE',
      sessionId,
      userId: currentUserId,
      kodeSesi: trimmed,
    });

    setKode('');
    setShowSuccess(true);
  };

  return (
    <View>
      <Text style={styles.label}>Masukkan Kode Sesi</Text>

      {/* Kotak digit hanya tampilan; input aslinya transparan di atasnya supaya ketukan membuka keyboard. */}
      <View style={styles.codeField}>
        <DigitBoxes value={kode} error={errorMsg !== null} />
        <TextInput
          style={styles.hiddenInput}
          value={kode}
          onChangeText={(text) => setKode(text.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={6}
          caretHidden
          accessibilityLabel="Kode sesi 6 digit"
        />
      </View>

      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Kirim Presensi</Text>
      </TouchableOpacity>

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccess(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Illustration icon="checkmark" />
            <Text style={[styles.modalTitle, { marginTop: 12 }]}>Presensi Berhasil Dicatat!</Text>
            <Text style={styles.modalSubtitle}>Kehadiran Anda telah tercatat.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSuccess(false)}
            >
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
  codeField: {
    marginBottom: Spacing.two,
  },
  hiddenInput: {
    bottom: 0,
    left: 0,
    opacity: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  errorText: {
    color: Palette.danger,
    fontSize: 13,
    marginBottom: Spacing.two,
  },
  submitButton: {
    backgroundColor: Palette.primary,
    padding: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: Spacing.two,
  },
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
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});