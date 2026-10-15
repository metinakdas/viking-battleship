import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Avatar, PlayerChip } from '@/features/auth';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import { breakpoints, Button, Logo, spacing } from '@/ui';

import { SettingsButton } from './SettingsButton';

export type AppHeaderProps = {
  /** Orta alan: aşama adımları (yerleştirme/savaş) vb. */
  center?: ReactNode;
  /** Oyuncu çipinden önce: mod etiketi, tur sayısı. */
  right?: ReactNode;
  /** scene: koyu sahne (lobi) üstünde açık renkler. */
  tone?: 'default' | 'scene';
};

/**
 * Üst çubuk: amblem + başlık | orta | ayarlar + oyuncu + çıkış.
 * Telefonda üç satır: (logo · ayarlar · avatar · çıkış) / aşama adımları / mod etiketleri;
 * tek satıra sığmayan oyuncu adı kırpılmasın diye adı gizlenir (avatar + erişilebilir etiket kalır).
 */
export function AppHeader({ center, right, tone = 'default' }: AppHeaderProps) {
  const light = tone === 'scene';
  const player = useAuthStore((s) => s.player);
  const logout = useAuthStore((s) => s.logout);
  const { width } = useWindowDimensions();
  const compact = width < breakpoints.tablet;

  const account = (
    <>
      <SettingsButton light={light} />
      {player ? (
        compact ? (
          <View
            accessibilityLabel={
              player.isGuest ? `${player.displayName}, ${t('common.guest')}` : player.displayName
            }
          >
            <Avatar avatar={player.avatar} size={30} />
          </View>
        ) : (
          <PlayerChip player={player} light={light} />
        )
      ) : null}
      {player ? (
        <Button
          label={t('common.logout')}
          variant={light ? 'sceneGhost' : 'ghost'}
          onPress={logout}
        />
      ) : null}
    </>
  );

  if (compact) {
    return (
      <View style={styles.compact}>
        <View style={styles.compactTop}>
          <View style={styles.shrink}>
            <Logo showSubtitle={false} size="xs" light={light} />
          </View>
          <View style={styles.row}>{account}</View>
        </View>
        {center ? <View style={styles.wrapRow}>{center}</View> : null}
        {right ? <View style={styles.wrapRow}>{right}</View> : null}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Logo light={light} />
      {center ? <View style={styles.row}>{center}</View> : null}
      <View style={styles.wrapRow}>
        {right}
        {account}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  compact: { gap: spacing.sm },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  shrink: { flexShrink: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wrapRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
