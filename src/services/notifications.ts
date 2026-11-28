// SRS3-04 (PIC B — Annis): push notification lewat Expo Push Service (diteruskan ke FCM),
// plus salinan di koleksi `notifications` sebagai notifikasi in-app bila push gagal.
//
// Alur:
// 1. Saat pengguna masuk, token Expo perangkat disimpan ke users/{uid}.pushTokens.
// 2. Saat asisten membuka sesi, mengubah jadwal, atau memutuskan izin, aplikasi asisten
//    memanggil kirimNotifikasi(): menulis dokumen notifications lalu mengirim push ke token
//    para penerima.
// 3. Saat logout, token perangkat dihapus dari dokumen user (QA #7).
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useCurrentUser } from '@/context/auth-context';
import { COLLECTIONS, db } from '@/services/firebase';
import type {
  LeaveRequest,
  Notification,
  NotificationType,
  PengajuanKelas,
  Session,
} from '@/types';
import { formatRentangJam, formatTanggal } from '@/utils/format';
import { Logger } from '@/utils/logger';
import { tipeNotifikasiValid, tujuanNotifikasi } from '@/utils/tujuan-notifikasi';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHANNEL_ID = 'default';
// Batas Expo Push Service per permintaan.
const MAKS_PER_KIRIM = 100;

// Notifikasi tetap tampil sebagai banner walaupun aplikasi sedang dibuka.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Token perangkat ini selama aplikasi berjalan; dipakai saat logout untuk dihapus.
let tokenPerangkat: string | null = null;

export type StatusPush =
  | 'memeriksa'
  | 'aktif' // izin diberikan dan token tersimpan
  | 'ditolak' // izin notifikasi ditolak pengguna
  | 'tidak_didukung' // emulator / perangkat tanpa layanan push
  | 'gagal'; // izin ada tetapi token gagal diambil atau disimpan (mis. offline)

async function siapkanChannelAndroid() {
  if (Platform.OS !== 'android') return;
  // Android 13+ butuh channel sebelum meminta izin notifikasi.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Kegiatan praktikum',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#E21BD0',
  });
}

/**
 * Meminta izin notifikasi (bila belum), mengambil token Expo, lalu menyimpannya ke
 * users/{uid}.pushTokens. Aman dipanggil berkali-kali karena memakai arrayUnion.
 */
export async function daftarkanPushToken(userId: string): Promise<StatusPush> {
  if (!Device.isDevice) return 'tidak_didukung';
  try {
    await siapkanChannelAndroid();

    let izin = await Notifications.getPermissionsAsync();
    if (izin.status !== 'granted' && izin.canAskAgain) {
      izin = await Notifications.requestPermissionsAsync();
    }
    if (izin.status !== 'granted') return 'ditolak';

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await updateDoc(doc(db, COLLECTIONS.users, userId), { pushTokens: arrayUnion(token) });
    tokenPerangkat = token;
    return 'aktif';
  } catch (error) {
    Logger.error('FCM', 'daftarkanPushToken', error);
    return 'gagal';
  }
}

/** Panggil SEBELUM signOut: setelah logout aplikasi tidak boleh lagi menulis dokumen user. */
export async function hapusPushToken(userId: string): Promise<void> {
  if (!tokenPerangkat) return;
  try {
    await updateDoc(doc(db, COLLECTIONS.users, userId), {
      pushTokens: arrayRemove(tokenPerangkat),
    });
    tokenPerangkat = null;
  } catch (error) {
    // Logout tetap dilanjutkan walaupun penghapusan gagal (mis. offline).
    Logger.error('FCM', 'hapusPushToken', error);
  }
}

/**
 * Mendaftarkan token setiap kali pengguna yang login berganti, dan saat layar kembali fokus
 * (misalnya setelah pengguna mengaktifkan izin di Pengaturan).
 */
export function usePushNotifikasi() {
  const currentUser = useCurrentUser();
  const userId = currentUser?.id ?? null;
  const [status, setStatus] = useState<StatusPush>('memeriksa');
  const [percobaan, setPercobaan] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let aktif = true;
      daftarkanPushToken(userId).then((hasil) => {
        if (aktif) setStatus(hasil);
      });
      if (percobaan > 0) Logger.info('FCM', 'usePushNotifikasi', `Percobaan ulang ke-${percobaan}`);
      return () => {
        aktif = false;
      };
    }, [userId, percobaan]),
  );

  return { status, cobaLagi: () => setPercobaan((n) => n + 1) };
}

// ---------------------------------------------------------------------------
// SRS4-04: deep link saat notifikasi push diketuk
// ---------------------------------------------------------------------------

