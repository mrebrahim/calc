import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Card, Screen, SectionTitle } from '../../src/components/ui';
import { AmountPrompt } from '../../src/components/AmountPrompt';
import { useApp } from '../../src/state/AppContext';
import { transactionsBetween } from '../../src/db/repo/transactions';
import { formatMoney, formatRelativeDay, formatTime } from '../../src/i18n/format';
import { toMajor } from '../../src/lib/money';
import { t } from '../../src/i18n/ar';
import { colors, radius, spacing } from '../../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, saveSettings, runSync, syncStatus, lastSync } = useApp();
  const [editingSalary, setEditingSalary] = useState(false);
  const [exporting, setExporting] = useState(false);

  const currency = settings?.currency === 'EGP' ? 'ج' : (settings?.currency ?? 'ج');

  const cycleSalaryDay = useCallback(() => {
    const next = ((settings?.salary_day ?? 1) % 31) + 1;
    void saveSettings({ salary_day: next });
  }, [settings?.salary_day, saveSettings]);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const rows = await transactionsBetween(new Date(2000, 0, 1), new Date(2100, 0, 1));
      const header = 'date,type,category,amount,note,source';
      const body = rows
        .map((tx) =>
          [
            new Date(tx.occurred_at).toISOString(),
            tx.type,
            (tx.category_name ?? '').replace(/,/g, ' '),
            toMajor(tx.amount),
            (tx.note ?? '').replace(/[,\n]/g, ' '),
            tx.source,
          ].join(',')
        )
        .join('\n');

      // BOM so Excel opens the Arabic column correctly.
      const file = new FileSystem.File(FileSystem.Paths.cache, 'masarify-export.csv');
      if (file.exists) file.delete();
      file.create();
      file.write(`﻿${header}\n${body}`);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      }
    } finally {
      setExporting(false);
    }
  }, []);

  if (!settings) return <Screen />;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing(3), paddingBottom: spacing(10) },
        ]}
      >
        <Text style={styles.heading}>{t.settings}</Text>

        <View style={styles.section}>
          <SectionTitle>{t.salary}</SectionTitle>
          <Card>
            <Row
              icon="cash-outline"
              label={t.salary}
              value={formatMoney(settings.salary_amount, currency)}
              onPress={() => setEditingSalary(true)}
            />
            <Divider />
            <Row
              icon="calendar-outline"
              label={t.salaryDay}
              value={String(settings.salary_day)}
              onPress={cycleSalaryDay}
            />
            <Divider />
            <Row
              icon="repeat-outline"
              label={t.recurring}
              value=""
              onPress={() => router.push('/recurring')}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle>{t.notifications}</SectionTitle>
          <Card>
            <ToggleRow
              icon="notifications-outline"
              label={t.weeklyReport}
              hint="كل جمعة 8 مساءً"
              value={settings.weekly_report_enabled === 1}
              onChange={(v) => saveSettings({ weekly_report_enabled: v ? 1 : 0 })}
            />
            <Divider />
            <ToggleRow
              icon="finger-print-outline"
              label={t.lock}
              hint="يقفل التطبيق لما ترجعله"
              value={settings.biometric_lock === 1}
              onChange={(v) => saveSettings({ biometric_lock: v ? 1 : 0 })}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle>{t.backup}</SectionTitle>
          <Card>
            <Row
              icon="cloud-upload-outline"
              label={t.syncNow}
              value={
                syncStatus === 'syncing'
                  ? t.syncing
                  : syncStatus === 'offline' || syncStatus === 'error'
                    ? t.offline
                    : lastSync
                      ? `${formatRelativeDay(lastSync)} ${formatTime(lastSync)}`
                      : t.neverSynced
              }
              onPress={runSync}
            />
            <Divider />
            <Row
              icon="download-outline"
              label={t.exportData}
              value={exporting ? '...' : 'CSV'}
              onPress={exportCsv}
            />
          </Card>
          <Text style={styles.privacy}>{t.privacyNote}</Text>
        </View>
      </ScrollView>

      <AmountPrompt
        visible={editingSalary}
        title={t.salary}
        initial={settings.salary_amount || null}
        currency={currency}
        onCancel={() => setEditingSalary(false)}
        onSubmit={async (minor) => {
          await saveSettings({ salary_amount: minor });
          setEditingSalary(false);
        }}
      />
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={styles.rowStart}>
        <Ionicons name={icon} size={19} color={colors.textMuted} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowEnd}>
        <Text style={styles.rowValue}>{value}</Text>
        <Ionicons name="chevron-back" size={16} color={colors.textFaint} />
      </View>
    </Pressable>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowStart}>
        <Ionicons name={icon} size={19} color={colors.textMuted} />
        <View>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowHint}>{hint}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing(4), gap: spacing(4) },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'right' },
  section: { gap: spacing(1) },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(3),
    minHeight: 52,
  },
  rowStart: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing(3), flex: 1 },
  rowEnd: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing(1) },
  rowLabel: { fontSize: 15, color: colors.text, fontWeight: '600' },
  rowHint: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  rowValue: { fontSize: 13, color: colors.textMuted, writingDirection: 'ltr' },
  divider: { height: 1, backgroundColor: colors.border },
  privacy: {
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'right',
    lineHeight: 20,
    paddingHorizontal: spacing(1),
    paddingTop: spacing(2),
  },
});
