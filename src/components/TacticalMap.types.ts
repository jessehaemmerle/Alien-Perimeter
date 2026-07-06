import type { ClearedArea, LatLng, Zone } from '../types';

export interface MapFocus {
  center: LatLng;
  radiusM: number;
}

/**
 * Plattformneutrale Schnittstelle der Einsatzkarte.
 * Native Implementierung: react-native-maps (TacticalMap.tsx),
 * Web/PWA-Implementierung: Leaflet (TacticalMap.web.tsx).
 */
export interface TacticalMapProps {
  zones: Zone[];
  cleared: ClearedArea[];
  /** Aufgezeichnete Route der aktiven Mission */
  route: LatLng[];
  /** Position des virtuellen Läufers im Simulationsmodus */
  simPos: LatLng | null;
  playerPos: LatLng | null;
  selectedZoneId: string | null;
  /** Blaue System-Positionsanzeige (nur sinnvoll, wenn GPS erlaubt ist) */
  showUserLocation: boolean;
  /** Kamerafokus; jede Änderung animiert die Kamera dorthin */
  focus: MapFocus | null;
  /** Aktuelle Zeit für Schild-Anzeige befreiter Gebiete */
  nowMs: number;
  onZonePress: (id: string) => void;
}

export function zoneIcon(kind: string): string {
  switch (kind) {
    case 'mothership':
      return '🛸';
    case 'sector':
      return '☣️';
    case 'cluster':
      return '👾';
    default:
      return '🕸️';
  }
}