// Notifikasi yang sudah dibuka, supaya tidak dibuka ulang saat layout dipasang lagi.
let responTerakhirDitangani: string | null = null;

/**
 * Mengetuk notifikasi push membuka halaman spesifiknya (bukan Beranda), termasuk saat
 * aplikasi dibuka dari keadaan tertutup lewat notifikasi. Dipasang sekali di layout tab.
 */
export function useBukaDariNotifikasi() {
  const currentUser = useCurrentUser();
  const respon = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!currentUser || !respon) return;
    if (respon.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = respon.notification.request.identifier;
    if (id === responTerakhirDitangani) return;
    responTerakhirDitangani = id;

    const data = respon.notification.request.content.data ?? {};
    const tujuan = tujuanNotifikasi({
      type: typeof data.type === 'string' ? data.type : null,
      sessionId: typeof data.sessionId === 'string' ? data.sessionId : null,
      fineId: typeof data.fineId === 'string' ? data.fineId : null,
    });
    Logger.info('FCM', 'bukaDariNotifikasi', `Membuka ${tujuan}`, { type: data.type });
    router.push(tujuan as Href);
    Notifications.clearLastNotificationResponse();
  }, [currentUser, respon]);
}

/**
 * Versi tanpa fokus layar, untuk dipasang sekali di layout tab (semua layar setelah login).
 * PM cukup menambahkan `useDaftarkanPushToken();` di src/app/(tabs)/_layout.tsx.
 */
export function useDaftarkanPushToken() {
  const currentUser = useCurrentUser();
  const userId = currentUser?.id ?? null;
  useEffect(() => {
    if (userId) daftarkanPushToken(userId);
  }, [userId]);
}

// ---------------------------------------------------------------------------
// Notifikasi in-app (fallback bila push tidak sampai)
// ---------------------------------------------------------------------------

type NotifState = {
  userId: string | null;
  items: Notification[];
  loading: boolean;
  error: string | null;
};

/** Pemberitahuan untuk pengguna yang login, terbaru di atas, realtime. */
export function useNotifikasiSaya() {
  const currentUser = useCurrentUser();
  const userId = currentUser?.id ?? null;
  const [state, setState] = useState<NotifState>({
    userId: null,
    items: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId) return;
    // Tanpa orderBy supaya tidak butuh indeks gabungan; diurutkan di perangkat.
    const q = query(
      collection(db, COLLECTIONS.notifications),
      where('targetUserIds', 'array-contains', userId),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Notification[] = [];
        snapshot?.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            targetUserIds: Array.isArray(data.targetUserIds) ? data.targetUserIds : [],
            title: typeof data.title === 'string' ? data.title : '',
            body: typeof data.body === 'string' ? data.body : '',
            type: tipeNotifikasiValid(data.type) ? data.type : 'sesi_dibuka',
            sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
            fineId: typeof data.fineId === 'string' ? data.fineId : undefined,
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
            readBy: Array.isArray(data.readBy) ? data.readBy : [],
            hiddenFor: Array.isArray(data.hiddenFor) ? data.hiddenFor : [],
          });
        });
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setState({ userId, items, loading: false, error: null });
      },
      (error) => {
        Logger.error('FIRESTORE', 'useNotifikasiSaya', error);
        setState({
          userId,
          items: [],
          loading: false,
          error: 'Pemberitahuan tidak dapat dimuat. Periksa koneksi internet Anda.',
        });
      },
    );
    return () => unsubscribe();
  }, [userId]);

  const sinkron = userId !== null && state.userId === userId;
  // SRS4-04: notifikasi yang dihapus pengguna ini (hiddenFor) tidak ditampilkan lagi.
  const items = sinkron && userId ? state.items.filter((item) => !item.hiddenFor?.includes(userId)) : [];
  const belumDibaca = userId ? items.filter((item) => !item.readBy.includes(userId)) : [];

  /** Hapus dari daftar pengguna ini saja (soft delete); dokumen tetap ada untuk audit. */
  async function sembunyikan(id: string) {
    if (!userId) return;
    await updateDoc(doc(db, COLLECTIONS.notifications, id), { hiddenFor: arrayUnion(userId) });
  }

  /** Urungkan hapus. */
  async function tampilkanLagi(id: string) {
    if (!userId) return;
    await updateDoc(doc(db, COLLECTIONS.notifications, id), { hiddenFor: arrayRemove(userId) });
  }

  async function tandaiDibaca(ids: string[]) {
    if (!userId) return;
    await Promise.all(
      ids.map((id) =>
        updateDoc(doc(db, COLLECTIONS.notifications, id), { readBy: arrayUnion(userId) }).catch(
          (error: unknown) => Logger.error('FIRESTORE', 'tandaiDibaca', error),
        ),
      ),
    );
  }

  return {
    items,
    jumlahBelumDibaca: belumDibaca.length,
    sudahDibaca: (item: Notification) => (userId ? item.readBy.includes(userId) : true),
    loading: userId === null ? false : sinkron ? state.loading : true,
    error: sinkron ? state.error : null,
    tandaiDibaca,
    tandaiSemuaDibaca: () => tandaiDibaca(belumDibaca.map((item) => item.id)),
    sembunyikan,
    tampilkanLagi,
  };
}

