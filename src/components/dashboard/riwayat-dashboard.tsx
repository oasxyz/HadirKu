// SRS4-03 (PIC B — Annis): Riwayat Kegiatan (10 sesi ditutup terakhir) dan
// Riwayat Pembayaran (10 pembayaran lunas terakhir) di tab Riwayat Dashboard Aslab.
import { StyleSheet, Text, View } from 'react-native';

import { Chip, formatRupiah } from '@/components/ui';
import { Palette } from '@/constants/theme';
import type { Fine, Payment, Session, User } from '@/types';
import { formatTanggalSingkat } from '@/utils/format';

import { jamTitik, LABEL_METODE, labelWaktuBayar } from './data-dashboard';

export type JenisRiwayat = 'kegiatan' | 'pembayaran';

function Baris({ judul, sub, ket, tag, warnaTag }: { judul: string; sub: string; ket: string; tag: string; warnaTag: string }) {
  return (
    <View style={styles.baris}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.judul} numberOfLines={1}>
          {judul}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
        <Text style={styles.ket} numberOfLines={1}>
          {ket}
        </Text>
      </View>
      <View style={[styles.tag, { backgroundColor: warnaTag }]}>
        <Text style={styles.tagTeks}>{tag}</Text>
      </View>
    </View>
  );
}

/** Nama pendek "Annis A." supaya baris pembayaran muat satu baris. */
function namaPendek(nama: string): string {
  const [depan, ...sisa] = nama.trim().split(/\s+/);
  return sisa.length ? `${depan} ${sisa[0][0]}.` : depan;
}

export function RiwayatDashboard({
  jenis,
  onJenis,
  kegiatan,
  pembayaran,
  hadir,
  namaLab,
  users,
  fines,
  sekarang,
}: {
  jenis: JenisRiwayat;
  onJenis: (j: JenisRiwayat) => void;
  kegiatan: Session[];
  pembayaran: Payment[];
  hadir: (sessionId: string) => number;
  namaLab: (labId?: string) => string;
  users: Map<string, User>;
  fines: Map<string, Fine>;
  sekarang: Date;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.chips}>
        <Chip label="Kegiatan" selected={jenis === 'kegiatan'} onPress={() => onJenis('kegiatan')} />
        <Chip label="Pembayaran" selected={jenis === 'pembayaran'} onPress={() => onJenis('pembayaran')} />
      </View>

      {jenis === 'kegiatan' ? (
        kegiatan.length === 0 ? (
          <Text style={styles.kosong}>Belum ada sesi yang ditutup.</Text>
        ) : (
          kegiatan.map((s) => (
            <Baris
              key={s.id}
              judul={`${s.praktikum} ${s.kelasLab}`}
              sub={`${formatTanggalSingkat(s.tanggal)} · ${jamTitik(s.jamMulai)}-${jamTitik(s.jamSelesai)}`}
              ket={`Hadir ${hadir(s.id)}/${s.pesertaIds.length} · ${namaLab(s.labId)}`}
              tag="Ditutup"
              warnaTag={Palette.ink}
            />
          ))
        )
      ) : pembayaran.length === 0 ? (
        <Text style={styles.kosong}>Belum ada denda yang dibayar.</Text>
      ) : (
        pembayaran.map((p) => {
          const fine = fines.get(p.fineId);
          const nama = users.get(p.userId)?.nama ?? 'Praktikan';
          const metode = p.paymentType ? LABEL_METODE[p.paymentType] ?? p.paymentType : 'Midtrans';
          return (
            <Baris
              key={p.id}
              judul={`${namaPendek(nama)} · ${formatRupiah(p.nominal)}`}
              sub={fine ? `${fine.praktikum} ${fine.kelasLab}` : 'Denda keterlambatan'}
              ket={`Lunas ${labelWaktuBayar(p.settledAt ?? p.createdAt, sekarang)} · ${metode}`}
              tag="Lunas"
              warnaTag={Palette.primary}
            />
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8 },
  kosong: { color: Palette.textMuted, fontSize: 13, lineHeight: 19 },
  baris: {
    alignItems: 'center',
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  judul: { color: Palette.text, fontSize: 15, fontWeight: '700' },
  sub: { color: Palette.textSecondary, fontSize: 12 },
  ket: { color: Palette.textMuted, fontSize: 12 },
  tag: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  tagTeks: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
