// SRS3-04 (PIC B — Annis): daftar sesi untuk direkap dengan ringkasan 4 status, realtime dari Firestore.
import { router, type Href } from "expo-router";
import { View, Text, ActivityIndicator } from "react-native";

import { StatusBadge } from "@/components/status-badge";
import {
  EmptyNote,
  GlassCard,
  ListRow,
  Screen,
  TopBar,
} from "@/components/ui";
import { Palette } from "@/constants/theme";
import { useCurrentUser } from "@/context/auth-context";
import { useLeaveRequests } from "@/hooks/use-leave-requests";
import { useSessions } from "@/hooks/use-sessions";
import { formatTanggal } from "@/utils/format";
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
    .filter((session) => session.asistenId === currentUser.id)
    .sort(
      (a, b) =>
        b.tanggal.localeCompare(a.tanggal) || b.jamMulai.localeCompare(a.jamMulai),
    );

  return (
    <Screen>
      <TopBar title="Rekap Kehadiran" />
      {assistantSessions.length === 0 ? (
        <EmptyNote message="Belum ada sesi praktikum untuk direkap." />
      ) : (
        <View style={{ gap: 12 }}>
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
              <ListRow
                key={session.id}
                title={session.praktikum}
                subtitle={`${formatTanggal(session.tanggal)} · ${detail}`}
                right={<StatusBadge status={session.status} />}
                onPress={() => router.push(`/rekap/${session.id}` as Href)}
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}