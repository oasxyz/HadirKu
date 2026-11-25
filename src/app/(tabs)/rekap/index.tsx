// SRS3-04 (PIC B — Annis): daftar sesi untuk direkap dengan ringkasan 4 status, realtime dari Firestore.
import { router, type Href } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { IlustrasiKosong, IlustrasiPapanKlip } from "@/components/ilustrasi";
import { StatusBadge } from "@/components/status-badge";
import { EmptyNote, GlassCard, Screen, TopBar } from "@/components/ui";
import { Palette } from "@/constants/theme";
import { useCurrentUser } from "@/context/auth-context";
import { useLeaveRequests } from "@/hooks/use-leave-requests";
import { useSessions } from "@/hooks/use-sessions";
import { formatTanggalSingkat, tanggalValid } from "@/utils/format";
import {
  hitungStatusKehadiran,
  ringkasKehadiran,
  sesiSelesai,
} from "@/utils/status-kehadiran";
import { useEffect } from "react";

export default function RekapScreen() {
  const currentUser = useCurrentUser();
  const { sessions, attendances, loading: sessionsLoading, error } = useSessions();
  const { leaveRequests, loading: izinLoading } = useLeaveRequests();
  const loading = sessionsLoading || izinLoading;

  // Redirect to login handled by router in layout or index, but adding safeguard per DESIGN
  useEffect(() => {
    if (!currentUser) {
      router.replace("/login" as Href);
    }
  }, [currentUser]);

  if (!currentUser) {
    return null; // Don't render empty screen while redirecting
  }

  if (loading) {
    return (
      <Screen>
        <TopBar title="Rekap Kehadiran" />
        <GlassCard style={{ alignItems: "center", padding: 24, gap: 12 }}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={{ color: Palette.textSecondary, fontSize: 14 }}>
            Memuat rekap kehadiran…
          </Text>
        </GlassCard>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <TopBar title="Rekap Kehadiran" />
        <EmptyNote
          icon="cloud-offline-outline"
          message="Rekap belum bisa dimuat. Periksa koneksi internet lalu coba lagi."
        />
      </Screen>
    );
  }

  // Sesi milik asisten yang login, terbaru di atas (tanggal lalu jam mulai, menurun)
  const assistantSessions = sessions
    // Sesi bertanggal tidak valid (data salah ketik) disembunyikan supaya urutan terbaru benar.
    .filter((session) => session.asistenId === currentUser.id && tanggalValid(session.tanggal))
    .sort(
      (a, b) =>
        b.tanggal.localeCompare(a.tanggal) || b.jamMulai.localeCompare(a.jamMulai),
    );

  const jumlahDibuka = assistantSessions.filter((s) => s.status === "dibuka").length;

  return (
    <Screen>
      <TopBar title="Rekap Kehadiran" />
      {assistantSessions.length === 0 ? (
        <GlassCard style={styles.kosong}>
          <IlustrasiKosong lebar={110} />
          <Text style={styles.kosongTeks}>Belum ada sesi praktikum untuk direkap.</Text>
        </GlassCard>
      ) : (
        <View style={{ gap: 12 }}>
          {/* Kartu ringkas berilustrasi di atas daftar sesi */}
          <View style={styles.ringkas}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.ringkasJudul}>
                {assistantSessions.length} sesi praktikum
                {jumlahDibuka > 0 ? ` · ${jumlahDibuka} dibuka` : ""}
              </Text>
              <Text style={styles.ringkasSub}>
                Ketuk sesi untuk melihat Hadir, Sakit, Izin, dan Alpha tiap peserta.
              </Text>
            </View>
            <IlustrasiPapanKlip lebar={84} />
          </View>
          {assistantSessions.map((session) => {
            const ringkasan = ringkasKehadiran(
              session.pesertaIds.map((userId) =>
                hitungStatusKehadiran(session, userId, attendances, leaveRequests),
              ),
            );
            const total = session.pesertaIds.length;
            // Alpha baru ditampilkan setelah sesi selesai; sebelum itu belum ada yang Alpha.
            const detail = [
              `Hadir ${ringkasan.hadir}/${total}`,
              ringkasan.sakit > 0 ? `Sakit ${ringkasan.sakit}` : null,
              ringkasan.izin > 0 ? `Izin ${ringkasan.izin}` : null,
              sesiSelesai(session) ? `Alpha ${ringkasan.alpha}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Pressable
                key={session.id}
                onPress={() => router.push(`/rekap/${session.id}` as Href)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.baris, pressed && { opacity: 0.7 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.barisJudul} numberOfLines={1}>
                    {session.praktikum}
                  </Text>
                  <Text style={styles.barisTanggal} numberOfLines={1}>
                    {formatTanggalSingkat(session.tanggal)} · {session.jamMulai}–{session.jamSelesai}
                  </Text>
                  <Text style={styles.barisDetail} numberOfLines={1}>
                    {detail}
                  </Text>
                </View>
                <StatusBadge status={session.status} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ringkas: {
    alignItems: "center",
    backgroundColor: Palette.warningMuted,
    borderRadius: 24,
    flexDirection: "row",
    gap: 4,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 12,
  },
  ringkasJudul: { color: Palette.text, fontSize: 16, fontWeight: "700" },
  ringkasSub: { color: Palette.textSecondary, fontSize: 12, lineHeight: 17 },
  // Kartu solid, latar sama dengan kartu kalender/Timeline di Beranda.
  baris: {
    alignItems: "center",
    backgroundColor: "#F7F6FB",
    borderColor: Palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  barisJudul: { color: Palette.text, fontSize: 15, fontWeight: "700" },
  barisTanggal: { color: Palette.textSecondary, fontSize: 12 },
  barisDetail: { color: Palette.textMuted, fontSize: 12 },
  kosong: { alignItems: "center", gap: 8, paddingVertical: 24 },
  kosongTeks: { color: Palette.textMuted, fontSize: 13, textAlign: "center" },
});