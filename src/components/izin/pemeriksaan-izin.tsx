import { useState, useEffect, useRef } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { router, type Href } from "expo-router";

import {
  Avatar,
  Badge,
  Chip,
  EmptyNote,
  GlassCard,
  Screen,
  SentimentBadge,
  TopBar,
} from "@/components/ui";
import { Palette, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/context/auth-context";
import { useSessions } from "@/hooks/use-sessions";
import { usePraktikanList } from "@/hooks/use-users";
import { useLeaveRequests } from "@/hooks/use-leave-requests";
import { kirimNotifikasi, pesanIzinDiputuskan, pesanTagihanDibatalkan } from "@/services/notifications";
import { classifySentiment } from "@/services/ai";
import { putuskanIzin } from "@/components/izin/putuskan-izin";
import { KategoriIzinBadge } from "@/components/status-kehadiran-badge";
import { IlustrasiKosong, IlustrasiSurat } from "@/components/ilustrasi";
import { BATAS_HARI_KEPUTUSAN_IZIN, masihBolehPutuskanIzin } from "@/utils/waktu-sesi";
import { PemeriksaanKelas } from "@/components/izin/pemeriksaan-kelas";
import { useToast } from "@/components/toast";
import { normalizeLeaveCategory } from "@/types";
import { formatTanggal } from "@/utils/format";
import { Logger } from "@/utils/logger";

type FilterWaktu = "hari_ini" | "minggu_ini" | "semua";
type Decision = { id: string; action: "diterima" | "ditolak" } | null;

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalDateKeyFromIso(isoOrDateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateStr)) {
    return isoOrDateStr;
  }
  const parsed = new Date(isoOrDateStr);
  if (Number.isNaN(parsed.getTime())) {
    return isoOrDateStr.split("T")[0];
  }
  return toLocalDateKey(parsed);
}

