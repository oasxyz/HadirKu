'use dom';

// SRS3-03 (PIC B — Annis): kanvas peta tab Peta, digambar Leaflet di dalam DOM component
// (tanpa kunci Google). Tampilannya mengikuti mockup HadirKu: peta pastel keunguan, pin tetes
// magenta bila ada praktikum berlangsung (hitam bila tidak), lingkaran radius, dan titik
// pengguna ungu. Komponen ini hanya menggambar; data dan logika ada di src/app/(tabs)/peta.tsx.
// Komponen Leaflet milik PM (src/components/leaflet-map.tsx) tetap dipakai untuk Kelola Lab.
import 'leaflet/dist/leaflet.css';
import type { DOMProps } from 'expo/dom';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

export type PinPeta = {
  key: string;
  latitude: number;
  longitude: number;
  judul: string;
  aktif: boolean; // ada praktikum berlangsung di titik ini
  labId: string; // lab yang dipilih saat pin diketuk
};

export type RadiusPeta = {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  aktif: boolean;
};

export type TitikPeta = { latitude: number; longitude: number };

type Props = {
  dom?: DOMProps;
  pins: PinPeta[];
  radius: RadiusPeta[];
  pinTerpilih?: string | null;
  posisiPengguna?: TitikPeta | null;
  /** Naikkan angkanya untuk memusatkan peta ke posisi pengguna. */
  pusatkanKePengguna?: number;
  onPilihLab?: (labId: string) => Promise<void>;
  onKetukPeta?: () => Promise<void>;
  /** Dipanggil sekali saat peta pertama kali tampil (untuk menyembunyikan indikator memuat). */
  onSiap?: () => Promise<void>;
};

const MAGENTA = '#E21BD0';
const INK = '#17151C';
const UNGU = '#6B4FA0';
const PUSAT_AWAL: [number, number] = [-7.0486, 110.4411];

// Tile Esri World Street Map (tanpa kunci). CARTO kini mewajibkan API key dan server
// OpenStreetMap memblokir aplikasi, jadi keduanya tidak dipakai.
// Dua lapisan dari tile yang sama:
// 1. Dasar: dibuat abu, kontras dinaikkan di sekitar nada terang sehingga jalan tetap putih
//    sedangkan blok di antara jalan sedikit lebih gelap, lalu diberi warna lavender yang
//    mendekati #ECE8F1 (warna latar peta di mockup). Bagian "invert → brightness(2.5) →
//    brightness(0.4) → invert" memberi batas bawah kecerahan (~0.6), supaya jalan besar yang
//    aslinya oranye/kuning tampil ungu keabu-abuan, bukan garis hitam, saat peta di-zoom jauh.
//    Efek sampingnya tulisan ikut pudar.
// 2. Label: tile hitam-putih berkontras tinggi dengan mix-blend-mode multiply. Bagian putih jadi
//    "tembus", jadi yang tersisa hanya tulisan nama jalan berwarna gelap di atas lapisan dasar.
//    Hanya tampil mulai zoom 17: di zoom lebih jauh, tulisan Esri sama gelapnya dengan garis
//    tepi jalan, sehingga filter ikut menghitamkan jaringan jalan dan menabrak tulisan.
const TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const GAYA = `
  html, body { margin: 0; padding: 0; background: #ECE8F1; }
  .leaflet-container { background: #ECE8F1; font-family: system-ui, sans-serif; }
  .tile-dasar { filter: grayscale(1) brightness(0.6) contrast(4) brightness(1.14) invert(1) brightness(2.5) brightness(0.4) invert(1) sepia(0.2) hue-rotate(218deg) saturate(1); }
  .tile-label { filter: grayscale(1) contrast(3); mix-blend-mode: multiply; }
  .leaflet-control-attribution { font-size: 9px; background: rgba(255,255,255,0.7) !important; }
  .pin-hadirku { background: none; border: none; }
`;

