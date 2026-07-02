import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ClearedArea,
  ItemId,
  LapEvaluation,
  LatLng,
  MovementMode,
  PlayerStats,
  RoutePoint,
  Zone,
} from '../types';
import { evaluateLap, lapDamage } from '../logic/encirclement';
import { haversineM, pathLengthM } from '../logic/geo';
import { rollDrops } from '../logic/items';
import { MOVEMENT_PROFILES } from '../logic/movement';
import {
  EMPTY_STATS,
  levelFromXp,
  unlockedAchievements,
  xpForLap,
  xpForZone,
} from '../logic/progression';
import { intRange, mulberry32, randomSeed } from '../logic/rng';
import { buildSimRoute, pointAlongPath } from '../logic/sim';
import { WAVE_INTERVAL_MS } from '../logic/world';
import { createZone, expandZone, generateZonesAround, pickZoneKind } from '../logic/zones';

/** Simulationsmodus: 1 realer Tick (300 ms) entspricht 12 s Spielzeit */
export const SIM_TICK_REAL_MS = 300;
const SIM_TIME_SCALE = 40;
const SHIELD_DURATION_MS = 12 * 3_600_000;
const REINFEST_AFTER_MS = 45 * 60_000;
const INITIAL_ZONE_COUNT = 11;

export interface MissionItems {
  signal: boolean;
  routeboost: boolean;
  teamboost: boolean;
}

export interface MissionState {
  zoneId: string;
  mode: MovementMode;
  route: RoutePoint[];
  startedMs: number;
  totalDistanceM: number;
  lapsCompleted: number;
  items: MissionItems;
  /** simulierte Koop-Mitspieler (Team-Booster / Einsatzgruppe) */
  allies: number;
  lastEval: LapEvaluation | null;
  simulation: boolean;
  simPath: LatLng[] | null;
  simSegLens: number[] | null;
  simProgressM: number;
  simTimeMs: number;
  log: string[];
}

export interface RewardSummary {
  zoneName: string;
  xp: number;
  drops: ItemId[];
  newAchievements: string[];
  distanceKm: number;
  laps: number;
  coop: boolean;
}

interface GameState {
  hydrated: boolean;
  callsign: string;
  equippedTitle: string | null;
  xp: number;
  stats: PlayerStats;
  inventory: Record<ItemId, number>;
  zones: Zone[];
  cleared: ClearedArea[];
  lastWaveMs: number;
  waveCount: number;
  playerPos: LatLng | null;
  simPos: LatLng | null;
  selectedZoneId: string | null;
  mission: MissionState | null;
  lastReward: RewardSummary | null;

  setHydrated: () => void;
  setCallsign: (name: string) => void;
  equipTitle: (id: string | null) => void;
  setPlayerPos: (pos: LatLng) => void;
  selectZone: (id: string | null) => void;
  startMission: (
    zoneId: string,
    mode: MovementMode,
    items: MissionItems & { orbital: boolean },
    simulation: boolean
  ) => void;
  recordPoint: (point: RoutePoint) => void;
  simTick: () => void;
  requestExtraction: () => void;
  abortMission: () => void;
  tickWorld: (nowMs: number) => void;
  useShieldOn: (clearedId: string) => void;
  useScanner: () => void;
  dismissReward: () => void;
  resetGame: () => void;
}

const START_INVENTORY: Record<ItemId, number> = {
  scanner: 1,
  signal: 1,
  shield: 1,
  orbital: 1,
  teamboost: 1,
  routeboost: 1,
  extraction: 2,
};

