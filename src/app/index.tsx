import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LoginCard, SeaBackdrop } from '@/features/auth';
import { safeNextPath } from '@/services/navigation';
import { useAuthStore } from '@/store/authStore';
import { Screen, spacing } from '@/ui';

/** Giriş: ortada tek cam kart, arkada soluk deniz ızgarası ve gemiler. */
export default function LoginScreen() {
  const status = useAuthStore((s) => s.status);
  const { next } = useLocalSearchParams<{ next?: string }>();
  // Girişten sonra dönülecek yer (ör. paylaşılan oda linki); yalnızca uygulama içi yollar.
  const target = safeNextPath(next) as Href;

  if (status === 'signedIn') return <Redirect href={target} />;

  return (
    <Screen scroll backdrop={<SeaBackdrop />} contentStyle={styles.content}>
      <View style={styles.center}>
        <LoginCard
          onSuccess={() => router.replace(target)}
          initialMode={String(target).startsWith('/room/') ? 'guest' : 'login'}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  center: { alignItems: 'center', paddingVertical: spacing.xl },
});
