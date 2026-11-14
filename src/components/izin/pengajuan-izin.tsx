import { sesiSudahBerakhir } from '@/utils/sesi';
import { addDoc, collection } from '@react-native-firebase/firestore';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Badge,
  EmptyNote,
  GlassCard,
  Screen,
  SectionTitle,
  TopBar,
} from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useLeaveRequests } from '@/hooks/use-leave-requests';
import { useSessions } from '@/hooks/use-sessions';
import { classifyLeaveReason } from '@/services/ai';
import { COLLECTIONS, db } from '@/services/firebase';
import type { LeaveRequest } from '@/types';
import { formatTanggal } from '@/utils/format';

export function PengajuanIzin() {
  const currentUser = useCurrentUser();
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const { leaveRequests, loading: leaveLoading, error: leaveError } = useLeaveRequests();

  const [showForm, setShowForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [alasan, setAlasan] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) router.replace('/login' as Href);
  }, [currentUser]);

  // Hanya izin milik praktikan yang login
  const myLeaves = useMemo(
    () =>
      currentUser
        ? leaveRequests.filter((lr) => lr.userId === currentUser.id)
        : [],
    [leaveRequests, currentUser],
  );

  if (!currentUser) return null;

  if (sessionsLoading || leaveLoading) {
    return (
      <Screen>
        <TopBar title="Pengajuan Izin" />
        <GlassCard style={styles.centerCard}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </GlassCard>
      </Screen>
    );
  }

  if (sessionsError || leaveError) {
    return (
      <Screen>
        <TopBar title="Pengajuan Izin" />
        <EmptyNote
          icon="cloud-offline-outline"
          message="Tidak ada koneksi internet. Terjadi kesalahan, coba lagi."
        />
      </Screen>
    );
  }

  const sesiBisaDiajukan = sessions.filter((s) => {
    if (s.status === 'ditutup') return false;
    if (sesiSudahBerakhir(s)) return false; 
    const sudahAdaMenunggu = myLeaves.some(
      (lr) => lr.sessionId === s.id && lr.status === 'menunggu',
    );
    return !sudahAdaMenunggu;
  });

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  const resetForm = () => {
    setSelectedSessionId(null);
    setAlasan('');
    setErrorMsg(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    const trimmed = alasan.trim();

    if (!selectedSessionId) {
      setErrorMsg('Pilih sesi terlebih dahulu');
      return;
    }
    if (trimmed.length < 10) {
      setErrorMsg('Alasan terlalu pendek, jelaskan minimal 10 karakter');
      return;
    }

    const sudahAda = myLeaves.some(
      (lr) => lr.sessionId === selectedSessionId && lr.status === 'menunggu',
    );
    if (sudahAda) {
      setErrorMsg('Anda sudah punya pengajuan menunggu untuk sesi ini');
      return;
    }

    setSubmitting(true);
    try {
      const kategoriAi = await classifyLeaveReason(trimmed);

      await addDoc(collection(db, COLLECTIONS.leaveRequests), {
        sessionId: selectedSessionId,
        userId: currentUser.id,
        alasan: trimmed,
        kategoriAi,
        status: 'menunggu',
        createdAt: new Date().toISOString(),
        diputuskanOleh: null,
        diputuskanAt: null,
      });

      resetForm();
    } catch (err) {
      console.warn('[pengajuan-izin] submit err', err);
      setErrorMsg('Gagal menyimpan pengajuan, periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const sortedHistory = [...myLeaves].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <Screen>
      <TopBar title="Pengajuan Izin" />

      <Pressable
        onPress={() => setShowForm(true)}
        disabled={sesiBisaDiajukan.length === 0}
        style={({ pressed }) => [
          styles.addButton,
          sesiBisaDiajukan.length === 0 && styles.addButtonDisabled,
          pressed && { opacity: 0.8 },
        ]}>
        <Text style={styles.addButtonText}>+ Ajukan Izin Baru</Text>
      </Pressable>

      {sesiBisaDiajukan.length === 0 && (
        <Text style={styles.hint}>Tidak ada sesi yang bisa diajukan izin saat ini.</Text>
      )}

      <SectionTitle title="Riwayat Pengajuan" />

      {sortedHistory.length === 0 ? (
        <EmptyNote message="Belum ada pengajuan izin." />
      ) : (
        <View style={{ gap: Spacing.two }}>
          {sortedHistory.map((item) => (
            <IzinCard
              key={item.id}
              item={item}
              sessionNama={sessions.find((s) => s.id === item.sessionId)?.praktikum ?? '-'}
              sessionTanggal={sessions.find((s) => s.id === item.sessionId)?.tanggal}
            />
          ))}
        </View>
      )}

      {/* === Modal Form Pengajuan === */}
      <Modal
        visible={showForm}
        animationType="fade"
        transparent
        onRequestClose={resetForm}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Ajukan Izin</Text>

              <Text style={styles.label}>Sesi</Text>
              <Pressable
                onPress={() => setShowPicker(true)}
                style={({ pressed }) => [styles.picker, pressed && { opacity: 0.8 }]}>
                <Text style={selectedSession ? styles.pickerValue : styles.pickerPlaceholder}>
                  {selectedSession
                    ? `${selectedSession.praktikum} · ${formatTanggal(selectedSession.tanggal)}`
                    : 'Pilih sesi'}
                </Text>
              </Pressable>

              <Text style={styles.label}>Alasan</Text>
              <TextInput
                style={styles.textarea}
                value={alasan}
                onChangeText={setAlasan}
                placeholder="Jelaskan alasan ketidakhadiran"
                placeholderTextColor={Palette.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                editable={!submitting}
              />

              {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

              <View style={styles.modalActions}>
                <Pressable
                  onPress={resetForm}
                  disabled={submitting}
                  style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.cancelBtnText}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    submitting && { opacity: 0.6 },
                    pressed && { opacity: 0.7 },
                  ]}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Kirim</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* === Modal Picker Sesi === */}
      <Modal
        visible={showPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pilih Sesi</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {sesiBisaDiajukan.length === 0 ? (
                <Text style={styles.hint}>Tidak ada sesi yang bisa diajukan izin.</Text>
              ) : (
                sesiBisaDiajukan.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.pickerItem, pressed && { opacity: 0.7 }]}
                    onPress={() => {
                      setSelectedSessionId(item.id);
                      setShowPicker(false);
                    }}>
                    <Text style={styles.pickerItemTitle}>{item.praktikum}</Text>
                    <Text style={styles.pickerItemSub}>
                      {item.kelasLab} · {formatTanggal(item.tanggal)} · {item.jamMulai}-{item.jamSelesai}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Pressable
              onPress={() => setShowPicker(false)}
              style={({ pressed }) => [styles.cancelBtn, { marginTop: Spacing.two }, pressed && { opacity: 0.7 }]}>
              <Text style={styles.cancelBtnText}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function IzinCard({
  item,
  sessionNama,
  sessionTanggal,
}: {
  item: LeaveRequest;
  sessionNama: string;
  sessionTanggal?: string;
}) {
  const badgeTone =
    item.status === 'diterima' ? 'primary' : item.status === 'ditolak' ? 'dark' : 'muted';
  const badgeLabel =
    item.status === 'diterima' ? 'Diterima' : item.status === 'ditolak' ? 'Ditolak' : 'Menunggu';

  const aiTone = item.kategoriAi ? 'outline' : 'muted';
  const aiLabel = item.kategoriAi
    ? item.kategoriAi.charAt(0).toUpperCase() + item.kategoriAi.slice(1)
    : 'Belum terklasifikasi';

  return (
    <GlassCard style={styles.reqCard}>
      <View style={styles.reqHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reqTitle}>{sessionNama}</Text>
          {sessionTanggal ? (
            <Text style={styles.reqMeta}>{formatTanggal(sessionTanggal)}</Text>
          ) : null}
        </View>
        <Badge label={badgeLabel} tone={badgeTone} />
      </View>

      <Text style={styles.reqAlasan}>{item.alasan}</Text>

      <View style={styles.aiRow}>
        <Text style={styles.aiLabel}>Kategori AI</Text>
        <Badge label={aiLabel} tone={aiTone} />
      </View>

      {item.status !== 'menunggu' && item.diputuskanOleh && item.diputuskanAt ? (
        <Text style={styles.decisionText}>
          Diputuskan {item.diputuskanOleh} ·{' '}
          {new Date(item.diputuskanAt).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  centerCard: { alignItems: 'center', padding: Spacing.four, gap: Spacing.two },
  addButton: {
    backgroundColor: Palette.primary,
    padding: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  hint: {
    fontSize: 12,
    color: Palette.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },

  reqCard: { gap: Spacing.two },
  reqHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  reqTitle: { fontSize: 15, fontWeight: '600', color: Palette.text },
  reqMeta: { fontSize: 12, color: Palette.textMuted, marginTop: 2 },
  reqAlasan: {
    fontSize: 14,
    color: Palette.text,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: Spacing.two,
    borderRadius: 12,
    lineHeight: 20,
  },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  aiLabel: { fontSize: 12, fontWeight: '600', color: Palette.textSecondary },
  decisionText: { fontSize: 12, color: Palette.textMuted, textAlign: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 20, 50, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.four,
    width: '100%',
    maxHeight: '85%',
    boxShadow: '0 8px 24px rgba(110, 70, 160, 0.10)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.text,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  picker: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  pickerValue: { color: Palette.text, fontSize: 14 },
  pickerPlaceholder: { color: Palette.textMuted, fontSize: 14 },
  textarea: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    color: Palette.text,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  errorText: { color: Palette.danger, fontSize: 13, marginTop: Spacing.two },
  modalActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
  },
  cancelBtnText: { color: Palette.text, fontSize: 14, fontWeight: '700' },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 999,
    paddingVertical: 12,
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  pickerItem: {
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  pickerItemTitle: { fontSize: 14, fontWeight: '600', color: Palette.text },
  pickerItemSub: { fontSize: 12, color: Palette.textMuted, marginTop: 2 },
});