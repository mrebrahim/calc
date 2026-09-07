import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { buildWeeklyReport, weeklyHeadline } from '../lib/weeklyReport';
import { budgetStatus, NEAR_LIMIT_RATIO } from '../lib/budgets';
import { formatMoney } from '../i18n/format';
import type { Settings } from '../db/types';

const WEEKLY_ID_KEY = 'weekly-report';
const CHANNEL_ID = 'reports';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'التقارير والتنبيهات',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: '#0B5D51',
  });
}

async function cancelWeekly(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === WEEKLY_ID_KEY)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/**
 * Friday 20:00 by default. The body is deliberately a single sentence — the
 * PRD is explicit that a chatty notification gets notifications turned off.
 *
 * The text is built now from the *current* week, so it is a real number by
 * the time it fires on Friday only if we reschedule regularly; the app does
 * that on every foreground, which is also when the numbers change.
 */
export async function scheduleWeeklyReport(settings: Settings): Promise<void> {
  await cancelWeekly();
  if (!settings.weekly_report_enabled) return;
  if (!(await requestNotificationPermission())) return;
  await ensureChannel();

  const report = await buildWeeklyReport();
  const body = weeklyHeadline(report, settings.currency === 'EGP' ? 'ج' : settings.currency);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'تقرير الأسبوع',
      body,
      data: { kind: WEEKLY_ID_KEY, route: '/reports' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      // expo-notifications counts weekdays from 1 = Sunday.
      weekday: settings.weekly_report_dow + 1,
      hour: settings.weekly_report_hour,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });
}

/**
 * Fired right after a spend, not a week later. A budget warning only changes
 * behaviour if it lands while the wallet is still open.
 */
export async function notifyBudgetBreach(
  settings: Settings,
  categoryId: string | null
): Promise<void> {
  if (!categoryId) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  const rows = await budgetStatus(settings.salary_day);
  const row = rows.find((r) => r.categoryId === categoryId);
  if (!row || row.ratio === null || row.limit === null) return;
  if (row.ratio < NEAR_LIMIT_RATIO) return;

  const currency = settings.currency === 'EGP' ? 'ج' : settings.currency;
  const body =
    row.ratio >= 1
      ? `عدّيت ميزانية ${row.name}: صرفت ${formatMoney(row.spent, currency)} من ${formatMoney(row.limit, currency)}.`
      : `قربت من حد ${row.name}: باقي ${formatMoney(row.limit - row.spent, currency)} بس.`;

  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'تنبيه ميزانية', body, data: { kind: 'budget', route: '/budgets' } },
    trigger: null, // immediate
  });
}
