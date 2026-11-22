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
import { useToast } from '@/components/toast';
import {
  DateTimeField,
  EmptyNote,
  GlassCard,
  Screen,
  SelectField,
  TopBar,
} from '@/components/ui';
import { kodeKelasDari, OPSI_KELAS } from '@/constants/kelas';
import { opsiPraktikum } from '@/constants/praktikum';
import { Palette } from '@/constants/theme';
import { useSesiSemuaAsisten } from '@/components/peta/use-sesi-semua-asisten';
import { useCurrentUser } from '@/context/auth-context';
import { useLabs } from '@/hooks/use-labs';
import { useSessions } from '@/hooks/use-sessions';
import { usePraktikanList } from '@/hooks/use-users';
import { kirimNotifikasi, pesanJadwalBerubah } from '@/services/notifications';
import type { Session } from '@/types';
import { getAuthErrorMessage } from '@/utils/auth-error';
import { cariBentrokAsisten, cariBentrokLab } from '@/utils/bentrok-lab';
import { formatTanggalSingkat } from '@/utils/format';
import { JAM_BUKA_LAB, JAM_TUTUP_LAB, validasiWaktuSesi } from '@/utils/waktu-sesi';
import { Logger } from '@/utils/logger';

// Jumlah baris praktikan per halaman pada tabel peserta.
const PESERTA_PER_HALAMAN = 5;

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
  const currentUser = useCurrentUser();
  // Semua sesi (termasuk milik asisten lain) untuk mengecek bentrok pemakaian lab.
  const { sessions: semuaSesi } = useSesiSemuaAsisten();

  const isEdit = Boolean(initial);

  // Field states
  const [praktikum, setPraktikum] = useState(initial?.praktikum ?? '');
  const [labIdState, setLabIdState] = useState<string | null>(initial?.labId ?? null);
  // Kelas memakai kode baku (A1–F2). Sesi lama berteks bebas yang tidak cocok harus dipilih ulang.
  const [kelasLab, setKelasLab] = useState(kodeKelasDari(initial?.kelasLab) ?? '');

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
  // Form bertahap: 1 Info, 2 Waktu & lab, 3 Peserta.
  const [langkah, setLangkah] = useState<Langkah>(1);

  const isSubmittingRef = useRef<boolean>(false);
  const { tampilkanToast } = useToast();
  // Daftar peserta ditampilkan per halaman supaya kartu tidak memanjang.
  const [halamanPeserta, setHalamanPeserta] = useState(0);

  // Lab yang aktif: prioritaskan yang dipilih, atau fallback ke lab pertama
  const labId = labIdState || (labs.length > 0 ? labs[0].id : '');
  const currentLab = labs.find((l) => l.id === labId);

  // Tanggal yang sudah lewat tidak bisa dipilih di kalender (awal hari ini).
  const [hariIniAwal] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Opsi dropdown praktikum; nama lama di luar daftar tetap muncul saat sesi diubah.
  const opsiPraktikumForm = useMemo(() => opsiPraktikum(initial?.praktikum), [initial?.praktikum]);

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
    const hasil = !q
      ? praktikanList
      : praktikanList.filter(
          (p) => p.nama.toLowerCase().includes(q) || p.nim.toLowerCase().includes(q)
        );
    return [...hasil].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [praktikanList, searchPraktikan]);

  const jumlahHalaman = Math.max(1, Math.ceil(filteredPraktikan.length / PESERTA_PER_HALAMAN));
  const halamanAktif = Math.min(halamanPeserta, jumlahHalaman - 1);
  const pesertaHalamanIni = filteredPraktikan.slice(
    halamanAktif * PESERTA_PER_HALAMAN,
    (halamanAktif + 1) * PESERTA_PER_HALAMAN
  );

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

  // Memilih kelas langsung mengisi peserta dengan semua praktikan kelas itu.
  // Tabel di langkah 3 tetap bisa dipakai untuk menambah/mengurangi (mis. praktikan pindahan).
  function pilihKelas(kelas: string) {
    if (error) setError(null);
    if (kelas === kelasLab) return;
    setKelasLab(kelas);
    const anggota = praktikanList.filter((p) => p.kelas === kelas).map((p) => p.id);
    setPesertaIds(anggota);
    setHalamanPeserta(0);
    if (anggota.length === 0) {
      tampilkanToast(
        `Belum ada praktikan yang memilih kelas ${kelas}. Peserta bisa dipilih manual di langkah 3.`,
        'info',
        'Kelas masih kosong'
      );
    }
  }

  const jumlahAnggotaKelas = kelasLab
    ? praktikanList.filter((p) => p.kelas === kelasLab).length
    : 0;

  // Validasi per langkah supaya kesalahan ketahuan sebelum pindah ke langkah berikutnya.
  function validasiLangkah(l: Langkah): string | null {
    if (l === 1) {
      if (!praktikum.trim()) return 'Pilih nama praktikum';
      if (!kelasLab) return 'Pilih kelas praktikum';
    }
    if (l === 2) {
      if (!labId) return 'Laboratorium wajib dipilih';
      // Jam selesai > jam mulai, dalam jam operasional lab, dan tidak di waktu yang sudah lewat.
      const salahWaktu = validasiWaktuSesi(
        {
          tanggal: dateToYmd(tanggalDate),
          jamMulai: timeToHm(jamMulaiDate),
          jamSelesai: timeToHm(jamSelesaiDate),
        },
        new Date(),
        initial
          ? { tanggal: initial.tanggal, jamMulai: initial.jamMulai, jamSelesai: initial.jamSelesai }
          : undefined,
      );
      if (salahWaktu) return salahWaktu;
      const rencana = {
        labId,
        tanggal: dateToYmd(tanggalDate),
        jamMulai: timeToHm(jamMulaiDate),
        jamSelesai: timeToHm(jamSelesaiDate),
      };
      // Asisten hanya bisa mengajar satu sesi pada satu waktu, di lab mana pun.
      const bentrokSendiri = currentUser
        ? cariBentrokAsisten(semuaSesi, currentUser.id, rencana, sessionId)
        : null;
      if (bentrokSendiri) {
        return `Kamu sudah mengajar ${bentrokSendiri.praktikum} ${bentrokSendiri.kelasLab} pukul ${bentrokSendiri.jamMulai}–${bentrokSendiri.jamSelesai} di hari yang sama. Pilih jam lain.`;
      }
      // Lab tidak boleh dipakai dua sesi di jam yang tumpang tindih (termasuk sesi asisten lain).
      const bentrok = cariBentrokLab(semuaSesi, rencana, sessionId);
      if (bentrok) {
        const pemilik = bentrok.asistenNama ? ` (${bentrok.asistenNama})` : '';
        return `${currentLab?.namaLab ?? 'Lab'} sudah dipakai ${bentrok.praktikum} ${bentrok.kelasLab} pukul ${bentrok.jamMulai}–${bentrok.jamSelesai}${pemilik}. Pilih jam atau lab lain.`;
      }
    }
    if (l === 3 && pesertaIds.length === 0) {
      return 'Pilih minimal satu praktikan sebagai peserta';
    }
    return null;
  }

  function handleLanjut() {
    const err = validasiLangkah(langkah);
    if (err) {
      setError(err);
      tampilkanToast(err, 'error', 'Periksa isian sesi');
      return;
    }
    setError(null);
    setLangkah((l) => Math.min(3, l + 1) as Langkah);
  }

  async function handleSave() {
    if (isSubmittingRef.current || loading) return;

    // Cek ulang semua langkah; bila ada yang salah, kembali ke langkah tersebut.
    for (const l of [1, 2, 3] as Langkah[]) {
      const err = validasiLangkah(l);
      if (err) {
        setError(err);
        setLangkah(l);
        tampilkanToast(err, 'error', 'Periksa isian sesi');
        return;
      }
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
        tampilkanToast(
          isChanged
            ? 'Peserta diberi tahu lewat notifikasi karena jadwal berubah.'
            : 'Data sesi praktikum sudah diperbarui.',
          'sukses',
          'Perubahan disimpan'
        );
      } else {
        await createSession(payload);
        tampilkanToast('Sesi siap dibuka sesuai jadwal.', 'sukses', 'Sesi praktikum dibuat');
      }

      router.back();
    } catch (e: unknown) {
      Logger.error('FIRESTORE', 'SAVE_SESSION', e);
      const pesan = getAuthErrorMessage(e);
      setError(pesan);
      tampilkanToast(pesan, 'error', 'Sesi gagal disimpan');
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
          <ProgresLangkah langkah={langkah} />

          {/* Langkah 1: Informasi Sesi */}
          {langkah === 1 ? (
          <GlassCard style={styles.card}>
            <Text style={styles.cardSectionHeader}>Informasi Sesi</Text>

            <SelectField
              label="Nama Praktikum"
              value={praktikum}
              options={opsiPraktikumForm}
              onSelect={(nama) => {
                setPraktikum(nama);
                if (error) setError(null);
              }}
              error={Boolean(error && !praktikum.trim())}
            />

            <View>
              <SelectField
                label="Kelas"
                value={kelasLab}
                options={OPSI_KELAS}
                onSelect={pilihKelas}
                error={Boolean(error && !kelasLab)}
              />
              {kelasLab ? (
                <Text style={styles.kelasInfo}>
                  {jumlahAnggotaKelas} praktikan kelas {kelasLab} otomatis jadi peserta
                </Text>
              ) : null}
            </View>
          </GlassCard>
          ) : null}

          {/* Langkah 2: Waktu & Laboratorium */}
          {langkah === 2 ? (
          <GlassCard style={styles.card}>
            <Text style={styles.cardSectionHeader}>Waktu &amp; Laboratorium</Text>

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
              minimumDate={hariIniAwal}
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
            <Text style={styles.kelasInfo}>
              Jam operasional lab {JAM_BUKA_LAB}–{JAM_TUTUP_LAB}. Waktu yang sudah lewat tidak bisa dipilih.
            </Text>
          </GlassCard>
          ) : null}

          {/* Langkah 3: Pemilihan Peserta + ringkasan sebelum disimpan */}
          {langkah === 3 ? (
          <>
          <GlassCard style={styles.card}>
            <View style={styles.pesertaHeaderRow}>
              <View>
                <Text style={styles.cardSectionHeader}>Peserta Praktikum</Text>
                <Text style={styles.pesertaCounter}>
                  {pesertaIds.length} praktikan terpilih
                  {kelasLab ? ` · otomatis dari kelas ${kelasLab}` : ''}
                </Text>
              </View>
              <View style={styles.pesertaActionButtons}>
                <Pressable
                  onPress={handleSelectAllPeserta}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.tombolKecil, styles.tombolKecilIsi, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.tombolKecilTeks}>Pilih Semua</Text>
                </Pressable>
                <Pressable
                  onPress={handleResetPeserta}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.tombolKecil, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.tombolKecilTeks}>Reset</Text>
                </Pressable>
              </View>
            </View>

            <TextField
              label="Cari Praktikan"
              value={searchPraktikan}
              onChangeText={(teks) => {
                setSearchPraktikan(teks);
                setHalamanPeserta(0);
              }}
              placeholder="Cari nama atau NIM praktikan…"
            />

            {filteredPraktikan.length === 0 ? (
              <Text style={styles.emptyPraktikanText}>
                {praktikanList.length === 0
                  ? 'Belum ada data praktikan di sistem.'
                  : 'Tidak ada praktikan yang cocok dengan pencarian.'}
              </Text>
            ) : (
              <View style={styles.tabel}>
                <View style={styles.tabelHeader}>
                  <View style={styles.tabelKolomCek} />
                  <Text style={[styles.tabelJudul, styles.tabelKolomNama]}>Nama</Text>
                  <Text style={[styles.tabelJudul, styles.tabelKolomKelas]}>Kelas</Text>
                  <Text style={[styles.tabelJudul, styles.tabelKolomNim]}>NIM</Text>
                </View>
                {pesertaHalamanIni.map((p) => {
                  const selected = pesertaIds.includes(p.id);
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => togglePeserta(p.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${p.nama}, NIM ${p.nim}`}
                      style={({ pressed }) => [
                        styles.tabelBaris,
                        selected && styles.tabelBarisTerpilih,
                        pressed && { opacity: 0.7 },
                      ]}>
                      <View style={styles.tabelKolomCek}>
                        <View style={[styles.kotakCek, selected && styles.kotakCekAktif]}>
                          {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                        </View>
                      </View>
                      <Text style={[styles.tabelTeks, styles.tabelKolomNama]} numberOfLines={1}>
                        {p.nama}
                      </Text>
                      <Text style={[styles.tabelTeksNim, styles.tabelKolomKelas]} numberOfLines={1}>
                        {p.kelas ?? '–'}
                      </Text>
                      <Text style={[styles.tabelTeksNim, styles.tabelKolomNim]} numberOfLines={1}>
                        {p.nim}
                      </Text>
                    </Pressable>
                  );
                })}
                {jumlahHalaman > 1 ? (
                  <View style={styles.paginasi}>
                    <Pressable
                      onPress={() => setHalamanPeserta(Math.max(0, halamanAktif - 1))}
                      disabled={halamanAktif === 0}
                      accessibilityRole="button"
                      style={[styles.tombolHalaman, halamanAktif === 0 && styles.tombolHalamanMati]}>
                      <Ionicons name="chevron-back" size={16} color={Palette.text} />
                    </Pressable>
                    <Text style={styles.teksHalaman}>
                      {halamanAktif * PESERTA_PER_HALAMAN + 1}–
                      {Math.min((halamanAktif + 1) * PESERTA_PER_HALAMAN, filteredPraktikan.length)} dari{' '}
                      {filteredPraktikan.length}
                    </Text>
                    <Pressable
                      onPress={() => setHalamanPeserta(Math.min(jumlahHalaman - 1, halamanAktif + 1))}
                      disabled={halamanAktif >= jumlahHalaman - 1}
                      accessibilityRole="button"
                      style={[
                        styles.tombolHalaman,
                        halamanAktif >= jumlahHalaman - 1 && styles.tombolHalamanMati,
                      ]}>
                      <Ionicons name="chevron-forward" size={16} color={Palette.text} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}
          </GlassCard>

          <View style={styles.ringkasan}>
            <Text style={styles.ringkasanJudul}>Ringkasan</Text>
            <Text style={styles.ringkasanTeks}>
              <Text style={styles.ringkasanTebal}>{praktikum.trim() || '—'}</Text> ·{' '}
              {kelasLab.trim() || '—'}
            </Text>
            <Text style={styles.ringkasanTeks}>
              {formatTanggalSingkat(dateToYmd(tanggalDate))}, {timeToHm(jamMulaiDate)}–
              {timeToHm(jamSelesaiDate)} · {currentLab?.namaLab ?? '—'}
            </Text>
            <Text style={styles.ringkasanTeks}>{pesertaIds.length} praktikan terpilih</Text>
          </View>
          </>
          ) : null}

          {/* Navigasi langkah: Kembali / Lanjut, lalu Simpan di langkah terakhir */}
          <View style={styles.navLangkah}>
            <Pressable
              onPress={() => setLangkah((l) => Math.max(1, l - 1) as Langkah)}
              disabled={langkah === 1 || loading}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.tombolKembali,
                langkah === 1 && styles.tombolMati,
                pressed && { opacity: 0.7 },
              ]}>
              <Text style={styles.tombolKembaliTeks}>Kembali</Text>
            </Pressable>
            <Pressable
              onPress={langkah < 3 ? handleLanjut : handleSave}
              disabled={loading}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.tombolLanjut,
                loading && styles.tombolMati,
                pressed && { opacity: 0.8 },
              ]}>
              <Text style={styles.tombolLanjutTeks}>
                {langkah < 3
                  ? 'Lanjut'
                  : loading
                    ? 'Menyimpan Sesi…'
                    : isEdit
                      ? 'Simpan Perubahan'
                      : 'Buat Sesi'}
              </Text>
            </Pressable>
          </View>
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
  // Tombol kecil berlatar supaya jelas bisa diketuk.
  tombolKecil: {
    backgroundColor: '#FFFFFF',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tombolKecilIsi: {
    backgroundColor: Palette.lavender,
    borderColor: Palette.lavender,
  },
  tombolKecilTeks: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.text,
  },
  emptyPraktikanText: {
    color: Palette.textMuted,
    fontSize: 13,
    paddingVertical: 8,
  },
  tabel: {
    borderColor: Palette.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabelHeader: {
    alignItems: 'center',
    backgroundColor: Palette.lavender,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabelJudul: {
    color: Palette.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  tabelBaris: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: Palette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tabelBarisTerpilih: {
    backgroundColor: '#F7F6FB',
  },
  tabelKolomCek: {
    width: 32,
  },
  tabelKolomNama: {
    flex: 1,
    paddingRight: 8,
  },
  tabelKolomKelas: {
    textAlign: 'center',
    width: 44,
  },
  tabelKolomNim: {
    textAlign: 'right',
    width: 116,
  },
  kelasInfo: {
    color: Palette.textSecondary,
    fontSize: 12,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  tabelTeks: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '500',
  },
  tabelTeksNim: {
    color: Palette.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  kotakCek: {
    alignItems: 'center',
    borderColor: 'rgba(110, 90, 150, 0.45)',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  kotakCekAktif: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  paginasi: {
    alignItems: 'center',
    borderTopColor: Palette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tombolHalaman: {
    alignItems: 'center',
    backgroundColor: Palette.lavender,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  tombolHalamanMati: {
    opacity: 0.35,
  },
  teksHalaman: {
    color: Palette.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  // Progres langkah (bulet-bulet), gaya sama dengan pelacak izin.
  progres: { gap: 6, paddingHorizontal: 4 },
  progresGaris: { flexDirection: 'row', alignItems: 'center' },
  progresSegmen: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  progresPenghubung: { flex: 1, height: 3, borderRadius: 999, backgroundColor: Palette.lavender },
  progresPenghubungAktif: { backgroundColor: Palette.primary },
  progresPenghubungKosong: { backgroundColor: 'transparent' },
  progresTitik: {
    alignItems: 'center',
    backgroundColor: Palette.lavender,
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  progresTitikSelesai: { backgroundColor: Palette.primary },
  progresTitikAktif: { backgroundColor: '#FFFFFF', borderColor: Palette.primary, borderWidth: 2 },
  progresAngka: { fontSize: 11, fontWeight: '700', color: Palette.textMuted },
  progresAngkaAktif: { color: Palette.primary },
  progresLabelBaris: { flexDirection: 'row' },
  progresLabel: { flex: 1, fontSize: 11, fontWeight: '600', color: Palette.textMuted, textAlign: 'center' },
  progresLabelAktif: { color: Palette.text },

  ringkasan: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    gap: 3,
    padding: 16,
  },
  ringkasanJudul: { fontSize: 13, fontWeight: '700', color: Palette.text, marginBottom: 2 },
  ringkasanTeks: { fontSize: 12, color: Palette.textSecondary, lineHeight: 18 },
  ringkasanTebal: { fontWeight: '700', color: Palette.text },

  navLangkah: { flexDirection: 'row', gap: 10, marginTop: 4 },
  tombolKembali: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    height: 56,
    justifyContent: 'center',
  },
  tombolKembaliTeks: { fontSize: 14, fontWeight: '700', color: Palette.text },
  tombolLanjut: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    flex: 1.4,
    height: 56,
    justifyContent: 'center',
  },
  tombolLanjutTeks: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  tombolMati: { opacity: 0.35 },
});

type Langkah = 1 | 2 | 3;
const LABEL_LANGKAH = ['Info', 'Waktu & lab', 'Peserta'];

/** Bulet progres form: langkah sebelumnya dicentang, langkah sekarang bertepi magenta. */
function ProgresLangkah({ langkah }: { langkah: Langkah }) {
  return (
    <View
      style={styles.progres}
      accessibilityLabel={`Langkah ${langkah} dari 3: ${LABEL_LANGKAH[langkah - 1]}`}>
      <View style={styles.progresGaris}>
        {LABEL_LANGKAH.map((label, i) => {
          const no = i + 1;
          const selesai = no < langkah;
          const aktif = no === langkah;
          return (
            <View key={label} style={styles.progresSegmen}>
              <View
                style={[
                  styles.progresPenghubung,
                  i === 0 && styles.progresPenghubungKosong,
                  i > 0 && no <= langkah ? styles.progresPenghubungAktif : null,
                ]}
              />
              <View
                style={[
                  styles.progresTitik,
                  selesai && styles.progresTitikSelesai,
                  aktif && styles.progresTitikAktif,
                ]}>
                {selesai ? (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.progresAngka, aktif && styles.progresAngkaAktif]}>{no}</Text>
                )}
              </View>
              <View
                style={[
                  styles.progresPenghubung,
                  i === LABEL_LANGKAH.length - 1 && styles.progresPenghubungKosong,
                  i < LABEL_LANGKAH.length - 1 && no + 1 <= langkah
                    ? styles.progresPenghubungAktif
                    : null,
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.progresLabelBaris}>
        {LABEL_LANGKAH.map((label, i) => (
          <Text key={label} style={[styles.progresLabel, i + 1 <= langkah && styles.progresLabelAktif]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
