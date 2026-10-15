import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/features/common/AppHeader';
import { RoomView } from '@/features/room/RoomView';
import { t } from '@/i18n';
import { services } from '@/services';
import { isValidRoomCode, normalizeRoomCode } from '@/services/room/code';
import { RoomError, type Room } from '@/services/room/types';
import { useAuthStore } from '@/store/authStore';
import { AppText, Button, Card, colors, Screen, spacing } from '@/ui';

/**
 * /room/new → yeni oda kurar ve /room/KOD'a geçer.
 * /room/KOD → odaya katılır (link ya da kodla). Oyun başlayınca /game/[id].
 */
export default function RoomScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const player = useAuthStore((s) => s.player);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const entered = useRef<string | null>(null);

  useEffect(() => {
    if (!player || !raw || entered.current === raw) return;
    entered.current = raw;
    // Servis çağrısı yan etkidir; sonucu render dışında (mikrogörevde) duruma yaz.
    void Promise.resolve().then(() => {
      try {
        if (raw === 'new') {
          const created = services.rooms.createRoom(player);
          router.replace(`/room/${created.code}`);
          return;
        }
        const code = normalizeRoomCode(raw);
        if (!isValidRoomCode(code)) throw new RoomError('not_found');
        setRoom(services.rooms.joinByCode(code, player));
      } catch (e) {
        setError(e instanceof RoomError ? t(`room.errors.${e.code}`) : t('auth.errors.unknown'));
      }
    });
  }, [raw, player]);

  const code = room?.code;
  useEffect(() => {
    if (!code) return;
    return services.rooms.onRoomUpdate(code, (r) => {
      setRoom(r);
      if (r.status === 'inGame' && r.gameId) router.replace(`/game/${r.gameId}`);
    });
  }, [code]);

  const leave = () => {
    if (room && player) services.rooms.leaveRoom(room.code, player.id);
    router.replace('/lobby');
  };

  if (!player) return null;
  if (error || room?.status === 'closed') {
    return (
      <Screen contentStyle={styles.content}>
        <AppHeader />
        <Card style={styles.card}>
          <View style={styles.body}>
            <AppText style={{ color: colors.danger }} role="alert">
              {error ?? t('room.errors.not_found')}
            </AppText>
            <Button
              label={t('gameOver.lobby')}
              variant="secondary"
              onPress={() => router.replace('/lobby')}
            />
          </View>
        </Card>
      </Screen>
    );
  }
  if (!room) {
    return (
      <Screen contentStyle={styles.content}>
        <AppHeader />
        <View style={styles.body}>
          <ActivityIndicator color={colors.gold} />
          <AppText tone="muted">{t('room.joining')}</AppText>
        </View>
      </Screen>
    );
  }
  return <RoomView room={room} me={player} onLeave={leave} />;
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  card: { alignSelf: 'center', maxWidth: 480, width: '100%' },
  body: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
});
