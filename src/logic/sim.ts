import type { LatLng, Zone } from '../types';
import { destinationPoint } from './geo';
import type { Rng } from './rng';

/**
 * Simulationsroute rund um eine Zone: ein leicht verrauschter Perimeter
 * knapp außerhalb des Befallsgebiets. Wird im Simulationsmodus abgelaufen,
 * damit das Spiel ohne echte GPS-Bewegung getestet werden kann.
 */
export function buildSimRoute(zone: Zone, rng: Rng, samples = 72): LatLng[] {
  const points: LatLng[] = [];
  const startBearing = rng() * 360;
  const baseRadius = zone.radiusM * 1.12;
  for (let i = 0; i <= samples; i++) {
    const bearing = startBearing + (360 / samples) * i;
    const jitter = 1 + (rng() - 0.5) * 0.06;
    points.push(destinationPoint(zone.center, bearing, baseRadius * jitter));
  }
  return points;
}

/**
 * Interpoliert eine Position entlang eines Pfads bei `progressM` zurückgelegten
 * Metern (planare Näherung zwischen den Stützpunkten).
 */
export function pointAlongPath(
  path: LatLng[],
  segmentLengthsM: number[],
  progressM: number
): { point: LatLng; finished: boolean } {
  let remaining = progressM;
  for (let i = 0; i < segmentLengthsM.length; i++) {
    const segLen = segmentLengthsM[i];
    if (remaining <= segLen || segLen === 0) {
      const t = segLen === 0 ? 0 : remaining / segLen;
      const a = path[i];
      const b = path[i + 1];
      return {
        point: {
          latitude: a.latitude + (b.latitude - a.latitude) * t,
          longitude: a.longitude + (b.longitude - a.longitude) * t,
        },
        finished: false,
      };
    }
    remaining -= segLen;
  }
  return { point: path[path.length - 1], finished: true };
}
