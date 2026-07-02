import type { MovementMode } from '../types';

export interface MovementProfile {
  id: MovementMode;
  label: string;
  icon: string;
  /** maximale plausible Geschwindigkeit in km/h */
  maxKmh: number;
  /** typische Geschwindigkeit (für den Simulationsmodus) */
  typicalKmh: number;
  xpMultiplier: number;
  bonus: string;
}

export const MOVEMENT_PROFILES: Record<MovementMode, MovementProfile> = {
  walk: {
    id: 'walk',
    label: 'Gehen',
    icon: '🚶',
    maxKmh: 9,
    typicalKmh: 4.5,
    xpMultiplier: 1.15,
    bonus: '+15 % XP – ideal für kleine Nester',
  },
  jog: {
    id: 'jog',
    label: 'Joggen',
    icon: '🏃',
    maxKmh: 17,
    typicalKmh: 9.5,
    xpMultiplier: 1.25,
    bonus: '+25 % XP – schnelle Einsätze',
  },
  hike: {
    id: 'hike',
    label: 'Wandern',
    icon: '🥾',
    maxKmh: 8,
    typicalKmh: 4,
    xpMultiplier: 1.2,
    bonus: '+20 % XP – Gelände-Bonus',
  },
  bike: {
    id: 'bike',
    label: 'Radfahren',
    icon: '🚴',
    maxKmh: 38,
    typicalKmh: 18,
    xpMultiplier: 1.0,
    bonus: 'Ideal für große Sektoren und Mutterschiffe',
  },
};

export const MOVEMENT_MODES: MovementMode[] = ['walk', 'jog', 'hike', 'bike'];

/** Erkennt die Bewegungsart anhand der Durchschnittsgeschwindigkeit */
export function detectMode(avgKmh: number): MovementMode {
  if (avgKmh <= 5.5) return 'walk';
  if (avgKmh <= 15) return 'jog';
  return 'bike';
}
