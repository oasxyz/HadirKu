import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/text-field';
import { Chip, GlassCard, PrimaryButton, Screen, TopBar } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useSessions } from '@/hooks/use-sessions';
import { usePraktikanList } from '@/hooks/use-users';
import { getAuthErrorMessage } from '@/utils/auth-error';

export default function JadwalFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sessions, createSession, updateSession } = useSessions();
  const { praktikanList } = usePraktikanList();

  const isEdit = Boolean(id);
  const existingSession = sessions.find((s) => s.id === id);

  const [praktikum, setPraktikum] = useState('');
  const [kelasLab, setKelasLab] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jamMulai, setJamMulai] = useState('');
  const [jamSelesai, setJamSelesai] = useState('');
  const [pesertaIds, setPesertaIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jika mode edit, isi form dengan data sesi yang dipilih
  useEffect(() => {
    if (existingSession) {
      setPraktikum(existingSession.praktikum);
      setKelasLab(existingSession.kelasLab);
      setTanggal(existingSession.tanggal);
      setJamMulai(existingSession.jamMulai);
      setJamSelesai(existingSession.jamSelesai);
      setPesertaIds(existingSession.pesertaIds);
    }
  }, [existingSession]);

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

      if (isEdit && id) {
        await updateSession(id, payload);
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