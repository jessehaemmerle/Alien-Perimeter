import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MissionHud, ZoneBriefing } from '../components/MissionPanel';
import TacticalMap from '../components/TacticalMap';
import type { MapFocus } from '../components/TacticalMap.types';
import { ActionButton, Panel, ProgressBar } from '../components/ui';
import { FALLBACK_POS } from '../constants';
import { ITEMS } from '../logic/items';
import { computeGlobalStats, formatDuration } from '../logic/world';
import { SIM_TICK_REAL_MS, useGame } from '../state/store';
import { colors } from '../theme';

export default function MapScreen() {
  const zones = useGame((s) => s.zones);
  const cleared = useGame((s) => s.cleared);
  const mission = useGame((s) => s.mission);
  const playerPos = useGame((s) => s.playerPos);
  const simPos = useGame((s) => s.simPos);
  const selectedZoneId = useGame((s) => s.selectedZoneId);
  const lastWaveMs = useGame((s) => s.lastWaveMs);
  const stats = useGame((s) => s.stats);
  const lastReward = useGame((s) => s.lastReward);
  const setPlayerPos = useGame((s) => s.setPlayerPos);
  const selectZone = useGame((s) => s.selectZone);
  const simTick = useGame((s) => s.simTick);
  const dismissReward = useGame((s) => s.dismissReward);

  const [gpsDenied, setGpsDenied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const insets = useSafeAreaInsets();
  const hadFirstFix = useRef(false);

  // GPS-Berechtigung anfragen und Position verfolgen
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setGpsDenied(true);
          setPlayerPos(FALLBACK_POS);
          return;
        }
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setPlayerPos({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 2000,
          },
          (loc) =>
            setPlayerPos({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            })
        );
      } catch {
        if (!cancelled) {
          setGpsDenied(true);
          setPlayerPos(FALLBACK_POS);
        }
      }
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [setPlayerPos]);

  // Kamera auf die erste bekannte Position zentrieren
  useEffect(() => {
    if (playerPos && !hadFirstFix.current) {
      hadFirstFix.current = true;
      setFocus({ center: playerPos, radiusM: 1200 });
    }
  }, [playerPos]);

  // Simulationsmodus: virtueller Läufer
  useEffect(() => {
    if (!mission?.simulation) return;
    const interval = setInterval(simTick, SIM_TICK_REAL_MS);
    return () => clearInterval(interval);
  }, [mission?.simulation, mission?.zoneId, simTick]);

  // Sekundentakt für Wellen-Countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Kamera zur ausgewählten Zone bewegen
  useEffect(() => {
    const zone = zones.find((z) => z.id === selectedZoneId);
    if (zone) {
      setFocus({ center: zone.center, radiusM: zone.radiusM });
    }
    // Nur bei Auswahlwechsel fokussieren, nicht bei jeder Zonen-Änderung
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId]);

  const global = useMemo(
    () => computeGlobalStats(now, stats, zones, lastWaveMs),
    [now, stats, zones, lastWaveMs]
  );

  return (
    <View style={styles.container}>
      <TacticalMap
        zones={zones}
        cleared={cleared}
        route={mission?.route ?? []}
        simPos={mission?.simulation ? simPos : null}
        playerPos={playerPos}
        selectedZoneId={selectedZoneId}
        showUserLocation={!gpsDenied && !mission?.simulation}
        focus={focus}
        nowMs={now}
        onZonePress={(id) => !mission && selectZone(id)}
      />

      {/* Statusleiste oben */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Panel style={styles.topPanel}>
          <View style={styles.topRow}>
            <Text style={styles.topText}>☠ Bedrohung {global.globalThreat} %</Text>
            <Text style={styles.topText}>🌊 Welle in {formatDuration(global.nextWaveInMs)}</Text>
            <Text style={styles.topText}>👾 {zones.length} Zonen</Text>
          </View>
          <ProgressBar
            fraction={global.globalThreat / 100}
            color={global.globalThreat > 60 ? colors.danger : colors.warning}
            height={4}
          />
          {gpsDenied && (
            <Text style={styles.gpsWarning}>
              GPS nicht verfügbar – Ausweichposition Wien. Simulationsmodus nutzen!
            </Text>
          )}
        </Panel>
      </View>

      {/* Auf eigene Position zentrieren */}
      {playerPos && !selectedZoneId && !mission && (
        <TouchableOpacity
          style={[styles.locateButton, { bottom: 24 + insets.bottom }]}
          onPress={() => setFocus({ center: playerPos, radiusM: 1200 })}
        >
          <Text style={styles.locateIcon}>🎯</Text>
        </TouchableOpacity>
      )}

      {/* Missions-Panel unten */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom }]}>
        {mission ? <MissionHud /> : selectedZoneId ? <ZoneBriefing /> : null}
      </View>

      {/* Belohnungs-Übersicht nach neutralisierter Zone */}
      <Modal visible={!!lastReward} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Panel>
            <Text style={styles.rewardTitle}>✅ Zone neutralisiert!</Text>
            {lastReward && (
              <>
                <Text style={styles.rewardZone}>{lastReward.zoneName}</Text>
                <Text style={styles.rewardLine}>+{lastReward.xp} XP</Text>
                <Text style={styles.rewardLine}>
                  {lastReward.laps} Umrundung(en) · {lastReward.distanceKm.toFixed(2)} km
                  {lastReward.coop ? ' · Koop-Bonus 🤝' : ''}
                </Text>
                {lastReward.drops.length > 0 && (
                  <Text style={styles.rewardLine}>
                    Beute:{' '}
                    {lastReward.drops.map((d) => `${ITEMS[d].icon} ${ITEMS[d].name}`).join(', ')}
                  </Text>
                )}
                {lastReward.newAchievements.length > 0 && (
                  <Text style={styles.rewardAchievement}>
                    🏆 Neu freigeschaltet: {lastReward.newAchievements.join(', ')}
                  </Text>
                )}
              </>
            )}
            <View style={{ marginTop: 14, flexDirection: 'row' }}>
              <ActionButton label="Weiter kämpfen" onPress={dismissReward} />
            </View>
          </Panel>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  topPanel: { margin: 10, paddingVertical: 10 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  topText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  gpsWarning: { color: colors.warning, fontSize: 11, marginTop: 6 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  locateButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locateIcon: { fontSize: 22 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,5,10,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  rewardTitle: { color: colors.toxic, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  rewardZone: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  rewardLine: { color: colors.text, fontSize: 13, marginBottom: 4 },
  rewardAchievement: { color: colors.warning, fontSize: 13, marginTop: 6, fontWeight: '700' },
});
