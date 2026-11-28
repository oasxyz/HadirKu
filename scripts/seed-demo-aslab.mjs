// Seeder demo fitur Sprint 4 PIC B (SRS4-03/04/05, Annis).
//
// 1. Dashboard Aslab (selalu):
//   - Hari Ini: 2 sesi sedang berlangsung (beda lab), sesi berikutnya, sesi selesai tadi pagi
//   - Riwayat: sesi ditutup minggu ini, denda (lunas/belum/batal) tersebar hari/minggu/bulan,
//     dan pembayaran lunas (GoPay/QRIS/Virtual Account)
// 2. Asprak (bila --asprak diisi): sesi kemarin milik asprak itu dengan 4 izin menunggu
//    beralasan beragam (badge sentimen); salah satunya punya denda pending (uji pembatalan
//    denda saat izin diterima).
// 3. Praktikan (bila --praktikan diisi): sesi milik asprak yang SEDANG DIBUKA dan memuat
//    praktikan itu (tombol Absen aktif), plus 6 notifikasi beragam jenis (3 belum dibaca)
//    untuk Profil, halaman Notifikasi, geser-hapus, dan deep link.
//
// Semua dokumen ber-ID awalan "demo-aslab-" supaya mudah dihapus, dan TIDAK menyentuh
// dokumen lain (akun, lab, sesi asli). Asprak dan praktikan diambil dari akun yang sudah ada.
//
// Persiapan: sama dengan scripts/seed-uji.mjs (firebase-admin + GOOGLE_APPLICATION_CREDENTIALS).
//
// Pakai:
//   node scripts/seed-demo-aslab.mjs
//   node scripts/seed-demo-aslab.mjs --asprak nissa@univ.ac.id --praktikan <email-praktikan>
//      (jalankan ulang sebelum demo karena jam sesi dihitung dari jam komputer)
//   node scripts/seed-demo-aslab.mjs --hapus   (hapus semua data demo)
//   tambahkan --cek untuk melihat rencana jadwal tanpa menulis apa pun

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const AWALAN = 'demo-aslab-';
const KOLEKSI = ['sessions', 'sessionCodes', 'attendances', 'fines', 'payments', 'leaveRequests', 'notifications'];
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

