// Seeder demo Dashboard Aslab (SRS4-03, PIC B — Annis).
//
// Mengisi data supaya semua bagian Dashboard Aslab terlihat terisi saat demo:
//   - Hari Ini: 2 sesi sedang berlangsung (beda lab), sesi berikutnya, sesi selesai tadi pagi
//   - Riwayat: sesi ditutup minggu ini, denda (lunas/belum/batal) tersebar hari/minggu/bulan,
//     dan pembayaran lunas (GoPay/QRIS/Virtual Account)
//
// Semua dokumen ber-ID awalan "demo-aslab-" supaya mudah dihapus, dan TIDAK menyentuh
// dokumen lain (akun, lab, sesi asli). Asprak dan praktikan diambil dari akun yang sudah ada.
//
// Persiapan: sama dengan scripts/seed-uji.mjs (firebase-admin + GOOGLE_APPLICATION_CREDENTIALS).
//
// Pakai:
//   node scripts/seed-demo-aslab.mjs           (isi data demo; jalankan ulang sebelum demo
//                                               karena jam sesi dihitung dari jam komputer)
//   node scripts/seed-demo-aslab.mjs --hapus   (hapus semua data demo)

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const AWALAN = 'demo-aslab-';
const KOLEKSI = ['sessions', 'sessionCodes', 'attendances', 'fines', 'payments'];
const DENDA = 10000;
const KODE_SESI = '246810';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const pad = (n) => String(n).padStart(2, '0');
const isoTanggal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoJam = (menitDariTengahMalam) => {
  const m = Math.min(Math.max(menitDariTengahMalam, 0), 23 * 60 + 59);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

/** Tanggal lokal digeser `hari` dari hari ini. */
function hariIni(hari = 0) {
  const d = new Date();
  d.setDate(d.getDate() + hari);
  return d;
}

/** ISO waktu `hari` dari hari ini pada jam:menit lokal. */
function waktu(hari, jamKe, menitKe = 0) {
  const d = hariIni(hari);
  d.setHours(jamKe, menitKe, 0, 0);
  return d.toISOString();
}

function acak(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

async function tulisBertahap(tulisan) {
  for (let i = 0; i < tulisan.length; i += 400) {
    const batch = db.batch();
    tulisan.slice(i, i + 400).forEach(([ref, data]) => batch.set(ref, data));
    await batch.commit();
  }
}

async function hapusSemua() {
  let total = 0;
  for (const koleksi of KOLEKSI) {
    const snap = await db.collection(koleksi).get();
    const target = snap.docs.filter((d) => d.id.startsWith(AWALAN));
    for (let i = 0; i < target.length; i += 400) {
      const batch = db.batch();
      target.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    total += target.length;
    console.log(`  ${koleksi}: ${target.length} dokumen demo dihapus`);
  }
  console.log(`Selesai, ${total} dokumen demo dihapus.`);
}

async function isi() {
  // --- Bahan dari data yang sudah ada -------------------------------------------------
  const [labSnap, userSnap] = await Promise.all([db.collection('labs').get(), db.collection('users').get()]);
  const labs = labSnap.docs.map((d) => ({ id: d.id, nama: d.data().namaLab ?? d.id })).sort((a, b) => a.id.localeCompare(b.id));
  const users = userSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const asprak = users.filter((u) => u.role === 'asprak' || u.role === 'asisten');
  const praktikan = users.filter((u) => u.role === 'praktikan');

  if (labs.length < 2 || asprak.length < 2 || praktikan.length < 12) {
    throw new Error(
      `Data dasar kurang (lab ${labs.length}, asprak ${asprak.length}, praktikan ${praktikan.length}). ` +
        'Butuh minimal 2 lab, 2 asprak, dan 12 praktikan.',
    );
  }

  // Lab yang dipakai: ambil yang bukan "Dekanat" dulu supaya Dekanat tetap tampil kosong.
  const labUtama = labs.filter((l) => !/dekanat/i.test(l.nama));
  const [labA, labB, labC] = [labUtama[0] ?? labs[0], labUtama[1] ?? labs[1], labUtama[2] ?? labUtama[0] ?? labs[0]];
  const [asp1, asp2, asp3] = [asprak[0], asprak[1], asprak[2] ?? asprak[0]];

  const sekarang = new Date();
  const menitKini = sekarang.getHours() * 60 + sekarang.getMinutes();
  const tglHariIni = isoTanggal(hariIni(0));

  // --- Sesi ---------------------------------------------------------------------------
  // [id, praktikum, kelas, lab, asprak, hari, mulai(menit), selesai(menit), status, jumlahPeserta, persenHadir]
  const RENCANA = [
    ['berlangsung-1', 'Basis Data', 'D1', labA, asp1, 0, menitKini - 40, menitKini + 80, 'dibuka', 20, 0.85],
    ['berlangsung-2', 'Sistem Operasi', 'C2', labB, asp2, 0, menitKini - 20, menitKini + 100, 'dibuka', 18, 0.6],
    ['pagi-tadi', 'Jaringan Komputer', 'B2', labB, asp2, 0, menitKini - 240, menitKini - 160, 'ditutup', 16, 0.9],
    ['nanti-1', 'Pemrograman Mobile', 'A1', labA, asp3, 0, menitKini + 150, menitKini + 270, 'belum_dibuka', 20, 0],
    ['nanti-2', 'Pemrograman Mobile', 'C1', labC, asp1, 0, menitKini + 120, menitKini + 240, 'belum_dibuka', 18, 0],
    ['kemarin-1', 'Basis Data', 'D2', labA, asp1, -1, 8 * 60, 10 * 60, 'ditutup', 20, 0.9],
    ['kemarin-2', 'Sistem Operasi', 'D1', labB, asp2, -1, 13 * 60, 15 * 60, 'ditutup', 19, 0.95],
    ['lusa-lalu', 'Pemrograman Mobile', 'C1', labC, asp3, -2, 10 * 60, 12 * 60, 'ditutup', 18, 0.8],
    ['minggu-lalu', 'Jaringan Komputer', 'A2', labA, asp3, -6, 9 * 60, 11 * 60, 'ditutup', 17, 0.88],
  ];

  const tulisan = [];
  const sesiDibuat = [];
  let urut = 0;
  for (const [nama, praktikum, kelas, lab, as, hari, mulai, selesai, status, n, persen] of RENCANA) {
    const id = `${AWALAN}${nama}`;
    // Peserta: utamakan praktikan dengan kelas yang sama, sisanya diisi acak.
    const sekelas = praktikan.filter((p) => p.kelas === kelas);
    const peserta = [...acak(sekelas, n), ...acak(praktikan.filter((p) => p.kelas !== kelas), n)].slice(0, n);
    const tanggal = isoTanggal(hariIni(hari));
    const sesi = {
      praktikum,
      kelasLab: kelas,
      labId: lab.id,
      tanggal,
      jamMulai: isoJam(mulai),
      jamSelesai: isoJam(selesai),
      asistenId: as.id,
      asistenNama: as.nama ?? 'Asprak',
      pesertaIds: peserta.map((p) => p.id),
      status,
      updatedAt: status === 'ditutup' ? waktu(hari, Math.floor(selesai / 60), selesai % 60) : new Date().toISOString(),
      demo: true,
    };
    tulisan.push([db.collection('sessions').doc(id), sesi]);
    if (status === 'dibuka') {
      tulisan.push([db.collection('sessionCodes').doc(id), { kode: KODE_SESI, asistenId: as.id, demo: true }]);
    }
    sesiDibuat.push({ id, sesi, peserta, persen, hari, mulai });

    // Presensi: sebagian peserta hadir; ±25% yang hadir terlambat dan didenda.
    const hadir = peserta.slice(0, Math.round(peserta.length * persen));
    hadir.forEach((p, i) => {
      const telat = i % 4 === 3 ? 5 + (i % 3) * 7 : 0;
      const waktuHadir = hariIni(hari);
      waktuHadir.setHours(0, mulai + 2 + telat + (i % 5), 0, 0);
      const idHadir = `${id}_${p.id}`;
      tulisan.push([
        db.collection('attendances').doc(idHadir),
        {
          sessionId: id,
          userId: p.id,
          waktuPresensi: waktuHadir.toISOString(),
          metode: i % 2 ? 'qr' : 'kode',
          menitTerlambat: telat,
          fineId: telat > 0 ? idHadir : null,
          demo: true,
        },
      ]);
      if (telat > 0) {
        urut += 1;
        // Status denda bergiliran supaya grafik punya tiga warna.
        const statusDenda =
          hari === 0 && status === 'dibuka'
            ? urut % 3 === 0 ? 'paid' : 'pending'
            : ['paid', 'paid', 'pending', 'cancelled', 'expired'][urut % 5];
        tulisan.push([
          db.collection('fines').doc(idHadir),
          {
            sessionId: id,
            userId: p.id,
            labId: lab.id,
            praktikum,
            kelasLab: kelas,
            jumlahMenitTerlambat: telat,
            nominal: DENDA,
            status: statusDenda,
            createdAt: waktuHadir.toISOString(),
            updatedAt: waktuHadir.toISOString(),
            ...(statusDenda === 'cancelled' ? { cancelledReason: 'Izin diterima otomatis membatalkan denda.' } : {}),
            demo: true,
          },
        ]);
        if (statusDenda === 'paid') {
          const bayar = new Date(waktuHadir.getTime() + (30 + (urut % 7) * 25) * 60000);
          const orderId = `${AWALAN}order-${urut}`;
          tulisan.push([
            db.collection('payments').doc(orderId),
            {
              fineId: idHadir,
              userId: p.id,
              nominal: DENDA,
              midtransOrderId: orderId,
              paymentType: ['gopay', 'qris', 'bank_transfer'][urut % 3],
              status: 'settlement',
              createdAt: bayar.toISOString(),
              settledAt: bayar.toISOString(),
              demo: true,
            },
          ]);
        }
      }
    });
  }

  // Denda lama awal bulan supaya filter "Bulan ini" punya batang di minggu-minggu sebelumnya.
  const awalBulan = hariIni(0).getDate();
  for (let k = 0; k < 6; k++) {
    const mundur = -Math.min(awalBulan - 1, 7 + k * 3);
    if (mundur === 0) break;
    const p = praktikan[k];
    const idDenda = `${AWALAN}lama-${k}_${p.id}`;
    const status = ['paid', 'paid', 'expired', 'paid', 'cancelled', 'pending'][k];
    const dibuat = waktu(mundur, 9 + k, 10);
    tulisan.push([
      db.collection('fines').doc(idDenda),
      {
        sessionId: `${AWALAN}lama-${k}`,
        userId: p.id,
        labId: labA.id,
        praktikum: 'Basis Data',
        kelasLab: 'D1',
        jumlahMenitTerlambat: 10,
        nominal: DENDA * (k % 2 ? 2 : 1),
        status,
        createdAt: dibuat,
        updatedAt: dibuat,
        demo: true,
      },
    ]);
    if (status === 'paid') {
      const orderId = `${AWALAN}order-lama-${k}`;
      tulisan.push([
        db.collection('payments').doc(orderId),
        {
          fineId: idDenda,
          userId: p.id,
          nominal: DENDA * (k % 2 ? 2 : 1),
          midtransOrderId: orderId,
          paymentType: 'qris',
          status: 'settlement',
          createdAt: dibuat,
          settledAt: dibuat,
          demo: true,
        },
      ]);
    }
  }

  await tulisBertahap(tulisan);

  const hitung = (k) => tulisan.filter(([ref]) => ref.parent.id === k).length;
  console.log(`Data demo aslab dibuat (${tglHariIni}, jam ${isoJam(menitKini)}):`);
  console.log(`  sesi ${hitung('sessions')} (2 berlangsung di ${labA.nama} & ${labB.nama}), presensi ${hitung('attendances')},`);
  console.log(`  denda ${hitung('fines')}, pembayaran ${hitung('payments')}. Kode sesi berlangsung: ${KODE_SESI}`);
  console.log('Hapus lagi dengan: node scripts/seed-demo-aslab.mjs --hapus');
}

if (process.argv.includes('--hapus')) {
  await hapusSemua();
} else {
  await isi();
}
