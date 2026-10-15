import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, PlayerChip } from '@/features/auth';
import { AppHeader } from '@/features/common/AppHeader';
import { t } from '@/i18n';
import {
  checkNickname,
  newId,
  normalizeNickname,
  randomAvatar,
  randomNickname,
  type AvatarId,
} from '@/services/auth';
import { createHotseatSession } from '@/services/transport/sessions';
import { useAuthStore } from '@/store/authStore';
import { AppText, Button, Card, Input, Screen, spacing, TextButton } from '@/ui';

/** Aynı cihazda iki kişi: ikinci kaptanın adını ve kalkanını seç, denize açıl. */
export default function HotseatSetupScreen() {
  const player = useAuthStore((s) => s.player);
  const [name, setName] = useState(() => randomNickname());
  const [avatar, setAvatar] = useState<AvatarId>(() => randomAvatar());
  const [error, setError] = useState<string | undefined>();
  if (!player) return null;

  const start = () => {
    if (checkNickname(name) || normalizeNickname(name) === player.displayName) {
      setError(t('auth.errors.invalid_nickname'));
      return;
    }
    const second = {
      id: newId('local'),
      displayName: normalizeNickname(name),
      avatar,
      isGuest: true,
    };
    router.replace(`/game/${createHotseatSession(player, second).id}`);
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <AppHeader />
      <Card highlighted style={styles.card}>
        <View style={styles.stack}>
          <AppText variant="h2">{t('hotseat.title')}</AppText>
          <AppText variant="label" tone="muted">
            {t('hotseat.hint')}
          </AppText>
          <AppText variant="overline" tone="muted">
            {t('hotseat.first').toLocaleUpperCase('tr')}
          </AppText>
          <PlayerChip player={player} />
          <View style={styles.second}>
            <Pressable
              onPress={() => setAvatar(randomAvatar())}
              accessibilityRole="button"
              accessibilityLabel={t('auth.guest.rerollAvatar')}
            >
              <Avatar avatar={avatar} size={56} />
            </Pressable>
            <Input
              label={t('hotseat.secondName')}
              value={name}
              onChangeText={(v) => {
                setName(v);
                setError(undefined);
              }}
              maxLength={16}
              error={error}
              returnKeyType="go"
              onSubmitEditing={start}
              style={styles.flex}
            />
          </View>
          <View style={styles.row}>
            <TextButton
              label={t('auth.guest.rerollName')}
              onPress={() => setName(randomNickname())}
            />
            <TextButton
              label={t('auth.guest.rerollAvatar')}
              onPress={() => setAvatar(randomAvatar())}
            />
          </View>
          <Button label={t('hotseat.start')} size="lg" fullWidth onPress={start} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  card: { alignSelf: 'center', width: '100%', maxWidth: 460 },
  stack: { gap: spacing.md },
  second: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  flex: { flex: 1 },
});
