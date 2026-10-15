import { StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import type { Player } from '@/services/auth';
import { AppText, Pill, spacing } from '@/ui';

import { Avatar } from './Avatar';

/** Avatar + ad + (misafirse) küçük "Misafir" rozeti. Üst çubuk, oda ve oyuncu kartlarında. */
export function PlayerChip({
  player,
  size = 32,
  light = false,
}: {
  player: Player;
  size?: number;
  /** Koyu sahne üstünde açık metin. */
  light?: boolean;
}) {
  return (
    <View
      style={styles.root}
      accessibilityLabel={
        player.isGuest ? `${player.displayName}, ${t('common.guest')}` : player.displayName
      }
    >
      <Avatar avatar={player.avatar} size={size} />
      <AppText
        variant="bodyStrong"
        tone={light ? 'onScene' : 'primary'}
        numberOfLines={1}
        style={styles.name}
      >
        {player.displayName}
      </AppText>
      {player.isGuest ? <Pill label={t('common.guest')} tone={light ? 'scene' : 'muted'} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1 },
});
