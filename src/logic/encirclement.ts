import type { LapEvaluation, MovementMode, RoutePoint, Zone } from '../types';
import { haversineM, maxDistanceFromM, pathLengthM, pointInPolygon } from './geo';
import { MOVEMENT_PROFILES } from './movement';

export interface EvaluateOptions {
  /** Signalverstärker: großzügigere Schließ- und Abdeckungs-Toleranzen */
  signalBoost?: boolean;
  /** Notfall-Extraktion einsetzen, um eine knapp ungültige Runde zu retten */
  useExtraction?: boolean;
}

/** Mindest-Routenlänge für eine gültige Einkesselung */
export function requiredDistanceM(zone: Zone): number {
  return Math.round(2 * Math.PI * zone.radiusM * 0.75);
}

/** Maximal erlaubte Entfernung vom Zonenzentrum ("maximale Routenabweichung") */
export function maxAllowedDeviationM(zone: Zone, signalBoost: boolean): number {
  return Math.round(zone.radiusM * (signalBoost ? 3.4 : 2.6));
}

function closureThresholdM(pathLen: number, signalBoost: boolean): number {
  const base = Math.max(50, pathLen * 0.1);
  return Math.round(signalBoost ? base * 1.6 : base);
}

interface SpeedCheck {
  avgKmh: number;
  maxKmh: number;
  speedOk: boolean;
  gpsPlausible: boolean;
}

function checkSpeeds(route: RoutePoint[], mode: MovementMode): SpeedCheck {
  const profile = MOVEMENT_PROFILES[mode];
  let maxKmh = 0;
  let plausible = true;
  const totalM = pathLengthM(route);
  const totalS = (route[route.length - 1].timestampMs - route[0].timestampMs) / 1000;
  for (let i = 1; i < route.length; i++) {
    const dM = haversineM(route[i - 1], route[i]);
    const dS = (route[i].timestampMs - route[i - 1].timestampMs) / 1000;
    if (dS <= 0) {
      if (dM > 30) plausible = false;
      continue;
    }
    const kmh = (dM / dS) * 3.6;
    if (kmh > maxKmh) maxKmh = kmh;
    // Teleport-/Spoofing-Erkennung: physikalisch unglaubwürdige Sprünge
    if (kmh > 150 || (dM > 300 && dS < 3)) plausible = false;
  }
  const avgKmh = totalS > 0 ? (totalM / totalS) * 3.6 : 0;
  // 25 % Toleranz über der Bewegungsart (kurze Sprints, GPS-Rauschen)
  const speedOk = maxKmh <= profile.maxKmh * 1.25;
  return { avgKmh, maxKmh, speedOk, gpsPlausible: plausible };
}

/**
 * Bewertet eine aufgezeichnete Route gegen eine Invasionszone.
 * Prüft alle Regeln aus dem Spielkonzept: geschlossene Route, Nähe,
 * Mindestdistanz, maximale Abweichung, Geschwindigkeit und GPS-Plausibilität.
 */
