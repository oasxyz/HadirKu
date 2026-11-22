// Seeder data uji (testing manual) untuk HadirKu.
//
// Menulis langsung ke Firestore lewat Firebase Admin SDK, jadi tidak terhalang firestore.rules.
// Semua dokumen yang dibuat ber-ID awalan "uji-" supaya mudah dikenali dan dihapus lagi.
//
// Persiapan (sekali):
//   1. npx expo install firebase-admin -- --save-dev
//   2. Unduh kunci service account: Firebase Console > Project settings > Service accounts >
//      Generate new private key. Simpan DI LUAR folder repo (jangan di-commit).
//   3. PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS = "D:\kunci\hadirku-admin.json"
//
// Pakai:
//   node scripts/seed-uji.mjs --asisten <email-asisten> --praktikan <email-praktikan>
//   node scripts/seed-uji.mjs --hapus          (hapus semua data uji)
//
// Kedua akun harus sudah pernah daftar/masuk di aplikasi (dokumen users/{uid} sudah ada).
// Jam sesi dihitung dari jam komputer saat skrip dijalankan, jadi jalankan ulang sebelum testing.

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const AWALAN = 'uji-';
// Kelas uji: praktikan utama dan teman uji ada di kelas ini, jadi Tambah Sesi kelas D1
// langsung mengisi mereka sebagai peserta.
const KELAS_UJI = 'D1';
const KODE_SESI_UJI = '123456';
const KOLEKSI = [
  'sessions',
  'sessionCodes',
  'attendances',
  'leaveRequests',
  'notifications',
  'pengajuanKelas',
  'users',
];