function statsAfterClear(stats: PlayerStats, zone: Zone): PlayerStats {
  return {
    ...stats,
    zonesCleared: stats.zonesCleared + 1,
    nestsCleared: stats.nestsCleared + (zone.kind === 'nest' ? 1 : 0),
    clustersCleared: stats.clustersCleared + (zone.kind === 'cluster' ? 1 : 0),
    sectorsCleared: stats.sectorsCleared + (zone.kind === 'sector' ? 1 : 0),
    mothershipsCleared: stats.mothershipsCleared + (zone.kind === 'mothership' ? 1 : 0),
    unstableCleared: stats.unstableCleared + (zone.unstable ? 1 : 0),
  };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      /** Verarbeitet eine gültige Runde: Schaden, XP, ggf. Zone neutralisieren */
      function completeLap(evaluation: LapEvaluation) {
        const state = get();
        const mission = state.mission;
        if (!mission) return;
        const zone = state.zones.find((z) => z.id === mission.zoneId);
        if (!zone) return;

        const rng = mulberry32(randomSeed());
        const coopPlayers = 1 + mission.allies;
        const damage = lapDamage(zone, {
          routeBoost: mission.items.routeboost,
          teamBoost: mission.items.teamboost,
          coopPlayers,
        });
        const lapDistM = pathLengthM(mission.route);
        const lapKm = lapDistM / 1000;
        const newIntegrity = Math.max(0, zone.integrity - damage);
        const lapXp = xpForLap(zone, evaluation, mission.mode);

        const prevLevel = levelFromXp(state.xp).level;
        const prevUnlocked = unlockedAchievements(state.stats, prevLevel).map((a) => a.id);

        let stats: PlayerStats = {
          ...state.stats,
          lapsCompleted: state.stats.lapsCompleted + 1,
          distanceKm: state.stats.distanceKm + lapKm,
          longestLapKm: Math.max(state.stats.longestLapKm, lapKm),
        };
        let xp = state.xp + lapXp;

        if (newIntegrity <= 0.5) {
          // Zone neutralisiert
          const zoneXp = xpForZone(zone, mission.mode, {
            coopPlayers,
            teamBoost: mission.items.teamboost,
          });
          xp += zoneXp;
          stats = statsAfterClear(stats, zone);
          if (mission.allies > 0) stats = { ...stats, coopMissions: stats.coopMissions + 1 };

          const drops = rollDrops(zone, rng);
          const inventory = { ...state.inventory };
          for (const d of drops) inventory[d] = (inventory[d] ?? 0) + 1;

          const newLevel = levelFromXp(xp).level;
          const nowUnlocked = unlockedAchievements(stats, newLevel);
          const newAchievements = nowUnlocked
            .filter((a) => !prevUnlocked.includes(a.id))
            .map((a) => a.title);

          const clearedArea: ClearedArea = {
            id: `cleared-${Date.now()}`,
            name: zone.name,
            center: zone.center,
            radiusM: zone.radiusM,
            clearedAtMs: Date.now(),
          };

          set({
            xp,
            stats,
            inventory,
            zones: state.zones.filter((z) => z.id !== zone.id),
            cleared: [...state.cleared, clearedArea],
            mission: null,
            simPos: null,
            selectedZoneId: null,
            lastReward: {
              zoneName: zone.name,
              xp: lapXp + zoneXp,
              drops,
              newAchievements,
              distanceKm: mission.totalDistanceM / 1000 + lapKm,
              laps: mission.lapsCompleted + 1,
              coop: mission.allies > 0,
            },
          });
          return;
        }

        // Zone steht noch – nächste Runde vorbereiten
        const updatedZone: Zone = {
          ...zone,
          integrity: newIntegrity,
          lapsDone: zone.lapsDone + 1,
        };
        const simPath = mission.simulation ? buildSimRoute(updatedZone, rng) : null;
        const simSegLens = simPath
          ? simPath.slice(1).map((p, i) => haversineM(simPath[i], p))
          : null;
        set({
          xp,
          stats,
          zones: state.zones.map((z) => (z.id === zone.id ? updatedZone : z)),
          mission: {
            ...mission,
            route: [],
            totalDistanceM: mission.totalDistanceM + lapDistM,
            lapsCompleted: mission.lapsCompleted + 1,
            lastEval: null,
            simPath,
            simSegLens,
            simProgressM: 0,
            log: [
              `Runde ${mission.lapsCompleted + 1} gewertet: −${Math.round(damage)} % Integrität (+${lapXp} XP)`,
              ...mission.log,
            ].slice(0, 8),
          },
        });
      }

      /** Fügt einen Punkt hinzu und prüft automatisch auf gültigen Routenschluss */
      function appendPoint(point: RoutePoint) {
        const state = get();
        const mission = state.mission;
        if (!mission) return;
        const zone = state.zones.find((z) => z.id === mission.zoneId);
        if (!zone) return;

        const last = mission.route[mission.route.length - 1];
        if (last && haversineM(last, point) < 4) return; // GPS-Rauschen filtern

        const route = [...mission.route, point];
        let lastEval = mission.lastEval;
        if (route.length >= 10) {
          const evaluation = evaluateLap(route, zone, mission.mode, {
            signalBoost: mission.items.signal,
          });
          lastEval = evaluation;
          if (evaluation.valid) {
            set({ mission: { ...mission, route, lastEval: evaluation } });
            completeLap(evaluation);
            return;
          }
        }
        set({ mission: { ...mission, route, lastEval } });
      }

      return {
        hydrated: false,
        callsign: 'Rekrut',
        equippedTitle: null,
        xp: 0,
        stats: { ...EMPTY_STATS },
        inventory: { ...START_INVENTORY },
        zones: [],
        cleared: [],
        lastWaveMs: Date.now(),
        waveCount: 0,
        playerPos: null,
        simPos: null,
        selectedZoneId: null,
        mission: null,
        lastReward: null,

        setHydrated: () => set({ hydrated: true }),
        setCallsign: (name) => set({ callsign: name.trim() || 'Rekrut' }),
        equipTitle: (id) => set({ equippedTitle: id }),

        setPlayerPos: (pos) => {
          const state = get();
          set({ playerPos: pos });
          // Erstes Betreten der Welt: Invasionszonen rund um den Spieler erzeugen
          if (state.zones.length === 0 && state.stats.zonesCleared === 0) {
            const rng = mulberry32(randomSeed());
            set({
              zones: generateZonesAround(pos, INITIAL_ZONE_COUNT, rng, Date.now()),
              lastWaveMs: Date.now(),
            });
          }
          const mission = get().mission;
          if (mission && !mission.simulation) {
            appendPoint({ ...pos, timestampMs: Date.now() });
          }
        },

        selectZone: (id) => set({ selectedZoneId: id }),

        startMission: (zoneId, mode, items, simulation) => {
          const state = get();
          const zone = state.zones.find((z) => z.id === zoneId);
          if (!zone || state.mission) return;

          const inventory = { ...state.inventory };
          const used: MissionItems = { signal: false, routeboost: false, teamboost: false };
          let zones = state.zones;
          const rng = mulberry32(randomSeed());
          const log: string[] = ['Einsatz gestartet. Perimeter sichern!'];

          if (items.signal && inventory.signal > 0) {
            inventory.signal -= 1;
            used.signal = true;
            log.unshift('Signalverstärker aktiv: erweiterte Toleranzen.');
          }
          if (items.routeboost && inventory.routeboost > 0) {
            inventory.routeboost -= 1;
            used.routeboost = true;
            log.unshift('Routenverstärker aktiv: +50 % Wirkung.');
          }
          let allies = 0;
          if (items.teamboost && inventory.teamboost > 0) {
            inventory.teamboost -= 1;
            used.teamboost = true;
            allies = intRange(rng, 2, 4);
            log.unshift(`Einsatzgruppe eingetroffen: ${allies} Verbündete unterstützen dich.`);
          }
          if (items.orbital && inventory.orbital > 0) {
            inventory.orbital -= 1;
            zones = zones.map((z) =>
              z.id === zoneId ? { ...z, integrity: Math.max(5, z.integrity - 25) } : z
            );
            log.unshift('Orbitalmarkierung eingeschlagen: Zone um 25 % geschwächt.');
          }

          const targetZone = zones.find((z) => z.id === zoneId)!;
          const simPath = simulation ? buildSimRoute(targetZone, rng) : null;
          const simSegLens = simPath
            ? simPath.slice(1).map((p, i) => haversineM(simPath[i], p))
            : null;

          set({
            inventory,
            zones,
            selectedZoneId: zoneId,
            simPos: simPath ? simPath[0] : null,
            mission: {
              zoneId,
              mode,
              route: [],
              startedMs: Date.now(),
              totalDistanceM: 0,
              lapsCompleted: 0,
              items: used,
              allies,
              lastEval: null,
              simulation,
              simPath,
              simSegLens,
              simProgressM: 0,
              simTimeMs: Date.now(),
              log,
            },
          });
        },

        recordPoint: (point) => appendPoint(point),

        simTick: () => {
          const state = get();
          const mission = state.mission;
          if (!mission || !mission.simulation || !mission.simPath || !mission.simSegLens) return;
          const profile = MOVEMENT_PROFILES[mission.mode];
          const dtSimS = (SIM_TICK_REAL_MS / 1000) * SIM_TIME_SCALE;
          const speedMs = profile.typicalKmh / 3.6;
          const progressM = mission.simProgressM + speedMs * dtSimS;
          const simTimeMs = mission.simTimeMs + dtSimS * 1000;
          const { point } = pointAlongPath(mission.simPath, mission.simSegLens, progressM);
          set({
            simPos: point,
            mission: { ...mission, simProgressM: progressM, simTimeMs },
          });
          appendPoint({ ...point, timestampMs: simTimeMs });
        },

        requestExtraction: () => {
          const state = get();
          const mission = state.mission;
          if (!mission || state.inventory.extraction <= 0) return;
          const zone = state.zones.find((z) => z.id === mission.zoneId);
          if (!zone) return;
          const evaluation = evaluateLap(mission.route, zone, mission.mode, {
            signalBoost: mission.items.signal,
            useExtraction: true,
          });
          if (evaluation.rescued) {
            set({
              inventory: { ...state.inventory, extraction: state.inventory.extraction - 1 },
              mission: {
                ...mission,
                lastEval: evaluation,
                log: ['Notfall-Extraktion erfolgreich: Runde gerettet!', ...mission.log].slice(0, 8),
              },
            });
            completeLap(evaluation);
          } else {
            set({
              mission: {
                ...mission,
                lastEval: evaluation,
                log: ['Extraktion nicht möglich: Route zu weit von einer gültigen Runde entfernt.', ...mission.log].slice(0, 8),
              },
            });
          }
        },

        abortMission: () =>
          set({ mission: null, simPos: null }),

        tickWorld: (nowMs) => {
          const state = get();
          if (!state.playerPos) return;
          const rng = mulberry32(randomSeed());
          let zones = state.zones;
          let cleared = state.cleared;
          let stats = state.stats;
          let lastWaveMs = state.lastWaveMs;
          let waveCount = state.waveCount;

          // Instabile Zonen breiten sich aus
          zones = zones.map((z) =>
            z.unstable && z.expandsAtMs && nowMs >= z.expandsAtMs ? expandZone(z, rng, nowMs) : z
          );

          // Neue Angriffswelle
          if (nowMs - lastWaveMs >= WAVE_INTERVAL_MS) {
            lastWaveMs = nowMs;
            waveCount += 1;
            stats = { ...stats, wavesSurvived: stats.wavesSurvived + 1 };
            const newZones = generateZonesAround(
              state.playerPos,
              intRange(rng, 2, 4),
              rng,
              nowMs
            );
            zones = [...zones, ...newZones];

            // Befreite Gebiete ohne Schild können erneut befallen werden
            const stillCleared: ClearedArea[] = [];
            for (const area of cleared) {
              const shielded = area.shieldUntilMs && area.shieldUntilMs > nowMs;
              const oldEnough = nowMs - area.clearedAtMs > REINFEST_AFTER_MS;
              if (!shielded && oldEnough && rng() < 0.25) {
                zones = [...zones, createZone(pickZoneKind(rng), area.center, rng, nowMs)];
              } else {
                stillCleared.push(area);
              }
            }
            cleared = stillCleared;
          }

          // Verbündete nagen an der Missionszone (Koop-Simulation)
          let mission = state.mission;
          if (mission && mission.allies > 0) {
            const zone = zones.find((z) => z.id === mission!.zoneId);
            if (zone && zone.integrity > 8) {
              zones = zones.map((z) =>
                z.id === zone.id
                  ? { ...z, integrity: Math.max(8, z.integrity - mission!.allies * 0.4) }
                  : z
              );
            }
          }

          set({ zones, cleared, stats, lastWaveMs, waveCount, mission });
        },

        useShieldOn: (clearedId) => {
          const state = get();
          if (state.inventory.shield <= 0) return;
          const area = state.cleared.find((c) => c.id === clearedId);
          if (!area) return;
          set({
            inventory: { ...state.inventory, shield: state.inventory.shield - 1 },
            stats: { ...state.stats, shieldsDeployed: state.stats.shieldsDeployed + 1 },
            cleared: state.cleared.map((c) =>
              c.id === clearedId ? { ...c, shieldUntilMs: Date.now() + SHIELD_DURATION_MS } : c
            ),
          });
        },

        useScanner: () => {
          const state = get();
          if (state.inventory.scanner <= 0 || !state.playerPos) return;
          const rng = mulberry32(randomSeed());
          const hidden = generateZonesAround(state.playerPos, 1, rng, Date.now());
          set({
            inventory: { ...state.inventory, scanner: state.inventory.scanner - 1 },
            zones: [...state.zones, ...hidden],
          });
        },

        dismissReward: () => set({ lastReward: null }),

        resetGame: () =>
          set({
            callsign: 'Rekrut',
            equippedTitle: null,
            xp: 0,
            stats: { ...EMPTY_STATS },
            inventory: { ...START_INVENTORY },
            zones: [],
            cleared: [],
            lastWaveMs: Date.now(),
            waveCount: 0,
            selectedZoneId: null,
            mission: null,
            simPos: null,
            lastReward: null,
          }),
      };
    },
    {
      name: 'alien-perimeter-save',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        callsign: state.callsign,
        equippedTitle: state.equippedTitle,
        xp: state.xp,
        stats: state.stats,
        inventory: state.inventory,
        zones: state.zones,
        cleared: state.cleared,
        lastWaveMs: state.lastWaveMs,
        waveCount: state.waveCount,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