export function evaluateLap(
  route: RoutePoint[],
  zone: Zone,
  mode: MovementMode,
  opts: EvaluateOptions = {}
): LapEvaluation {
  const signalBoost = !!opts.signalBoost;
  const reasons: string[] = [];
  const requiredM = requiredDistanceM(zone);
  const maxDevAllowed = maxAllowedDeviationM(zone, signalBoost);

  if (route.length < 8) {
    return {
      valid: false,
      reasons: ['Zu wenige Positionsdaten – Route zu kurz.'],
      closed: false,
      closureGapM: Infinity,
      closureThresholdM: 50,
      pathLengthM: pathLengthM(route),
      requiredDistanceM: requiredM,
      enclosesCenter: false,
      coverage: 0,
      maxDeviationM: 0,
      maxAllowedDeviationM: maxDevAllowed,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      speedOk: true,
      gpsPlausible: true,
      rescuable: false,
      rescued: false,
    };
  }

  const pathLen = pathLengthM(route);
  const closureGap = haversineM(route[0], route[route.length - 1]);
  const closureThreshold = closureThresholdM(pathLen, signalBoost);
  const closed = closureGap <= closureThreshold;

  const enclosesCenter = pointInPolygon(zone.center, route);
  const insideCount = zone.polygon.filter((v) => pointInPolygon(v, route)).length;
  const coverage = insideCount / zone.polygon.length;
  const requiredCoverage = signalBoost ? 0.65 : 0.8;

  const maxDeviation = maxDistanceFromM(route, zone.center);
  const speeds = checkSpeeds(route, mode);

  if (!closed) reasons.push(`Route nicht geschlossen (Lücke ${Math.round(closureGap)} m).`);
  if (pathLen < requiredM)
    reasons.push(`Mindestdistanz nicht erreicht (${Math.round(pathLen)} / ${requiredM} m).`);
  if (!enclosesCenter) reasons.push('Zonenzentrum liegt nicht innerhalb der Route.');
  if (coverage < requiredCoverage)
    reasons.push(`Zone nur zu ${Math.round(coverage * 100)} % eingeschlossen.`);
  if (maxDeviation > maxDevAllowed)
    reasons.push(`Route weicht zu weit ab (${Math.round(maxDeviation)} / ${maxDevAllowed} m).`);
  if (!speeds.speedOk)
    reasons.push(
      `Geschwindigkeit unplausibel für ${MOVEMENT_PROFILES[mode].label} (max. ${speeds.maxKmh.toFixed(1)} km/h).`
    );
  if (!speeds.gpsPlausible) reasons.push('GPS-Signal unplausibel – möglicher Spoofing-Verdacht.');

  let valid = reasons.length === 0;

  // Notfall-Extraktion: rettet knapp ungültige Runden – aber niemals
  // Spoofing, Geschwindigkeitsverstöße oder komplett verfehlte Zonen.
  const marginalClosure = !closed && closureGap <= closureThreshold * 3;
  const marginalCoverage = coverage >= requiredCoverage * 0.75 && enclosesCenter;
  const marginalDistance = pathLen >= requiredM * 0.85;
  const hardFail = !speeds.speedOk || !speeds.gpsPlausible || !enclosesCenter;
  const softFailsOnly =
    !hardFail &&
    (closed || marginalClosure) &&
    marginalCoverage &&
    marginalDistance &&
    maxDeviation <= maxDevAllowed * 1.2;
  const rescuable = !valid && softFailsOnly;

  let rescued = false;
  if (!valid && rescuable && opts.useExtraction) {
    valid = true;
    rescued = true;
  }

  return {
    valid,
    reasons: valid && !rescued ? [] : reasons,
    closed,
    closureGapM: Math.round(closureGap),
    closureThresholdM: closureThreshold,
    pathLengthM: Math.round(pathLen),
    requiredDistanceM: requiredM,
    enclosesCenter,
    coverage,
    maxDeviationM: Math.round(maxDeviation),
    maxAllowedDeviationM: maxDevAllowed,
    avgSpeedKmh: speeds.avgKmh,
    maxSpeedKmh: speeds.maxKmh,
    speedOk: speeds.speedOk,
    gpsPlausible: speeds.gpsPlausible,
    rescuable,
    rescued,
  };
}

export interface DamageOptions {
  routeBoost?: boolean;
  teamBoost?: boolean;
  /** Anzahl der beteiligten Spieler (Koop-Bonus) */
  coopPlayers?: number;
}

/** Schaden (Integritätsverlust) einer gültigen Umrundung */
export function lapDamage(zone: Zone, opts: DamageOptions = {}): number {
  let damage = 100 / zone.requiredLaps;
  if (opts.routeBoost) damage *= 1.5;
  if (opts.teamBoost) damage *= 1.35;
  const coop = Math.max(1, opts.coopPlayers ?? 1);
  if (coop > 1) damage *= 1 + Math.min(0.5, (coop - 1) * 0.15);
  return Math.min(100, damage);
}