function ambilArg(nama) {
  const i = process.argv.indexOf(`--${nama}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const pad = (n) => String(n).padStart(2, '0');

/** Tanggal lokal YYYY-MM-DD, digeser `hari` dari hari ini. */
function tanggal(hari = 0) {
  const d = new Date();
  d.setDate(d.getDate() + hari);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Jam lokal HH:mm, digeser `menit` dari sekarang, dibatasi 00:00–23:59 hari ini. */
function jam(menit = 0) {
  const sekarang = new Date();
  const total = Math.min(
    Math.max(sekarang.getHours() * 60 + sekarang.getMinutes() + menit, 0),
    23 * 60 + 59,
  );
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** ISO waktu `hari` hari lalu (negatif = lampau) pada jam tertentu. */
function waktuIso(hari, jamKe = 9, menitKe = 0) {
  const d = new Date();
  d.setDate(d.getDate() + hari);
  d.setHours(jamKe, menitKe, 0, 0);
  return d.toISOString();
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

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
    console.log(`  ${koleksi}: ${target.length} dokumen uji dihapus`);
  }
  console.log(`Selesai, ${total} dokumen uji dihapus.`);
}

async function cariAkun(email, peranDiharapkan) {
  const akun = await getAuth().getUserByEmail(email);
  const profil = await db.collection('users').doc(akun.uid).get();
  if (!profil.exists) {
    throw new Error(
      `Akun ${email} belum punya profil di koleksi users. Masuk dulu di aplikasi dan lengkapi profil.`,
    );
  }
  const data = profil.data();
  if (data.role !== peranDiharapkan) {
    throw new Error(`Akun ${email} berperan "${data.role}", bukan "${peranDiharapkan}".`);
  }
  return { uid: akun.uid, nama: data.nama ?? email, kelas: data.kelas };
}

async function isiData(emailAsisten, emailPraktikan) {
  const asisten = await cariAkun(emailAsisten, 'asisten');
  const praktikan = await cariAkun(emailPraktikan, 'praktikan');
  console.log(`Asisten  : ${asisten.nama}`);
  console.log(`Praktikan: ${praktikan.nama}`);

  if (new Date().getHours() >= 21) {
    console.warn('Peringatan: sudah malam, beberapa sesi "hari ini" bisa terpotong di 23:59.');
  }

  // Praktikan tambahan supaya rekap punya isi (bukan akun login sungguhan).
  const temanUji = [
    { id: 'uji-praktikan-1', nama: 'Rizky Pratama (uji)', nim: '24060124990001', kelas: KELAS_UJI },
    { id: 'uji-praktikan-2', nama: 'Siti Rahmawati (uji)', nim: '24060124990002', kelas: KELAS_UJI },
    { id: 'uji-praktikan-3', nama: 'Dewi Kusuma (uji)', nim: '24060124990003', kelas: KELAS_UJI },
    { id: 'uji-praktikan-4', nama: 'Joko Santoso (uji)', nim: '24060124990004', kelas: KELAS_UJI },
    // Kelas lain supaya terlihat bahwa memilih D1 tidak ikut memilih mereka.
    { id: 'uji-praktikan-5', nama: 'Bagus Wijaya (uji)', nim: '24060124990005', kelas: 'D2' },
    { id: 'uji-praktikan-6', nama: 'Nadia Putri (uji)', nim: '24060124990006', kelas: 'C1' },
  ];
  const teman = temanUji.filter((t) => t.kelas === KELAS_UJI).map((t) => t.id);
  const semuaPeserta = [praktikan.uid, ...teman];

  const sesiDasar = {
    asistenId: asisten.uid,
    asistenNama: asisten.nama,
    pesertaIds: semuaPeserta,
    updatedAt: new Date().toISOString(),
  };

  // Tiap sesi menguji satu keadaan di aplikasi.
  const sesi = [
    // Presensi praktikan (QR / kode 123456), Kelola Sesi "dibuka", Timeline "Dibuka".
    { id: 'uji-dibuka-sekarang', praktikum: 'Pemrograman Mobile', kelasLab: 'D1', labId: 'dekanat-fsm',
      tanggal: tanggal(0), jamMulai: jam(-30), jamSelesai: jam(90), status: 'dibuka' },
    // Tombol Buka Sesi (asisten) dan "Sesi Belum Dibuka" (praktikan).
    { id: 'uji-belum-dibuka-nanti', praktikum: 'Basis Data', kelasLab: 'D1', labId: 'lab-informatika-b',
      tanggal: tanggal(0), jamMulai: jam(180), jamSelesai: jam(300), status: 'belum_dibuka' },
    // Rekap: Hadir.
    { id: 'uji-kemarin-hadir', praktikum: 'Jaringan Komputer', kelasLab: 'D1', labId: 'lab-informatika-c',
      tanggal: tanggal(-1), jamMulai: '08:00', jamSelesai: '10:00', status: 'ditutup' },
    // Rekap: Sakit (izin sakit diterima).
    { id: 'uji-lalu-sakit', praktikum: 'Struktur Data', kelasLab: 'D1', labId: 'lab-informatika-d',
      tanggal: tanggal(-3), jamMulai: '13:00', jamSelesai: '15:00', status: 'ditutup' },
    // Rekap: Izin (izin biasa diterima).
    { id: 'uji-lalu-izin', praktikum: 'Pemrograman Web', kelasLab: 'D1', labId: 'dekanat-fsm',
      tanggal: tanggal(-5), jamMulai: '10:00', jamSelesai: '12:00', status: 'ditutup' },
    // Rekap: Alpha (izin ditolak dan tidak hadir).
    { id: 'uji-lalu-alpha', praktikum: 'Sistem Operasi', kelasLab: 'D1', labId: 'lab-informatika-b',
      tanggal: tanggal(-7), jamMulai: '08:00', jamSelesai: '10:00', status: 'ditutup' },
    // Pemeriksaan izin (menunggu) dan pelacak izin "Diperiksa".
    { id: 'uji-besok-izin-menunggu', praktikum: 'Kecerdasan Buatan', kelasLab: 'D1', labId: 'lab-informatika-c',
      tanggal: tanggal(1), jamMulai: '09:00', jamSelesai: '11:00', status: 'belum_dibuka' },
    // Ajukan izin baru (belum ada pengajuan).
    { id: 'uji-lusa-bebas', praktikum: 'Interaksi Manusia Komputer', kelasLab: 'D1', labId: 'lab-informatika-d',
      tanggal: tanggal(2), jamMulai: '13:00', jamSelesai: '15:00', status: 'belum_dibuka' },
  ].map((s) => ({ ...sesiDasar, ...s }));

  // Sesi milik asisten lain: Peta asisten menampilkan "Bukan sesimu".
  sesi.push({
    id: 'uji-asisten-lain', praktikum: 'Grafika Komputer', kelasLab: 'D1', labId: 'lab-informatika-c',
    tanggal: tanggal(0), jamMulai: jam(-15), jamSelesai: jam(105), status: 'dibuka',
    asistenId: 'uji-asisten-lain', asistenNama: 'Rani (uji)', pesertaIds: teman,
    updatedAt: new Date().toISOString(),
  });

  const hadir = (sessionId, userId, hari, jamKe, menitKe, jarakMeter, metode = 'qr') => ({
    id: `${sessionId}_${userId}`, sessionId, userId,
    waktuPresensi: waktuIso(hari, jamKe, menitKe), jarakMeter, radiusSaatPresensi: 60, metode,
  });

  const sekarang = new Date();
  const attendances = [
    // Sesi dibuka: dua teman sudah hadir, praktikan utama BELUM (untuk dicoba presensi).
    { ...hadir('uji-dibuka-sekarang', teman[0], 0, sekarang.getHours(), 0, 12), waktuPresensi: new Date(Date.now() - 20 * 60000).toISOString() },
    { ...hadir('uji-dibuka-sekarang', teman[1], 0, sekarang.getHours(), 0, 75, 'kode'), waktuPresensi: new Date(Date.now() - 10 * 60000).toISOString() },
    // Sesi kemarin: praktikan utama hadir, satu teman di luar radius.
    hadir('uji-kemarin-hadir', praktikan.uid, -1, 8, 6, 18),
    hadir('uji-kemarin-hadir', teman[0], -1, 8, 2, 9),
    hadir('uji-kemarin-hadir', teman[2], -1, 8, 15, 140, 'kode'),
    // Sesi lalu: beberapa teman hadir supaya rekap tidak kosong.
    hadir('uji-lalu-sakit', teman[0], -3, 13, 4, 20),
    hadir('uji-lalu-sakit', teman[1], -3, 13, 9, 31),
    hadir('uji-lalu-izin', teman[2], -5, 10, 1, 15),
    hadir('uji-lalu-alpha', teman[3], -7, 8, 3, 22),
  ];

  const izin = (sessionId, userId, alasan, kategoriAi, status, hariAju, diputuskan) => ({
    id: `${sessionId}_${userId}`, sessionId, userId, alasan, kategoriAi, status,
    createdAt: waktuIso(hariAju, 20, 15),
    diputuskanOleh: diputuskan ? asisten.nama : null,
    diputuskanAt: diputuskan ? waktuIso(hariAju + 1, 7, 30) : null,
  });

  const leaveRequests = [
    izin('uji-lalu-sakit', praktikan.uid, 'Demam tinggi sejak malam, disarankan istirahat oleh klinik kampus.', 'sakit', 'diterima', -4, true),
    izin('uji-lalu-izin', praktikan.uid, 'Menghadiri pernikahan kakak di luar kota.', 'izin', 'diterima', -6, true),
    izin('uji-lalu-alpha', praktikan.uid, 'Ada urusan keluarga mendadak.', 'izin', 'ditolak', -8, true),
    // Diajukan hari ini supaya muncul di filter "Hari ini" pada Pemeriksaan Izin.
    { ...izin('uji-besok-izin-menunggu', praktikan.uid, 'Kontrol ke dokter gigi yang jadwalnya tidak bisa dipindah.', 'sakit', 'menunggu', 0, false),
      createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
    // Teman: satu izin menunggu lagi dan satu sakit pada sesi kemarin.
    { ...izin('uji-besok-izin-menunggu', teman[3], 'Mengikuti lomba mewakili fakultas.', 'izin', 'menunggu', 0, false),
      createdAt: new Date(Date.now() - 25 * 60000).toISOString() },
    izin('uji-kemarin-hadir', teman[1], 'Tipes, ada surat dokter.', 'sakit', 'diterima', -2, true),
  ];

  const notifications = [
    { id: 'uji-notif-1', type: 'sesi_dibuka', sessionId: 'uji-dibuka-sekarang',
      title: 'Sesi Pemrograman Mobile dibuka', body: 'Kelas D1 di Dekanat FSM. Segera lakukan presensi.',
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(), readBy: [] },
    { id: 'uji-notif-2', type: 'izin_diterima', sessionId: 'uji-lalu-sakit',
      title: 'Izin diterima', body: `Izin untuk Struktur Data diterima oleh ${asisten.nama}.`,
      createdAt: waktuIso(-3, 7, 30), readBy: [praktikan.uid] },
    { id: 'uji-notif-3', type: 'izin_ditolak', sessionId: 'uji-lalu-alpha',
      title: 'Izin ditolak', body: `Izin untuk Sistem Operasi ditolak oleh ${asisten.nama}.`,
      createdAt: waktuIso(-7, 7, 30), readBy: [] },
  ].map((n) => ({ ...n, targetUserIds: [praktikan.uid] }));

  // Pengajuan pindah kelas menunggu: Bagus (D2) ingin ke D1, dipegang asisten uji.
  const pengajuanKelas = [{
    id: 'uji-praktikan-5', userId: 'uji-praktikan-5', nama: 'Bagus Wijaya (uji)', nim: '24060124990005',
    kelasLama: 'D2', kelasBaru: KELAS_UJI, alasan: 'Jadwal kuliah kelas D2 bentrok dengan kerja praktik.',
    asistenIds: [asisten.uid], status: 'menunggu', createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    diputuskanOleh: null, diputuskanAt: null,
  }];

  const batch = db.batch();
  temanUji.forEach((t) =>
    batch.set(db.collection('users').doc(t.id), {
      nama: t.nama, nim: t.nim, role: 'praktikan', email: `${t.id}@contoh.test`, kelas: t.kelas,
    }),
  );
  // Praktikan utama ikut kelas uji (hanya bila belum memilih kelas sendiri).
  if (!praktikan.kelas) {
    batch.update(db.collection('users').doc(praktikan.uid), { kelas: KELAS_UJI });
  }
  sesi.forEach(({ id, ...data }) => batch.set(db.collection('sessions').doc(id), data));
  sesi
    .filter((s) => s.status === 'dibuka')
    .forEach((s) =>
      batch.set(db.collection('sessionCodes').doc(s.id), {
        kode: KODE_SESI_UJI, asistenId: s.asistenId, updatedAt: new Date().toISOString(),
      }),
    );
  attendances.forEach(({ id, ...data }) => batch.set(db.collection('attendances').doc(id), data));
  leaveRequests.forEach(({ id, ...data }) => batch.set(db.collection('leaveRequests').doc(id), data));
  notifications.forEach(({ id, ...data }) => batch.set(db.collection('notifications').doc(id), data));
  pengajuanKelas.forEach(({ id, ...data }) => batch.set(db.collection('pengajuanKelas').doc(id), data));
  await batch.commit();

  console.log('');
  console.log(`Data uji ditulis: ${sesi.length} sesi, ${attendances.length} presensi, ` +
    `${leaveRequests.length} izin, ${notifications.length} pemberitahuan, ${temanUji.length} praktikan tambahan, ` +
    `${pengajuanKelas.length} pengajuan pindah kelas.`);
  console.log(`Kode sesi yang sedang dibuka: ${KODE_SESI_UJI}`);
  console.log('Hapus lagi dengan: node scripts/seed-uji.mjs --hapus');
}

try {
  if (process.argv.includes('--hapus')) {
    await hapusSemua();
  } else {
    const emailAsisten = ambilArg('asisten');
    const emailPraktikan = ambilArg('praktikan');
    if (!emailAsisten || !emailPraktikan) {
      console.error('Pakai: node scripts/seed-uji.mjs --asisten <email> --praktikan <email>');
      process.exit(1);
    }
    await isiData(emailAsisten, emailPraktikan);
  }
} catch (err) {
  console.error(`Gagal: ${err.message}`);
  process.exit(1);
}
