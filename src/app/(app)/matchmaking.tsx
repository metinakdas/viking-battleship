import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/features/common/AppHeader';
import { formatSeconds, useReducedMotion } from '@/features/game/hooks';
import { t } from '@/i18n';
import { services } from '@/services';
import { MatchmakingCancelled } from '@/services/room/types';
import { useAuthStore } from '@/store/authStore';
import { AppText, Button, Card, Screen, spacing, Vegvisir } from '@/ui';

/** "Rakip aranıyor": dönen Vegvísir, geçen süre, İptal. */
export default function MatchmakingScreen() {
  const player = useAuthStore((s) => s.player);
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(started);
  const reduced = useReducedMotion();
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!player) return;
    let alive = true;
    services.matchmaking
      .findRandomOpponent(player)
      .then(({ gameId }) => alive && router.replace(`/game/${gameId}`))
      .catch((e) => {
        if (!(e instanceof MatchmakingCancelled)) throw e;
      });
    return () => {
      alive = false;
      services.matchmaking.cancel();
    };
  }, [player]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Screen contentStyle={styles.content}>
      <AppHeader />
      <Card highlighted style={styles.card}>
        <View style={styles.body} accessibilityLiveRegion="polite">
          <Animated.View style={reduced ? undefined : { transform: [{ rotate }] }}>
            <Vegvisir size={96} />
          </Animated.View>
          <AppText variant="h2" align="center">
            {t('matchmaking.title')}
          </AppText>
          <AppText tone="muted" align="center">
            {t('matchmaking.hint')}
          </AppText>
          <AppText variant="bodyStrong" tone="gold">
            {t('matchmaking.elapsed', {
              time: formatSeconds(Math.floor((now - started) / 1000)),
            })}
          </AppText>
          <Button
            label={t('matchmaking.cancel')}
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/lobby')}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  card: { alignSelf: 'center', width: '100%', maxWidth: 420 },
  body: { alignItems: 'center', gap: spacing.md },
});
