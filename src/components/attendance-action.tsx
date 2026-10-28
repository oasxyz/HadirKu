import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
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
        <Text style={styles.bannerIcon}>🔒</Text>
        <Text style={styles.bannerText}>Presensi belum dibuka oleh asisten</Text>
      </View>
    );
  }

  // === KONDISI 2: Sesi sudah ditutup ===
  if (session.status === 'ditutup') {
    return (
      <View style={[styles.banner, styles.closedBorder]}>
        <Text style={styles.bannerIcon}>🚫</Text>
        <Text style={[styles.bannerText, { color: Palette.danger }]}>
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
        <Text style={{ fontSize: 32, color: Palette.success }}>✓</Text>
        <Text style={[styles.bannerText, { color: Palette.success, fontWeight: '600' }]}>
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

      <TextInput
        style={styles.input}
        value={kode}
        onChangeText={setKode}
        placeholder="Contoh: 123456"
        placeholderTextColor={Palette.textMuted}
        keyboardType="number-pad"
        maxLength={6}
      />

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
            <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
            <Text style={styles.modalTitle}>Presensi Berhasil Dicatat!</Text>
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
    borderColor: Palette.border,
    padding: Spacing.three,
    borderRadius: 14,
    alignItems: 'center',
    gap: Spacing.one,
  },
  closedBorder: { borderColor: Palette.danger },
  successBorder: { borderColor: Palette.success },
  bannerIcon: { fontSize: 24 },
  bannerText: { fontSize: 14, color: Palette.textSecondary, textAlign: 'center' },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: Spacing.two,
  },
  input: {
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: 12,
    fontSize: 18,
    color: Palette.text,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: Spacing.two,
  },
  errorText: {
    color: Palette.danger,
    fontSize: 13,
    marginBottom: Spacing.two,
  },
  submitButton: {
    backgroundColor: Palette.primary,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.primary,
    padding: Spacing.four,
    width: '80%',
    alignItems: 'center',
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
    borderRadius: 14,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});