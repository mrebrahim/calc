import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, ProgressBar, Screen } from '../../src/components/ui';
import { AmountPrompt } from '../../src/components/AmountPrompt';
import { useApp } from '../../src/state/AppContext';
import { setMonthlyLimit } from '../../src/db/repo/categories';
import {
  budgetStatus,
  FREE_BUDGET_LIMIT,
  NEAR_LIMIT_RATIO,
  type BudgetRow,
} from '../../src/lib/budgets';
import { formatMoney } from '../../src/i18n/format';
import { t } from '../../src/i18n/ar';
import { colors, radius, spacing } from '../../src/theme';

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, refresh } = useApp();
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [editing, setEditing] = useState<BudgetRow | null>(null);

  const currency = settings?.currency === 'EGP' ? 'ج' : (settings?.currency ?? 'ج');
  const isPro = settings?.is_pro === 1;

  const load = useCallback(async () => {
    setRows(await budgetStatus(settings?.salary_day ?? 1));
  }, [settings?.salary_day]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const withLimit = rows.filter((r) => r.limit !== null);

  const editLimit = useCallback(
    (row: BudgetRow) => {
      // The free tier caps budgets at two categories; Pro removes the cap.
      if (!isPro && row.limit === null && withLimit.length >= FREE_BUDGET_LIMIT) {
        Alert.alert(
          'ميزانيتين بس في النسخة المجانية',
          'اشترك في Pro عشان تحط سقف لكل التصنيفات.'
        );
        return;
      }
      setEditing(row);
    },
    [isPro, withLimit.length]
  );

  const applyLimit = useCallback(
    async (limit: number | null) => {
      if (!editing) return;
      await setMonthlyLimit(editing.categoryId, limit);
      setEditing(null);
      await load();
      await refresh();
    },
    [editing, load, refresh]
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing(3), paddingBottom: spacing(10) },
        ]}
      >
        <Text style={styles.heading}>{t.budgets}</Text>
        <Text style={styles.sub}>{t.budgetsSub}</Text>

        <Card>
          {rows.map((row, index) => {
            const ratio = row.ratio ?? 0;
            const state =
              row.limit === null ? 'none' : ratio >= 1 ? 'over' : ratio >= NEAR_LIMIT_RATIO ? 'near' : 'ok';
            const barColor =
              state === 'over' ? colors.danger : state === 'near' ? colors.warn : row.color;

            return (
              <Pressable
                key={row.categoryId}
                onPress={() => editLimit(row)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
              >
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.head}>
                  <View style={styles.name}>
                    <Ionicons
                      name={row.icon as keyof typeof Ionicons.glyphMap}
                      size={17}
                      color={row.color}
                    />
                    <Text style={styles.label}>{row.name}</Text>
                    {state === 'over' ? (
                      <Text style={styles.badgeOver}>{t.exceeded}</Text>
                    ) : state === 'near' ? (
                      <Text style={styles.badgeNear}>{t.nearLimit}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.value}>
                    {row.limit === null
                      ? t.noLimit
                      : `${formatMoney(row.spent, currency)} / ${formatMoney(row.limit, currency)}`}
                  </Text>
                </View>
                {row.limit !== null ? <ProgressBar ratio={ratio} color={barColor} /> : null}
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>

      <AmountPrompt
        visible={editing !== null}
        title={editing ? `${t.setLimit} — ${editing.name}` : ''}
        initial={editing?.limit ?? null}
        currency={currency}
        onCancel={() => setEditing(null)}
        onSubmit={(minor) => applyLimit(minor)}
        onClear={editing?.limit != null ? () => applyLimit(null) : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing(4), gap: spacing(3) },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'right' },
  sub: { fontSize: 13, color: colors.textMuted, textAlign: 'right', lineHeight: 20 },
  row: { paddingVertical: spacing(2.5), gap: spacing(2) },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing(2) },
  head: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  name: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing(2), flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  value: { fontSize: 12, color: colors.textMuted, writingDirection: 'ltr' },
  badgeOver: {
    fontSize: 10,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing(1.5),
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  badgeNear: {
    fontSize: 10,
    color: colors.warn,
    backgroundColor: '#FFF6DF',
    paddingHorizontal: spacing(1.5),
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
});
