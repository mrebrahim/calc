import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Empty, ProgressBar, Screen, SectionTitle } from '../../src/components/ui';
import { TransactionRow } from '../../src/components/TransactionRow';
import { useApp } from '../../src/state/AppContext';
import {
  sumBetween,
  totalsByCategory,
  transactionsBetween,
  type CategoryTotal,
  type TransactionWithCategory,
} from '../../src/db/repo/transactions';
import { addDays, payCycle, startOfWeek } from '../../src/lib/date';
import { formatDayShort, formatMoney, formatPercent } from '../../src/i18n/format';
import { t } from '../../src/i18n/ar';
import { colors, radius, spacing } from '../../src/theme';

type Period = 'weekly' | 'monthly';

interface ReportData {
  from: Date;
  to: Date;
  total: number;
  previous: number;
  byCategory: CategoryTotal[];
  top: TransactionWithCategory[];
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useApp();
  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<ReportData | null>(null);

  const currency = settings?.currency === 'EGP' ? 'ج' : (settings?.currency ?? 'ج');
  const salaryDay = settings?.salary_day ?? 1;

  const load = useCallback(async () => {
    const now = new Date();
    let from: Date;
    let to: Date;
    let prevFrom: Date;

    if (period === 'weekly') {
      from = startOfWeek(now);
      to = addDays(from, 7);
      prevFrom = addDays(from, -7);
    } else {
      // Months are pay cycles here, not calendar months — that is the window
      // the user's money actually lives in.
      const cycle = payCycle(now, salaryDay);
      from = cycle.start;
      to = cycle.end;
      prevFrom = payCycle(addDays(cycle.start, -1), salaryDay).start;
    }

    const [total, previous, byCategory, all] = await Promise.all([
      sumBetween(from, to, 'expense'),
      sumBetween(prevFrom, from, 'expense'),
      totalsByCategory(from, to),
      transactionsBetween(from, to),
    ]);

    setData({
      from,
      to,
      total,
      previous,
      byCategory,
      top: all.filter((tx) => tx.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 3),
    });
  }, [period, salaryDay]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const change =
    data && data.previous > 0 ? (data.total - data.previous) / data.previous : null;
  const max = data?.byCategory[0]?.total ?? 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing(3), paddingBottom: spacing(10) },
        ]}
      >
        <Text style={styles.heading}>{t.reports}</Text>

        <View style={styles.switch}>
          {(['weekly', 'monthly'] as Period[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => setPeriod(option)}
              style={[styles.switchOption, period === option && styles.switchOptionActive]}
            >
              <Text style={[styles.switchLabel, period === option && styles.switchLabelActive]}>
                {option === 'weekly' ? t.weekly : t.monthly}
              </Text>
            </Pressable>
          ))}
        </View>

        <Card style={styles.summary}>
          <Text style={styles.summaryRange}>
            {data ? `${formatDayShort(data.from)} — ${formatDayShort(addDays(data.to, -1))}` : ''}
          </Text>
          <Text style={styles.summaryTotal}>{formatMoney(data?.total ?? 0, currency)}</Text>
          <Text
            style={[
              styles.summaryChange,
              change !== null && change > 0 ? styles.up : change !== null ? styles.down : null,
            ]}
          >
            {change === null
              ? t.sameAsBefore
              : Math.abs(change) < 0.05
                ? t.sameAsBefore
                : change > 0
                  ? t.higherBy(formatPercent(Math.abs(change)))
                  : t.lowerBy(formatPercent(Math.abs(change)))}
          </Text>
        </Card>

        <View style={styles.section}>
          <SectionTitle>{t.byCategory}</SectionTitle>
          <Card>
            {!data || data.byCategory.length === 0 ? (
              <Empty text={t.noData} />
            ) : (
              data.byCategory.map((row, index) => (
                <View key={row.category_id ?? `none-${index}`} style={styles.catRow}>
                  <View style={styles.catHead}>
                    <View style={styles.catName}>
                      <Ionicons
                        name={row.icon as keyof typeof Ionicons.glyphMap}
                        size={16}
                        color={row.color}
                      />
                      <Text style={styles.catLabel}>{row.name}</Text>
                    </View>
                    <Text style={styles.catValue}>{formatMoney(row.total, currency)}</Text>
                  </View>
                  <ProgressBar ratio={max > 0 ? row.total / max : 0} color={row.color} />
                </View>
              ))
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle>{t.topExpenses}</SectionTitle>
          <Card>
            {!data || data.top.length === 0 ? (
              <Empty text={t.noData} />
            ) : (
              data.top.map((tx, index) => (
                <View key={tx.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <TransactionRow tx={tx} currency={currency} />
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing(4), gap: spacing(4) },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'right' },
  switch: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
    alignSelf: 'flex-end',
  },
  switchOption: {
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
  },
  switchOptionActive: { backgroundColor: colors.surface },
  switchLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  switchLabelActive: { color: colors.primary },

  summary: { alignItems: 'center', paddingVertical: spacing(6) },
  summaryRange: { fontSize: 12, color: colors.textFaint },
  summaryTotal: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing(2),
    writingDirection: 'ltr',
  },
  summaryChange: { fontSize: 13, color: colors.textMuted, marginTop: spacing(1) },
  up: { color: colors.danger },
  down: { color: colors.success },

  section: { gap: spacing(1) },
  catRow: { paddingVertical: spacing(2), gap: spacing(2) },
  catHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  catName: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing(2) },
  catLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  catValue: { fontSize: 14, color: colors.textMuted, writingDirection: 'ltr' },
  divider: { height: 1, backgroundColor: colors.border },
});
