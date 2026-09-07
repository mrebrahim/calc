import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import { formatMoney, formatRelativeDay, formatTime } from '../i18n/format';
import type { TransactionWithCategory } from '../db/repo/transactions';

export function TransactionRow({
  tx,
  currency,
  onLongPress,
}: {
  tx: TransactionWithCategory;
  currency: string;
  onLongPress?: () => void;
}) {
  const occurred = new Date(tx.occurred_at);
  const isIncome = tx.type === 'income';
  const icon = (tx.category_icon ?? 'ellipsis-horizontal') as keyof typeof Ionicons.glyphMap;

  return (
    <Pressable
      onLongPress={onLongPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: `${tx.category_color ?? colors.textFaint}1A` }]}>
        <Ionicons name={icon} size={19} color={tx.category_color ?? colors.textMuted} />
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {tx.note || tx.category_name || 'متنوع'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {tx.note && tx.category_name ? `${tx.category_name} · ` : ''}
          {formatRelativeDay(occurred)} {formatTime(occurred)}
          {tx.source === 'recurring' ? ' · متكرر' : ''}
        </Text>
      </View>

      <Text style={[styles.amount, isIncome && styles.income]}>
        {isIncome ? '+' : '−'}
        {formatMoney(tx.amount, currency)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: spacing(3),
    gap: spacing(3),
  },
  pressed: { opacity: 0.6 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  meta: {
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'right',
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    writingDirection: 'ltr',
  },
  income: { color: colors.income },
});
