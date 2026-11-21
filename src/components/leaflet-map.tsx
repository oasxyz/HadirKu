'use dom';

import 'leaflet/dist/leaflet.css';
import type { DOMProps } from 'expo/dom';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

export interface MapLabPoint {
  id: string;
  namaLab: string;
  deskripsi?: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
}

export interface MapCoords {
  latitude: number;
  longitude: number;
}

interface LeafletMapProps {
  dom?: DOMProps;
  labs: MapLabPoint[];
  selectedLabId?: string | null;
  userLocation?: MapCoords | null;
  onSelectLab?: (labId: string) => void | Promise<void>;
  onPickLocation?: (coords: MapCoords) => void | Promise<void>;
}

// Titik tengah area FSM UNDIP sebagai fallback awal
const DEFAULT_CENTER: [number, number] = [-7.0486, 110.4411];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createPinIcon(label: string, active: boolean): L.DivIcon {
  const bg = active ? '#E21BD0' : '#17151C';
  const ring = active ? 'rgba(226, 27, 208, 0.28)' : 'rgba(23, 21, 28, 0.18)';

  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="
          width:18px;height:18px;border-radius:999px;
          background:${bg};border:3px solid #FFFFFF;
          box-shadow:0 0 0 4px ${ring}, 0 4px 10px rgba(0,0,0,0.22);
        "></div>
        <div style="
          margin-top:4px;padding:2px 8px;border-radius:999px;
          background:rgba(255,255,255,0.92);color:#131118;
          font-family:system-ui,sans-serif;font-size:11px;font-weight:700;
          white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.14);
          border:1px solid ${active ? '#E21BD0' : 'rgba(110,90,150,0.2)'};
        ">${escapeHtml(label)}</div>
      </div>
    `,
  });
}

function createUserIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `
      <div style="
        width:14px;height:14px;border-radius:999px;
        background:#2563EB;border:3px solid #FFFFFF;
        box-shadow:0 0 0 6px rgba(37,99,235,0.25);
      "></div>
    `,
  });
}

export default function LeafletMap({
  labs,
  selectedLabId,
  userLocation,
  onSelectLab,
  onPickLocation,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Inisialisasi peta sekali saja
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 17,
      zoomControl: true,
      attributionControl: true,
    });

    // Tile gratis CartoDB Voyager (berbasis data OpenStreetMap, tanpa API key)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // 2. Listener ketuk peta (untuk fitur Kelola Lab milik PIC A)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onPickLocation) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      onPickLocation({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [onPickLocation]);

  // 3. Render marker lab, lingkaran radius geofence, dan titik lokasi pengguna
  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // Hitung duplikasi koordinat agar pin lab yang berada di gedung sama tidak saling menumpuk
    const coordCounts = new Map<string, number>();
    const coordCursor = new Map<string, number>();
    labs.forEach((lab) => {
      const key = `${lab.latitude.toFixed(6)},${lab.longitude.toFixed(6)}`;
      coordCounts.set(key, (coordCounts.get(key) ?? 0) + 1);
    });

    labs.forEach((lab) => {
      const isActive = lab.id === selectedLabId;
      const key = `${lab.latitude.toFixed(6)},${lab.longitude.toFixed(6)}`;
      const totalSame = coordCounts.get(key) ?? 1;
      const idx = coordCursor.get(key) ?? 0;
      coordCursor.set(key, idx + 1);

      // Lingkaran geofence selalu menggunakan koordinat asli
      L.circle([lab.latitude, lab.longitude], {
        radius: lab.radiusMeter,
        color: isActive ? '#E21BD0' : '#6D28D9',
        weight: isActive ? 2 : 1,
        fillColor: isActive ? '#E21BD0' : '#6D28D9',
        fillOpacity: isActive ? 0.16 : 0.06,
      }).addTo(group);

      // Offset visual pin ~5 meter hanya jika ada beberapa lab di titik persis sama
      let pinLat = lab.latitude;
      let pinLng = lab.longitude;
      if (totalSame > 1) {
        const angle = (2 * Math.PI * idx) / totalSame;
        const offsetDeg = 0.000045;
        pinLat += Math.sin(angle) * offsetDeg;
        pinLng += Math.cos(angle) * offsetDeg;
      }

      const marker = L.marker([pinLat, pinLng], {
        icon: createPinIcon(lab.namaLab, isActive),
        zIndexOffset: isActive ? 500 : 100,
      }).addTo(group);

      marker.on('click', () => {
        onSelectLab?.(lab.id);
      });
    });

    if (userLocation) {
      L.marker([userLocation.latitude, userLocation.longitude], {
        icon: createUserIcon(),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(group);
    }
  }, [labs, selectedLabId, userLocation, onSelectLab]);

  // 4. Geser kamera halus ke lab yang dipilih
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLabId) return;

    const target = labs.find((l) => l.id === selectedLabId);
    if (target) {
      map.flyTo([target.latitude, target.longitude], 18, { duration: 0.6 });
    }
  }, [labs, selectedLabId]);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}