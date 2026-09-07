import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui';
import { colors, spacing } from '../theme';
import { t } from '../i18n/ar';

/**
 * Re-locks when the app has been in the background — the common case is
 * handing the phone to someone, not a cold start.
 */
export function LockGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [locked, setLocked] = useState(enabled);
  const [prompting, setPrompting] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  const authenticate = useCallback(async () => {
    if (prompting) return;
    setPrompting(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      // Never strand the user behind a lock their phone cannot open.
      if (!hasHardware || !enrolled) {
        setLocked(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t.unlockPrompt,
        cancelLabel: t.cancel,
      });
      if (result.success) setLocked(false);
    } finally {
      setPrompting(false);
    }
  }, [prompting]);

  useEffect(() => {
    setLocked(enabled);
    if (enabled) void authenticate();
    // `authenticate` is intentionally omitted: re-running on its identity
    // would re-prompt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onChange = (state: AppStateStatus) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current !== null) {
        backgroundedAt.current = null;
        setLocked(true);
        void authenticate();
      }
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [enabled, authenticate]);

  if (!enabled || !locked) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={44} color={colors.primary} />
      <Text style={styles.title}>{t.appName}</Text>
      <Text style={styles.sub}>{t.unlockPrompt}</Text>
      <Button label="افتح" onPress={authenticate} loading={prompting} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: spacing(2),
    padding: spacing(6),
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing(2) },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: spacing(4) },
  button: { alignSelf: 'stretch' },
});
