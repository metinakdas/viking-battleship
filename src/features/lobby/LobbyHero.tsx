import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/features/auth';
import { t } from '@/i18n';
import { services } from '@/services';
import type { Player, PlayerStats } from '@/services/auth';
import { AppText, colors, RuneText, spacing, TextButton, withAlpha } from '@/ui';

/**
 * Lobi kahramanı: gökyüzünde büyük destansı selamlama, adın runlarla, kalkanın.
 * Misafire "ilerlemen bu cihazda" rozeti; girişliye seyir defteri (istatistik) rozetleri.
 */
export function LobbyHero({
  player,
  minHeight,
  compact,
  onUpgrade,
}: {
  player: Player;
  minHeight: number;
  compact: boolean;
  onUpgrade: () => void;
}) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  useEffect(() => {
    if (player.isGuest) return;
    let alive = true;
    services.auth.getProfile(player.id).then((p) => alive && setStats(p?.stats ?? null));
    return () => {
      alive = false;
    };
  }, [player.id, player.isGuest]);

  return (
    <View style={[styles.root, { minHeight }]}>
      <AppText variant="epicSection" tone="onSceneMuted">
        {t('lobby.overline').toLocaleUpperCase('tr')}
      </AppText>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <AppText
            variant="hero"
            tone="onScene"
            style={[styles.shadow, compact && styles.heroCompact]}
          >
            {t('lobby.greetingTop')}
          </AppText>
          <AppText
            variant="hero"
            style={[styles.shadow, styles.name, compact && styles.heroCompact]}
            numberOfLines={2}
          >
            {player.displayName}
          </AppText>
        </View>
        {compact ? null : (
          <View style={styles.shield}>
            <Avatar avatar={player.avatar} size={84} />
          </View>
        )}
      </View>
      <RuneText text={player.displayName} height={13} dotted color={colors.horizonHaze} />
      <AppText tone="onSceneMuted" style={styles.subtitle}>
        {t('lobby.subtitle')}
      </AppText>

      <View style={styles.badges}>
        {player.isGuest ? (
          <View style={styles.badge}>
            <View style={styles.dot} />
            <AppText variant="label" tone="onScene">
              {t('lobby.upgrade.short')}
            </AppText>
            <TextButton label={t('lobby.upgrade.open')} onPress={onUpgrade} light />
          </View>
        ) : (
          [
            { label: t('lobby.stats.played'), value: String(stats?.played ?? 0) },
            { label: t('lobby.stats.won'), value: String(stats?.won ?? 0) },
            {
              label: t('lobby.stats.accuracy'),
              value:
                stats && stats.shots > 0 ? `%${Math.round((stats.hits / stats.shots) * 100)}` : '–',
            },
          ].map((s) => (
            <View key={s.label} style={styles.badge}>
              <AppText variant="bodyStrong" tone="onScene">
                {s.value}
              </AppText>
              <AppText variant="label" tone="onSceneMuted">
                {s.label}
              </AppText>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: 'flex-end', gap: spacing.xs, paddingBottom: spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xl },
  titleText: { flexShrink: 1 },
  shadow: {
    textShadowColor: 'rgba(8, 20, 32, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  name: { color: colors.horizonHaze },
  heroCompact: { fontSize: 34, lineHeight: 40 },
  shield: {
    marginBottom: spacing.xs,
    borderRadius: 48,
    boxShadow: `0 0 0 4px ${withAlpha(colors.horizonHaze, 0.25)}, 0 10px 30px rgba(8,20,32,0.45)`,
  },
  subtitle: { maxWidth: 560 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  badge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 24, 38, 0.45)',
    borderWidth: 1,
    borderColor: withAlpha(colors.horizonHaze, 0.25),
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.horizonGlow },
});
