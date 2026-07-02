import { mulberry32 } from '../rng';
import { rollDrops } from '../items';
import {
  EMPTY_STATS,
  levelFromXp,
  unlockedAchievements,
  xpForNextLevel,
  xpForZone,
} from '../progression';
import { createZone } from '../zones';

const WIEN = { latitude: 48.2082, longitude: 16.3738 };

describe('progression', () => {
  test('Levelkurve ist monoton steigend', () => {
    for (let l = 1; l < 30; l++) {
      expect(xpForNextLevel(l + 1)).toBeGreaterThan(xpForNextLevel(l));
    }
  });

  test('levelFromXp rechnet kumulativ korrekt', () => {
    expect(levelFromXp(0).level).toBe(1);
    const l1 = xpForNextLevel(1);
    expect(levelFromXp(l1 - 1).level).toBe(1);
    expect(levelFromXp(l1).level).toBe(2);
    expect(levelFromXp(l1 + xpForNextLevel(2)).level).toBe(3);
  });

  test('xpForZone: Koop und Team-Booster erhöhen XP, Gehen gibt Bonus', () => {
    const zone = createZone('cluster', WIEN, mulberry32(5), Date.now());
    const solo = xpForZone(zone, 'bike');
    expect(xpForZone(zone, 'walk')).toBeGreaterThan(solo);
    expect(xpForZone(zone, 'bike', { coopPlayers: 3 })).toBeGreaterThan(solo);
    expect(xpForZone(zone, 'bike', { teamBoost: true })).toBeCloseTo(solo * 1.5, -1);
  });

  test('Erfolge schalten anhand der Statistiken frei', () => {
    expect(unlockedAchievements(EMPTY_STATS, 1)).toHaveLength(0);
    const stats = { ...EMPTY_STATS, nestsCleared: 1, zonesCleared: 1 };
    const ids = unlockedAchievements(stats, 1).map((a) => a.id);
    expect(ids).toContain('nestbrecher');
    expect(ids).toContain('erster-einsatz');
    expect(ids).not.toContain('mutterschiff-jaeger');
  });

  test('Mutterschiffe garantieren mindestens einen Drop', () => {
    const ship = createZone('mothership', WIEN, mulberry32(11), Date.now());
    for (let seed = 0; seed < 25; seed++) {
      expect(rollDrops(ship, mulberry32(seed)).length).toBeGreaterThanOrEqual(1);
    }
  });
});
