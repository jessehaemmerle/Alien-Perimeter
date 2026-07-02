import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polygon, Polyline } from 'react-native-maps';
import { MissionHud, ZoneBriefing } from '../components/MissionPanel';
import { ActionButton, Panel, ProgressBar } from '../components/ui';
import { darkMapStyle } from '../data/mapStyle';
import { ITEMS } from '../logic/items';
import { computeGlobalStats, formatDuration } from '../logic/world';
import { SIM_TICK_REAL_MS, useGame } from '../state/store';
import { colors, threatColor, threatFill } from '../theme';
import type { LatLng } from '../types';

/** Ausweichposition, falls keine GPS-Berechtigung erteilt wird (Wien) */
const FALLBACK_POS: LatLng = { latitude: 48.2082, longitude: 16.3738 };

function zoneIcon(kind: string): string {
  switch (kind) {
    case 'mothership':
      return '🛸';
    case 'sector':
      return '☣️';
    case 'cluster':
      return '👾';
    default:
      return '🕸️';
  }
}

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
  const mapRef = useRef<MapView>(null);

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
    if (zone && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...zone.center,
          latitudeDelta: (zone.radiusM / 111_000) * 4,
          longitudeDelta: (zone.radiusM / 111_000) * 4,
        },
        600
      );
    }
  }, [selectedZoneId, zones]);

  const global = useMemo(
    () => computeGlobalStats(now, stats, zones, lastWaveMs),
    [now, stats, zones, lastWaveMs]
  );

  const initialRegion = useMemo(
    () => ({
      ...(playerPos ?? FALLBACK_POS),
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    }),
    // Nur beim ersten Rendern relevant
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={darkMapStyle}
        showsUserLocation={!gpsDenied && !mission?.simulation}
        showsMyLocationButton
        toolbarEnabled={false}
      >
        {zones.map((zone) => (
          <React.Fragment key={zone.id}>
            <Polygon
              coordinates={zone.polygon}
              strokeColor={threatColor(zone.threat)}
              fillColor={threatFill(zone.threat)}
              strokeWidth={selectedZoneId === zone.id ? 3 : 1.5}
              tappable
              onPress={() => !mission && selectZone(zone.id)}
            />
            {zone.kind === 'mothership' && (
              <Circle
                center={zone.center}
                radius={zone.radiusM * 1.6}
                strokeColor="rgba(160,107,255,0.35)"
                fillColor="rgba(20,8,40,0.25)"
              />
            )}
            <Marker
              coordinate={zone.center}
              onPress={() => !mission && selectZone(zone.id)}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <Text style={styles.zoneEmoji}>{zoneIcon(zone.kind)}</Text>
            </Marker>
          </React.Fragment>
        ))}

        {cleared.map((area) => (
          <Circle
            key={area.id}
            center={area.center}
            radius={area.radiusM}
            strokeColor={
              area.shieldUntilMs && area.shieldUntilMs > now
                ? colors.shield
                : 'rgba(125,255,90,0.5)'
            }
            fillColor={
              area.shieldUntilMs && area.shieldUntilMs > now
                ? 'rgba(77,163,255,0.12)'
                : 'rgba(125,255,90,0.08)'
            }
          />
        ))}

        {mission && mission.route.length > 1 && (
          <Polyline
            coordinates={mission.route}
            strokeColor={colors.route}
            strokeWidth={4}
          />
        )}

        {mission?.simulation && simPos && (
          <Marker coordinate={simPos} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.simDot} />
          </Marker>
        )}
      </MapView>

      {/* Statusleiste oben */}
      <View style={styles.topBar}>
        <Panel style={styles.topPanel}>
          <View style={styles.topRow}>
            <Text style={styles.topText}>
              ☠ Bedrohung {global.globalThreat} %
            </Text>
            <Text style={styles.topText}>
              🌊 Welle in {formatDuration(global.nextWaveInMs)}
            </Text>
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

      {/* Missions-Panel unten */}
      <View style={styles.bottom}>
        {mission ? <MissionHud /> : selectedZoneId ? <ZoneBriefing /> : null}
      </View>

      {/* Belohnungs-Übersicht nach neutralisierter Zone */}
      <Modal visible={!!lastReward} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Panel style={styles.rewardPanel}>
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
                    Beute: {lastReward.drops.map((d) => `${ITEMS[d].icon} ${ITEMS[d].name}`).join(', ')}
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
  zoneEmoji: { fontSize: 22 },
  simDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: '#03110f',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,5,10,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  rewardPanel: {},
  rewardTitle: { color: colors.toxic, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  rewardZone: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  rewardLine: { color: colors.text, fontSize: 13, marginBottom: 4 },
  rewardAchievement: { color: colors.warning, fontSize: 13, marginTop: 6, fontWeight: '700' },
});
