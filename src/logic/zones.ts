import type { LatLng, ThreatLevel, Zone, ZoneKind } from '../types';
import { destinationPoint } from './geo';
import { intRange, pick, range, type Rng } from './rng';

export interface ZoneSpec {
  kind: ZoneKind;
  label: string;
  radiusM: [number, number];
  threat: [ThreatLevel, ThreatLevel];
  laps: [number, number];
  xpBase: number;
  /** relative Spawn-Wahrscheinlichkeit */
  weight: number;
  unstableChance: number;
}

export const ZONE_SPECS: Record<ZoneKind, ZoneSpec> = {
  nest: {
    kind: 'nest',
    label: 'Alien-Nest',
    radiusM: [60, 140],
    threat: [1, 2],
    laps: [1, 1],
    xpBase: 120,
    weight: 0.45,
    unstableChance: 0.25,
  },
  cluster: {
    kind: 'cluster',
    label: 'Invasionscluster',
    radiusM: [150, 320],
    threat: [2, 3],
    laps: [1, 2],
    xpBase: 320,
    weight: 0.3,
    unstableChance: 0.35,
  },
  sector: {
    kind: 'sector',
    label: 'Invasionssektor',
    radiusM: [330, 620],
    threat: [3, 4],
    laps: [2, 3],
    xpBase: 750,
    weight: 0.17,
    unstableChance: 0.2,
  },
  mothership: {
    kind: 'mothership',
    label: 'Mutterschiff',
    radiusM: [450, 800],
    threat: [5, 5],
    laps: [4, 4],
    xpBase: 2200,
    weight: 0.08,
    unstableChance: 0,
  },
};

const CODENAMES = [
  'KRAIT',
  'VESSEL',
  'MORDAX',
  'ZERUS',
  'HALON',
  'NYX',
  'OKKUL',
  'THARN',
  'VOIDMAW',
  'SKARAB',
  'ECHIDNA',
  'PHOBOS',
];

/**
 * Unregelmäßiges "Befalls"-Polygon rund um das Zentrum – bewusst organisch,
 * damit Zonen wie ausgebreitete Infektionen wirken.
 */
export function generateZonePolygon(center: LatLng, radiusM: number, rng: Rng): LatLng[] {
  const vertices = 14;
  const points: LatLng[] = [];
  const phase = rng() * Math.PI * 2;
  for (let i = 0; i < vertices; i++) {
    const bearing = (360 / vertices) * i;
    const wobble =
      0.78 + 0.18 * Math.sin(phase + i * 1.7) + rng() * 0.22;
    points.push(destinationPoint(center, bearing, radiusM * wobble));
  }
  return points;
}

let zoneCounter = 0;

export function createZone(kind: ZoneKind, center: LatLng, rng: Rng, nowMs: number): Zone {
  const spec = ZONE_SPECS[kind];
  const radiusM = range(rng, spec.radiusM[0], spec.radiusM[1]);
  const threat = intRange(rng, spec.threat[0], spec.threat[1]) as ThreatLevel;
  const requiredLaps = intRange(rng, spec.laps[0], spec.laps[1]);
  const unstable = rng() < spec.unstableChance;
  zoneCounter += 1;
  const name = `${spec.label} ${pick(rng, CODENAMES)}-${intRange(rng, 1, 99)}`;
  return {
    id: `zone-${nowMs}-${zoneCounter}-${Math.floor(rng() * 1e6)}`,
    kind,
    name,
    center,
    radiusM,
    polygon: generateZonePolygon(center, radiusM, rng),
    threat,
    integrity: 100,
    requiredLaps,
    lapsDone: 0,
    unstable,
    expandsAtMs: unstable ? nowMs + intRange(rng, 20, 45) * 60_000 : undefined,
    spawnedAtMs: nowMs,
    xpReward: Math.round(spec.xpBase * (0.8 + threat * 0.25)),
  };
}

export function pickZoneKind(rng: Rng): ZoneKind {
  const specs = Object.values(ZONE_SPECS);
  const total = specs.reduce((s, z) => s + z.weight, 0);
  let roll = rng() * total;
  for (const spec of specs) {
    roll -= spec.weight;
    if (roll <= 0) return spec.kind;
  }
  return 'nest';
}

/**
 * Erzeugt Zonen rund um die Spielerposition (350 m – 2,6 km entfernt),
 * damit realistische Einsätze in Geh-/Radreichweite entstehen.
 */
export function generateZonesAround(
  playerPos: LatLng,
  count: number,
  rng: Rng,
  nowMs: number
): Zone[] {
  const zones: Zone[] = [];
  for (let i = 0; i < count; i++) {
    const kind = pickZoneKind(rng);
    const spec = ZONE_SPECS[kind];
    const minDist = spec.radiusM[1] + 250;
    const distance = range(rng, minDist, 2600);
    const bearing = range(rng, 0, 360);
    const center = destinationPoint(playerPos, bearing, distance);
    zones.push(createZone(kind, center, rng, nowMs));
  }
  return zones;
}

/** Instabile Zone breitet sich aus: größer, gefährlicher, neue Deadline */
export function expandZone(zone: Zone, rng: Rng, nowMs: number): Zone {
  const radiusM = zone.radiusM * 1.3;
  const threat = Math.min(5, zone.threat + 1) as ThreatLevel;
  return {
    ...zone,
    radiusM,
    threat,
    polygon: generateZonePolygon(zone.center, radiusM, rng),
    xpReward: Math.round(zone.xpReward * 1.35),
    expandsAtMs: nowMs + intRange(rng, 25, 50) * 60_000,
  };
}
