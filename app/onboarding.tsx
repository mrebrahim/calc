import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Screen } from '../src/components/ui';
import { useApp } from '../src/state/AppContext';
import { parseAmount } from '../src/lib/money';
import { t } from '../src/i18n/ar';
import { colors, radius, spacing } from '../src/theme';

/**
 * Two screens, both skippable. There is no account, no email and no phone
 * number anywhere — the biggest leak in a new app is the screen before the
 * first value.
 */
export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveSettings } = useApp();

  const [step, setStep] = useState<0 | 1>(0);
  const [salary, setSalary] = useState('');
  const [day, setDay] = useState(1);

  const finish = useCallback(
    async (withSalary: boolean) => {
      await saveSettings({
        onboarding_done: 1,
        ...(withSalary ? { salary_amount: parseAmount(salary), salary_day: day } : {}),
      });
      router.replace('/');
    },
    [saveSettings, salary, day, router]
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing(12), paddingBottom: insets.bottom + spacing(6) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>{t.appName}</Text>

        {step === 0 ? (
          <>
            <Text style={styles.title}>{t.onboardingSalaryTitle}</Text>
            <Text style={styles.sub}>{t.onboardingSalarySub}</Text>
            <TextInput
              value={salary}
              onChangeText={setSalary}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              style={styles.salaryInput}
              autoFocus
            />
            <Button
              label={t.next}
              onPress={() => setStep(1)}
              disabled={parseAmount(salary) <= 0}
              style={styles.cta}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>{t.onboardingDayTitle}</Text>
            <Text style={styles.sub}>{t.onboardingDaySub}</Text>
            <View style={styles.dayGrid}>
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
            <Button label={t.start} onPress={() => finish(true)} style={styles.cta} />
          </>
        )}

        <Pressable onPress={() => finish(false)} hitSlop={12} style={styles.skip}>
          <Text style={styles.skipText}>{t.skip}</Text>
        </Pressable>

        <Text style={styles.privacy}>{t.privacyNote}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing(6) },
  brand: { fontSize: 15, fontWeight: '700', color: colors.primary, textAlign: 'right' },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    marginTop: spacing(6),
  },
  sub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing(2),
    lineHeight: 22,
  },
  salaryInput: {
    marginTop: spacing(8),
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: spacing(2),
  },
  dayGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginTop: spacing(6),
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCellActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 15, color: colors.text },
  dayTextActive: { color: '#FFFFFF', fontWeight: '700' },
  cta: { marginTop: spacing(8) },
  skip: { alignSelf: 'center', marginTop: spacing(4), padding: spacing(2) },
  skipText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  privacy: {
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing(6),
    lineHeight: 20,
  },
});
