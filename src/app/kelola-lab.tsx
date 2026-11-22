import * as Location from 'expo-location';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Badge,
  GlassCard,
  IconCircle,
  PrimaryButton,
  Screen,
  SectionTitle,
  TopBar,
} from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useLabs } from '@/hooks/use-labs';
import { Logger } from '@/utils/logger';

// Koordinat referensi Lab FSM UNDIP (Lantai 2 Gedung E) dari file data asisten
const UNDIP_LAB_COORDS = {
  latitude: -7.0482375,
  longitude: 110.440765625,
  name: 'Lab FSM Undip (Gedung E Lt 2)',
};

export default function KelolaLabScreen() {
  const user = useCurrentUser();
  const { labs, loading, error: labsError, updateLab } = useLabs();

  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [latInput, setLatInput] = useState<string>('');
  const [lngInput, setLngInput] = useState<string>('');
  const [radiusInput, setRadiusInput] = useState<string>('50');
  const [fetchingGps, setFetchingGps] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const isSubmittingRef = useRef<boolean>(false);

  const activeLabId = selectedLabId || (labs.length > 0 ? labs[0].id : '');
  const selectedLab = labs.find((l) => l.id === activeLabId);

  // Inisialisasi atau sinkronkan form saat activeLabId berubah atau data lab diperbarui
  const [syncedKey, setSyncedKey] = useState<string>('');
  const currentKey = selectedLab
    ? `${selectedLab.id}_${selectedLab.latitude}_${selectedLab.longitude}_${selectedLab.radiusMeter}`
    : '';

  if (selectedLab && syncedKey !== currentKey) {
    setSyncedKey(currentKey);
    setLatInput(selectedLab.latitude.toString());
    setLngInput(selectedLab.longitude.toString());
    setRadiusInput(selectedLab.radiusMeter.toString());
    setFeedback(null);
  }

  function handleSelectLab(labId: string) {
    setSelectedLabId(labId);
    const lab = labs.find((l) => l.id === labId);
    if (lab) {
      setLatInput(lab.latitude.toString());
      setLngInput(lab.longitude.toString());
      setRadiusInput(lab.radiusMeter.toString());
      setFeedback(null);
    }
  }

  // Ambil lokasi GPS saat ini
  async function handleGetCurrentLocation() {
    setFetchingGps(true);
    setFeedback(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Izin Lokasi Ditolak',
          'Aplikasi membutuhkan izin lokasi untuk membaca koordinat GPS perangkat.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      setLatInput(loc.coords.latitude.toFixed(7));
      setLngInput(loc.coords.longitude.toFixed(7));
      setFeedback({
        type: 'success',
        message: 'Koordinat GPS saat ini berhasil diambil.',
      });
    } catch (err) {
      Logger.error('GEO', 'KELOLA_LAB_GPS', err);
      Alert.alert(
        'Gagal Mendeteksi Lokasi',
        'Pastikan GPS perangkat Anda aktif dan coba kembali.'
      );
    } finally {
      setFetchingGps(false);
    }
  }

  // Terapkan koordinat preset FSM Undip
  function handleUseUndipPreset() {
    setLatInput(UNDIP_LAB_COORDS.latitude.toString());
    setLngInput(UNDIP_LAB_COORDS.longitude.toString());
    setFeedback({
      type: 'success',
      message: `Koordinat ${UNDIP_LAB_COORDS.name} berhasil diterapkan.`,
    });
  }

  // Simpan perubahan lokasi dan radius lab
  async function handleSave() {
    if (isSubmittingRef.current || saving) return;

    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    const radius = parseInt(radiusInput, 10);

    if (isNaN(lat) || isNaN(lng)) {
      setFeedback({
        type: 'error',
        message: 'Koordinat latitude dan longitude wajib berupa angka desimal yang valid.',
      });
      return;
    }

    if (isNaN(radius) || radius < 20 || radius > 200) {
      setFeedback({
        type: 'error',
        message: 'Batas radius presensi harus di antara 20 sampai 200 meter.',
      });
      return;
    }

    if (!activeLabId) {
      setFeedback({
        type: 'error',
        message: 'Silakan pilih laboratorium terlebih dahulu.',
      });
      return;
    }

    isSubmittingRef.current = true;
    setSaving(true);
    setFeedback(null);

    try {
      await updateLab(
        activeLabId,
        {
          latitude: lat,
          longitude: lng,
          radiusMeter: radius,
        },
        user?.nama ?? 'Asisten'
      );

      setFeedback({
        type: 'success',
        message: `Pengaturan lokasi ${selectedLab?.namaLab ?? 'Lab'} berhasil disimpan.`,
      });
    } catch (err: unknown) {
      Logger.error('FIRESTORE', 'UPDATE_LAB', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan lab.';
      setFeedback({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <Screen
      withTabBar={false}
      header={<TopBar title="Kelola Lokasi Lab" back fallback="/jadwal" />}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {loading ? (
          <GlassCard style={styles.loadingCard}>
            <ActivityIndicator size="small" color={Palette.primary} />
            <Text style={styles.loadingText}>Memuat data laboratorium…</Text>
          </GlassCard>
        ) : labsError ? (
          <GlassCard style={styles.errorCard}>
            <Text style={styles.errorText}>{labsError}</Text>
          </GlassCard>
        ) : (
          <View style={styles.container}>
            {/* 1. Pilih Laboratorium */}
            <SectionTitle title="Pilih Laboratorium" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.labPillRow}
            >
              {labs.map((lab) => {
                const isSelected = lab.id === activeLabId;
                return (
                  <Pressable
                    key={lab.id}
                    onPress={() => handleSelectLab(lab.id)}
                    style={[styles.labPill, isSelected && styles.labPillSelected]}
                  >
                    <Text
                      style={[styles.labPillText, isSelected && styles.labPillTextSelected]}
                    >
                      {lab.namaLab}
                    </Text>
                    {isSelected && (
                      <Badge label={`${lab.radiusMeter}m`} tone="primary" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {selectedLab && (
              <>
                {/* 2. Kartu Koordinat Lokasi */}
                <GlassCard style={styles.card}>
                  <View style={styles.cardHeader}>
                    <IconCircle icon="location" tint={0} size={42} />
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardTitle}>{selectedLab.namaLab}</Text>
                      <Text style={styles.cardSubtitle}>
                        {selectedLab.deskripsi || 'Titik acuan validasi presensi'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.label}>Latitude</Text>
                      <TextInput
                        style={styles.input}
                        value={latInput}
                        onChangeText={setLatInput}
                        keyboardType="numeric"
                        placeholder="-7.0491"
                        placeholderTextColor={Palette.textMuted}
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.label}>Longitude</Text>
                      <TextInput
                        style={styles.input}
                        value={lngInput}
                        onChangeText={setLngInput}
                        keyboardType="numeric"
                        placeholder="110.4391"
                        placeholderTextColor={Palette.textMuted}
                      />
                    </View>
                  </View>

                  {/* Tombol Ambil Lokasi & Shortcut Preset */}
                  <View style={styles.actionRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.gpsButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={handleGetCurrentLocation}
                      disabled={fetchingGps}
                    >
                      {fetchingGps ? (
                        <ActivityIndicator size="small" color={Palette.primary} />
                      ) : (
                        <Text style={styles.gpsButtonText}>
                          📍 Gunakan Lokasi Saya
                        </Text>
                      )}
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.presetButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={handleUseUndipPreset}
                    >
                      <Text style={styles.presetButtonText}>🏫 Titik FSM Undip</Text>
                    </Pressable>
                  </View>
                </GlassCard>

                {/* 3. Kartu Radius Presensi */}
                <GlassCard style={styles.card}>
                  <View style={styles.radiusHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Radius Presensi</Text>
                      <Text style={styles.cardSubtitle}>
                        Batas toleransi jarak presensi (20–200 m)
                      </Text>
                    </View>
                    <Badge label={`${radiusInput || 0} meter`} tone="primary" />
                  </View>

                  <View style={styles.radiusInputRow}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() => {
                        const cur = parseInt(radiusInput, 10) || 50;
                        setRadiusInput(Math.max(20, cur - 10).toString());
                      }}
                    >
                      <Text style={styles.stepButtonText}>- 10m</Text>
                    </Pressable>

                    <TextInput
                      style={[styles.input, styles.radiusNumberInput]}
                      value={radiusInput}
                      onChangeText={setRadiusInput}
                      keyboardType="number-pad"
                      maxLength={3}
                    />

                    <Pressable
                      style={styles.stepButton}
                      onPress={() => {
                        const cur = parseInt(radiusInput, 10) || 50;
                        setRadiusInput(Math.min(200, cur + 10).toString());
                      }}
                    >
                      <Text style={styles.stepButtonText}>+ 10m</Text>
                    </Pressable>
                  </View>

                  {/* Preset Cepat Radius */}
                  <View style={styles.radiusChips}>
                    {[30, 50, 75, 100].map((r) => (
                      <Pressable
                        key={r}
                        style={[
                          styles.radiusChip,
                          radiusInput === r.toString() && styles.radiusChipActive,
                        ]}
                        onPress={() => setRadiusInput(r.toString())}
                      >
                        <Text
                          style={[
                            styles.radiusChipText,
                            radiusInput === r.toString() && styles.radiusChipTextActive,
                          ]}
                        >
                          {r}m
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </GlassCard>

                {/* Feedback status */}
                {feedback && (
                  <View
                    style={[
                      styles.feedbackBox,
                      feedback.type === 'error'
                        ? styles.feedbackError
                        : styles.feedbackSuccess,
                    ]}
                  >
                    <Text
                      style={[
                        styles.feedbackText,
                        feedback.type === 'error'
                          ? styles.feedbackTextError
                          : styles.feedbackTextSuccess,
                      ]}
                    >
                      {feedback.message}
                    </Text>
                  </View>
                )}

                {/* Tombol Simpan */}
                <PrimaryButton
                  label={saving ? 'Menyimpan Pengaturan…' : 'Simpan Lokasi Lab'}
                  onPress={handleSave}
                  style={styles.saveButton}
                />
              </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  loadingCard: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Palette.textSecondary,
    fontSize: 14,
  },
  errorCard: {
    padding: 20,
    backgroundColor: Palette.dangerMuted,
  },
  errorText: {
    color: Palette.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  labPillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  labPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  labPillSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: Palette.primary,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  labPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  labPillTextSelected: {
    color: Palette.ink,
    fontWeight: '700',
  },
  card: {
    padding: 18,
    borderRadius: 24,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gpsButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Palette.primaryMuted,
    borderWidth: 1,
    borderColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsButtonText: {
    color: Palette.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  presetButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetButtonText: {
    color: Palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radiusInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Palette.lavender,
    borderRadius: 14,
  },
  stepButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink,
  },
  radiusNumberInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  radiusChips: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  radiusChipActive: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  radiusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  radiusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  feedbackBox: {
    padding: 14,
    borderRadius: 16,
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  feedbackError: {
    backgroundColor: Palette.dangerMuted,
    borderWidth: 1,
    borderColor: Palette.danger,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackTextSuccess: {
    color: '#15803d',
    fontWeight: '600',
  },
  feedbackTextError: {
    color: Palette.danger,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 8,
  },
  pressed: {
    opacity: 0.75,
  },
});
