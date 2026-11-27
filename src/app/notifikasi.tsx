// SRS4-04 (PIC B — Annis): daftar notifikasi lengkap, dibuka dari "Lihat semua" di Profil.
// - Ketuk: tandai dibaca lalu buka halaman terkait (deep link yang sama dengan push).
// - Geser ke kiri: hapus dari daftarmu (soft delete lewat hiddenFor), dengan "Urungkan".
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IlustrasiNotifikasi } from '@/components/ilustrasi';
import { BarisNotifikasi } from '@/components/notifikasi/baris-notifikasi';
import { useToast } from '@/components/toast';
import { EmptyNote, Screen, TopBar } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useNotifikasiSaya } from '@/services/notifications';
import type { Notification } from '@/types';
import { Logger } from '@/utils/logger';
import { tujuanNotifikasi } from '@/utils/tujuan-notifikasi';

const LAMA_URUNGKAN_MS = 4000;

function AksiHapus() {
  return (
    <View style={styles.aksiHapus}>
      <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
      <Text style={styles.aksiHapusTeks}>Hapus</Text>
    </View>
  );
}

export default function NotifikasiScreen() {
  const notif = useNotifikasiSaya();
  const insets = useSafeAreaInsets();
  const { tampilkanToast } = useToast();

  // Disembunyikan di layar seketika, sebelum Firestore mengirim pembaruan.
  const [disembunyikan, setDisembunyikan] = useState<Set<string>>(new Set());
  const [urungkan, setUrungkan] = useState<Notification | null>(null);
  const pewaktu = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (pewaktu.current) clearTimeout(pewaktu.current);
  }, []);

  const daftar = notif.items.filter((item) => !disembunyikan.has(item.id));

  function buka(item: Notification) {
    if (!notif.sudahDibaca(item)) void notif.tandaiDibaca([item.id]);
    router.push(tujuanNotifikasi(item) as Href);
  }

  function hapus(item: Notification) {
    setDisembunyikan((s) => new Set(s).add(item.id));
    setUrungkan(item);
    if (pewaktu.current) clearTimeout(pewaktu.current);
    pewaktu.current = setTimeout(() => setUrungkan(null), LAMA_URUNGKAN_MS);
    notif.sembunyikan(item.id).catch((err: unknown) => {
      Logger.error('FIRESTORE', 'sembunyikanNotifikasi', err);
      setDisembunyikan((s) => {
        const baru = new Set(s);
        baru.delete(item.id);
        return baru;
      });
      tampilkanToast('Periksa koneksi internet lalu coba lagi.', 'error', 'Notifikasi gagal dihapus');
    });
  }

  function batalkanHapus() {
    const item = urungkan;
    if (!item) return;
    if (pewaktu.current) clearTimeout(pewaktu.current);
    setUrungkan(null);
    setDisembunyikan((s) => {
      const baru = new Set(s);
      baru.delete(item.id);
      return baru;
    });
    notif.tampilkanLagi(item.id).catch((err: unknown) => Logger.error('FIRESTORE', 'tampilkanLagiNotifikasi', err));
  }

  const tombolDibaca =
    notif.jumlahBelumDibaca > 0 ? (
      <Pressable
        onPress={notif.tandaiSemuaDibaca}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Tandai semua sudah dibaca"
        style={({ pressed }) => [styles.tombolDibaca, pressed && { opacity: 0.7 }]}>
        <Ionicons name="checkmark-done" size={18} color={Palette.text} />
      </Pressable>
    ) : undefined;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Screen withTabBar={false} header={<TopBar title="Notifikasi" back fallback="/profil" right={tombolDibaca} />}>
        {notif.loading ? (
          <ActivityIndicator color={Palette.primary} style={{ marginTop: 24 }} />
        ) : notif.error ? (
          <EmptyNote icon="cloud-offline-outline" message={notif.error} />
        ) : daftar.length === 0 ? (
          <View style={styles.kosong}>
            <IlustrasiNotifikasi lebar={200} />
            <Text style={styles.kosongJudul}>Belum ada notifikasi</Text>
            <Text style={styles.kosongTeks}>
              Pemberitahuan sesi dibuka, keputusan izin, dan tagihan akan muncul di sini.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.petunjuk}>
              {notif.jumlahBelumDibaca > 0 ? `${notif.jumlahBelumDibaca} belum dibaca · ` : ''}Geser ke kiri untuk menghapus
            </Text>
            <View style={{ gap: 10 }}>
              {daftar.map((item, i) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(Math.min(i, 8) * 40)}
                  exiting={FadeOut.duration(180)}
                  layout={LinearTransition.duration(220)}>
                  <ReanimatedSwipeable
                    friction={1.6}
                    rightThreshold={72}
                    overshootRight={false}
                    renderRightActions={() => <AksiHapus />}
                    onSwipeableOpen={() => hapus(item)}>
                    <BarisNotifikasi item={item} baru={!notif.sudahDibaca(item)} onPress={() => buka(item)} />
                  </ReanimatedSwipeable>
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </Screen>

      {urungkan ? (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.urungkan, { bottom: insets.bottom + 20 }]}>
          <Text style={styles.urungkanTeks} numberOfLines={1}>
            Notifikasi dihapus
          </Text>
          <Pressable onPress={batalkanHapus} hitSlop={10} accessibilityRole="button">
            <Text style={styles.urungkanAksi}>Urungkan</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tombolDibaca: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  petunjuk: { color: Palette.textMuted, fontSize: 12 },
  aksiHapus: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 20,
    gap: 2,
    justifyContent: 'center',
    marginLeft: 8,
    width: 84,
  },
  aksiHapusTeks: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  kosong: { alignItems: 'center', gap: 6, paddingTop: 24 },
  kosongJudul: { color: Palette.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
  kosongTeks: { color: Palette.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  urungkan: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 16,
    left: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    position: 'absolute',
    right: 20,
  },
  urungkanTeks: { color: '#FFFFFF', flex: 1, fontSize: 13 },
  urungkanAksi: { color: Palette.lilac, fontSize: 13, fontWeight: '700' },
});
