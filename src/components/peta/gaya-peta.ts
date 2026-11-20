// SRS3-03 (PIC B — Annis): gaya peta Google pastel sesuai warna HadirKu
// (ungu muda, putih, abu keunguan). Label tempat yang tidak relevan disembunyikan
// supaya marker laboratorium paling menonjol. Hanya berlaku untuk tile Google, bukan OSM.
import type { MapStyleElement } from 'react-native-maps';

export const GAYA_PETA_PASTEL: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#ECE8F1' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8F89A0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F6F4F9' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#E4DAF1' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#E2EBE0' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#DCD5E6' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#A39DB2' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F7F3FA' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#D9D0EA' }] },
];
