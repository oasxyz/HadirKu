// SRS005 rekap (PIC B — Yustinus): daftar sesi untuk direkap, kehadiran realtime dari Firestore.
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
import { useSessions } from "@/hooks/use-sessions";
import { formatTanggal } from "@/utils/format";
import { useEffect } from "react";

export default function RekapScreen() {
  const currentUser = useCurrentUser();
  const { sessions, attendances, loading, error } = useSessions();

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
            Memuat...
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
          message="Tidak ada koneksi internet. Terjadi kesalahan, coba lagi."
        />
      </Screen>
    );
  }

  // Filter only sessions handled by the logged-in assistant and sort
  const assistantSessions = sessions
    .filter((session) => session.asistenId === currentUser.id)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  return (
    <Screen>
      <TopBar title="Rekap Kehadiran" />
      {assistantSessions.length === 0 ? (
        <EmptyNote message="Belum ada sesi praktikum untuk direkap." />
      ) : (
        <View style={{ gap: 12 }}>
          {assistantSessions.map((session) => {
            const hadir = attendances.filter(
              (item) => item.sessionId === session.id,
            ).length;
            return (
              <ListRow
                key={session.id}
                title={session.praktikum}
                subtitle={`${formatTanggal(session.tanggal)} · Hadir ${hadir}/${session.pesertaIds.length}`}
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