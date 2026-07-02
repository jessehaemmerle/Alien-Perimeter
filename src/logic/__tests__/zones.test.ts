import { haversineM, pathLengthM } from '../geo';
import { mulberry32 } from '../rng';
import { buildSimRoute } from '../sim';
import { createZone, expandZone, generateZonesAround, ZONE_SPECS } from '../zones';

const WIEN = { latitude: 48.2082, longitude: 16.3738 };

describe('zones', () => {
  test('generateZonesAround platziert Zonen in Einsatzreichweite', () => {
    const zones = generateZonesAround(WIEN, 12, mulberry32(7), Date.now());
    expect(zones).toHaveLength(12);
    for (const z of zones) {
      const d = haversineM(WIEN, z.center);
      expect(d).toBeGreaterThan(z.radiusM); // Spieler steht nicht im Befall
      expect(d).toBeLessThanOrEqual(2600);
      expect(z.integrity).toBe(100);
      expect(z.polygon.length).toBeGreaterThanOrEqual(10);
      const spec = ZONE_SPECS[z.kind];
      expect(z.radiusM).toBeGreaterThanOrEqual(spec.radiusM[0]);
      expect(z.radiusM).toBeLessThanOrEqual(spec.radiusM[1]);
      expect(z.threat).toBeGreaterThanOrEqual(spec.threat[0]);
      expect(z.threat).toBeLessThanOrEqual(spec.threat[1]);
    }
  });

  test('Mutterschiffe benötigen mehrere Umrundungen', () => {
    const z = createZone('mothership', WIEN, mulberry32(1), Date.now());
    expect(z.requiredLaps).toBe(4);
    expect(z.threat).toBe(5);
  });

  test('expandZone vergrößert instabile Zonen und erhöht die Bedrohung', () => {
    const z = createZone('nest', WIEN, mulberry32(3), Date.now());
    const grown = expandZone(z, mulberry32(4), Date.now());
    expect(grown.radiusM).toBeCloseTo(z.radiusM * 1.3);
    expect(grown.threat).toBe(Math.min(5, z.threat + 1));
    expect(grown.xpReward).toBeGreaterThan(z.xpReward);
  });

  test('Simulationsroute umschließt die Zone mit passender Länge', () => {
    const z = createZone('cluster', WIEN, mulberry32(9), Date.now());
    const route = buildSimRoute(z, mulberry32(10));
    const len = pathLengthM(route);
    const ideal = 2 * Math.PI * z.radiusM * 1.12;
    expect(len).toBeGreaterThan(ideal * 0.9);
    expect(len).toBeLessThan(ideal * 1.15);
  });
});
