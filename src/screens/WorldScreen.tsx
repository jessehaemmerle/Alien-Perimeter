import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Panel, ProgressBar, SectionTitle, StatRow } from '../components/ui';
import { computeGlobalStats, formatDuration } from '../logic/world';
import { useGame } from '../state/store';
import { colors } from '../theme';

export default function WorldScreen() {
  const stats = useGame((s) => s.stats);
  const zones = useGame((s) => s.zones);
  const lastWaveMs = useGame((s) => s.lastWaveMs);
  const waveCount = useGame((s) => s.waveCount);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const global = useMemo(
    () => computeGlobalStats(now, stats, zones, lastWaveMs),
    [now, stats, zones, lastWaveMs]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Globales Verteidigungsnetz</Text>
      <Text style={styles.subtitle}>
        Der Zustand der Erde im Kampf gegen die Invasion – die gesamte Community kämpft mit.
      </Text>

      <Panel style={styles.panel}>
        <SectionTitle>Globale Bedrohungsstufe</SectionTitle>
        <Text style={styles.threatValue}>{global.globalThreat} %</Text>
        <ProgressBar
          fraction={global.globalThreat / 100}
          color={global.globalThreat > 60 ? colors.danger : colors.warning}
          height={10}
        />
        <Text style={styles.waveInfo}>
          🌊 Nächste Angriffswelle in {formatDuration(global.nextWaveInMs)} · Welle #{waveCount + 1}{' '}
          in deinem Sektor
        </Text>
      </Panel>

      <Panel style={styles.panel}>
        <SectionTitle>Weltweite Statistik</SectionTitle>
        <StatRow label="Gereinigte Gebiete" value={global.clearedZonesWorldwide.toLocaleString('de-AT')} />
        <StatRow label="Aktive Invasionszonen" value={global.activeZonesWorldwide.toLocaleString('de-AT')} />
        <StatRow label="Zerstörte Mutterschiffe" value={global.mothershipsDestroyed.toLocaleString('de-AT')} />
        <StatRow label="Zurückgelegte Kilometer" value={global.kilometersWorldwide.toLocaleString('de-AT')} />
        <StatRow label="Abgeschlossene Umrundungen" value={global.lapsWorldwide.toLocaleString('de-AT')} />
      </Panel>

      <Panel style={styles.panel}>
        <SectionTitle>Aktivste Regionen</SectionTitle>
        {global.regions.map((r, i) => (
          <View key={r.name} style={styles.regionRow}>
            <Text style={styles.regionRank}>#{i + 1}</Text>
            <Text style={styles.regionName}>{r.name}</Text>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <ProgressBar fraction={r.activity / 100} color={colors.accent} height={6} />
            </View>
            <Text style={styles.regionValue}>{r.activity}</Text>
          </View>
        ))}
      </Panel>

      <Panel style={styles.panel}>
        <SectionTitle>Beste Einsatzgruppen</SectionTitle>
        {global.topSquads.map((s, i) => (
          <StatRow key={s.name} label={`#${i + 1}  ${s.name}`} value={`${s.cleared} Zonen`} />
        ))}
      </Panel>

      <Panel style={styles.panel}>
        <SectionTitle>Dein Sektor</SectionTitle>
        <StatRow label="Aktive Zonen in deiner Umgebung" value={zones.length} />
        <StatRow
          label="Höchste lokale Bedrohung"
          value={zones.length ? `Stufe ${Math.max(...zones.map((z) => z.threat))}` : '–'}
        />
        <StatRow label="Überstandene Wellen" value={stats.wavesSurvived} />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: colors.dim, fontSize: 13, marginBottom: 14 },
  panel: { marginBottom: 12 },
  threatValue: { color: colors.danger, fontSize: 34, fontWeight: '800', marginBottom: 8 },
  waveInfo: { color: colors.text, fontSize: 13, marginTop: 10 },
  regionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  regionRank: { color: colors.accent, width: 30, fontWeight: '800' },
  regionName: { color: colors.text, width: 90, fontSize: 13 },
  regionValue: { color: colors.dim, width: 30, textAlign: 'right', fontSize: 12 },
});
