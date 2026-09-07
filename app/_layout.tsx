import React, { useEffect } from 'react';
import { ActivityIndicator, I18nManager, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../src/state/AppContext';
import { LockGate } from '../src/components/LockGate';
import { colors } from '../src/theme';

// The whole product is Arabic-first, so RTL is forced rather than inherited
// from the device locale.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

function Gate() {
  const { ready, settings } = useApp();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <LockGate enabled={settings?.biometric_lock === 1}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recurring" options={{ presentation: 'modal' }} />
      </Stack>
    </LockGate>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Nothing to preload beyond the database, which AppProvider opens.
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>
        <Gate />
      </AppProvider>
    </SafeAreaProvider>
  );
}
