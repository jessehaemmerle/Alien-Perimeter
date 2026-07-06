import { destinationPoint, haversineM, pathLengthM, pointInPolygon } from '../geo';

const WIEN = { latitude: 48.2082, longitude: 16.3738 };

describe('geo', () => {
  test('haversineM liefert bekannte Distanz Wien–Graz (~145 km)', () => {
    const graz = { latitude: 47.0707, longitude: 15.4395 };
    const d = haversineM(WIEN, graz);
    expect(d).toBeGreaterThan(140_000);
    expect(d).toBeLessThan(152_000);
  });

  test('destinationPoint + haversineM sind konsistent', () => {
    const p = destinationPoint(WIEN, 73, 1234);
    expect(haversineM(WIEN, p)).toBeCloseTo(1234, 0);
  });

  test('pathLengthM summiert Segmente', () => {
    const a = WIEN;
    const b = destinationPoint(a, 0, 500);
    const c = destinationPoint(b, 90, 500);
    expect(pathLengthM([a, b, c])).toBeCloseTo(1000, 0);
  });

  test('pointInPolygon erkennt Punkte in einem Ring um Wien', () => {
    const ring = Array.from({ length: 24 }, (_, i) =>
      destinationPoint(WIEN, (360 / 24) * i, 300)
    );
    expect(pointInPolygon(WIEN, ring)).toBe(true);
    expect(pointInPolygon(destinationPoint(WIEN, 45, 250), ring)).toBe(true);
    expect(pointInPolygon(destinationPoint(WIEN, 45, 400), ring)).toBe(false);
  });
});
