export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RoutePoint extends LatLng {
  timestampMs: number;
}

export type MovementMode = 'walk' | 'jog' | 'hike' | 'bike';

export type ZoneKind = 'nest' | 'cluster' | 'sector' | 'mothership';

export type ThreatLevel = 1 | 2 | 3 | 4 | 5;

export interface Zone {
  id: string;
  kind: ZoneKind;
  name: string;
  center: LatLng;
  radiusM: number;
  polygon: LatLng[];
  threat: ThreatLevel;
  /** 100 = voller Befall, 0 = neutralisiert */
  integrity: number;
  requiredLaps: number;
  lapsDone: number;
  unstable: boolean;
  /** Zeitpunkt, zu dem sich eine instabile Zone ausbreitet */
  expandsAtMs?: number;
  spawnedAtMs: number;
  xpReward: number;
}

export interface ClearedArea {
  id: string;
  name: string;
  center: LatLng;
  radiusM: number;
  clearedAtMs: number;
  /** Schildgenerator-Schutz bis zu diesem Zeitpunkt */
  shieldUntilMs?: number;
}

export type ItemId =
  | 'scanner'
  | 'signal'
  | 'shield'
  | 'orbital'
  | 'teamboost'
  | 'routeboost'
  | 'extraction';

export interface PlayerStats {
  distanceKm: number;
  zonesCleared: number;
  nestsCleared: number;
  clustersCleared: number;
  sectorsCleared: number;
  mothershipsCleared: number;
  lapsCompleted: number;
  longestLapKm: number;
  shieldsDeployed: number;
  coopMissions: number;
  unstableCleared: number;
  wavesSurvived: number;
}

export interface LapEvaluation {
  valid: boolean;
  /** Deutsche Begründungen, warum die Runde (noch) nicht gilt */
  reasons: string[];
  closed: boolean;
  closureGapM: number;
  closureThresholdM: number;
  pathLengthM: number;
  requiredDistanceM: number;
  enclosesCenter: boolean;
  /** Anteil der Zonen-Eckpunkte innerhalb der Route (0..1) */
  coverage: number;
  maxDeviationM: number;
  maxAllowedDeviationM: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  speedOk: boolean;
  gpsPlausible: boolean;
  /** true, wenn eine Notfall-Extraktion die Runde retten könnte */
  rescuable: boolean;
  rescued: boolean;
}
