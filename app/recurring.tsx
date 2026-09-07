import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Screen, SectionTitle } from '../src/components/ui';
import { useApp } from '../src/state/AppContext';
import { listCategories } from '../src/db/repo/categories';
import {
  addRecurring,
  deleteRecurring,
  listRecurring,
  materialiseRecurring,
  setRecurringActive,
} from '../src/db/repo/recurring';
import { parseAmount } from '../src/lib/money';
import { formatMoney } from '../src/i18n/format';
import { t } from '../src/i18n/ar';
import { colors, radius, spacing } from '../src/theme';
import type { Category, Recurring } from '../src/db/types';

export default function RecurringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, refresh } = useApp();

  const [rules, setRules] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const currency = settings?.currency === 'EGP' ? 'ج' : (settings?.currency ?? 'ج');

  const load = useCallback(async () => {
    const [all, cats] = await Promise.all([listRecurring(), listCategories()]);
    setRules(all);
    setCategories(cats);
    setCategoryId((current) => current ?? cats.find((c) => c.slug === 'rent_bills')?.id ?? cats[0]?.id ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(async () => {
    const minor = parseAmount(amount);
    if (!title.trim() || minor <= 0) return;

    await addRecurring({ title: title.trim(), amount: minor, dayOfMonth: day, categoryId });
    // Charge it straight away if this month's date has already passed.
    await materialiseRecurring();
    setTitle('');
    setAmount('');
    await load();
    await refresh();
  }, [title, amount, day, categoryId, load, refresh]);

  const remove = useCallback(
    (rule: Recurring) => {
      Alert.alert(t.confirmDelete, rule.title, [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteRecurring(rule.id);
            await load();
            await refresh();
          },
        },
      ]);
    },
    [load, refresh]
  );

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing(2) }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.heading}>{t.recurring}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing(8) }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sub}>{t.recurringSub}</Text>

        <Card>
          {rules.length === 0 ? (
            <Empty text="مفيش مصاريف متكررة لسه. ضيف الإيجار أو الاشتراكات وهي هتتسجل لوحدها." />
          ) : (
            rules.map((rule, index) => (
              <View key={rule.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable onLongPress={() => remove(rule)} style={styles.ruleRow}>
                  <View style={styles.ruleBody}>
                    <Text style={styles.ruleTitle}>{rule.title}</Text>
                    <Text style={styles.ruleMeta}>
                      {formatMoney(rule.amount, currency)} · يوم {rule.day_of_month} كل شهر
                    </Text>
                  </View>
                  <Switch
                    value={rule.is_active === 1}
                    onValueChange={async (v) => {
                      await setRecurringActive(rule.id, v);
                      await load();
                      await refresh();
                    }}
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                </Pressable>
              </View>
            ))
          )}
        </Card>

        <View style={styles.section}>
          <SectionTitle>{t.addRecurring}</SectionTitle>
          <Card style={{ gap: spacing(3) }}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t.title}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              maxLength={40}
            />
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={t.amount}
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>{t.dayOfMonth}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.dayRow}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setDay(d)}
                    style={[styles.dayCell, d === day && styles.dayCellActive]}
                  >
                    <Text style={[styles.dayText, d === day && styles.dayTextActive]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>{t.category}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.dayRow}>
                {categories.map((c) => {
                  const active = c.id === categoryId;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategoryId(c.id)}
                      style={[
                        styles.chip,
                        active && { backgroundColor: `${c.color}1F`, borderColor: c.color },
                      ]}
                    >
                      <Text style={[styles.chipLabel, active && { color: c.color, fontWeight: '700' }]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Button
              label={t.save}
              onPress={add}
              disabled={!title.trim() || parseAmount(amount) <= 0}
            />
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(2),
  },
  heading: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { paddingHorizontal: spacing(4), gap: spacing(4) },
  sub: { fontSize: 13, color: colors.textMuted, textAlign: 'right', lineHeight: 20 },
  section: { gap: spacing(1) },
  divider: { height: 1, backgroundColor: colors.border },

  ruleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(3),
  },
  ruleBody: { flex: 1 },
  ruleTitle: { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'right' },
  ruleMeta: { fontSize: 12, color: colors.textFaint, textAlign: 'right', marginTop: 2 },

  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3),
    height: 46,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  fieldLabel: { fontSize: 12, color: colors.textMuted, textAlign: 'right' },
  dayRow: { flexDirection: 'row-reverse', gap: spacing(2) },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellActive: { backgroundColor: colors.primary },
  dayText: { fontSize: 14, color: colors.text },
  dayTextActive: { color: '#FFFFFF', fontWeight: '700' },
  chip: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipLabel: { fontSize: 13, color: colors.textMuted },
});
