import React, { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Empty, Screen, SectionTitle } from '../../src/components/ui';
import { TransactionRow } from '../../src/components/TransactionRow';
import { useApp } from '../../src/state/AppContext';
import {
  deleteTransaction,
  recentTransactions,
  type TransactionWithCategory,
} from '../../src/db/repo/transactions';
import { formatMoney } from '../../src/i18n/format';
import { t } from '../../src/i18n/ar';
import { colors, radius, shadow, spacing } from '../../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, allowance, refresh, runSync, syncStatus } = useApp();
  const [recent, setRecent] = useState<TransactionWithCategory[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const currency = settings?.currency === 'EGP' ? 'ج' : (settings?.currency ?? 'ج');

  const load = useCallback(async () => {
    setRecent(await recentTransactions(5));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refresh();
    }, [load, refresh])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await runSync();
    await refresh();
    await load();
    setRefreshing(false);
  }, [runSync, refresh, load]);

  const confirmDelete = useCallback(
    (tx: TransactionWithCategory) => {
      Alert.alert(t.confirmDelete, tx.note || tx.category_name || '', [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(tx.id);
            await refresh();
            await load();
          },
        },
      ]);
    },
    [refresh, load]
  );

  const overspent = (allowance?.availableToday ?? 0) < 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing(3), paddingBottom: spacing(24) },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.appName}>{t.appName}</Text>
          {syncStatus === 'offline' || syncStatus === 'error' ? (
            <Ionicons name="cloud-offline-outline" size={18} color={colors.textFaint} />
          ) : null}
        </View>

        {/* The number the user opens the app for. */}
        <Card style={styles.hero}>
          {allowance?.hasSalary ? (
            <>
              <Text style={styles.heroLabel}>
                {overspent ? t.overspentToday : t.availableToday}
              </Text>
              <Text style={[styles.heroValue, overspent && styles.heroValueDanger]}>
                {formatMoney(allowance.availableToday, currency)}
              </Text>
              <Text style={styles.heroMeta}>
                {t.remainingUntilSalary} {formatMoney(allowance.remaining, currency)} ·{' '}
                {t.daysLeft(allowance.daysLeft)}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.heroLabel}>{t.spentToday}</Text>
              <Text style={styles.heroValue}>
                {formatMoney(allowance?.spentToday ?? 0, currency)}
              </Text>
              <Pressable onPress={() => router.push('/settings')}>
                <Text style={styles.heroLink}>{t.setSalaryPrompt}</Text>
              </Pressable>
            </>
          )}
        </Card>

        <View style={styles.stats}>
          <Stat label={t.spentToday} value={formatMoney(allowance?.spentToday ?? 0, currency)} />
          <Stat label={t.spentWeek} value={formatMoney(allowance?.spentWeek ?? 0, currency)} />
          <Stat label={t.spentMonth} value={formatMoney(allowance?.spentCycle ?? 0, currency)} />
        </View>

        <View style={styles.section}>
          <SectionTitle>{t.latestTransactions}</SectionTitle>
          <Card>
            {recent.length === 0 ? (
              <Empty text={t.noTransactions} />
            ) : (
              recent.map((tx, index) => (
                <View key={tx.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <TransactionRow
                    tx={tx}
                    currency={currency}
                    onLongPress={() => confirmDelete(tx)}
                  />
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.addExpense}
        onPress={() => router.push('/add')}
        style={({ pressed }) => [styles.fab, { bottom: spacing(6) }, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing(4), gap: spacing(4) },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appName: { fontSize: 20, fontWeight: '800', color: colors.text },

  hero: { alignItems: 'center', paddingVertical: spacing(7) },
  heroLabel: { fontSize: 14, color: colors.textMuted },
  heroValue: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.primary,
    marginTop: spacing(2),
    writingDirection: 'ltr',
  },
  heroValueDanger: { color: colors.danger },
  heroMeta: { fontSize: 13, color: colors.textMuted, marginTop: spacing(2), textAlign: 'center' },
  heroLink: {
    fontSize: 13,
    color: colors.primary,
    marginTop: spacing(3),
    fontWeight: '600',
  },

  stats: { flexDirection: 'row-reverse', gap: spacing(2) },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(2),
    alignItems: 'center',
    ...shadow,
  },
  statLabel: { fontSize: 11, color: colors.textFaint },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
    writingDirection: 'ltr',
  },

  section: { gap: spacing(1) },
  divider: { height: 1, backgroundColor: colors.border },

  fab: {
    position: 'absolute',
    insetInlineStart: spacing(5),
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.2,
    elevation: 6,
  },
});
