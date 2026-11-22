// Asisten: memeriksa pengajuan pindah kelas dari praktikan yang dipegangnya.
// Ditampilkan di tab Izin (segmen "Pindah kelas"), gaya kartunya sama dengan pemeriksaan izin.
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { IlustrasiKosong } from '@/components/ilustrasi';
import { PelacakPengajuan } from '@/components/pelacak-pengajuan';
import { useToast } from '@/components/toast';
import { Avatar, Badge, type BadgeTone } from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { usePengajuanKelasMasuk } from '@/hooks/use-pengajuan-kelas';
import type { PengajuanKelas } from '@/types';
import { Logger } from '@/utils/logger';

type Keputusan = { pengajuan: PengajuanKelas; aksi: 'diterima' | 'ditolak' } | null;

export function PemeriksaanKelas() {
  const { daftar, loading, error, putuskan } = usePengajuanKelasMasuk();
  const { tampilkanToast } = useToast();
  const [keputusan, setKeputusan] = useState<Keputusan>(null);
  const [memproses, setMemproses] = useState(false);
  const kunciRef = useRef(false);

  if (loading) {
    return (
      <View style={styles.kosong}>
        <ActivityIndicator color={Palette.primary} />
        <Text style={styles.kosongTeks}>Memuat pengajuan pindah kelas…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.kosong}>
        <Text style={styles.kosongTeks}>{error} Periksa koneksi internet lalu coba lagi.</Text>
      </View>
    );
  }

  const menunggu = daftar.filter((p) => p.status === 'menunggu');
  const selesai = daftar.filter((p) => p.status !== 'menunggu');

  async function konfirmasi() {
    if (!keputusan || kunciRef.current) return;
    kunciRef.current = true;
    try {
      setMemproses(true);
      await putuskan(keputusan.pengajuan, keputusan.aksi);
      tampilkanToast(
        keputusan.aksi === 'diterima'
          ? `Kelas ${keputusan.pengajuan.nama} sekarang ${keputusan.pengajuan.kelasBaru}.`
          : 'Praktikan diberi tahu lewat notifikasi.',
        'sukses',
        keputusan.aksi === 'diterima' ? 'Pindah kelas diterima' : 'Pindah kelas ditolak',
      );
    } catch (err) {
      Logger.error('FIRESTORE', 'putuskanPindahKelas', err);
      tampilkanToast('Periksa koneksi internet lalu coba lagi.', 'error', 'Keputusan gagal disimpan');
    } finally {
      kunciRef.current = false;
      setMemproses(false);
      setKeputusan(null);
    }
  }

  return (
    <View style={{ gap: Spacing.three }}>
      {daftar.length === 0 ? (
        <View style={styles.kosong}>
          <IlustrasiKosong lebar={100} />
          <Text style={styles.kosongTeks}>Belum ada pengajuan pindah kelas.</Text>
        </View>
      ) : null}

      {menunggu.length > 0 ? <Text style={styles.grup}>{menunggu.length} menunggu keputusan</Text> : null}
      {menunggu.map((p) => (
        <KartuPengajuan key={p.id} pengajuan={p} onPutuskan={(aksi) => setKeputusan({ pengajuan: p, aksi })} />
      ))}

      {selesai.length > 0 ? <Text style={styles.grup}>Sudah diputuskan</Text> : null}
      {selesai.map((p) => (
        <KartuPengajuan key={p.id} pengajuan={p} />
      ))}

      <Modal visible={!!keputusan} transparent animationType="fade" onRequestClose={() => setKeputusan(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalJudul}>
              {keputusan?.aksi === 'diterima' ? 'Terima pindah kelas?' : 'Tolak pindah kelas?'}
            </Text>
            <Text style={styles.modalPesan}>
              {keputusan?.aksi === 'diterima'
                ? `${keputusan.pengajuan.nama} akan pindah ke kelas ${keputusan.pengajuan.kelasBaru}. Sesi yang sudah dibuat tidak berubah.`
                : 'Kelas praktikan tetap seperti sekarang.'}
            </Text>
            <View style={styles.aksi}>
              <Pressable onPress={() => setKeputusan(null)} disabled={memproses} style={styles.batal}>
                <Text style={styles.batalTeks}>Batal</Text>
              </Pressable>
              <Pressable onPress={konfirmasi} disabled={memproses} style={styles.ya}>
                {memproses ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.yaTeks}>{keputusan?.aksi === 'diterima' ? 'Terima' : 'Tolak'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function KartuPengajuan({
  pengajuan,
  onPutuskan,
}: {
  pengajuan: PengajuanKelas;
  onPutuskan?: (aksi: 'diterima' | 'ditolak') => void;
}) {
  const tone: BadgeTone =
    pengajuan.status === 'diterima' ? 'primary' : pengajuan.status === 'ditolak' ? 'dark' : 'muted';
  const label =
    pengajuan.status === 'diterima' ? 'Diterima' : pengajuan.status === 'ditolak' ? 'Ditolak' : 'Menunggu';

  return (
    <View style={styles.kartu}>
      <View style={styles.kepala}>
        <Avatar nama={pengajuan.nama || '?'} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.nama}>{pengajuan.nama || 'Praktikan'}</Text>
          <Text style={styles.nim}>{pengajuan.nim}</Text>
        </View>
        <Badge label={label} tone={tone} />
      </View>

      <View style={styles.pindah}>
        <View style={styles.kotakKelas}>
          <Text style={styles.kotakKelasTeks}>{pengajuan.kelasLama ?? '–'}</Text>
        </View>
        <Text style={styles.panah}>→</Text>
        <View style={[styles.kotakKelas, styles.kotakKelasBaru]}>
          <Text style={[styles.kotakKelasTeks, styles.kotakKelasTeksBaru]}>{pengajuan.kelasBaru}</Text>
        </View>
      </View>

      <Text style={styles.alasan}>{pengajuan.alasan}</Text>

      {pengajuan.status === 'menunggu' && onPutuskan ? (
        <View style={styles.aksi}>
          <Pressable
            onPress={() => onPutuskan('ditolak')}
            style={({ pressed }) => [styles.batal, pressed && { opacity: 0.7 }]}>
            <Text style={styles.batalTeks}>Tolak</Text>
          </Pressable>
          <Pressable
            onPress={() => onPutuskan('diterima')}
            style={({ pressed }) => [styles.ya, pressed && { opacity: 0.7 }]}>
            <Text style={styles.yaTeks}>Terima</Text>
          </Pressable>
        </View>
      ) : (
        <PelacakPengajuan
          status={pengajuan.status}
          createdAt={pengajuan.createdAt}
          diputuskanAt={pengajuan.diputuskanAt}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kosong: {
    alignItems: 'center',
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    paddingVertical: 24,
  },
  kosongTeks: { color: Palette.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
  grup: { color: Palette.text, fontSize: 15, fontWeight: '600', paddingHorizontal: Spacing.one },
  kartu: {
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: Spacing.three,
    padding: 16,
  },
  kepala: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  nama: { color: Palette.text, fontSize: 15, fontWeight: '600' },
  nim: { color: Palette.textSecondary, fontSize: 12 },
  pindah: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  kotakKelas: {
    backgroundColor: '#FFFFFF',
    borderColor: Palette.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kotakKelasBaru: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  kotakKelasTeks: { color: Palette.text, fontSize: 14, fontWeight: '800' },
  kotakKelasTeksBaru: { color: '#FFFFFF' },
  panah: { color: Palette.textMuted, fontSize: 16 },
  alasan: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    color: Palette.text,
    fontSize: 14,
    lineHeight: 20,
    padding: Spacing.two,
  },
  aksi: { flexDirection: 'row', gap: Spacing.two },
  batal: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  batalTeks: { color: Palette.text, fontSize: 14, fontWeight: '700' },
  ya: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 12,
  },
  yaTeks: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 20, 50, 0.4)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modal: { backgroundColor: '#FFFFFF', borderRadius: 24, gap: Spacing.two, padding: Spacing.four, width: '100%' },
  modalJudul: { color: Palette.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  modalPesan: { color: Palette.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
