import type { LapEvaluation, MovementMode, PlayerStats, Zone } from '../types';
import { MOVEMENT_PROFILES } from './movement';

/** XP, die von Level `level` auf `level + 1` benötigt werden */
export function xpForNextLevel(level: number): number {
  return Math.round(150 * Math.pow(level, 1.5));
}

export interface LevelInfo {
  level: number;
  intoLevelXp: number;
  neededXp: number;
  totalXp: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpForNextLevel(level) && level < 99) {
    remaining -= xpForNextLevel(level);
    level += 1;
  }
  return { level, intoLevelXp: remaining, neededXp: xpForNextLevel(level), totalXp };
}

export interface XpOptions {
  coopPlayers?: number;
  teamBoost?: boolean;
}

/** XP-Belohnung für eine neutralisierte Zone */
export function xpForZone(zone: Zone, mode: MovementMode, opts: XpOptions = {}): number {
  let xp = zone.xpReward * MOVEMENT_PROFILES[mode].xpMultiplier;
  const coop = Math.max(1, opts.coopPlayers ?? 1);
  if (coop > 1) xp *= 1 + Math.min(0.6, (coop - 1) * 0.2);
  if (opts.teamBoost) xp *= 1.5;
  return Math.round(xp);
}

/** XP für eine einzelne gültige Umrundung (auch wenn die Zone noch steht) */
export function xpForLap(zone: Zone, evaluation: LapEvaluation, mode: MovementMode): number {
  const base = (zone.xpReward / (zone.requiredLaps * 4)) + evaluation.pathLengthM * 0.02;
  return Math.round(base * MOVEMENT_PROFILES[mode].xpMultiplier);
}

export type AchievementKind = 'titel' | 'abzeichen';

export interface Achievement {
  id: string;
  kind: AchievementKind;
  title: string;
  description: string;
  icon: string;
  unlocked: (stats: PlayerStats, level: number) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'nestbrecher',
    kind: 'titel',
    title: 'Nestbrecher',
    description: 'Neutralisiere dein erstes Alien-Nest.',
    icon: '🕸️',
    unlocked: (s) => s.nestsCleared >= 1,
  },
  {
    id: 'sektor-reiniger',
    kind: 'titel',
    title: 'Sektor-Reiniger',
    description: 'Reinige 3 große Invasionssektoren.',
    icon: '☣️',
    unlocked: (s) => s.sectorsCleared >= 3,
  },
  {
    id: 'mutterschiff-jaeger',
    kind: 'titel',
    title: 'Mutterschiff-Jäger',
    description: 'Zerstöre ein Mutterschiff.',
    icon: '🛸',
    unlocked: (s) => s.mothershipsCleared >= 1,
  },
  {
    id: 'grenzlaeufer',
    kind: 'titel',
    title: 'Grenzläufer',
    description: 'Lege insgesamt 42 km im Einsatz zurück.',
    icon: '🧭',
    unlocked: (s) => s.distanceKm >= 42,
  },
  {
    id: 'widerstandslegende',
    kind: 'titel',
    title: 'Widerstandslegende',
    description: 'Erreiche Level 15.',
    icon: '⚔️',
    unlocked: (_s, level) => level >= 15,
  },
  {
    id: 'orbit-verteidiger',
    kind: 'titel',
    title: 'Orbit-Verteidiger',
    description: 'Setze 5 Schildgeneratoren ein.',
    icon: '🛡️',
    unlocked: (s) => s.shieldsDeployed >= 5,
  },
  {
    id: 'letzte-linie',
    kind: 'titel',
    title: 'Letzte Linie',
    description: 'Neutralisiere 3 instabile Zonen vor ihrer Ausbreitung.',
    icon: '🚨',
    unlocked: (s) => s.unstableCleared >= 3,
  },
  {
    id: 'erster-einsatz',
    kind: 'abzeichen',
    title: 'Erster Einsatz',
    description: 'Neutralisiere deine erste Invasionszone.',
    icon: '🎖️',
    unlocked: (s) => s.zonesCleared >= 1,
  },
  {
    id: 'perimeter-veteran',
    kind: 'abzeichen',
    title: 'Perimeter-Veteran',
    description: 'Schließe 10 gültige Umrundungen ab.',
    icon: '♻️',
    unlocked: (s) => s.lapsCompleted >= 10,
  },
  {
    id: 'marathon-widerstand',
    kind: 'abzeichen',
    title: 'Marathon-Widerstand',
    description: 'Lege 100 km im Einsatz zurück.',
    icon: '🏅',
    unlocked: (s) => s.distanceKm >= 100,
  },
  {
    id: 'koop-kommandant',
    kind: 'abzeichen',
    title: 'Koop-Kommandant',
    description: 'Absolviere 5 Einsätze mit aktiver Einsatzgruppe.',
    icon: '🤝',
    unlocked: (s) => s.coopMissions >= 5,
  },
  {
    id: 'wellenbrecher',
    kind: 'abzeichen',
    title: 'Wellenbrecher',
    description: 'Überstehe 5 Angriffswellen.',
    icon: '🌊',
    unlocked: (s) => s.wavesSurvived >= 5,
  },
];

export function unlockedAchievements(stats: PlayerStats, level: number): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.unlocked(stats, level));
}

export const EMPTY_STATS: PlayerStats = {
  distanceKm: 0,
  zonesCleared: 0,
  nestsCleared: 0,
  clustersCleared: 0,
  sectorsCleared: 0,
  mothershipsCleared: 0,
  lapsCompleted: 0,
  longestLapKm: 0,
  shieldsDeployed: 0,
  coopMissions: 0,
  unstableCleared: 0,
  wavesSurvived: 0,
};