export function PemeriksaanIzin() {
  const currentUser = useCurrentUser();
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
  } = useSessions();
  const { praktikanList, loading: usersLoading } = usePraktikanList();
  const {
    leaveRequests,
    loading: leaveLoading,
    error: leaveError,
  } = useLeaveRequests();

  const [filter, setFilter] = useState<FilterWaktu>("hari_ini");
  const [bagian, setBagian] = useState<"izin" | "kelas">("izin");
  const [decision, setDecision] = useState<Decision>(null);
  const [processing, setProcessing] = useState(false);
  const isSubmittingRef = useRef(false);
  const { tampilkanToast } = useToast();

  useEffect(() => {
    if (!currentUser) {
      router.replace("/login" as Href);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  if (sessionsLoading || usersLoading || leaveLoading) {
    return (
      <Screen>
        <TopBar title="Pemeriksaan Izin" />
        <GlassCard style={styles.centerCard}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={styles.loadingText}>Memuat pengajuan izin…</Text>
        </GlassCard>
      </Screen>
    );
  }

  const loadError = sessionsError || leaveError;
  if (loadError) {
    const isOffline = /offline|network|internet|koneksi|unavailable/i.test(loadError);
    return (
      <Screen>
        <TopBar title="Pemeriksaan Izin" />
        <EmptyNote
          icon={isOffline ? "cloud-offline-outline" : "alert-circle-outline"}
          message={
            isOffline
              ? "Tidak ada koneksi internet. Periksa jaringan lalu coba lagi."
              : `${loadError}. Coba muat ulang halaman.`
          }
        />
      </Screen>
    );
  }

  // 1. Filter by Assistant's Sessions
  const assistantSessionIds = new Set(
    sessions.filter((s) => s.asistenId === currentUser.id).map((s) => s.id),
  );
  const assistantRequests = leaveRequests.filter((req) =>
    assistantSessionIds.has(req.sessionId),
  );

  // Izin hanya bisa diputuskan sampai akhir H+3 dari tanggal sesi; yang lewat tidak dihitung menunggu.
  const tanggalSesiIzin = (sessionId: string) => sessions.find((s) => s.id === sessionId)?.tanggal;
  const jumlahMenunggu = assistantRequests.filter(
    (req) => req.status === "menunggu" && masihBolehPutuskanIzin(tanggalSesiIzin(req.sessionId)),
  ).length;

  // 2. Filter by Time (menggunakan tanggal lokal perangkat, bukan UTC)
  const now = new Date();
  const todayLocalKey = toLocalDateKey(now);
  const oneWeekAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  const filteredRequests = assistantRequests.filter((req) => {
    if (filter === "hari_ini") {
      return getLocalDateKeyFromIso(req.createdAt) === todayLocalKey;
    }
    if (filter === "minggu_ini") {
      const createdMs = new Date(req.createdAt).getTime();
      return !Number.isNaN(createdMs) && createdMs >= oneWeekAgoMs;
    }
    return true;
  });

  // 3. Group by Local Date
  const grouped = filteredRequests.reduce(
    (acc, req) => {
      const dateStr = formatTanggal(getLocalDateKeyFromIso(req.createdAt));
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(req);
      return acc;
    },
    {} as Record<string, typeof filteredRequests>,
  );

  const groupEntries = Object.entries(grouped).map(([date, reqs]) => {
    const menungguCount = reqs.filter((r) => r.status === "menunggu").length;
    return { date, reqs, menungguCount, rawDate: reqs[0].createdAt };
  });

  groupEntries.sort((a, b) => {
    if (a.menungguCount > 0 && b.menungguCount === 0) return -1;
    if (a.menungguCount === 0 && b.menungguCount > 0) return 1;
    return b.rawDate.localeCompare(a.rawDate);
  });

  async function handleConfirm() {
    // SRS 3.1 In-Flight Submission Lock: ref berubah seketika, sedangkan state baru
    // terbaca di render berikutnya, jadi ketukan ganda yang cepat tetap tertahan.
    if (!decision || isSubmittingRef.current) return;
    const izinDipilih = leaveRequests.find((req) => req.id === decision.id);
    if (izinDipilih && !masihBolehPutuskanIzin(tanggalSesiIzin(izinDipilih.sessionId))) {
      setDecision(null);
      tampilkanToast("Batas keputusan izin (H+3 dari tanggal sesi) sudah lewat.", "error", "Izin tidak bisa diputuskan");
      return;
    }
    isSubmittingRef.current = true;
    try {
      setProcessing(true);
      const izin = leaveRequests.find((req) => req.id === decision.id);
      if (!izin) throw new Error("Pengajuan izin tidak ditemukan");
      // SRS4-05: keputusan izin + pembatalan denda pending dalam satu transaksi.
      const { dendaDibatalkan } = await putuskanIzin({
        izinId: izin.id,
        sessionId: izin.sessionId,
        userId: izin.userId,
        keputusan: decision.action,
        asistenId: currentUser!.id,
        asistenNama: currentUser!.nama,
      });
      tampilkanToast(
        dendaDibatalkan
          ? 'Denda keterlambatannya ikut dibatalkan. Praktikan diberi tahu lewat notifikasi.'
          : 'Praktikan diberi tahu lewat notifikasi.',
        'sukses',
        decision.action === 'diterima' ? 'Izin diterima' : 'Izin ditolak'
      );

      // SRS3-04: beri tahu praktikan pemohon. Dijalankan di latar belakang supaya dialog
      // langsung tertutup; kegagalan notifikasi tidak membatalkan keputusan izin.
      const sesi = sessions.find((s) => s.id === izin.sessionId);
      void kirimNotifikasi(pesanIzinDiputuskan(izin, decision.action, sesi));
      if (dendaDibatalkan) {
        void kirimNotifikasi(pesanTagihanDibatalkan(dendaDibatalkan, sesi));
      }
    } catch (err) {
      Logger.error("FIRESTORE", "putuskanIzin", err, { leaveRequestId: decision.id });
      tampilkanToast("Periksa koneksi internet lalu coba lagi.", "error", "Keputusan gagal disimpan");
    } finally {
      isSubmittingRef.current = false;
      setProcessing(false);
      setDecision(null);
    }
  }

  const getEmptyMessage = () => {
    if (filter === "hari_ini") return "Tidak ada pengajuan izin hari ini.";
    if (filter === "minggu_ini") return "Tidak ada pengajuan izin minggu ini.";
    return "Belum ada pengajuan izin.";
  };

  const renderBadgeStatus = (status: string) => {
    if (status === "diterima") return <Badge label="Diterima" tone="primary" />;
    if (status === "ditolak") return <Badge label="Ditolak" tone="dark" />;
    return <Badge label="Menunggu" tone="muted" />;
  };

  return (
    <Screen>
      <TopBar title="Pemeriksaan Izin" />

      {/* Dua jenis persetujuan asisten dalam satu tab. */}
      <View style={styles.segmen} accessibilityRole="tablist">
        {([
          ["izin", "Izin sesi"],
          ["kelas", "Pindah kelas"],
        ] as const).map(([nilai, label]) => {
          const aktif = bagian === nilai;
          return (
            <Pressable
              key={nilai}
              onPress={() => setBagian(nilai)}
              accessibilityRole="tab"
              accessibilityState={{ selected: aktif }}
              style={[styles.segmenItem, aktif && styles.segmenItemAktif]}>
              <Text style={[styles.segmenTeks, aktif && styles.segmenTeksAktif]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {bagian === "kelas" ? (
        <PemeriksaanKelas />
      ) : (
      <>
      {/* Kartu ringkas berilustrasi: berapa izin yang masih menunggu keputusan. */}
      <View style={styles.ringkas}>
        <View style={styles.ringkasTeks}>
          <Text style={styles.ringkasJudul}>
            {jumlahMenunggu > 0
              ? `${jumlahMenunggu} izin menunggu keputusan`
              : "Semua izin sudah diputuskan"}
          </Text>
          <Text style={styles.ringkasSub}>
            {jumlahMenunggu > 0
              ? "Periksa alasan dan saran AI, lalu terima atau tolak."
              : "Pengajuan baru dari praktikan akan muncul di sini."}
          </Text>
        </View>
        <IlustrasiSurat lebar={88} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        <Chip
          label="Hari ini"
          selected={filter === "hari_ini"}
          onPress={() => setFilter("hari_ini")}
        />
        <Chip
          label="Minggu ini"
          selected={filter === "minggu_ini"}
          onPress={() => setFilter("minggu_ini")}
        />
        <Chip
          label="Semua"
          selected={filter === "semua"}
          onPress={() => setFilter("semua")}
        />
      </ScrollView>

      {groupEntries.length === 0 ? (
        <View style={styles.kosong}>
          <IlustrasiKosong lebar={100} />
          <Text style={styles.kosongTeks}>{getEmptyMessage()}</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {groupEntries.map((group) => (
            <View key={group.date} style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupDate}>{group.date}</Text>
                <Text style={styles.groupCount}>
                  {group.menungguCount > 0
                    ? `${group.menungguCount} menunggu`
                    : "Selesai"}
                </Text>
              </View>

              {group.reqs.map((req) => {
                const praktikan = praktikanList.find(
                  (p) => p.id === req.userId,
                );
                const session = sessions.find((s) => s.id === req.sessionId);
                // Kategori Sprint 2 (keluarga/akademik/lainnya) dibaca sebagai "izin".
                const kategori = normalizeLeaveCategory(req.kategoriAi);
                // SRS4-05: izin lama (sebelum Sprint 4) belum punya field sentimenAi; karena
                // modelnya di HP, sentimennya dihitung langsung saat ditampilkan.
                const sentimen =
                  req.sentimenAi === undefined ? classifySentiment(req.alasan) : req.sentimenAi;

                return (
                  <View key={req.id} style={styles.reqCard}>
                    <View style={styles.reqHeader}>
                      <Avatar nama={praktikan?.nama ?? "?"} size={40} />
                      <View style={styles.reqInfo}>
                        <Text style={styles.reqName}>
                          {praktikan?.nama ?? "Praktikan"}
                        </Text>
                        <Text style={styles.reqSession}>
                          {session?.praktikum ?? ""} ·{" "}
                          {session ? formatTanggal(session.tanggal) : ""}
                        </Text>
                      </View>
                      {renderBadgeStatus(req.status)}
                    </View>

                    <Text style={styles.reasonText}>{req.alasan}</Text>

                    <View style={styles.aiSection}>
                      <Text style={styles.aiLabel}>Saran AI</Text>
                      <KategoriIzinBadge kategori={kategori} />
                      <SentimentBadge value={sentimen} />
                    </View>

                    {req.status === "menunggu" && !masihBolehPutuskanIzin(session?.tanggal) ? (
                      <Text style={styles.decisionText}>
                        Batas keputusan (H+{BATAS_HARI_KEPUTUSAN_IZIN} dari tanggal sesi) sudah lewat. Izin ini tidak diputuskan dan dihitung Alpha.
                      </Text>
                    ) : req.status === "menunggu" ? (
                      <View style={styles.actionButtons}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.btnSecondary,
                            pressed && styles.btnPressed,
                          ]}
                          onPress={() =>
                            setDecision({ id: req.id, action: "ditolak" })
                          }
                        >
                          <Text style={styles.btnSecondaryText}>Tolak</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.btnPrimary,
                            pressed && styles.btnPressed,
                          ]}
                          onPress={() =>
                            setDecision({ id: req.id, action: "diterima" })
                          }
                        >
                          <Text style={styles.btnPrimaryText}>Terima</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.decisionText}>
                        Diputuskan {req.diputuskanOleh ?? "Asisten"}
                        {req.diputuskanAt
                          ? ` · ${new Date(req.diputuskanAt).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" },
                            )}`
                          : ""}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}

      </>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={!!decision}
        transparent
        animationType="fade"
        onRequestClose={() => setDecision(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {decision?.action === "diterima" ? "Terima Izin?" : "Tolak Izin?"}
            </Text>
            <Text style={styles.modalMessage}>
              Keputusan ini akan disimpan dan dapat dilihat langsung oleh
              praktikan.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setDecision(null)}
                disabled={processing}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                disabled={processing}
                style={[
                  styles.confirmButton,
                  decision?.action === "ditolak" && styles.confirmDanger,
                ]}
              >
                <Text style={styles.confirmText}>
                  {processing
                    ? "Memproses..."
                    : decision?.action === "diterima"
                      ? "Terima"
                      : "Tolak"}
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
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.one,
  },
  groupDate: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: "600",
  },
  groupCount: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  segmen: {
    backgroundColor: "#F7F6FB",
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginBottom: Spacing.three,
    padding: 4,
  },
  segmenItem: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  segmenItemAktif: {
    backgroundColor: Palette.ink,
  },
  segmenTeks: {
    color: Palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  segmenTeksAktif: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  ringkas: {
    alignItems: "center",
    backgroundColor: Palette.infoMuted,
    borderRadius: 28,
    flexDirection: "row",
    gap: 4,
    marginBottom: Spacing.three,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 14,
  },
  ringkasTeks: { flex: 1, gap: 4 },
  ringkasJudul: { color: Palette.text, fontSize: 16, fontWeight: "700" },
  ringkasSub: { color: Palette.textSecondary, fontSize: 12, lineHeight: 17 },
  kosong: {
    alignItems: "center",
    backgroundColor: "#F7F6FB",
    borderColor: Palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 8,
    paddingVertical: 24,
  },
  kosongTeks: { color: Palette.textMuted, fontSize: 13, textAlign: "center" },
  // Kartu solid, latar sama dengan kartu Timeline/Rekap.
  reqCard: {
    backgroundColor: "#F7F6FB",
    borderColor: Palette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.three,
    padding: 16,
  },
  reqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  reqInfo: {
    flex: 1,
  },
  reqName: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: "600",
  },
  reqSession: {
    color: Palette.textSecondary,
    fontSize: 12,
  },
  reasonText: {
    color: Palette.text,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: "#FFFFFF",
    padding: Spacing.two,
    borderRadius: 12,
  },
  aiSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.two,
  },
  aiLabel: {
    color: Palette.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  btnSecondary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
  },
  btnSecondaryText: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  btnPrimary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.primary,
    borderRadius: 999,
    paddingVertical: 12,
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  btnPressed: {
    opacity: 0.7,
  },
  decisionText: {
    color: Palette.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.one,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(30, 20, 50, 0.4)",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.four,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: Spacing.four,
    width: "100%",
    boxShadow: "0 8px 24px rgba(110, 70, 160, 0.10)",
  },
  modalTitle: {
    color: Palette.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  modalMessage: {
    color: Palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.two,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
  },
  cancelText: {
    color: Palette.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: Palette.primary,
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
  },
  confirmDanger: {
    backgroundColor: Palette.ink,
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});