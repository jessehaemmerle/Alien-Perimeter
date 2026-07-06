import type { PlayerStats, Zone } from '../types';

/** Intervall zwischen zwei Angriffswellen */
export const WAVE_INTERVAL_MS = 12 * 60_000;

/** Fiktiver Invasionsbeginn für die simulierten Weltstatistiken */
const INVASION_EPOCH_MS = Date.UTC(2026, 0, 17, 4, 12, 0);

export interface GlobalStats {
  clearedZonesWorldwide: number;
  activeZonesWorldwide: number;
  mothershipsDestroyed: number;
  kilometersWorldwide: number;
  lapsWorldwide: number;
  globalThreat: number; // 0..100
  nextWaveInMs: number;
  regions: { name: string; activity: number }[];
  topSquads: { name: string; cleared: number }[];
}

function wave(nowMs: number, period: number, amplitude: number): number {
  return Math.sin((nowMs / period) * Math.PI * 2) * amplitude;
}

/**
 * Simulierte, "lebendige" Weltstatistik: deterministisch aus der Uhrzeit
 * abgeleitet und mit dem eigenen Fortschritt kombiniert, sodass die Zahlen
 * zwischen App-Starts konsistent weiterlaufen.
 */
export function computeGlobalStats(
  nowMs: number,
  playerStats: PlayerStats,
  activeLocalZones: Zone[],
  lastWaveMs: number
): GlobalStats {
  const hoursSinceInvasion = Math.max(1, (nowMs - INVASION_EPOCH_MS) / 3_600_000);
  const cleared = Math.floor(hoursSinceInvasion * 214 + playerStats.zonesCleared);
  const active = Math.floor(
    9200 + wave(nowMs, 26 * 3_600_000, 1400) + wave(nowMs, 95 * 60_000, 260) + activeLocalZones.length
  );
  const motherships = Math.floor(hoursSinceInvasion / 5.2 + playerStats.mothershipsCleared);
  const km = Math.floor(hoursSinceInvasion * 1840 + playerStats.distanceKm);
  const laps = Math.floor(hoursSinceInvasion * 96 + playerStats.lapsCompleted);

  const localThreat = activeLocalZones.reduce((s, z) => s + z.threat, 0);
  const globalThreat = Math.max(
    5,
    Math.min(100, Math.round(42 + wave(nowMs, 7 * 3_600_000, 14) + localThreat * 1.8))
  );

  const sinceWave = nowMs - lastWaveMs;
  const nextWaveInMs = Math.max(0, WAVE_INTERVAL_MS - (sinceWave % WAVE_INTERVAL_MS));

  const regionNames = ['Wien', 'Berlin', 'Tokio', 'São Paulo', 'Nairobi', 'Seattle', 'Warschau'];
  const regions = regionNames
    .map((name, i) => ({
      name,
      activity: Math.round(55 + wave(nowMs + i * 9_999_000, (14 + i) * 3_600_000, 35)),
    }))
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 5);

  const topSquads = [
    { name: 'Letzte Linie Wien', cleared: Math.floor(hoursSinceInvasion * 1.9) },
    { name: 'Perimeter Wolves', cleared: Math.floor(hoursSinceInvasion * 1.6) },
    { name: 'Orbital Watch', cleared: Math.floor(hoursSinceInvasion * 1.3) },
  ];

  return {
    clearedZonesWorldwide: cleared,
    activeZonesWorldwide: active,
    mothershipsDestroyed: motherships,
    kilometersWorldwide: km,
    lapsWorldwide: laps,
    globalThreat,
    nextWaveInMs,
    regions,
    topSquads,
  };
}

export function formatDuration(ms: number): string {
  const totalS = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h} h ${m % 60} min`;
  }
  return `${m}:${String(s).padStart(2, '0')} min`;
}
