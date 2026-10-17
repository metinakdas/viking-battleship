import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Rekey } from '@/features/arcade/Rekey';
import { A, themed } from '@/features/arcade/theme';
import { setMusic } from '@/services/sound';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { fontMap } from '@/ui';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontMap);
  const authStatus = useAuthStore((s) => s.status);
  const theme = useSettingsStore((s) => s.theme);
  const [prefsReady, setPrefsReady] = useState(() => useSettingsStore.persist.hasHydrated());
  const fontsReady = loaded || Boolean(error);
  // Açılış ekranı; fontlar, kayıtlı oturum ve tercihler (dil, tema) hazır olana kadar kalır.
  const ready = fontsReady && authStatus !== 'loading' && prefsReady;
  const pathname = usePathname();

  // Müzik: oyun ekranında (yerleştirme, savaş, oyun sonu) chiptune, diğer her yerde menü parçası.
  useEffect(() => {
    if (ready) setMusic(pathname.startsWith('/game') ? 'battle' : 'menu');
  }, [ready, pathname]);

  useEffect(() => {
    useAuthStore.getState().init();
    return useSettingsStore.persist.onFinishHydration(() => setPrefsReady(true));
  }, []);

  // Web: başka sekmede tema/dil değişince bu sekme de hemen uygulasın (ekranlar yeniden kurulur).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'prefs.settings') void useSettingsStore.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style={theme === 'day' ? 'dark' : 'light'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: A.bg },
            animation: 'fade',
          }}
          // (app) grubu kendi yığınını taşır; onu yeniden kurmak açık oyunu kaybettirir.
          screenLayout={({ route, children }) =>
            route.name === '(app)' ? children : <Rekey>{children}</Rekey>
          }
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: A.bg },
  }),
);
