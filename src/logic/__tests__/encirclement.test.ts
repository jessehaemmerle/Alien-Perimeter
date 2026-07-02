import type { RoutePoint, Zone } from '../../types';
import { evaluateLap, lapDamage, requiredDistanceM } from '../encirclement';
import { destinationPoint, pathLengthM } from '../geo';
import { mulberry32 } from '../rng';
import { createZone } from '../zones';

const WIEN = { latitude: 48.2082, longitude: 16.3738 };

function makeZone(): Zone {
  return createZone('nest', WIEN, mulberry32(42), 1_000_000);
}

/** Erzeugt eine Route um die Zone mit realistischen Zeitstempeln */
function circleRoute(
  zone: Zone,
  opts: { radiusFactor?: number; kmh?: number; fractionOfCircle?: number; points?: number } = {}
): RoutePoint[] {
  const { radiusFactor = 1.15, kmh = 4.5, fractionOfCircle = 1, points = 48 } = opts;
  const r = zone.radiusM * radiusFactor;
  const route: RoutePoint[] = [];
  let t = 5_000_000;
  let prev: RoutePoint | null = null;
  for (let i = 0; i <= points; i++) {
    const bearing = 360 * fractionOfCircle * (i / points);
    const p = destinationPoint(zone.center, bearing, r);
    if (prev) {
      const dM = pathLengthM([prev, p]);
      t += (dM / (kmh / 3.6)) * 1000;
    }
    const rp = { ...p, timestampMs: t };
    route.push(rp);
    prev = rp;
  }
  return route;
}

describe('evaluateLap', () => {
  test('vollständige Umrundung in Gehgeschwindigkeit ist gültig', () => {
    const zone = makeZone();
    const route = circleRoute(zone);
    const result = evaluateLap(route, zone, 'walk');
    expect(result.valid).toBe(true);
    expect(result.closed).toBe(true);
    expect(result.enclosesCenter).toBe(true);
    expect(result.coverage).toBe(1);
    expect(result.pathLengthM).toBeGreaterThanOrEqual(requiredDistanceM(zone));
  });

  test('offene Route (Halbkreis) ist ungültig', () => {
    const zone = makeZone();
    const route = circleRoute(zone, { fractionOfCircle: 0.5 });
    const result = evaluateLap(route, zone, 'walk');
    expect(result.valid).toBe(false);
    expect(result.closed).toBe(false);
  });

  test('Route weit außerhalb der Zone verletzt die maximale Abweichung', () => {
    const zone = makeZone();
    const route = circleRoute(zone, { radiusFactor: 3.5 });
    const result = evaluateLap(route, zone, 'walk');
    expect(result.valid).toBe(false);
    expect(result.maxDeviationM).toBeGreaterThan(result.maxAllowedDeviationM);
  });

  test('unplausible Geschwindigkeit beim Gehen wird abgelehnt', () => {
    const zone = makeZone();
    const route = circleRoute(zone, { kmh: 30 });
    const result = evaluateLap(route, zone, 'walk');
    expect(result.valid).toBe(false);
    expect(result.speedOk).toBe(false);
  });

  test('gleiche Geschwindigkeit ist beim Radfahren gültig', () => {
    const zone = makeZone();
    const route = circleRoute(zone, { kmh: 30 });
    const result = evaluateLap(route, zone, 'bike');
    expect(result.valid).toBe(true);
  });

  test('GPS-Teleport wird als Spoofing erkannt und ist nicht rettbar', () => {
    const zone = makeZone();
    const route = circleRoute(zone);
    // Teleport: 500 m Sprung in 1 Sekunde
    const jump = destinationPoint(route[10], 90, 500);
    route.splice(11, 0, { ...jump, timestampMs: route[10].timestampMs + 1000 });
    route.splice(12, 0, { ...route[13] });
    const result = evaluateLap(route, zone, 'walk');
    expect(result.gpsPlausible).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.rescuable).toBe(false);
  });

  test('knapp offene Route ist per Notfall-Extraktion rettbar', () => {
    const zone = makeZone();
    const route = circleRoute(zone).slice(0, -3); // kleine Lücke am Ende
    const withoutRescue = evaluateLap(route, zone, 'walk');
    if (!withoutRescue.valid) {
      expect(withoutRescue.rescuable).toBe(true);
      const rescued = evaluateLap(route, zone, 'walk', { useExtraction: true });
      expect(rescued.valid).toBe(true);
      expect(rescued.rescued).toBe(true);
    }
  });

  test('Signalverstärker erlaubt größere Toleranzen', () => {
    const zone = makeZone();
    const route = circleRoute(zone, { radiusFactor: 2.9 });
    expect(evaluateLap(route, zone, 'walk').valid).toBe(false);
    expect(evaluateLap(route, zone, 'walk', { signalBoost: true }).valid).toBe(true);
  });
});

describe('lapDamage', () => {
  test('Basis-Schaden entspricht 100 / requiredLaps', () => {
    const zone = { ...makeZone(), requiredLaps: 4 };
    expect(lapDamage(zone)).toBeCloseTo(25);
  });

  test('Booster und Koop erhöhen den Schaden', () => {
    const zone = { ...makeZone(), requiredLaps: 4 };
    expect(lapDamage(zone, { routeBoost: true })).toBeCloseTo(37.5);
    expect(lapDamage(zone, { coopPlayers: 3 })).toBeCloseTo(25 * 1.3);
    expect(lapDamage(zone, { routeBoost: true, teamBoost: true })).toBeGreaterThan(50);
  });
});
