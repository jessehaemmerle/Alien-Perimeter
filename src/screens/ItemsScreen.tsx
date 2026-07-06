import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Panel, SectionTitle } from '../components/ui';
import { ITEM_IDS, ITEMS } from '../logic/items';
import { formatDuration } from '../logic/world';
import { useGame } from '../state/store';
import { colors } from '../theme';

export default function ItemsScreen() {
  const inventory = useGame((s) => s.inventory);
  const cleared = useGame((s) => s.cleared);
  const useShieldOn = useGame((s) => s.useShieldOn);
  const useScanner = useGame((s) => s.useScanner);

  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: 14 + insets.top }]}
    >
      <Text style={styles.title}>Ausrüstung</Text>
      <Text style={styles.subtitle}>
        Power-ups aus neutralisierten Zonen. Die meisten setzt du beim Missionsstart ein.
      </Text>

      <Panel style={styles.panel}>
        <SectionTitle>Inventar</SectionTitle>
        {ITEM_IDS.map((id) => {
          const item = ITEMS[id];
          const count = inventory[id] ?? 0;
          return (
            <View key={id} style={[styles.itemRow, count === 0 && { opacity: 0.45 }]}>
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {item.name} <Text style={styles.itemCount}>× {count}</Text>
                </Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text style={styles.itemUsage}>{item.usage}</Text>
              </View>
              {id === 'scanner' && count > 0 && (
                <TouchableOpacity style={styles.useButton} onPress={useScanner}>
                  <Text style={styles.useButtonText}>Einsetzen</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </Panel>

      <Panel style={styles.panel}>
        <SectionTitle>Befreite Gebiete</SectionTitle>
        {cleared.length === 0 && (
          <Text style={styles.itemDesc}>
            Noch keine befreiten Gebiete. Kessle eine Invasionszone ein, um die Erde Stück für
            Stück zurückzuerobern!
          </Text>
        )}
        {cleared.map((area) => {
          const shielded = area.shieldUntilMs && area.shieldUntilMs > now;
          return (
            <View key={area.id} style={styles.itemRow}>
              <Text style={styles.itemIcon}>{shielded ? '🛡️' : '🏳️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{area.name}</Text>
                <Text style={styles.itemDesc}>
                  {shielded
                    ? `Geschützt für ${formatDuration(area.shieldUntilMs! - now)}`
                    : 'Ungeschützt – kann bei der nächsten Welle erneut befallen werden.'}
                </Text>
              </View>
              {!shielded && (inventory.shield ?? 0) > 0 && (
                <TouchableOpacity style={styles.useButton} onPress={() => useShieldOn(area.id)}>
                  <Text style={styles.useButtonText}>🛡️ Schild</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomColor: colors.panelBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: { fontSize: 24, width: 40, textAlign: 'center' },
  itemName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  itemCount: { color: colors.accent },
  itemDesc: { color: colors.dim, fontSize: 12, marginTop: 2 },
  itemUsage: { color: '#4a5b75', fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  useButton: {
    backgroundColor: colors.accentDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
  },
  useButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
