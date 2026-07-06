import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { colors } from '../theme';

export function Panel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function ProgressBar({
  fraction,
  color = colors.accent,
  height = 8,
}: {
  fraction: number;
  color?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <View style={[styles.barTrack, { height }]}>
      <View
        style={[styles.barFill, { width: `${clamped * 100}%`, backgroundColor: color, height }]}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'danger' && styles.buttonDanger,
        variant === 'ghost' && styles.buttonGhost,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'danger' && { color: '#fff' },
          variant === 'ghost' && { color: colors.dim },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.panelBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomColor: colors.panelBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statLabel: { color: colors.dim, fontSize: 13 },
  statValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  barTrack: {
    backgroundColor: '#060b16',
    borderRadius: 6,
    overflow: 'hidden',
    borderColor: colors.panelBorder,
    borderWidth: StyleSheet.hairlineWidth,
  },
  barFill: { borderRadius: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.card,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentDark },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: colors.dim, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.panelBorder },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#03110f', fontWeight: '800', fontSize: 14 },
});