function escapeHtml(teks: string): string {
  return teks
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ikonPin(judul: string, aktif: boolean, terpilih: boolean): L.DivIcon {
  const warna = aktif ? MAGENTA : INK;
  const skala = terpilih ? 1.15 : 1;
  return L.divIcon({
    className: 'pin-hadirku',
    iconSize: [140, 64],
    iconAnchor: [70, 40],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:scale(${skala});transform-origin:50% 62%;">
        <svg width="30" height="40" viewBox="0 0 30 40" style="filter:drop-shadow(0 3px 4px rgba(40,20,60,0.28));">
          <path d="M15 1C7.3 1 1.5 6.9 1.5 14.3 1.5 24.6 15 39 15 39S28.5 24.6 28.5 14.3C28.5 6.9 22.7 1 15 1Z"
            fill="${warna}" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="15" cy="14" r="5" fill="#FFFFFF"/>
        </svg>
        <div style="margin-top:2px;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          color:${INK};font-size:12px;font-weight:700;
          text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;">${escapeHtml(judul)}</div>
      </div>
    `,
  });
}

function ikonPengguna(): L.DivIcon {
  return L.divIcon({
    className: 'pin-hadirku',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `
      <div style="width:34px;height:34px;border-radius:999px;background:rgba(107,79,160,0.18);
        display:flex;align-items:center;justify-content:center;">
        <div style="width:14px;height:14px;border-radius:999px;background:${UNGU};border:3px solid #FFFFFF;
          box-shadow:0 1px 4px rgba(40,20,60,0.3);"></div>
      </div>
    `,
  });
}

export default function PetaLeaflet({
  pins,
  radius,
  pinTerpilih,
  posisiPengguna,
  pusatkanKePengguna = 0,
  onPilihLab,
  onKetukPeta,
  onSiap,
}: Props) {
  const wadahRef = useRef<HTMLDivElement | null>(null);
  const petaRef = useRef<L.Map | null>(null);
  const lapisanRef = useRef<L.LayerGroup | null>(null);
  const sudahDipusatkanRef = useRef(false);
  // Disimpan di ref supaya efek pembuatan peta (sekali jalan) tetap memanggil fungsi terbaru.
  const onSiapRef = useRef(onSiap);
  useEffect(() => {
    onSiapRef.current = onSiap;
  }, [onSiap]);

  // 1. Buat peta sekali.
  useEffect(() => {
    if (!wadahRef.current || petaRef.current) return;
    const peta = L.map(wadahRef.current, {
      center: PUSAT_AWAL,
      zoom: 17,
      // Cukup sampai skala kota; lebih jauh dari ini peta kampus jadi kosong dan pucat.
      minZoom: 14,
      zoomControl: false,
      attributionControl: true,
    });
    // Esri belum punya tile detail di atas zoom 17 untuk area kampus ("Map data not yet
    // available"), jadi zoom lebih dekat memakai tile zoom 17 yang diperbesar.
    const tile = L.tileLayer(TILE_URL, {
      className: 'tile-dasar',
      maxZoom: 19,
      maxNativeZoom: 17,
      attribution: 'Tiles &copy; Esri',
    }).addTo(peta);
    L.tileLayer(TILE_URL, {
      className: 'tile-label',
      minZoom: 17,
      maxZoom: 19,
      maxNativeZoom: 17,
    }).addTo(peta);
    lapisanRef.current = L.layerGroup().addTo(peta);
    petaRef.current = peta;

    // Beri tahu layar bahwa peta sudah tampil: saat tile pertama selesai dimuat, atau paling
    // lambat 8 detik (mis. koneksi lambat) supaya indikator memuat tidak menggantung.
    let sudahSiap = false;
    const tandaiSiap = () => {
      if (sudahSiap) return;
      sudahSiap = true;
      onSiapRef.current?.();
    };
    tile.once('load', tandaiSiap);
    const cadangan = setTimeout(tandaiSiap, 8000);

    return () => {
      clearTimeout(cadangan);
      peta.remove();
      petaRef.current = null;
      lapisanRef.current = null;
    };
  }, []);

  // 2. Ketuk area kosong peta (klik marker tidak diteruskan ke peta).
  useEffect(() => {
    const peta = petaRef.current;
    if (!peta || !onKetukPeta) return;
    const tangani = () => {
      onKetukPeta();
    };
    peta.on('click', tangani);
    return () => {
      peta.off('click', tangani);
    };
  }, [onKetukPeta]);

  // 3. Gambar radius, pin lab, dan titik pengguna.
  useEffect(() => {
    const lapisan = lapisanRef.current;
    if (!lapisan) return;
    lapisan.clearLayers();

    radius.forEach((r) => {
      L.circle([r.latitude, r.longitude], {
        radius: r.radiusMeter,
        color: r.aktif ? MAGENTA : INK,
        weight: r.aktif ? 2 : 1.5,
        opacity: r.aktif ? 0.9 : 0.55,
        dashArray: r.aktif ? undefined : '6 5',
        fillColor: r.aktif ? MAGENTA : INK,
        fillOpacity: r.aktif ? 0.13 : 0.05,
        interactive: false,
      }).addTo(lapisan);
    });

    pins.forEach((pin) => {
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: ikonPin(pin.judul, pin.aktif, pin.key === pinTerpilih),
        zIndexOffset: pin.key === pinTerpilih ? 500 : 100,
        keyboard: false,
      }).addTo(lapisan);
      marker.on('click', () => {
        onPilihLab?.(pin.labId);
      });
    });

    if (posisiPengguna) {
      L.marker([posisiPengguna.latitude, posisiPengguna.longitude], {
        icon: ikonPengguna(),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(lapisan);
    }
  }, [pins, radius, pinTerpilih, posisiPengguna, onPilihLab]);

  // 4. Saat data lab pertama kali datang, pusatkan peta ke semua lab.
  useEffect(() => {
    const peta = petaRef.current;
    if (!peta || sudahDipusatkanRef.current || pins.length === 0) return;
    sudahDipusatkanRef.current = true;
    const batas = L.latLngBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number]));
    peta.fitBounds(batas.pad(0.6), { maxZoom: 18 });
  }, [pins]);

  // 5. Terbang ke pin yang dipilih.
  useEffect(() => {
    const peta = petaRef.current;
    if (!peta || !pinTerpilih) return;
    const pin = pins.find((p) => p.key === pinTerpilih);
    if (pin) peta.flyTo([pin.latitude, pin.longitude], 18, { duration: 0.6 });
    // Sengaja hanya bereaksi pada pergantian pin, bukan setiap data pin diperbarui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinTerpilih]);

  // 6. Tombol "lokasi saya": pusatkan ke posisi pengguna setiap angkanya naik.
  useEffect(() => {
    const peta = petaRef.current;
    if (!peta || pusatkanKePengguna === 0 || !posisiPengguna) return;
    peta.flyTo([posisiPengguna.latitude, posisiPengguna.longitude], 18, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pusatkanKePengguna]);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <style>{GAYA}</style>
      <div ref={wadahRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
