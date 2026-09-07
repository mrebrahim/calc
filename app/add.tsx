import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button, Screen } from '../src/components/ui';
import { useApp } from '../src/state/AppContext';
import { listCategories } from '../src/db/repo/categories';
import { addTransaction, mostUsedCategoryId } from '../src/db/repo/transactions';
import { notifyBudgetBreach } from '../src/notifications/weekly';
import { parseAmount, toMajor } from '../src/lib/money';
import { addDays } from '../src/lib/date';
import { t } from '../src/i18n/ar';
import { colors, radius, spacing } from '../src/theme';
import type { Category, TxType } from '../src/db/types';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, refresh, runSync } = useApp();

  const [raw, setRaw] = useState('');
  const [type, setType] = useState<TxType>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [saving, setSaving] = useState(false);

  const currency = settings?.currency === 'EGP' ? 'ج' : (settings?.currency ?? 'ج');
  const amount = useMemo(() => parseAmount(raw), [raw]);

  // Preselect the category the user picks most — one less tap on the
  // overwhelmingly common path.
  useEffect(() => {
    (async () => {
      const [all, suggested] = await Promise.all([listCategories(), mostUsedCategoryId()]);
      setCategories(all);
      setCategoryId(suggested ?? all[0]?.id ?? null);
    })();
  }, []);

  const press = useCallback((key: string) => {
    void Haptics.selectionAsync();
    setRaw((current) => {
      if (key === 'del') return current.slice(0, -1);
      if (key === '.') return current.includes('.') ? current : `${current || '0'}.`;
      // Two decimal places is all money has.
      if (current.includes('.') && current.split('.')[1].length >= 2) return current;
      return current === '0' ? key : current + key;
    });
  }, []);

  const save = useCallback(async () => {
    if (amount <= 0 || saving) return;
    setSaving(true);
    try {
      await addTransaction({
        amount,
        type,
        categoryId: type === 'expense' ? categoryId : null,
        note,
        occurredAt: addDays(new Date(), -dayOffset),
      });
      await refresh();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (settings && type === 'expense') void notifyBudgetBreach(settings, categoryId);
      void runSync();
      router.back();
    } finally {
      setSaving(false);
    }
  }, [amount, saving, type, categoryId, note, dayOffset, refresh, settings, runSync, router]);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing(2) }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>

        <View style={styles.typeSwitch}>
          {(['expense', 'income'] as TxType[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => setType(option)}
              style={[styles.typeOption, type === option && styles.typeOptionActive]}
            >
              <Text style={[styles.typeLabel, type === option && styles.typeLabelActive]}>
                {option === 'expense' ? t.addExpense : t.addIncome}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ width: 26 }} />
      </View>

      <View style={styles.amountBox}>
        <Text style={[styles.amount, amount === 0 && styles.amountEmpty]}>
          {raw === '' ? '0' : raw} <Text style={styles.currency}>{currency}</Text>
        </Text>
        <Text style={styles.amountHint}>
          {amount > 0 ? toMajor(amount).toLocaleString('en-US') : t.amountRequired}
        </Text>
      </View>

      {type === 'expense' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryStrip}
        >
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
                <Ionicons
                  name={c.icon as keyof typeof Ionicons.glyphMap}
                  size={15}
                  color={active ? c.color : colors.textMuted}
                />
                <Text style={[styles.chipLabel, active && { color: c.color, fontWeight: '700' }]}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.dayStrip}>
        {[0, 1, 2].map((offset) => (
          <Pressable
            key={offset}
            onPress={() => setDayOffset(offset)}
            style={[styles.dayChip, dayOffset === offset && styles.dayChipActive]}
          >
            <Text style={[styles.dayLabel, dayOffset === offset && styles.dayLabelActive]}>
              {offset === 0 ? t.today : offset === 1 ? t.yesterday : `من ${offset} أيام`}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t.note}
        placeholderTextColor={colors.textFaint}
        style={styles.note}
        maxLength={80}
      />

      <View style={styles.keypad}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            onPress={() => press(key)}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            accessibilityRole="button"
            accessibilityLabel={key === 'del' ? 'مسح' : key}
          >
            {key === 'del' ? (
              <Ionicons name="backspace-outline" size={22} color={colors.text} />
            ) : (
              <Text style={styles.keyLabel}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing(3) }]}>
        <Button label={t.save} onPress={save} disabled={amount <= 0} loading={saving} />
      </View>
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
  typeSwitch: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
  },
  typeOption: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
  },
  typeOptionActive: { backgroundColor: colors.surface },
  typeLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  typeLabelActive: { color: colors.primary },

  amountBox: { alignItems: 'center', paddingVertical: spacing(5) },
  amount: { fontSize: 46, fontWeight: '800', color: colors.text, writingDirection: 'ltr' },
  amountEmpty: { color: colors.textFaint },
  currency: { fontSize: 22, fontWeight: '600', color: colors.textMuted },
  amountHint: { fontSize: 12, color: colors.textFaint, marginTop: spacing(1) },

  categoryStrip: {
    paddingHorizontal: spacing(4),
    gap: spacing(2),
    flexDirection: 'row-reverse',
  },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipLabel: { fontSize: 13, color: colors.textMuted },

  dayStrip: {
    flexDirection: 'row-reverse',
    gap: spacing(2),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
  },
  dayChip: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  dayChipActive: { backgroundColor: colors.primarySoft },
  dayLabel: { fontSize: 12, color: colors.textMuted },
  dayLabelActive: { color: colors.primary, fontWeight: '700' },

  note: {
    marginHorizontal: spacing(4),
    marginTop: spacing(3),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3),
    height: 44,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.border,
  },

  keypad: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
  },
  key: {
    width: '33.33%',
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { opacity: 0.4 },
  keyLabel: { fontSize: 26, fontWeight: '600', color: colors.text },

  footer: { paddingHorizontal: spacing(4), paddingTop: spacing(2) },
});
