import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TextField } from '@/components/text-field';
import {
  Chip,
  DateTimeField,
  EmptyNote,
  GlassCard,
  PrimaryButton,
  Screen,
  SelectField,
  TopBar,
} from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useLabs } from '@/hooks/use-labs';
import { useSessions } from '@/hooks/use-sessions';
import { usePraktikanList } from '@/hooks/use-users';
import { kirimNotifikasi, pesanJadwalBerubah } from '@/services/notifications';
import type { Session } from '@/types';
import { getAuthErrorMessage } from '@/utils/auth-error';
import { Logger } from '@/utils/logger';

function dateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function timeToHm(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function hmToDate(hm: string, baseDate?: Date): Date {
  const [h, m] = hm.split(':').map(Number);
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setHours(isNaN(h) ? 8 : h, isNaN(m) ? 0 : m, 0, 0);
  return d;
}

export default function JadwalFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sessions, loading: sessionsLoading } = useSessions();

  if (id && sessionsLoading) {
    return (
      <Screen
        withTabBar={false}
        header={<TopBar title="Ubah Sesi Praktikum" back fallback="/jadwal" />}>
        <GlassCard style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={styles.loadingText}>Memuat sesi…</Text>
        </GlassCard>
      </Screen>
    );
  }

  const existingSession = id ? sessions.find((s) => s.id === id) : undefined;

  if (id && !existingSession) {
    return (
      <Screen
        withTabBar={false}
        header={<TopBar title="Ubah Sesi Praktikum" back fallback="/jadwal" />}>
        <EmptyNote message="Sesi praktikum tidak ditemukan atau telah dihapus." />
      </Screen>
    );
  }

  return (
    <JadwalFormContent
      key={existingSession?.id ?? 'baru'}
      sessionId={id}
      initial={existingSession}
    />
  );
}

