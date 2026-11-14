import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/text-field';
import {
  Chip,
  EmptyNote,
  GlassCard,
  PrimaryButton,
  Screen,
  TopBar,
} from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useSessions } from '@/hooks/use-sessions';
import { usePraktikanList } from '@/hooks/use-users';
import type { Session } from '@/types';
import { getAuthErrorMessage } from '@/utils/auth-error';

export default function JadwalFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sessions, loading } = useSessions();

  if (id && loading) {
    return (
      <Screen withTabBar={false}>
        <TopBar title="Ubah Sesi" back fallback="/jadwal" />
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
      <Screen withTabBar={false}>
        <TopBar title="Ubah Sesi" back fallback="/jadwal" />
        <EmptyNote message="Sesi praktikum tidak ditemukan atau telah dihapus." />
      </Screen>
    );
  }

  // Form di-mount ulang per sesi lewat `key`, sehingga nilai awal cukup diambil sekali
  // saat render pertama tanpa setState di dalam effect.
  return (
    <JadwalForm
      key={existingSession?.id ?? 'baru'}
      sessionId={id}
      initial={existingSession}
    />
  );
}

function JadwalForm({ sessionId, initial }: { sessionId?: string; initial?: Session }) {
  const { createSession, updateSession } = useSessions();
  const { praktikanList } = usePraktikanList();

  const isEdit = Boolean(initial);

  const [praktikum, setPraktikum] = useState(initial?.praktikum ?? '');
  const [kelasLab, setKelasLab] = useState(initial?.kelasLab ?? '');
  const [tanggal, setTanggal] = useState(initial?.tanggal ?? '');
  const [jamMulai, setJamMulai] = useState(initial?.jamMulai ?? '');
  const [jamSelesai, setJamSelesai] = useState(initial?.jamSelesai ?? '');
  const [pesertaIds, setPesertaIds] = useState<string[]>(initial?.pesertaIds ?? []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePeserta(userId: string) {
    if (pesertaIds.includes(userId)) {
      setPesertaIds(pesertaIds.filter((p) => p !== userId));
    } else {
      setPesertaIds([...pesertaIds, userId]);
    }
    if (error) setError(null);
  }

  function validate() {
    if (!praktikum.trim() || !kelasLab.trim() || !tanggal.trim() || !jamMulai.trim() || !jamSelesai.trim()) {
      return 'Semua kolom formulir wajib diisi';
    }

    // Validasi format tanggal YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal.trim())) {
      return 'Format tanggal harus YYYY-MM-DD (contoh: 2026-11-20)';
    }

    // Validasi format jam HH:mm
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(jamMulai.trim()) || !timeRegex.test(jamSelesai.trim())) {
      return 'Format jam harus HH:mm (contoh: 08:00)';
    }

    if (jamMulai.trim() >= jamSelesai.trim()) {
      return 'Jam selesai harus lebih lambat dari jam mulai';
    }

    if (pesertaIds.length === 0) {
      return 'Pilih minimal satu praktikan sebagai peserta';
    }

    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const payload = {
        praktikum: praktikum.trim(),
        kelasLab: kelasLab.trim(),
        tanggal: tanggal.trim(),
        jamMulai: jamMulai.trim(),
        jamSelesai: jamSelesai.trim(),
        pesertaIds,
      };

      if (isEdit && sessionId) {
        await updateSession(sessionId, payload);
      } else {
        await createSession(payload);
      }

      router.back();
    } catch (e: any) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen withTabBar={false}>
      <TopBar title={isEdit ? 'Ubah Sesi' : 'Tambah Sesi'} back fallback="/jadwal" />

      <GlassCard style={styles.sheet}>
        <Text style={styles.heading}>{isEdit ? 'Perbarui Jadwal Sesi' : 'Jadwal Sesi Baru'}</Text>
        <Text style={styles.subtitle}>
          Isi informasi sesi praktikum dan tentukan praktikan yang akan mengikuti sesi ini.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <TextField
            label="Mata Praktikum"
            placeholder="Contoh: Praktikum Jaringan Komputer"
            value={praktikum}
            onChangeText={(text) => {
              setPraktikum(text);
              if (error) setError(null);
            }}
          />

          <TextField
            label="Kelas / Ruangan Lab"
            placeholder="Contoh: Lab 2 (Lantai 3)"
            value={kelasLab}
            onChangeText={(text) => {
              setKelasLab(text);
              if (error) setError(null);
            }}
          />

          <TextField
            label="Tanggal Praktikum"
            placeholder="YYYY-MM-DD (Contoh: 2026-11-20)"
            value={tanggal}
            onChangeText={(text) => {
              setTanggal(text);
              if (error) setError(null);
            }}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <TextField
                label="Jam Mulai"
                placeholder="HH:mm (08:00)"
                value={jamMulai}
                onChangeText={(text) => {
                  setJamMulai(text);
                  if (error) setError(null);
                }}
              />
            </View>
            <View style={styles.col}>
              <TextField
                label="Jam Selesai"
                placeholder="HH:mm (10:00)"
                value={jamSelesai}
                onChangeText={(text) => {
                  setJamSelesai(text);
                  if (error) setError(null);
                }}
              />
            </View>
          </View>

          {/* Pemilihan Peserta */}
          <View style={styles.pesertaSection}>
            <Text style={styles.pesertaLabel}>Pilih Peserta Praktikum ({pesertaIds.length} dipilih)</Text>
            {praktikanList.length === 0 ? (
              <Text style={styles.emptyPeserta}>
                Belum ada akun praktikan yang terdaftar di sistem.
              </Text>
            ) : (
              <View style={styles.chips}>
                {praktikanList.map((user) => {
                  const selected = pesertaIds.includes(user.id);
                  return (
                    <Chip
                      key={user.id}
                      label={`${user.nama} (${user.nim})`}
                      selected={selected}
                      onPress={() => togglePeserta(user.id)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <PrimaryButton
          label={loading ? 'Menyimpan…' : 'Simpan Sesi'}
          onPress={handleSave}
          disabled={loading}
        />
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    alignItems: 'center',
    borderRadius: 36,
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: Palette.textSecondary,
    fontSize: 14,
  },
  sheet: {
    borderRadius: 36,
    gap: 16,
    padding: 24,
  },
  heading: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    borderColor: 'rgba(225, 29, 72, 0.3)',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    color: Palette.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  pesertaSection: {
    gap: 8,
    marginTop: 4,
  },
  pesertaLabel: {
    color: Palette.textMuted,
    fontSize: 12,
    fontWeight: '500',
    paddingLeft: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyPeserta: {
    color: Palette.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    paddingLeft: 4,
  },
});
