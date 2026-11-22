import { Ionicons } from '@expo/vector-icons';
import { doc, getFirestore, setDoc } from '@react-native-firebase/firestore';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ExpandableCalendar, toDateString } from '@/components/expandable-calendar';
import {
  EmptyNote,
  GlassCard,
  Screen,
  SectionTitle,
  TopBar,
} from '@/components/ui';
import { useAppConfig } from '@/constants/config';
import { Palette, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useLeaveRequests } from '@/hooks/use-leave-requests';
import { useSessions } from '@/hooks/use-sessions';
import { classifyLeaveReason } from '@/services/ai';
import { COLLECTIONS, getCompositeId } from '@/services/firebase';
import type { LeaveRequest } from '@/types';
import { normalizeLeaveCategory } from '@/types';
import { formatTanggal } from '@/utils/format';
import { Logger, toUserErrorMessage } from '@/utils/logger';
import { sesiSudahBerakhir } from '@/utils/sesi';

function LocalBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'primary' | 'warning' | 'info' | 'danger' | 'muted';
}) {
  const palette: Record<typeof tone, { bg: string; fg: string }> = {
    primary: { bg: Palette.primary, fg: '#FFFFFF' },
    warning: { bg: 'rgba(217,119,6,0.14)', fg: '#D97706' },
    info: { bg: 'rgba(109,40,217,0.12)', fg: '#6D28D9' },
    danger: { bg: 'rgba(225,29,72,0.12)', fg: '#E11D48' },
    muted: { bg: '#B9B5C6', fg: '#FFFFFF' },
  };
  const c = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function PengajuanIzin() {
  const currentUser = useCurrentUser();
  const config = useAppConfig();
  const { sessions, attendances, loading: sessionsLoading, error: sessionsError } = useSessions();
  const { leaveRequests, loading: leaveLoading, error: leaveError } = useLeaveRequests();

  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(toDateString(new Date()));
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [alasan, setAlasan] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) router.replace('/login' as Href);
  }, [currentUser]);

  const myLeaves = useMemo(
    () =>
      currentUser
        ? leaveRequests.filter((lr) => lr.userId === currentUser.id)
        : [],
    [leaveRequests, currentUser],
  );

  const markedDates = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (!s.pesertaIds.includes(currentUser.id)) return;
      set.add(s.tanggal);
    });
    return set;
  }, [sessions, currentUser]);

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
    if (s.tanggal !== selectedDate) return false;
    if (s.status === 'ditutup') return false;
    if (sesiSudahBerakhir(s)) return false;
    const sudahHadir = attendances.some(
      (a) => a.sessionId === s.id && a.userId === currentUser.id,
    );
    if (sudahHadir) return false;
    const sudahAdaAktif = myLeaves.some(
      (lr) =>
        lr.sessionId === s.id && (lr.status === 'menunggu' || lr.status === 'diterima'),
    );
    return !sudahAdaAktif;
  });

  const resetForm = () => {
    setSelectedSessionId(null);
    setAlasan('');
    setErrorMsg(null);
    setShowForm(false);
  };

  const doSubmit = async (trimmed: string, compositeId: string) => {
    setSubmitting(true);
    try {
      const kategoriAi = await classifyLeaveReason(trimmed, config.aiTimeoutMs);

      const firestore = getFirestore();
      const ref = doc(firestore, COLLECTIONS.leaveRequests, compositeId);

      await setDoc(ref, {
        sessionId: selectedSessionId,
        userId: currentUser.id,
        alasan: trimmed,
        kategoriAi,
        status: 'menunggu',
        createdAt: new Date().toISOString(),
        diputuskanOleh: null,
        diputuskanAt: null,
      });

      Logger.info('FIRESTORE', 'LeaveRequestCreate', 'Pengajuan izin tersimpan', {
        sessionId: selectedSessionId,
        kategoriAi,
      });

      resetForm();
    } catch (err) {
      Logger.error('FIRESTORE', 'LeaveRequestCreate', err);
      setErrorMsg(toUserErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
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

    // Cek belum ada dokumen untuk composite ID ini (doc id = sessionId_uid)
    const compositeId = getCompositeId(selectedSessionId, currentUser.id);
    const existing = myLeaves.find((lr) => lr.id === compositeId);
    if (existing && (existing.status === 'menunggu' || existing.status === 'diterima')) {
      setErrorMsg('Anda sudah punya pengajuan aktif untuk sesi ini');
      return;
    }

    Alert.alert(
      'Konfirmasi Pengajuan Izin',
      'Setelah diajukan, izin tidak dapat dibatalkan dan fitur presensi untuk sesi ini akan otomatis dikunci. Apakah Anda yakin ingin melanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Ajukan Izin',
          onPress: () => doSubmit(trimmed, compositeId),
        },
      ],
    );
  };

  const sortedHistory = [...myLeaves].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  );

  return (
    <Screen>
      <TopBar title="Pengajuan Izin" />

      <SectionTitle title="Pilih Tanggal Sesi" />

      <ExpandableCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        markedDates={markedDates}
      />

      <Pressable
        onPress={() => setShowForm(true)}
        disabled={sesiBisaDiajukan.length === 0}
        style={({ pressed }) => [
          styles.addButton,
          sesiBisaDiajukan.length === 0 && styles.addButtonDisabled,
          pressed && { opacity: 0.8 },
        ]}>
        <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Ajukan Izin untuk Tanggal Ini</Text>
      </Pressable>

      {sesiBisaDiajukan.length === 0 && (
        <Text style={styles.hint}>
          Tidak ada sesi praktikum yang bisa diajukan izin di tanggal ini.
        </Text>
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

      <Modal
        visible={showForm}
        animationType="fade"
        transparent
        onRequestClose={resetForm}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                Ajukan Izin · {formatTanggal(selectedDate)}
              </Text>

              <Text style={styles.label}>Sesi</Text>
              <View style={{ gap: 6 }}>
                {sesiBisaDiajukan.map((s) => {
                  const selected = s.id === selectedSessionId;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSelectedSessionId(s.id)}
                      style={[
                        styles.sessionOption,
                        selected && styles.sessionOptionSelected,
                      ]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionOptionTitle}>{s.praktikum}</Text>
                        <Text style={styles.sessionOptionSub}>
                          {s.kelasLab} · {s.jamMulai}-{s.jamSelesai}
                        </Text>
                      </View>
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={Palette.primary}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Alasan</Text>
              <TextInput
                style={styles.textarea}
                value={alasan}
                onChangeText={setAlasan}
                placeholder="Jelaskan alasan ketidakhadiran (min. 10 karakter)"
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
  const statusTone: 'primary' | 'warning' | 'danger' =
    item.status === 'diterima' ? 'primary' : item.status === 'ditolak' ? 'danger' : 'warning';
  const statusLabel =
    item.status === 'diterima' ? 'Diterima' : item.status === 'ditolak' ? 'Ditolak' : 'Menunggu';

  const normalizedKategori = normalizeLeaveCategory(item.kategoriAi);
  const kategoriTone: 'warning' | 'info' | 'muted' =
    normalizedKategori === 'sakit'
      ? 'warning'
      : normalizedKategori === 'izin'
      ? 'info'
      : 'muted';
  const kategoriLabel =
    normalizedKategori === 'sakit'
      ? 'Sakit'
      : normalizedKategori === 'izin'
      ? 'Izin'
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
        <LocalBadge label={statusLabel} tone={statusTone} />
      </View>

      <Text style={styles.reqAlasan}>{item.alasan}</Text>

      <View style={styles.aiRow}>
        <Text style={styles.aiLabel}>Kategori AI</Text>
        <LocalBadge label={kategoriLabel} tone={kategoriTone} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    padding: 14,
    borderRadius: 999,
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  hint: {
    fontSize: 12,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: -6,
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

  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

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
  },
  modalTitle: {
    fontSize: 17,
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
  sessionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  sessionOptionSelected: {
    borderColor: Palette.primary,
    backgroundColor: 'rgba(226, 27, 208, 0.08)',
  },
  sessionOptionTitle: {
    fontSize: 14, fontWeight: '600', color: Palette.text,
  },
  sessionOptionSub: {
    fontSize: 12, color: Palette.textMuted, marginTop: 2,
  },
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
});