function JadwalFormContent({
  sessionId,
  initial,
}: {
  sessionId?: string;
  initial?: Session;
}) {
  const { createSession, updateSession } = useSessions();
  const { labs } = useLabs();
  const { praktikanList } = usePraktikanList();

  const isEdit = Boolean(initial);

  // Field states
  const [praktikum, setPraktikum] = useState(initial?.praktikum ?? '');
  const [labIdState, setLabIdState] = useState<string | null>(initial?.labId ?? null);
  const [kelasLab, setKelasLab] = useState(initial?.kelasLab ?? '');

  // Date and Time states (Date objects for DateTimeField)
  const [tanggalDate, setTanggalDate] = useState<Date>(() =>
    initial?.tanggal ? ymdToDate(initial.tanggal) : new Date()
  );
  const [jamMulaiDate, setJamMulaiDate] = useState<Date>(() =>
    initial?.jamMulai ? hmToDate(initial.jamMulai) : hmToDate('08:00')
  );
  const [jamSelesaiDate, setJamSelesaiDate] = useState<Date>(() =>
    initial?.jamSelesai ? hmToDate(initial.jamSelesai) : hmToDate('10:00')
  );

  const [pesertaIds, setPesertaIds] = useState<string[]>(initial?.pesertaIds ?? []);
  const [searchPraktikan, setSearchPraktikan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubmittingRef = useRef<boolean>(false);

  // Lab yang aktif: prioritaskan yang dipilih, atau fallback ke lab pertama
  const labId = labIdState || (labs.length > 0 ? labs[0].id : '');
  const currentLab = labs.find((l) => l.id === labId);

  // Opsi Dropdown Lab
  const labOptions = useMemo(
    () =>
      labs.map((l) => ({
        label: l.namaLab,
        value: l.id,
        subtitle: `Radius: ${l.radiusMeter}m`,
      })),
    [labs]
  );

  // Peserta yang terfilter pencarian
  const filteredPraktikan = useMemo(() => {
    const q = searchPraktikan.trim().toLowerCase();
    if (!q) return praktikanList;
    return praktikanList.filter(
      (p) => p.nama.toLowerCase().includes(q) || p.nim.toLowerCase().includes(q)
    );
  }, [praktikanList, searchPraktikan]);

  function togglePeserta(userId: string) {
    if (pesertaIds.includes(userId)) {
      setPesertaIds(pesertaIds.filter((p) => p !== userId));
    } else {
      setPesertaIds([...pesertaIds, userId]);
    }
    if (error) setError(null);
  }

  function handleSelectAllPeserta() {
    const allFilteredIds = filteredPraktikan.map((p) => p.id);
    const merged = Array.from(new Set([...pesertaIds, ...allFilteredIds]));
    setPesertaIds(merged);
  }

  function handleResetPeserta() {
    setPesertaIds([]);
  }

  function validate() {
    if (!praktikum.trim()) return 'Nama praktikum wajib diisi';
    if (!labId) return 'Laboratorium wajib dipilih';
    if (!kelasLab.trim()) return 'Kelas praktikum wajib diisi';

    const hmStart = timeToHm(jamMulaiDate);
    const hmEnd = timeToHm(jamSelesaiDate);

    if (hmStart >= hmEnd) {
      return 'Jam selesai harus lebih lambat dari jam mulai';
    }

    if (pesertaIds.length === 0) {
      return 'Pilih minimal satu praktikan sebagai peserta';
    }

    return null;
  }

  async function handleSave() {
    if (isSubmittingRef.current || loading) return;

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError(null);

    const tanggalStr = dateToYmd(tanggalDate);
    const jamMulaiStr = timeToHm(jamMulaiDate);
    const jamSelesaiStr = timeToHm(jamSelesaiDate);

    const payload = {
      praktikum: praktikum.trim(),
      labId,
      kelasLab: kelasLab.trim(),
      tanggal: tanggalStr,
      jamMulai: jamMulaiStr,
      jamSelesai: jamSelesaiStr,
      pesertaIds,
    };

    try {
      if (isEdit && sessionId) {
        await updateSession(sessionId, payload);

        // SRS 5.4: Picu notifikasi jadwal_berubah jika tanggal, jam, atau lab diubah
        const isChanged =
          initial?.tanggal !== tanggalStr ||
          initial?.jamMulai !== jamMulaiStr ||
          initial?.jamSelesai !== jamSelesaiStr ||
          initial?.labId !== labId;

        if (isChanged) {
          const pesan = pesanJadwalBerubah(
            {
              id: sessionId,
              praktikum: payload.praktikum,
              kelasLab: payload.kelasLab,
              tanggal: payload.tanggal,
              jamMulai: payload.jamMulai,
              jamSelesai: payload.jamSelesai,
              pesertaIds: payload.pesertaIds,
            },
            currentLab?.namaLab
          );
          // Jangan await blocking agar navigasi tetap instan
          kirimNotifikasi(pesan).catch((err) =>
            Logger.error('FCM', 'NOTIF_JADWAL_BERUBAH', err)
          );
        }
      } else {
        await createSession(payload);
      }

      router.back();
    } catch (e: unknown) {
      Logger.error('FIRESTORE', 'SAVE_SESSION', e);
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <Screen
      withTabBar={false}
      header={
        <TopBar
          title={isEdit ? 'Ubah Sesi Praktikum' : 'Tambah Sesi Praktikum'}
          back
          fallback="/jadwal"
        />
      }>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.formContainer}>
          {/* Card 1: Informasi Praktikum & Waktu */}
          <GlassCard style={styles.card}>
            <Text style={styles.cardSectionHeader}>Informasi Sesi</Text>

            <TextField
              label="Nama Praktikum"
              value={praktikum}
              onChangeText={(text) => {
                setPraktikum(text);
                if (error) setError(null);
              }}
              placeholder="Contoh: Pemrograman Perangkat Bergerak"
              error={error && !praktikum.trim() ? 'Wajib diisi' : undefined}
            />

            <TextField
              label="Kelas"
              value={kelasLab}
              onChangeText={(text) => {
                setKelasLab(text);
                if (error) setError(null);
              }}
              placeholder="Contoh: Kelas A / Sesi 1"
              error={error && !kelasLab.trim() ? 'Wajib diisi' : undefined}
            />

            {/* SelectField Laboratorium dari Koleksi labs */}
            <View>
              <SelectField
                label="Laboratorium"
                value={labId}
                options={labOptions}
                onSelect={(val) => {
                  setLabIdState(val);
                  if (error) setError(null);
                }}
                error={Boolean(error && !labId)}
              />
              <View style={styles.labSubInfo}>
                <Text style={styles.labRadiusText}>
                  Radius presensi:{' '}
                  <Text style={{ fontWeight: '700', color: Palette.primary }}>
                    {currentLab ? `${currentLab.radiusMeter} m` : '50 m'}
                  </Text>
                </Text>
                <Pressable
                  onPress={() => router.push('/kelola-lab' as any)}
                  style={styles.manageLabLink}
                >
                  <Ionicons name="map-outline" size={13} color={Palette.primary} />
                  <Text style={styles.manageLabLinkText}>Kelola lokasi lab</Text>
                </Pressable>
              </View>
            </View>

            {/* DateTimeField Tanggal (Native Date Picker) */}
            <DateTimeField
              label="Tanggal Pelaksanaan"
              mode="date"
              value={tanggalDate}
              onChange={(d) => {
                setTanggalDate(d);
                if (error) setError(null);
              }}
            />

            {/* DateTimeField Jam Mulai & Jam Selesai Berdampingan */}
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  label="Jam Mulai"
                  mode="time"
                  value={jamMulaiDate}
                  onChange={(d) => {
                    setJamMulaiDate(d);
                    if (error) setError(null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  label="Jam Selesai"
                  mode="time"
                  value={jamSelesaiDate}
                  onChange={(d) => {
                    setJamSelesaiDate(d);
                    if (error) setError(null);
                  }}
                />
              </View>
            </View>
          </GlassCard>

          {/* Card 2: Pemilihan Peserta */}
          <GlassCard style={styles.card}>
            <View style={styles.pesertaHeaderRow}>
              <View>
                <Text style={styles.cardSectionHeader}>Peserta Praktikum</Text>
                <Text style={styles.pesertaCounter}>
                  {pesertaIds.length} praktikan terpilih
                </Text>
              </View>
              <View style={styles.pesertaActionButtons}>
                <Pressable onPress={handleSelectAllPeserta}>
                  <Text style={styles.pesertaActionText}>Pilih Semua</Text>
                </Pressable>
                <Text style={styles.pesertaActionDivider}>•</Text>
                <Pressable onPress={handleResetPeserta}>
                  <Text style={styles.pesertaActionText}>Reset</Text>
                </Pressable>
              </View>
            </View>

            <TextField
              label="Cari Praktikan"
              value={searchPraktikan}
              onChangeText={setSearchPraktikan}
              placeholder="Cari nama atau NIM praktikan…"
            />

            <View style={styles.chipsContainer}>
              {filteredPraktikan.length === 0 ? (
                <Text style={styles.emptyPraktikanText}>
                  {praktikanList.length === 0
                    ? 'Belum ada data praktikan di sistem.'
                    : 'Tidak ada praktikan yang cocok dengan pencarian.'}
                </Text>
              ) : (
                filteredPraktikan.map((p) => {
                  const selected = pesertaIds.includes(p.id);
                  return (
                    <Chip
                      key={p.id}
                      label={`${p.nama} (${p.nim})`}
                      selected={selected}
                      icon={selected ? 'checkmark' : undefined}
                      onPress={() => togglePeserta(p.id)}
                    />
                  );
                })
              )}
            </View>
          </GlassCard>

          {/* Pesan Error Validasi */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Palette.danger} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Tombol Simpan Sesi */}
          <PrimaryButton
            label={
              loading
                ? 'Menyimpan Sesi…'
                : isEdit
                  ? 'Simpan Perubahan Sesi'
                  : 'Buat Sesi Praktikum'
            }
            onPress={handleSave}
            style={styles.saveButton}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Palette.textSecondary,
    fontSize: 14,
  },
  formContainer: {
    gap: 16,
    paddingBottom: 24,
  },
  card: {
    padding: 18,
    borderRadius: 24,
    gap: 14,
  },
  cardSectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  labSubInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  labRadiusText: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  manageLabLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageLabLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pesertaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pesertaCounter: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  pesertaActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pesertaActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  pesertaActionDivider: {
    color: Palette.textMuted,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  emptyPraktikanText: {
    fontSize: 13,
    color: Palette.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Palette.dangerMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.danger,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: Palette.danger,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 8,
  },
});