// ---------------------------------------------------------------------------
// Pengiriman
// ---------------------------------------------------------------------------

export type PesanNotifikasi = {
  type: NotificationType;
  targetUserIds: string[];
  title: string;
  body: string;
  sessionId?: string;
  /** Sprint 4: rujukan deep link untuk notifikasi tagihan. */
  fineId?: string;
};

export type HasilKirim = {
  tersimpanInApp: boolean;
  pushTerkirim: number;
  pushGagal: number;
};

async function ambilToken(userIds: string[]): Promise<string[]> {
  const hasil = await Promise.all(
    userIds.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
        const tokens = snap.data()?.pushTokens;
        return Array.isArray(tokens) ? tokens.filter((t): t is string => typeof t === 'string') : [];
      } catch (error) {
        Logger.warn('FCM', 'ambilToken', `Gagal membaca token ${uid}`, { error: String(error) });
        return [];
      }
    }),
  );
  // Satu perangkat bisa tersimpan di dua akun; kirim sekali saja.
  return [...new Set(hasil.flat())];
}

type BalasanExpo = {
  data?: { status: string; message?: string }[];
  errors?: { code?: string; message?: string; details?: Record<string, string[]> }[];
};

async function kirimKeExpo(tokens: string[], pesan: PesanNotifikasi) {
  let terkirim = 0;
  let gagal = 0;
  const antrian: string[][] = [];
  for (let i = 0; i < tokens.length; i += MAKS_PER_KIRIM) {
    antrian.push(tokens.slice(i, i + MAKS_PER_KIRIM));
  }

  let kelompok = antrian.shift();
  while (kelompok) {
    const bagian = kelompok.map((to) => ({
      to,
      title: pesan.title,
      body: pesan.body,
      sound: 'default',
      channelId: CHANNEL_ID,
      data: { type: pesan.type, sessionId: pesan.sessionId ?? null, fineId: pesan.fineId ?? null },
    }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(bagian),
      });
      const json = (await res.json()) as BalasanExpo;

      // Expo menolak SELURUH permintaan bila tokennya berasal dari lebih dari satu project Expo
      // (mis. development build tim dan APK build pribadi). Kirim ulang per project.
      const campuran = json.errors?.find((e) => e.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS');
      if (campuran?.details && kelompok.length > 1) {
        Object.values(campuran.details).forEach((daftar) => {
          if (daftar.length > 0) antrian.push(daftar);
        });
      } else {
        (json.data ?? []).forEach((tiket) => {
          if (tiket.status === 'ok') terkirim += 1;
          else {
            gagal += 1;
            Logger.warn('FCM', 'kirimKeExpo', tiket.message ?? 'Tiket push gagal');
          }
        });
        if (!res.ok) {
          if (!json.data) gagal += kelompok.length;
          Logger.warn('FCM', 'kirimKeExpo', `HTTP ${res.status} ${json.errors?.[0]?.message ?? ''}`);
        }
      }
    } catch (error) {
      gagal += bagian.length;
      Logger.error('FCM', 'kirimKeExpo', error);
    }
    kelompok = antrian.shift();
  }
  return { terkirim, gagal };
}

/**
 * Menyimpan notifikasi in-app lalu mengirim push. Tidak pernah melempar error: kegagalan
 * notifikasi tidak boleh membatalkan aksi utama (buka sesi, ubah jadwal, putuskan izin).
 * Dipanggil dari perangkat asisten.
 */
export async function kirimNotifikasi(pesan: PesanNotifikasi): Promise<HasilKirim> {
  const targetUserIds = [...new Set(pesan.targetUserIds)];
  if (targetUserIds.length === 0) return { tersimpanInApp: false, pushTerkirim: 0, pushGagal: 0 };

  let tersimpanInApp = false;
  try {
    await addDoc(collection(db, COLLECTIONS.notifications), {
      targetUserIds,
      title: pesan.title,
      body: pesan.body,
      type: pesan.type,
      sessionId: pesan.sessionId ?? null,
      ...(pesan.fineId ? { fineId: pesan.fineId } : {}),
      createdAt: new Date().toISOString(),
      readBy: [],
    });
    tersimpanInApp = true;
  } catch (error) {
    Logger.error('FIRESTORE', 'kirimNotifikasi', error);
  }

  const tokens = await ambilToken(targetUserIds);
  const { terkirim, gagal } = tokens.length > 0 ? await kirimKeExpo(tokens, pesan) : { terkirim: 0, gagal: 0 };
  return { tersimpanInApp, pushTerkirim: terkirim, pushGagal: gagal };
}

