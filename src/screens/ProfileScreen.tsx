import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Panel, ProgressBar, SectionTitle, StatRow } from '../components/ui';
import { ACHIEVEMENTS, levelFromXp } from '../logic/progression';
import { useGame } from '../state/store';
import { colors } from '../theme';

export default function ProfileScreen() {
  const callsign = useGame((s) => s.callsign);
  const xp = useGame((s) => s.xp);
  const stats = useGame((s) => s.stats);
  const equippedTitle = useGame((s) => s.equippedTitle);
  const setCallsign = useGame((s) => s.setCallsign);
  const equipTitle = useGame((s) => s.equipTitle);
  const resetGame = useGame((s) => s.resetGame);

  const level = levelFromXp(xp);
  const titles = ACHIEVEMENTS.filter((a) => a.kind === 'titel');
  const badges = ACHIEVEMENTS.filter((a) => a.kind === 'abzeichen');
  const equipped = titles.find((t) => t.id === equippedTitle);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Panel style={styles.panel}>
        <View style={styles.headerRow}>
          <View style={styles.levelRing}>
            <Text style={styles.levelNumber}>{level.level}</Text>
            <Text style={styles.levelLabel}>LEVEL</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <TextInput
              value={callsign}
              onChangeText={setCallsign}
              style={styles.callsign}
              placeholder="Rufzeichen"
              placeholderTextColor={colors.dim}
              maxLength={18}
            />
            <Text style={styles.title}>
              {equipped ? `${equipped.icon} ${equipped.title}` : 'Kein Titel ausgerüstet'}
            </Text>
            <Text style={styles.xpText}>
              {level.intoLevelXp} / {level.neededXp} XP bis Level {level.level + 1}
            </Text>
            <ProgressBar fraction={level.intoLevelXp / level.neededXp} height={6} />
          </View>
        </View>
      </Panel>

      <Panel style={styles.panel}>
        <SectionTitle>Einsatzstatistik</SectionTitle>
        <StatRow label="Gesamt-XP" value={xp.toLocaleString('de-AT')} />
        <StatRow label="Einsatzdistanz" value={`${stats.distanceKm.toFixed(2)} km`} />
        <StatRow label="Neutralisierte Zonen" value={stats.zonesCleared} />
        <StatRow label="Alien-Nester" value={stats.nestsCleared} />
        <StatRow label="Invasionscluster" value={stats.clustersCleared} />
        <StatRow label="Invasionssektoren" value={stats.sectorsCleared} />
        <StatRow label="Zerstörte Mutterschiffe" value={stats.mothershipsCleared} />
        <StatRow label="Gültige Umrundungen" value={stats.lapsCompleted} />
        <StatRow label="Längste Runde" value={`${stats.longestLapKm.toFixed(2)} km`} />
        <StatRow label="Koop-Einsätze" value={stats.coopMissions} />
        <StatRow label="Eingesetzte Schilde" value={stats.shieldsDeployed} />
        <StatRow label="Instabile Zonen gestoppt" value={stats.unstableCleared} />
      </Panel>

      <Panel style={styles.panel}>
        <SectionTitle>Titel</SectionTitle>
        <Text style={styles.hint}>Tippe einen freigeschalteten Titel an, um ihn auszurüsten.</Text>
        {titles.map((a) => {
          const unlocked = a.unlocked(stats, level.level);
          const isEquipped = equippedTitle === a.id;
          return (
            <TouchableOpacity
              key={a.id}
              disabled={!unlocked}
              onPress={() => equipTitle(isEquipped ? null : a.id)}
              style={[
                styles.achievement,
                !unlocked && styles.achievementLocked,
                isEquipped && styles.achievementEquipped,
              ]}
            >
              <Text style={styles.achievementIcon}>{unlocked ? a.icon : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.achievementTitle}>
                  {a.title}
                  {isEquipped ? '  ✓ ausgerüstet' : ''}
                </Text>
                <Text style={styles.achievementDesc}>{a.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </Panel>

      <Panel style={styles.panel}>
        <SectionTitle>Abzeichen</SectionTitle>
        {badges.map((a) => {
          const unlocked = a.unlocked(stats, level.level);
          return (
            <View key={a.id} style={[styles.achievement, !unlocked && styles.achievementLocked]}>
              <Text style={styles.achievementIcon}>{unlocked ? a.icon : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.achievementTitle}>{a.title}</Text>
                <Text style={styles.achievementDesc}>{a.description}</Text>
              </View>
            </View>
          );
        })}
      </Panel>

      <TouchableOpacity onPress={resetGame} style={styles.reset}>
        <Text style={styles.resetText}>Spielstand zurücksetzen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, paddingBottom: 40 },
  panel: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  levelRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  levelNumber: { color: colors.text, fontSize: 24, fontWeight: '800' },
  levelLabel: { color: colors.dim, fontSize: 9, letterSpacing: 2 },
  callsign: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    padding: 0,
    marginBottom: 2,
  },
  title: { color: colors.warning, fontSize: 13, marginBottom: 6 },
  xpText: { color: colors.dim, fontSize: 11, marginBottom: 4 },
  hint: { color: colors.dim, fontSize: 12, marginBottom: 8 },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomColor: colors.panelBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  achievementLocked: { opacity: 0.45 },
  achievementEquipped: { backgroundColor: 'rgba(55,224,216,0.07)', borderRadius: 8 },
  achievementIcon: { fontSize: 22, width: 36, textAlign: 'center' },
  achievementTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  achievementDesc: { color: colors.dim, fontSize: 12 },
  reset: { alignItems: 'center', padding: 14 },
  resetText: { color: colors.danger, fontSize: 13 },
});
