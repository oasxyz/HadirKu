import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DeviceStatusCard, GlassCard } from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import type { useLocationValidation } from '@/hooks/useLocationValidation';

interface LocationCheckCardProps {
  state: ReturnType<typeof useLocationValidation>;
  onOpenSettings: () => void;
}

export function LocationCheckCard({ state, onOpenSettings }: LocationCheckCardProps) {
  // Kondisi error -> DeviceStatusCard
  if (state.permissionStatus === 'denied') {
    return (
      <DeviceStatusCard
        title="Akses Lokasi Ditolak"
        message="HadirKu memerlukan izin akses lokasi untuk memastikan Anda berada di dalam radius laboratorium."
        tone="danger"
        actionLabel="Buka Pengaturan"
        onAction={onOpenSettings}
        icon="location-outline"
      />
    );
  }
  if (state.permissionStatus === 'services_off') {
    return (
      <DeviceStatusCard
        title="Layanan Lokasi Nonaktif"
        message="Aktifkan GPS pada perangkat Anda agar posisi terhadap laboratorium dapat diperiksa."
        tone="danger"
        actionLabel="Coba Lagi"
        onAction={state.refreshLocation}
        icon="locate-outline"
      />
    );
  }
  if (state.permissionStatus === 'timeout') {
    return (
      <DeviceStatusCard
        title="Mencari Titik Koordinat"
        message="Koordinat lokasi perangkat belum tersedia. Pastikan Anda berada di area dengan sinyal GPS memadai."
        tone="warning"
        actionLabel="Muat Ulang Lokasi"
        onAction={state.refreshLocation}
        icon="compass-outline"
      />
    );
  }
  if (state.isMocked) {
    return (
      <DeviceStatusCard
        title="Lokasi Palsu Terdeteksi"
        message="Matikan aplikasi pemalsu lokasi (Fake GPS) di perangkat Anda untuk melanjutkan presensi."
        tone="danger"
        actionLabel="Periksa Ulang"
        onAction={state.refreshLocation}
        icon="warning-outline"
      />
    );
  }

  // Loading awal
  if (state.loading && state.currentCoords === null) {
    return (
      <GlassCard style={styles.locationCard}>
        <Text style={styles.locationStatusText}>Memeriksa lokasi…</Text>
      </GlassCard>
    );
  }

  // Tampilan normal: jarak + status radius
  const jarakText =
    state.jarakMeter !== null ? `${state.jarakMeter} m` : 'Belum terhitung';
  const radiusText =
    state.labRadiusMeter !== null ? `${state.labRadiusMeter} m` : '-';

  return (
    <GlassCard style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <Ionicons
          name={state.isWithinRadius ? 'checkmark-circle' : 'alert-circle'}
          size={28}
          color={state.isWithinRadius ? Palette.primary : Palette.ink}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationTitle}>
            {state.isWithinRadius ? 'Di Dalam Radius' : 'Di Luar Radius'}
          </Text>
          <Text style={styles.locationMeta}>
            Jarak Anda ke {state.labName ?? 'Lab'}: {jarakText}
          </Text>
          <Text style={styles.locationMetaSub}>
            Batas radius maksimal: {radiusText}
          </Text>
        </View>
      </View>

      {!state.isWithinRadius && (
        <Text style={styles.locationWarning}>
          Anda berada di luar radius laboratorium. Dekati area praktikum lalu tekan Perbarui Lokasi.
        </Text>
      )}

      <View style={styles.actionsRow}>
        <Pressable
          onPress={state.refreshLocation}
          style={styles.refreshButton}
          disabled={state.loading}>
          <Ionicons name="refresh" size={16} color={Palette.text} />
          <Text style={styles.refreshButtonText}>
            {state.loading ? 'Memperbarui lokasi…' : 'Perbarui Lokasi'}
          </Text>
        </Pressable>

        {__DEV__ && !state.isWithinRadius && (
          <Pressable
            onPress={state.simulateAtLab}
            style={styles.testingSimulateBtn}>
            <Ionicons name="location" size={16} color="#FFFFFF" />
            <Text style={styles.testingSimulateText}>
              Simulasi Lokasi di Lab (Testing)
            </Text>
          </Pressable>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  locationCard: {
    gap: Spacing.two,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  locationMeta: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  locationMetaSub: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 1,
  },
  locationStatusText: {
    fontSize: 13,
    color: Palette.textMuted,
    textAlign: 'center',
  },
  locationWarning: {
    // Aturan warna seragam: merah hanya untuk error; kondisi di luar radius memakai hitam.
    fontSize: 12,
    fontWeight: '600',
    color: Palette.ink,
    lineHeight: 18,
  },
  actionsRow: {
    gap: 8,
    marginTop: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 999,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  testingSimulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.ink,
    borderRadius: 999,
    paddingVertical: 10,
  },
  testingSimulateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
