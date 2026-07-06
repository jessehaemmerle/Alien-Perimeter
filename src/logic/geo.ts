import type { LatLng } from '../types';

export const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Distanz in Metern zwischen zwei Koordinaten (Haversine) */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Gesamtlänge eines Pfads in Metern */
export function pathLengthM(points: LatLng[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += haversineM(points[i - 1], points[i]);
  }
  return sum;
}

/** Zielpunkt von origin aus in Richtung bearingDeg (0 = Nord) nach distanceM Metern */
export function destinationPoint(origin: LatLng, bearingDeg: number, distanceM: number): LatLng {
  const delta = distanceM / EARTH_RADIUS_M;
  const theta = toRad(bearingDeg);
  const phi1 = toRad(origin.latitude);
  const lambda1 = toRad(origin.longitude);
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
    );
  return {
    latitude: toDeg(phi2),
    longitude: ((toDeg(lambda2) + 540) % 360) - 180,
  };
}

/**
 * Punkt-in-Polygon-Test (Ray-Casting). Für die kleinen Spielflächen ist die
 * planare Näherung über lat/lng ausreichend genau.
 */
export function pointInPolygon(p: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const intersects =
      yi > p.latitude !== yj > p.latitude &&
      p.longitude < ((xj - xi) * (p.latitude - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function centroid(points: LatLng[]): LatLng {
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    lat += p.latitude;
    lng += p.longitude;
  }
  return { latitude: lat / points.length, longitude: lng / points.length };
}

/** Maximale Entfernung eines Pfadpunkts von einem Referenzpunkt */
export function maxDistanceFromM(points: LatLng[], reference: LatLng): number {
  let max = 0;
  for (const p of points) {
    const d = haversineM(p, reference);
    if (d > max) max = d;
  }
  return max;
}
