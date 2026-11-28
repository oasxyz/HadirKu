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
import { IlustrasiKosong, IlustrasiSurat } from '@/components/ilustrasi';
import { PelacakPengajuan } from '@/components/pelacak-pengajuan';
import { KategoriIzinBadge } from '@/components/status-kehadiran-badge';
import { useToast } from '@/components/toast';
import {
  Badge,
  type BadgeTone,
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
import { classifyLeaveReason, classifySentiment } from '@/services/ai';
import { COLLECTIONS, getCompositeId } from '@/services/firebase';
import type { LeaveRequest } from '@/types';
import { normalizeLeaveCategory } from '@/types';
import { formatTanggal, formatTanggalSingkat } from '@/utils/format';
import { BATAS_HARI_KEPUTUSAN_IZIN, masihBolehPutuskanIzin } from '@/utils/waktu-sesi';
import { Logger, toUserErrorMessage } from '@/utils/logger';
import { sesiSudahBerakhir } from '@/utils/sesi';

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
  const { tampilkanToast } = useToast();
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
      // SRS4-05: sentimen dihitung di HP (on-device), null bila tidak terbaca.
      const sentimenAi = classifySentiment(trimmed);

      const firestore = getFirestore();
      const ref = doc(firestore, COLLECTIONS.leaveRequests, compositeId);

      await setDoc(ref, {
        sessionId: selectedSessionId,
        userId: currentUser.id,
        alasan: trimmed,
        kategoriAi,
        sentimenAi,
        status: 'menunggu',
        createdAt: new Date().toISOString(),
        diputuskanOleh: null,
        diputuskanAt: null,
      });

      Logger.info('FIRESTORE', 'LeaveRequestCreate', 'Pengajuan izin tersimpan', {
        sessionId: selectedSessionId,
        kategoriAi,
        sentimenAi,
      });

      resetForm();
      tampilkanToast('Pantau statusnya di daftar pengajuan. Kamu akan diberi tahu saat asisten memutuskan.', 'sukses', 'Izin diajukan');
    } catch (err) {
      Logger.error('FIRESTORE', 'LeaveRequestCreate', err);
      // Form berada di dalam Modal (toast tertutup modal), jadi pesan juga tetap tampil di form.
      setErrorMsg(toUserErrorMessage(err));
      tampilkanToast('Periksa koneksi internet lalu coba lagi.', 'error', 'Izin gagal diajukan');
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

      {/* Kartu ajukan berilustrasi; tombolnya mati bila tanggal ini tidak punya sesi yang bisa diizinkan. */}
      <View style={styles.ajukanCard}>
        <View style={styles.ajukanText}>
          <Text style={styles.ajukanTitle}>
            {sesiBisaDiajukan.length > 0
              ? `Tidak bisa hadir ${formatTanggalSingkat(selectedDate)}?`
              : formatTanggalSingkat(selectedDate)}
          </Text>
          <Text style={styles.ajukanSub}>
            {sesiBisaDiajukan.length > 0
              ? 'Ajukan izin sebelum sesi berakhir.'
              : 'Tidak ada sesi yang bisa diajukan izin di tanggal ini.'}
          </Text>
          <Pressable
            onPress={() => setShowForm(true)}
            disabled={sesiBisaDiajukan.length === 0}
            style={({ pressed }) => [
              styles.addButton,
              sesiBisaDiajukan.length === 0 && styles.addButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Ajukan Izin</Text>
          </Pressable>
        </View>
        <IlustrasiSurat lebar={92} />
      </View>

      <SectionTitle title="Riwayat Pengajuan" />

      {sortedHistory.length === 0 ? (
        <GlassCard style={styles.emptyCard}>
          <IlustrasiKosong lebar={100} />
          <Text style={styles.emptyText}>Belum ada pengajuan izin.</Text>
        </GlassCard>
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

              <Text style={styles.label}>Pilih sesi</Text>
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
                      {/* Tombol pilihan bulat: kosong, atau hitam bercentang saat dipilih. */}
                      <View style={[styles.radio, selected && styles.radioTerpilih]}>
                        {selected ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionOptionTitle}>{s.praktikum}</Text>
                        <Text style={styles.sessionOptionSub}>
                          {s.jamMulai}–{s.jamSelesai} · {s.kelasLab}
                        </Text>
                      </View>
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
  // Aturan warna seragam: Menunggu abu, Diterima magenta, Ditolak hitam.
  const statusTone: BadgeTone =
    item.status === 'diterima' ? 'primary' : item.status === 'ditolak' ? 'dark' : 'muted';
  const statusLabel =
    item.status === 'diterima' ? 'Diterima' : item.status === 'ditolak' ? 'Ditolak' : 'Menunggu';

  const normalizedKategori = normalizeLeaveCategory(item.kategoriAi);
  // Ringkas dulu; ketuk kartu untuk membuka alasan dan pelacak di tempat (tanpa pindah halaman).
  // Pengajuan yang masih menunggu langsung terbuka supaya progresnya terlihat.
  const [terbuka, setTerbuka] = useState(item.status === 'menunggu');

  return (
    <GlassCard style={styles.reqCard}>
      <Pressable
        onPress={() => setTerbuka((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: terbuka }}
        accessibilityHint={terbuka ? 'Ketuk untuk menutup detail' : 'Ketuk untuk melihat pelacakan izin'}
        style={({ pressed }) => [styles.reqHeader, pressed && { opacity: 0.7 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reqTitle}>{sessionNama}</Text>
          {sessionTanggal ? (
            <Text style={styles.reqMeta}>{formatTanggal(sessionTanggal)}</Text>
          ) : null}
        </View>
        <Badge label={statusLabel} tone={statusTone} />
        <Ionicons
          name={terbuka ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Palette.textMuted}
        />
      </Pressable>

      {terbuka ? (
        <View style={styles.reqDetail}>
          <Text style={styles.reqAlasan}>{item.alasan}</Text>

          <View style={styles.aiRow}>
            <Text style={styles.aiLabel}>Kategori AI</Text>
            <KategoriIzinBadge kategori={normalizedKategori} />
          </View>

          <PelacakPengajuan
            status={item.status}
            createdAt={item.createdAt}
            diputuskanAt={item.diputuskanAt}
          />

          {item.status === 'menunggu' && !masihBolehPutuskanIzin(sessionTanggal) ? (
            <Text style={styles.decisionText}>
              Asisten tidak memutuskan sampai batas H+{BATAS_HARI_KEPUTUSAN_IZIN}, jadi sesi ini dihitung Alpha.
            </Text>
          ) : null}

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
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  centerCard: { alignItems: 'center', padding: Spacing.four, gap: Spacing.two },
  ajukanCard: {
    alignItems: 'center',
    backgroundColor: Palette.infoMuted,
    borderRadius: 28,
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 16,
  },
  ajukanText: { flex: 1, alignItems: 'flex-start', gap: 4 },
  ajukanTitle: { fontSize: 16, fontWeight: '700', color: Palette.text },
  ajukanSub: { fontSize: 12, color: Palette.textSecondary, lineHeight: 17 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.ink,
    borderRadius: 999,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonDisabled: { opacity: 0.35 },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { color: Palette.textMuted, fontSize: 13, textAlign: 'center' },

  reqCard: { gap: Spacing.two },
  reqDetail: { gap: Spacing.two },
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
    borderRadius: 28,
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
  // Pilihan sesi: kartu solid; yang dipilih bertepi hitam (bukan latar merah muda).
  sessionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F7F6FB',
  },
  sessionOptionSelected: {
    borderColor: Palette.ink,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  radio: {
    alignItems: 'center',
    borderColor: Palette.textMuted,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioTerpilih: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
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
    backgroundColor: '#F7F6FB',
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
    backgroundColor: Palette.ink,
    borderRadius: 999,
    paddingVertical: 12,
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});