function ambilArg(nama) {
  const i = process.argv.indexOf(`--${nama}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function akunDariEmail(email) {
  if (!email) return null;
  const akun = await getAuth().getUserByEmail(email);
  const dok = await db.collection('users').doc(akun.uid).get();
  if (!dok.exists) throw new Error(`Akun ${email} belum melengkapi profil (dokumen users belum ada).`);
  return { id: akun.uid, ...dok.data() };
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
  // Akun uji dibaca lebih dulu: asprak uji tidak dipakai di sesi Dashboard supaya tidak
  // mengajar dua sesi di jam yang sama (aturan bentrok asisten).
  const asprakUji = await akunDariEmail(ambilArg('asprak'));
  const praktikanUji = await akunDariEmail(ambilArg('praktikan'));
  const asprakLain = asprak.filter((a) => a.id !== asprakUji?.id);
  if (asprakLain.length < 3) {
    throw new Error(`Butuh minimal 3 asprak selain asprak uji (ada ${asprakLain.length}).`);
  }
  // Tiap asprak hanya punya satu sesi di jam yang sama.
  const [asp1, asp2, asp3] = asprakLain;

  const sekarang = new Date();
  const menitKini = sekarang.getHours() * 60 + sekarang.getMinutes();
  const tglHariIni = isoTanggal(hariIni(0));

  // --- Penempatan jadwal sesuai aturan aplikasi ---------------------------------------
  // Satu lab hanya satu sesi di jam yang sama, satu asprak hanya satu sesi di jam yang sama,
  // dan jam sesi di 07.00–21.00. Sesi asli (bukan demo) ikut diperhitungkan, jadi seeder
  // memilih lab/asprak lain bila bentrok, dan melewati sesi yang tidak bisa ditempatkan.
  const JAM_BUKA = 7 * 60;
  const JAM_TUTUP = 21 * 60;
  const DURASI_MIN = 45;
  const keMenit = (j) => Number(j.slice(0, 2)) * 60 + Number(j.slice(3, 5));
  const terpakai = (await db.collection('sessions').get()).docs
    .filter((d) => !d.id.startsWith(AWALAN))
    .map((d) => d.data())
    .filter((d) => typeof d.jamMulai === 'string' && typeof d.jamSelesai === 'string')
    .map((d) => ({ tanggal: d.tanggal, labId: d.labId, asistenId: d.asistenId, m: keMenit(d.jamMulai), s: keMenit(d.jamSelesai) }));
  const bentrok = (c) =>
    terpakai.some(
      (t) => t.tanggal === c.tanggal && c.m < t.s && t.m < c.s && (t.labId === c.labId || t.asistenId === c.asistenId),
    );
  const urutkanLab = (utama) => [utama, ...labUtama.filter((l) => l.id !== utama.id)];
  const dilewati = [];
  function tempatkan(nama, hari, mulai, selesai, daftarLab, daftarAsprak) {
    const tanggal = isoTanggal(hariIni(hari));
    const m = Math.max(mulai, JAM_BUKA);
    const sl = Math.min(selesai, JAM_TUTUP);
    if (sl - m < DURASI_MIN) {
      dilewati.push(`${nama} (di luar jam lab)`);
      return null;
    }
    for (const lab of daftarLab) {
      for (const as of daftarAsprak) {
        const calon = { tanggal, labId: lab.id, asistenId: as.id, m, s: sl };
        if (!bentrok(calon)) {
          terpakai.push(calon);
          return { lab, as, tanggal, mulai: m, selesai: sl };
        }
      }
    }
    dilewati.push(`${nama} (semua lab/asprak bentrok)`);
    return null;
  }

  // Sesi uji ditempatkan lebih dulu karena paling dibutuhkan untuk testing.
  const posUjiIzin = asprakUji ? tempatkan('uji-izin', -1, 13 * 60, 15 * 60, urutkanLab(labA), [asprakUji]) : null;
  const posUjiAbsen =
    asprakUji && praktikanUji
      ? tempatkan('uji-absen', 0, menitKini - 10, menitKini + 110, urutkanLab(labC), [asprakUji])
      : null;

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
  for (const [nama, praktikum, kelas, labPilihan, asPilihan, hari, mulaiRencana, selesaiRencana, status, n, persen] of RENCANA) {
    const pos = tempatkan(nama, hari, mulaiRencana, selesaiRencana, urutkanLab(labPilihan), [
      asPilihan,
      ...asprakLain.filter((a) => a.id !== asPilihan.id),
    ]);
    if (!pos) continue;
    const { lab, as, mulai, selesai } = pos;
    // Sesi "berlangsung" yang terpotong jam buka bisa belum mulai; jadikan belum dibuka.
    const statusAkhir = status === 'dibuka' && mulai > menitKini ? 'belum_dibuka' : status;
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
      status: statusAkhir,
      updatedAt: statusAkhir === 'ditutup' ? waktu(hari, Math.floor(selesai / 60), selesai % 60) : new Date().toISOString(),
      demo: true,
    };
    tulisan.push([db.collection('sessions').doc(id), sesi]);
    if (statusAkhir === 'dibuka') {
      tulisan.push([db.collection('sessionCodes').doc(id), { kode: KODE_SESI, asistenId: as.id, demo: true }]);
    }
    sesiDibuat.push({ id, sesi, peserta, persen, hari, mulai });

    // Presensi: sebagian peserta hadir; ±25% yang hadir terlambat dan didenda.
    const hadir = statusAkhir === 'belum_dibuka' ? [] : peserta.slice(0, Math.round(peserta.length * persen));
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
          hari === 0 && statusAkhir === 'dibuka'
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

  // --- 2 & 3. Data uji asprak dan praktikan --------------------------------------------
  const tambahan = [];
  const ringkas = [];
  const idKemarin = `${AWALAN}uji-izin`;
  const idBuka = `${AWALAN}uji-absen`;

  if (asprakUji && posUjiIzin) {
    const lainnya = acak(praktikan.filter((p) => p.id !== praktikanUji?.id), 17);
    const pesertaKemarin = [...(praktikanUji ? [praktikanUji] : []), ...lainnya];

    // Sesi kemarin milik asprak uji, sudah ditutup; izin masih bisa diputuskan (H+3).
    tambahan.push([
      db.collection('sessions').doc(idKemarin),
      {
        praktikum: 'Basis Data',
        kelasLab: praktikanUji?.kelas ?? 'D1',
        labId: posUjiIzin.lab.id,
        tanggal: posUjiIzin.tanggal,
        jamMulai: isoJam(posUjiIzin.mulai),
        jamSelesai: isoJam(posUjiIzin.selesai),
        asistenId: asprakUji.id,
        asistenNama: asprakUji.nama ?? 'Asprak',
        pesertaIds: pesertaKemarin.map((p) => p.id),
        status: 'ditutup',
        updatedAt: waktu(-1, 15, 5),
        demo: true,
      },
    ]);

    // Alasan beragam supaya badge sentimen positif/netral/negatif terlihat.
    const ALASAN = [
      ['Motor saya mogok di jalan dan bengkel jauh, jadi tidak sempat sampai ke lab.', 'izin'],
      ['Saya demam tinggi sejak semalam, sudah ada surat dokter.', 'sakit'],
      ['Ada acara keluarga, nenek saya meninggal dunia.', 'izin'],
      ['Saya mengikuti lomba GEMASTIK di luar kota mewakili kampus, terima kasih atas pengertiannya.', 'izin'],
    ];
    const pengaju = praktikanUji ? [praktikanUji, ...lainnya.slice(0, 3)] : lainnya.slice(0, 4);
    pengaju.forEach((p, i) => {
      tambahan.push([
        db.collection('leaveRequests').doc(`${idKemarin}_${p.id}`),
        {
          sessionId: idKemarin,
          userId: p.id,
          alasan: ALASAN[i][0],
          kategoriAi: ALASAN[i][1],
          // sentimenAi sengaja tidak diisi: layar Pemeriksaan Izin menghitungnya di HP.
          status: 'menunggu',
          // Dibuat beberapa menit lalu supaya langsung tampil di filter "Hari ini".
          createdAt: new Date(Date.now() - (i + 1) * 17 * 60000).toISOString(),
          diputuskanOleh: null,
          diputuskanAt: null,
          demo: true,
        },
      ]);
    });

    // Pengaju pertama juga punya denda pending di sesi ini; hilang saat izinnya diterima.
    const pemilikDenda = pengaju[0];
    tambahan.push([
      db.collection('fines').doc(`${idKemarin}_${pemilikDenda.id}`),
      {
        sessionId: idKemarin,
        userId: pemilikDenda.id,
        labId: posUjiIzin.lab.id,
        praktikum: 'Basis Data',
        kelasLab: praktikanUji?.kelas ?? 'D1',
        jumlahMenitTerlambat: 20,
        nominal: DENDA,
        status: 'pending',
        createdAt: waktu(-1, 13, 35),
        updatedAt: waktu(-1, 13, 35),
        demo: true,
      },
    ]);
    ringkas.push(`asprak ${asprakUji.nama}: 4 izin menunggu di sesi kemarin (izin ${pemilikDenda.nama} punya denda pending)`);
  }

  if (praktikanUji && asprakUji && posUjiAbsen) {
    // Sesi milik asprak uji yang sedang dibuka dan memuat praktikan uji: tombol Absen aktif.
    const peserta = [praktikanUji.id, ...acak(praktikan, 15).map((p) => p.id)];
    tambahan.push([
      db.collection('sessions').doc(idBuka),
      {
        praktikum: 'Pemrograman Mobile',
        kelasLab: praktikanUji.kelas ?? 'D1',
        labId: posUjiAbsen.lab.id,
        tanggal: posUjiAbsen.tanggal,
        jamMulai: isoJam(posUjiAbsen.mulai),
        jamSelesai: isoJam(posUjiAbsen.selesai),
        asistenId: asprakUji.id,
        asistenNama: asprakUji.nama ?? 'Asprak',
        pesertaIds: [...new Set(peserta)],
        status: 'dibuka',
        updatedAt: new Date().toISOString(),
        demo: true,
      },
    ]);
    tambahan.push([db.collection('sessionCodes').doc(idBuka), { kode: KODE_SESI, asistenId: asprakUji.id, demo: true }]);
    ringkas.push(`sesi uji-absen sedang dibuka untuk ${praktikanUji.nama} (kode ${KODE_SESI})`);
  }

  if (praktikanUji) {
    const sesiAcuan = posUjiAbsen ? idBuka : `${AWALAN}berlangsung-1`;
    const dendaAcuan = posUjiIzin ? `${idKemarin}_${praktikanUji.id}` : null;
    // [type, judul, isi, rujukan, menit lalu, sudah dibaca]
    const NOTIF = [
      ['sesi_dibuka', 'Sesi praktikum dibuka', 'Pemrograman Mobile sudah dibuka. Segera lakukan presensi.', { sessionId: sesiAcuan }, 0, false],
      ['tagihan_baru', 'Tagihan denda baru', 'Kamu terlambat 20 menit di Basis Data. Denda Rp10.000 menunggu pembayaran.', { sessionId: idKemarin, fineId: dendaAcuan }, 25, false],
      ['izin_diterima', 'Izin diterima', 'Pengajuan izin untuk Sistem Operasi diterima oleh asisten.', {}, 90, false],
      ['jadwal_berubah', 'Jadwal praktikum berubah', 'Jaringan Komputer kini Kamis, 14.00–16.00 di Lab Informatika C.', { sessionId: sesiAcuan }, 60 * 5, true],
      ['pembayaran_sukses', 'Pembayaran berhasil', 'Denda Rp10.000 untuk Pemrograman Mobile sudah lunas lewat GoPay.', {}, 60 * 26, true],
      ['kelas_diterima', 'Pindah kelas diterima', 'Kelas praktikummu sekarang D1. Sesi baru kelas ini otomatis mencantumkanmu.', {}, 60 * 50, true],
    ];
    NOTIF.forEach(([type, title, body, ref, menitLalu, dibaca], i) => {
      tambahan.push([
        db.collection('notifications').doc(`${AWALAN}notif-${i}`),
        {
          targetUserIds: [praktikanUji.id],
          type,
          title,
          body,
          sessionId: ref.sessionId ?? null,
          ...(ref.fineId ? { fineId: ref.fineId } : {}),
          createdAt: new Date(Date.now() - menitLalu * 60000).toISOString(),
          readBy: dibaca ? [praktikanUji.id] : [],
          hiddenFor: [],
          demo: true,
        },
      ]);
    });
    ringkas.push(`6 notifikasi untuk ${praktikanUji.nama} (3 belum dibaca)`);
  }

  // --- Validasi aturan jadwal sebelum menulis apa pun ------------------------------------
  // Sama dengan aturan form Tambah Sesi: satu lab hanya satu sesi di jam yang sama, satu asprak
  // hanya mengajar satu sesi di jam yang sama, dan jam berada di 07.00–21.00.
  const rencanaSesi = [...tulisan, ...tambahan]
    .filter(([ref]) => ref.parent.id === 'sessions')
    .map(([ref, d]) => ({ id: ref.id, ...d }));
  const sesiAsli = (await db.collection('sessions').get()).docs
    .filter((d) => !d.id.startsWith(AWALAN))
    .map((d) => ({ id: d.id, ...d.data() }));
  const masalah = [];
  rencanaSesi.forEach((a, i) => {
    const [m, sl] = [keMenit(a.jamMulai), keMenit(a.jamSelesai)];
    if (m < 7 * 60 || sl > 21 * 60 || sl <= m) {
      masalah.push(`${a.id} di luar jam lab 07.00–21.00 (${a.jamMulai}–${a.jamSelesai})`);
    }
    [...rencanaSesi.slice(i + 1), ...sesiAsli].forEach((b) => {
      if (b.tanggal !== a.tanggal || typeof b.jamMulai !== 'string' || typeof b.jamSelesai !== 'string') return;
      const tumpang = m < keMenit(b.jamSelesai) && keMenit(b.jamMulai) < sl;
      if (!tumpang) return;
      if (b.labId === a.labId) masalah.push(`${a.id} bentrok lab dengan ${b.id} (${b.jamMulai}–${b.jamSelesai})`);
      if (b.asistenId === a.asistenId) masalah.push(`${a.id} bentrok asprak dengan ${b.id} (${b.jamMulai}–${b.jamSelesai})`);
    });
  });
  if (masalah.length > 0) {
    console.error('Data demo TIDAK ditulis karena melanggar aturan jadwal:');
    masalah.forEach((x) => console.error(`  - ${x}`));
    console.error('Jalankan di jam 09.00–17.00 (jadwal dihitung dari jam sekarang), atau hapus sesi asli yang bentrok.');
    process.exit(1);
  }

  // --cek: tampilkan rencana jadwal tanpa menulis apa pun ke Firestore.
  if (process.argv.includes('--cek')) {
    console.log('Mode cek (tidak menulis apa pun). Rencana sesi:');
    rencanaSesi
      .sort((x, y) => (x.tanggal + x.jamMulai).localeCompare(y.tanggal + y.jamMulai))
      .forEach((r) => console.log(`  ${r.tanggal} ${r.jamMulai}-${r.jamSelesai}  ${r.labId.padEnd(18)} ${r.status.padEnd(12)} ${r.id.replace(AWALAN, '')}`));
    if (dilewati.length > 0) console.log(`  Dilewati: ${dilewati.join(', ')}`);
    return;
  }

  await tulisBertahap(tulisan);
  await tulisBertahap(tambahan);

  const hitung = (k) => tulisan.filter(([ref]) => ref.parent.id === k).length;
  console.log(`Data demo aslab dibuat (${tglHariIni}, jam ${isoJam(menitKini)}):`);
  console.log(`  sesi ${hitung('sessions')} (2 berlangsung di ${labA.nama} & ${labB.nama}), presensi ${hitung('attendances')},`);
  console.log(`  denda ${hitung('fines')}, pembayaran ${hitung('payments')}. Kode sesi berlangsung: ${KODE_SESI}`);
  ringkas.forEach((r) => console.log(`  ${r}`));
  if (dilewati.length > 0) {
    console.log(`  Dilewati karena aturan jadwal: ${dilewati.join(', ')}`);
  }
  if (!asprakUji || !praktikanUji) {
    console.log('  (Tambah --asprak <email> --praktikan <email> untuk data uji izin, tombol Absen, dan notifikasi.)');
  }
  console.log('Hapus lagi dengan: node scripts/seed-demo-aslab.mjs --hapus');
}

if (process.argv.includes('--hapus')) {
  await hapusSemua();
} else {
  await isi();
}
