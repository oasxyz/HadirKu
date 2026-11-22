// Kartu kelas praktikum di Profil praktikan.
// - Belum punya kelas (akun lama): pilih kelas sendiri sekali.
// - Sudah punya kelas: pindah kelas lewat pengajuan yang diputuskan asisten yang memegangnya.
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PelacakPengajuan } from '@/components/pelacak-pengajuan';
import { useToast } from '@/components/toast';
import { Badge, SelectField, type BadgeTone } from '@/components/ui';
import { OPSI_KELAS } from '@/constants/kelas';
import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { usePengajuanKelasSaya } from '@/hooks/use-pengajuan-kelas';
import { useSessions } from '@/hooks/use-sessions';
import { Logger } from '@/utils/logger';

const MIN_ALASAN = 10;

export function KartuKelasPraktikan() {
  const { currentUser, ubahKelas, reloadProfile } = useAuth();
  const { sessions } = useSessions();
  const { pengajuan, ajukan } = usePengajuanKelasSaya();
  const { tampilkanToast } = useToast();

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [kelasBaru, setKelasBaru] = useState('');
  const [alasan, setAlasan] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [pesanSalah, setPesanSalah] = useState<string | null>(null);

  // Asisten yang memegang praktikan = pembuat sesi yang mencantumkannya.
  const asistenIds = useMemo(
    () => [...new Set(sessions.map((s) => s.asistenId).filter(Boolean))],
    [sessions],
  );

  const kelasSaatIni = currentUser?.kelas;
  const menunggu = pengajuan?.status === 'menunggu';

  // Setelah asisten menerima, kelas di dokumen users sudah berganti; muat ulang profil.
  useEffect(() => {
    if (pengajuan?.status === 'diterima' && pengajuan.kelasBaru !== kelasSaatIni) {
      reloadProfile().catch(() => undefined);
    }
  }, [pengajuan?.status, pengajuan?.kelasBaru, kelasSaatIni, reloadProfile]);

  if (!currentUser) return null;

  async function pilihKelasPertama(kelas: string) {
    try {
      await ubahKelas(kelas);
      tampilkanToast(`Sesi baru kelas ${kelas} akan otomatis mencantumkanmu.`, 'sukses', 'Kelas disimpan');
    } catch (err) {
      Logger.error('FIRESTORE', 'pilihKelasPertama', err);
      tampilkanToast('Periksa koneksi internet lalu coba lagi.', 'error', 'Kelas gagal disimpan');
    }
  }

  function tutupForm() {
    setFormTerbuka(false);
    setKelasBaru('');
    setAlasan('');
    setPesanSalah(null);
  }

  async function kirim() {
    if (!kelasBaru) return setPesanSalah('Pilih kelas tujuan');
    if (kelasBaru === kelasSaatIni) return setPesanSalah('Kelas tujuan sama dengan kelasmu sekarang');
    if (alasan.trim().length < MIN_ALASAN) {
      return setPesanSalah(`Jelaskan alasan minimal ${MIN_ALASAN} karakter`);
    }
    try {
      setMengirim(true);
      await ajukan({ kelasBaru, alasan, asistenIds });
      tutupForm();
      tampilkanToast('Asisten akan memeriksa pengajuanmu.', 'sukses', 'Pindah kelas diajukan');
    } catch (err) {
      Logger.error('FIRESTORE', 'ajukanPindahKelas', err);
      // Form berada di dalam Modal, jadi pesan juga ditampilkan di form.
      setPesanSalah('Pengajuan gagal dikirim. Periksa koneksi internet lalu coba lagi.');
    } finally {
      setMengirim(false);
    }
  }

  // Akun lama tanpa kelas: boleh memilih sendiri satu kali.
  if (!kelasSaatIni) {
    return (
      <View style={styles.kartu}>
        <SelectField
          label="Kelas Praktikum"
          value={undefined}
          options={OPSI_KELAS}
          onSelect={pilihKelasPertama}
          error
        />
        <Text style={styles.petunjuk}>
          Pilih kelasmu supaya otomatis terdaftar di sesi praktikum kelas tersebut. Setelah ini,
          pindah kelas perlu persetujuan asisten.
        </Text>
      </View>
    );
  }

  const tonePengajuan: BadgeTone =
    pengajuan?.status === 'diterima' ? 'primary' : pengajuan?.status === 'ditolak' ? 'dark' : 'muted';
  const labelPengajuan =
    pengajuan?.status === 'diterima' ? 'Diterima' : pengajuan?.status === 'ditolak' ? 'Ditolak' : 'Menunggu';

  return (
    <View style={styles.kartu}>
      <View style={styles.baris}>
        <View style={{ flex: 1 }}>
          <Text style={styles.judul}>Kelas Praktikum</Text>
          <Text style={styles.petunjuk}>Pindah kelas perlu persetujuan asisten.</Text>
        </View>
        <View style={styles.kotakKelas}>
          <Text style={styles.kotakKelasTeks}>{kelasSaatIni}</Text>
        </View>
      </View>

      {pengajuan ? (
        <View style={styles.pengajuan}>
          <View style={styles.baris}>
            <Text style={styles.pengajuanJudul}>
              Pindah {pengajuan.kelasLama ?? '–'} → {pengajuan.kelasBaru}
            </Text>
            <Badge label={labelPengajuan} tone={tonePengajuan} />
          </View>
          <PelacakPengajuan
            status={pengajuan.status}
            createdAt={pengajuan.createdAt}
            diputuskanAt={pengajuan.diputuskanAt}
          />
          {pengajuan.diputuskanOleh ? (
            <Text style={styles.keputusan}>Diputuskan {pengajuan.diputuskanOleh}</Text>
          ) : null}
        </View>
      ) : null}

      {asistenIds.length === 0 ? (
        <Text style={styles.petunjuk}>
          Belum ada asisten yang memegangmu, jadi pindah kelas belum bisa diajukan.
        </Text>
      ) : (
        <Pressable
          onPress={() => setFormTerbuka(true)}
          disabled={menunggu}
          accessibilityRole="button"
          style={({ pressed }) => [styles.tombol, menunggu && styles.tombolMati, pressed && { opacity: 0.8 }]}>
          <Text style={styles.tombolTeks}>
            {menunggu ? 'Pengajuan sedang diperiksa' : 'Ajukan pindah kelas'}
          </Text>
        </Pressable>
      )}

      <Modal visible={formTerbuka} transparent animationType="fade" onRequestClose={tutupForm}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
              <Text style={styles.modalJudul}>Ajukan Pindah Kelas</Text>
              <Text style={styles.petunjuk}>Kelasmu sekarang {kelasSaatIni}.</Text>
              <SelectField
                label="Kelas tujuan"
                value={kelasBaru}
                options={OPSI_KELAS.filter((o) => o.value !== kelasSaatIni)}
                onSelect={(k) => {
                  setKelasBaru(k);
                  setPesanSalah(null);
                }}
                error={Boolean(pesanSalah && !kelasBaru)}
              />
              <Text style={styles.label}>Alasan</Text>
              <TextInput
                style={styles.textarea}
                value={alasan}
                onChangeText={(t) => {
                  setAlasan(t);
                  setPesanSalah(null);
                }}
                placeholder={`Mis. bentrok jadwal kuliah (min. ${MIN_ALASAN} karakter)`}
                placeholderTextColor={Palette.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!mengirim}
              />
              {pesanSalah ? <Text style={styles.salah}>{pesanSalah}</Text> : null}
              <View style={styles.aksi}>
                <Pressable onPress={tutupForm} disabled={mengirim} style={styles.batal}>
                  <Text style={styles.batalTeks}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={kirim}
                  disabled={mengirim}
                  style={[styles.kirim, mengirim && { opacity: 0.6 }]}>
                  {mengirim ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.tombolTeks}>Kirim</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  kartu: {
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  baris: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  judul: { color: Palette.text, fontSize: 14, fontWeight: '600' },
  petunjuk: { color: Palette.textSecondary, fontSize: 12, lineHeight: 17 },
  kotakKelas: {
    backgroundColor: Palette.ink,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kotakKelasTeks: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  pengajuan: {
    backgroundColor: '#FFFFFF',
    borderColor: Palette.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  pengajuanJudul: { color: Palette.text, flex: 1, fontSize: 13, fontWeight: '700' },
  keputusan: { color: Palette.textMuted, fontSize: 11, textAlign: 'center' },
  tombol: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    paddingVertical: 12,
  },
  tombolMati: { opacity: 0.4 },
  tombolTeks: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 20, 50, 0.4)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '85%',
    padding: Spacing.four,
    width: '100%',
  },
  modalJudul: { color: Palette.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  label: { color: Palette.text, fontSize: 13, fontWeight: '600' },
  textarea: {
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
    borderRadius: 12,
    borderWidth: 1,
    color: Palette.text,
    minHeight: 90,
    padding: 12,
  },
  salah: { color: Palette.danger, fontSize: 13 },
  aksi: { flexDirection: 'row', gap: Spacing.two, marginTop: 4 },
  batal: {
    alignItems: 'center',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  batalTeks: { color: Palette.text, fontSize: 14, fontWeight: '700' },
  kirim: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 12,
  },
});
