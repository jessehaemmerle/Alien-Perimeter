import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { maxAllowedDeviationM, requiredDistanceM } from '../logic/encirclement';
import { ITEMS } from '../logic/items';
import { MOVEMENT_MODES, MOVEMENT_PROFILES } from '../logic/movement';
import { formatDuration } from '../logic/world';
import { useGame } from '../state/store';
import { colors, threatColor, threatLabel } from '../theme';
import type { MovementMode } from '../types';
import { ActionButton, Chip, Panel, ProgressBar, SectionTitle, StatRow } from './ui';

function km(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

/** Missions-Briefing für die ausgewählte Zone (vor dem Start) */
export function ZoneBriefing() {
  const zones = useGame((s) => s.zones);
  const selectedZoneId = useGame((s) => s.selectedZoneId);
  const inventory = useGame((s) => s.inventory);
  const selectZone = useGame((s) => s.selectZone);
  const startMission = useGame((s) => s.startMission);

  const [mode, setMode] = useState<MovementMode>('walk');
  const [useSignal, setUseSignal] = useState(false);
  const [useOrbital, setUseOrbital] = useState(false);
  const [useRouteboost, setUseRouteboost] = useState(false);
  const [useTeamboost, setUseTeamboost] = useState(false);
  const [simulation, setSimulation] = useState(false);

  const zone = zones.find((z) => z.id === selectedZoneId);
  useEffect(() => {
    setUseSignal(false);
    setUseOrbital(false);
    setUseRouteboost(false);
    setUseTeamboost(false);
  }, [selectedZoneId]);

  if (!zone) return null;

  const itemToggles: {
    key: 'signal' | 'orbital' | 'routeboost' | 'teamboost';
    value: boolean;
    set: (v: boolean) => void;
  }[] = [
    { key: 'signal', value: useSignal, set: setUseSignal },
    { key: 'orbital', value: useOrbital, set: setUseOrbital },
    { key: 'routeboost', value: useRouteboost, set: setUseRouteboost },
    { key: 'teamboost', value: useTeamboost, set: setUseTeamboost },
  ];

  return (
    <Panel style={styles.panel}>
      <ScrollView style={{ maxHeight: 360 }}>
        <View style={styles.headerRow}>
          <Text style={styles.zoneName}>{zone.name}</Text>
          <View style={[styles.threatBadge, { borderColor: threatColor(zone.threat) }]}>
            <Text style={[styles.threatText, { color: threatColor(zone.threat) }]}>
              Stufe {zone.threat} · {threatLabel(zone.threat)}
            </Text>
          </View>
        </View>
        {zone.unstable && zone.expandsAtMs && (
          <Text style={styles.unstable}>
            ⚠ Instabile Zone – Ausbreitung in {formatDuration(zone.expandsAtMs - Date.now())}
          </Text>
        )}
        <View style={{ marginVertical: 8 }}>
          <Text style={styles.integrityLabel}>Alien-Integrität {Math.round(zone.integrity)} %</Text>
          <ProgressBar fraction={zone.integrity / 100} color={threatColor(zone.threat)} />
        </View>

        <SectionTitle>Einsatzanforderungen</SectionTitle>
        <StatRow label="Mindestdistanz pro Runde" value={km(requiredDistanceM(zone))} />
        <StatRow label="Benötigte Umrundungen" value={zone.requiredLaps} />
        <StatRow label="Max. Routenabweichung" value={km(maxAllowedDeviationM(zone, useSignal))} />
        <StatRow label="Belohnung" value={`${zone.xpReward} XP`} />

        <SectionTitle>Bewegungsart</SectionTitle>
        <View style={styles.chipRow}>
          {MOVEMENT_MODES.map((m) => (
            <Chip
              key={m}
              label={`${MOVEMENT_PROFILES[m].icon} ${MOVEMENT_PROFILES[m].label}`}
              active={mode === m}
              onPress={() => setMode(m)}
            />
          ))}
        </View>
        <Text style={styles.modeBonus}>{MOVEMENT_PROFILES[mode].bonus}</Text>

        <SectionTitle>Ausrüstung einsetzen</SectionTitle>
        <View style={styles.chipRow}>
          {itemToggles.map(({ key, value, set }) => (
            <Chip
              key={key}
              label={`${ITEMS[key].icon} ${ITEMS[key].name} (${inventory[key] ?? 0})`}
              active={value}
              disabled={(inventory[key] ?? 0) <= 0}
              onPress={() => set(!value)}
            />
          ))}
        </View>

        <View style={styles.simRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.simTitle}>Simulationsmodus</Text>
            <Text style={styles.simHint}>
              Testet den Einsatz ohne echte Bewegung (virtueller Läufer umrundet die Zone).
            </Text>
          </View>
          <Switch
            value={simulation}
            onValueChange={setSimulation}
            trackColor={{ true: colors.accentDark, false: colors.panelBorder }}
            thumbColor={simulation ? colors.accent : colors.dim}
          />
        </View>
      </ScrollView>

      <View style={styles.buttonRow}>
        <ActionButton label="Schließen" variant="ghost" onPress={() => selectZone(null)} />
        <View style={{ width: 10 }} />
        <ActionButton
          label="Einsatz starten"
          onPress={() =>
            startMission(
              zone.id,
              mode,
              {
                signal: useSignal,
                orbital: useOrbital,
                routeboost: useRouteboost,
                teamboost: useTeamboost,
              },
              simulation
            )
          }
        />
      </View>
    </Panel>
  );
}

/** Live-HUD während eines aktiven Einsatzes */
export function MissionHud() {
  const mission = useGame((s) => s.mission);
  const zones = useGame((s) => s.zones);
  const inventory = useGame((s) => s.inventory);
  const abortMission = useGame((s) => s.abortMission);
  const requestExtraction = useGame((s) => s.requestExtraction);

  if (!mission) return null;
  const zone = zones.find((z) => z.id === mission.zoneId);
  if (!zone) return null;

  const evaluation = mission.lastEval;
  const lapDist = evaluation?.pathLengthM ?? 0;
  const required = requiredDistanceM(zone);
  const canExtract =
    !!evaluation && !evaluation.valid && evaluation.rescuable && (inventory.extraction ?? 0) > 0;

  return (
    <Panel style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.zoneName}>⛔ {zone.name}</Text>
        <Text style={styles.hudLaps}>
          Runde {mission.lapsCompleted + 1}/{zone.requiredLaps}
          {mission.allies > 0 ? `  ·  🤝 ${mission.allies}` : ''}
        </Text>
      </View>

      <View style={{ marginVertical: 6 }}>
        <Text style={styles.integrityLabel}>Alien-Integrität {Math.round(zone.integrity)} %</Text>
        <ProgressBar fraction={zone.integrity / 100} color={threatColor(zone.threat)} />
      </View>
      <View style={{ marginBottom: 6 }}>
        <Text style={styles.integrityLabel}>
          Runden-Distanz {km(lapDist)} / {km(required)}
          {mission.simulation ? '  ·  SIMULATION' : ''}
        </Text>
        <ProgressBar fraction={lapDist / required} color={colors.accent} />
      </View>

      {evaluation && !evaluation.valid && evaluation.reasons.length > 0 && (
        <Text style={styles.warning}>{evaluation.reasons[0]}</Text>
      )}
      {mission.log.length > 0 && <Text style={styles.log}>{mission.log[0]}</Text>}

      <View style={styles.buttonRow}>
        <ActionButton label="Abbrechen" variant="danger" onPress={abortMission} />
        {canExtract && (
          <>
            <View style={{ width: 10 }} />
            <ActionButton
              label={`🪂 Extraktion (${inventory.extraction})`}
              onPress={requestExtraction}
            />
          </>
        )}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { margin: 10 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  zoneName: { color: colors.text, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  threatBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  threatText: { fontSize: 11, fontWeight: '700' },
  unstable: { color: colors.warning, fontSize: 12, marginTop: 6 },
  integrityLabel: { color: colors.dim, fontSize: 11, marginBottom: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  modeBonus: { color: colors.dim, fontSize: 12, marginBottom: 8 },
  simRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  simTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  simHint: { color: colors.dim, fontSize: 11, marginTop: 2 },
  buttonRow: { flexDirection: 'row', marginTop: 10 },
  hudLaps: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  warning: { color: colors.warning, fontSize: 12, marginTop: 4 },
  log: { color: colors.dim, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
});
