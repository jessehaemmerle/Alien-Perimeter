/**
 * Dunkler, taktischer Kartenstil (Google-Maps-Stil-JSON, wirkt nur auf
 * Android/PROVIDER_GOOGLE; iOS nutzt den System-Dark-Mode von Apple Maps).
 */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a6b85' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#05080f' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1c2a42' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0d1626' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#16233b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0b1220' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#4a5b75' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e3050' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#060b16' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#33415c' }] },
];