// ---------------------------------------------------------------------------
// Isi pesan untuk 4 peristiwa (SRS 5.4). PIC A memakai dua yang pertama.
// ---------------------------------------------------------------------------

type SesiRingkas = Pick<Session, 'id' | 'praktikum' | 'kelasLab' | 'tanggal' | 'jamMulai' | 'jamSelesai' | 'pesertaIds'>;

function namaSesi(session: Pick<Session, 'praktikum' | 'kelasLab'>): string {
  return session.kelasLab ? `${session.praktikum} (${session.kelasLab})` : session.praktikum;
}

/** Sesi dibuka asisten → seluruh peserta. */
export function pesanSesiDibuka(session: SesiRingkas): PesanNotifikasi {
  return {
    type: 'sesi_dibuka',
    targetUserIds: session.pesertaIds,
    title: 'Sesi praktikum dibuka',
    body: `${namaSesi(session)} sudah dibuka. Segera lakukan presensi.`,
    sessionId: session.id,
  };
}

/** Tanggal, jam, atau lab diubah asisten → seluruh peserta. Kirim dengan data sesi yang BARU. */
export function pesanJadwalBerubah(session: SesiRingkas, namaLab?: string): PesanNotifikasi {
  const tempat = namaLab ? ` di ${namaLab}` : '';
  return {
    type: 'jadwal_berubah',
    targetUserIds: session.pesertaIds,
    title: 'Jadwal praktikum berubah',
    body: `${namaSesi(session)} kini ${formatTanggal(session.tanggal)}, ${formatRentangJam(session.jamMulai, session.jamSelesai)}${tempat}.`,
    sessionId: session.id,
  };
}

/** Izin diterima/ditolak asisten → praktikan pemohon. */
export function pesanKelasDiputuskan(
  pengajuan: Pick<PengajuanKelas, 'userId' | 'kelasBaru'>,
  keputusan: 'diterima' | 'ditolak',
): PesanNotifikasi {
  return {
    type: keputusan === 'diterima' ? 'kelas_diterima' : 'kelas_ditolak',
    targetUserIds: [pengajuan.userId],
    title: keputusan === 'diterima' ? 'Pindah kelas diterima' : 'Pindah kelas ditolak',
    body:
      keputusan === 'diterima'
        ? `Kelas praktikummu sekarang ${pengajuan.kelasBaru}. Sesi baru kelas ini otomatis mencantumkanmu.`
        : `Pengajuan pindah ke kelas ${pengajuan.kelasBaru} ditolak oleh asisten.`,
  };
}

export function pesanIzinDiputuskan(
  izin: Pick<LeaveRequest, 'userId' | 'sessionId'>,
  keputusan: 'diterima' | 'ditolak',
  session?: Pick<Session, 'praktikum' | 'kelasLab' | 'tanggal'>,
): PesanNotifikasi {
  const untuk = session ? ` untuk ${namaSesi(session)}, ${formatTanggal(session.tanggal)}` : '';
  return {
    type: keputusan === 'diterima' ? 'izin_diterima' : 'izin_ditolak',
    targetUserIds: [izin.userId],
    title: keputusan === 'diterima' ? 'Izin diterima' : 'Izin ditolak',
    body: `Pengajuan izin${untuk} ${keputusan} oleh asisten.`,
    sessionId: izin.sessionId,
  };
}

/** SRS4-05: izin diterima membatalkan denda keterlambatan sesi itu → praktikan pemilik denda. */
export function pesanTagihanDibatalkan(
  fine: { id: string; userId: string; sessionId: string; nominal: number },
  session?: Pick<Session, 'praktikum' | 'kelasLab'>,
): PesanNotifikasi {
  const rupiah = 'Rp' + Math.round(fine.nominal).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sesi = session ? ` ${namaSesi(session)}` : '';
  return {
    type: 'tagihan_dibatalkan',
    targetUserIds: [fine.userId],
    title: 'Denda dibatalkan',
    body: `Denda keterlambatan${sesi} sebesar ${rupiah} dibatalkan karena izinmu diterima.`,
    sessionId: fine.sessionId,
    fineId: fine.id,
  };
}
