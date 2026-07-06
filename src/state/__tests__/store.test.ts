jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { mulberry32 } from '../../logic/rng';
import { createZone } from '../../logic/zones';
import { useGame } from '../store';

const WIEN = { latitude: 48.2082, longitude: 16.3738 };

describe('Missions-Engine (End-to-End im Simulationsmodus)', () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test('komplette Mission: Nest einkesseln, Belohnungen erhalten', () => {
    const zone = createZone('nest', { latitude: 48.215, longitude: 16.38 }, mulberry32(21), Date.now());
    useGame.setState({ playerPos: WIEN, zones: [zone], hydrated: true });

    useGame
      .getState()
      .startMission(zone.id, 'walk', { signal: false, orbital: false, routeboost: false, teamboost: false }, true);
    expect(useGame.getState().mission).not.toBeNull();

    // Virtueller Läufer umrundet die Zone
    for (let i = 0; i < 5000 && useGame.getState().mission; i++) {
      useGame.getState().simTick();
    }

    const state = useGame.getState();
    expect(state.mission).toBeNull();
    expect(state.zones).toHaveLength(0);
    expect(state.cleared).toHaveLength(1);
    expect(state.stats.zonesCleared).toBe(1);
    expect(state.stats.nestsCleared).toBe(1);
    expect(state.stats.lapsCompleted).toBeGreaterThanOrEqual(1);
    expect(state.stats.distanceKm).toBeGreaterThan(0);
    expect(state.xp).toBeGreaterThan(0);
    expect(state.lastReward).not.toBeNull();
    expect(state.lastReward!.zoneName).toBe(zone.name);
  });

  test('Mehrrunden-Zone: Integrität sinkt pro Runde', () => {
    const zone = {
      ...createZone('sector', { latitude: 48.22, longitude: 16.39 }, mulberry32(5), Date.now()),
      requiredLaps: 3,
    };
    useGame.setState({ playerPos: WIEN, zones: [zone], hydrated: true });
    useGame
      .getState()
      .startMission(zone.id, 'bike', { signal: false, orbital: false, routeboost: false, teamboost: false }, true);

    // So lange ticken, bis die erste Runde gewertet wurde
    for (let i = 0; i < 5000; i++) {
      useGame.getState().simTick();
      const m = useGame.getState().mission;
      if (!m || m.lapsCompleted >= 1) break;
    }
    const afterLap = useGame.getState();
    expect(afterLap.mission?.lapsCompleted).toBe(1);
    const z = afterLap.zones.find((x) => x.id === zone.id)!;
    expect(z.integrity).toBeLessThan(100);
    expect(z.integrity).toBeGreaterThan(0);
  });

  test('Orbitalmarkierung schwächt die Zone beim Missionsstart', () => {
    const zone = createZone('cluster', { latitude: 48.2, longitude: 16.36 }, mulberry32(8), Date.now());
    useGame.setState({ playerPos: WIEN, zones: [zone], hydrated: true });
    useGame
      .getState()
      .startMission(zone.id, 'walk', { signal: false, orbital: true, routeboost: false, teamboost: false }, true);
    const state = useGame.getState();
    expect(state.zones.find((z) => z.id === zone.id)!.integrity).toBe(75);
    expect(state.inventory.orbital).toBe(0);
  });

  test('Schildgenerator schützt ein befreites Gebiet', () => {
    useGame.setState({
      hydrated: true,
      cleared: [
        {
          id: 'c1',
          name: 'Testgebiet',
          center: WIEN,
          radiusM: 200,
          clearedAtMs: Date.now(),
        },
      ],
    });
    useGame.getState().useShieldOn('c1');
    const state = useGame.getState();
    expect(state.cleared[0].shieldUntilMs).toBeGreaterThan(Date.now());
    expect(state.inventory.shield).toBe(0);
    expect(state.stats.shieldsDeployed).toBe(1);
  });

  test('Angriffswelle erzeugt neue Zonen', () => {
    useGame.setState({
      playerPos: WIEN,
      zones: [],
      hydrated: true,
      stats: { ...useGame.getState().stats, zonesCleared: 1 }, // verhindert Erst-Spawn-Logik
      lastWaveMs: Date.now() - 13 * 60_000,
    });
    useGame.getState().tickWorld(Date.now());
    const state = useGame.getState();
    expect(state.zones.length).toBeGreaterThanOrEqual(2);
    expect(state.waveCount).toBe(1);
  });
});
