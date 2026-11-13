import { useState, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { router, type Href } from 'expo-router';

import { Avatar, Badge, Chip, EmptyNote, GlassCard, Illustration, Screen, TopBar } from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useSessions } from '@/hooks/use-sessions';
import { usePraktikanList } from '@/hooks/use-users';
import { useLeaveRequests } from '@/hooks/use-leave-requests';
import { formatTanggal } from '@/utils/format';

type FilterWaktu = 'hari_ini' | 'minggu_ini' | 'semua';
type Decision = { id: string; action: 'diterima' | 'ditolak' } | null;

export function PemeriksaanIzin() {
  const currentUser = useCurrentUser();
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const { praktikanList, loading: usersLoading } = usePraktikanList();
  const { leaveRequests, loading: leaveLoading, error: leaveError, updateLeaveStatus } = useLeaveRequests();
  
  const [filter, setFilter] = useState<FilterWaktu>('hari_ini');
  const [decision, setDecision] = useState<Decision>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login' as Href);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  if (sessionsLoading || usersLoading || leaveLoading) {
    return (
      <Screen>
        <TopBar title="Pemeriksaan Izin" />
        <GlassCard style={styles.centerCard}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={styles.loadingText}>Memuat...</Text>
        </GlassCard>
      </Screen>
    );
  }

  if (sessionsError || leaveError) {
    return (
      <Screen>
        <TopBar title="Pemeriksaan Izin" />
        <EmptyNote 
          icon={<Illustration icon="cloud-offline-outline" />}
          message="Tidak ada koneksi internet. Terjadi kesalahan, coba lagi." 
        />
      </Screen>
    );
  }

  // 1. Filter by Assistant's Sessions
  const assistantSessionIds = new Set(
    sessions.filter((s) => s.asistenId === currentUser.id).map((s) => s.id)
  );
  const assistantRequests = leaveRequests.filter((req) => assistantSessionIds.has(req.sessionId));

  // 2. Filter by Time
  const now = new Date();
  const todayString = now.toISOString().split('T')[0];
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const filteredRequests = assistantRequests.filter((req) => {
    if (filter === 'hari_ini') return req.createdAt.startsWith(todayString);
    if (filter === 'minggu_ini') return req.createdAt >= oneWeekAgo;
    return true;
  });

  // 3. Group by Date
  const grouped = filteredRequests.reduce((acc, req) => {
    const dateStr = formatTanggal(req.createdAt.split('T')[0]);
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(req);
    return acc;
  }, {} as Record<string, typeof filteredRequests>);

  const groupEntries = Object.entries(grouped).map(([date, reqs]) => {
    const menungguCount = reqs.filter((r) => r.status === 'menunggu').length;
    return { date, reqs, menungguCount, rawDate: reqs[0].createdAt };
  });

  groupEntries.sort((a, b) => {
    if (a.menungguCount > 0 && b.menungguCount === 0) return -1;
    if (a.menungguCount === 0 && b.menungguCount > 0) return 1;
    return b.rawDate.localeCompare(a.rawDate);
  });

  async function handleConfirm() {
    if (!decision || processing) return;
    try {
      setProcessing(true);
      await updateLeaveStatus(decision.id, decision.action, currentUser!.nama);
    } catch (err) {
      console.error('Gagal memperbarui status izin:', err);
    } finally {
      setProcessing(false);
      setDecision(null);
    }
  }

  const getEmptyMessage = () => {
    if (filter === 'hari_ini') return 'Tidak ada pengajuan izin hari ini.';
    if (filter === 'minggu_ini') return 'Tidak ada pengajuan izin minggu ini.';
    return 'Belum ada pengajuan izin.';
  };

  const renderBadgeStatus = (status: string) => {
    if (status === 'diterima') return <Badge label="Diterima" tone="primary" />;
    if (status === 'ditolak') return <Badge label="Ditolak" tone="dark" />;
    return <Badge label="Menunggu" tone="muted" />;
  };

  return (
    <Screen>
      <TopBar title="Pemeriksaan Izin" />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
        <Chip label="Hari ini" selected={filter === 'hari_ini'} onPress={() => setFilter('hari_ini')} />
        <Chip label="Minggu ini" selected={filter === 'minggu_ini'} onPress={() => setFilter('minggu_ini')} />
        <Chip label="Semua" selected={filter === 'semua'} onPress={() => setFilter('semua')} />
      </ScrollView>

      {groupEntries.length === 0 ? (
        <EmptyNote message={getEmptyMessage()} />
      ) : (
        <View style={styles.listContainer}>
          {groupEntries.map((group) => (
            <View key={group.date} style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupDate}>{group.date}</Text>
                <Text style={styles.groupCount}>
                  {group.menungguCount > 0 ? `${group.menungguCount} menunggu` : 'Selesai'}
                </Text>
              </View>

              {group.reqs.map((req) => {
                const praktikan = praktikanList.find((p) => p.id === req.userId);
                const session = sessions.find((s) => s.id === req.sessionId);
                const aiBadgeTone = req.kategoriAi ? 'outline' : 'muted';
                const aiBadgeLabel = req.kategoriAi 
                  ? req.kategoriAi.charAt(0).toUpperCase() + req.kategoriAi.slice(1) 
                  : 'Belum terklasifikasi';

                return (
                  <GlassCard key={req.id} style={styles.reqCard}>
                    <View style={styles.reqHeader}>
                      <Avatar nama={praktikan?.nama ?? '?'} size={40} />
                      <View style={styles.reqInfo}>
                        <Text style={styles.reqName}>{praktikan?.nama ?? 'Praktikan'}</Text>
                        <Text style={styles.reqSession}>
                          {session?.praktikum ?? ''} · {session ? formatTanggal(session.tanggal) : ''}
                        </Text>
                      </View>
                      {renderBadgeStatus(req.status)}
                    </View>

                    <Text style={styles.reasonText}>{req.alasan}</Text>

                    <View style={styles.aiSection}>
                      <Text style={styles.aiLabel}>Saran AI</Text>
                      <Badge label={aiBadgeLabel} tone={aiBadgeTone} />
                    </View>

                    {req.status === 'menunggu' ? (
                      <View style={styles.actionButtons}>
                        <Pressable 
                          style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
                          onPress={() => setDecision({ id: req.id, action: 'ditolak' })}>
                          <Text style={styles.btnSecondaryText}>Tolak</Text>
                        </Pressable>
                        <Pressable 
                          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
                          onPress={() => setDecision({ id: req.id, action: 'diterima' })}>
                          <Text style={styles.btnPrimaryText}>Terima</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.decisionText}>
                        Diputuskan {req.diputuskanOleh} · {new Date(req.diputuskanAt!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </GlassCard>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal visible={!!decision} transparent animationType="fade" onRequestClose={() => setDecision(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {decision?.action === 'diterima' ? 'Terima Izin?' : 'Tolak Izin?'}
            </Text>
            <Text style={styles.modalMessage}>
              Keputusan ini akan disimpan dan dapat dilihat langsung oleh praktikan.
            </Text>
            <View style={styles.modalActions}>
              <Pressable 
                onPress={() => setDecision(null)} 
                disabled={processing}
                style={styles.cancelButton}>
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                disabled={processing}
                style={[styles.confirmButton, decision?.action === 'ditolak' && styles.confirmDanger]}>
                <Text style={styles.confirmText}>
                  {processing ? 'Memproses...' : (decision?.action === 'diterima' ? 'Terima' : 'Tolak')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerCard: {
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  loadingText: {
    color: Palette.textSecondary,
    fontSize: 14,
  },
  filterContainer: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  listContainer: {
    gap: Spacing.four,
  },
  groupContainer: {
    gap: Spacing.two,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  groupDate: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  groupCount: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  reqCard: {
    gap: Spacing.three,
  },
  reqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  reqInfo: {
    flex: 1,
  },
  reqName: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  reqSession: {
    color: Palette.textSecondary,
    fontSize: 12,
  },
  reasonText: {
    color: Palette.text,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: Spacing.two,
    borderRadius: 12,
  },
  aiSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  aiLabel: {
    color: Palette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  btnSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
  },
  btnSecondaryText: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  btnPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 999,
    paddingVertical: 12,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.7,
  },
  decisionText: {
    color: Palette.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.one,
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
    borderRadius: 24,
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
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});