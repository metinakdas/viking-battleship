import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';

import { ShipSprite } from '@/features/board';
import { formatSeconds, useCountdown, useReducedMotion } from '@/features/game/hooks';
import { FLEET, shotStats, type ShipType, type ShotRecord } from '@/game';
import { t } from '@/i18n';
import { AppText, Card, colors, Glass, Pill, radii, spacing, withAlpha } from '@/ui';

import type { DamageEntry, LogEntry } from './log';

/** Sıra şeridi: senin sıranda kırmızı-altın ve geri sayım; rakibin sırasında gri. */
export function TurnBanner({
  isMyTurn,
  opponentName,
  turnEndsAt,
}: {
  isMyTurn: boolean;
  opponentName: string;
  turnEndsAt: number | null;
}) {
  const left = useCountdown(turnEndsAt);
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!isMyTurn || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isMyTurn, reduced, pulse]);

  const urgent = left !== null && left <= 5;
  return (
    <View
      style={[styles.banner, isMyTurn ? styles.bannerMine : styles.bannerTheirs]}
      accessibilityLiveRegion="polite"
      role="status"
    >
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: isMyTurn ? colors.textOnAccent : colors.textMuted },
          isMyTurn && !reduced && { opacity: pulse },
        ]}
      />
      <AppText
        variant="h3"
        style={{ color: isMyTurn ? colors.textOnAccent : colors.textSecondary }}
      >
        {isMyTurn ? t('battle.yourTurn') : t('battle.theirTurn', { name: opponentName })}
      </AppText>
      <View style={styles.flex} />
      {left !== null ? (
        <View
          style={[styles.timer, urgent && styles.timerUrgent]}
          accessibilityLabel={`${left} saniye`}
        >
          <AppText
            variant="bodyStrong"
            style={{ color: isMyTurn ? colors.textOnAccent : colors.textSecondary }}
          >
            {formatSeconds(left)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export function StatsPanel({
  mine,
  theirs,
}: {
  mine: readonly ShotRecord[];
  theirs: readonly ShotRecord[];
}) {
  const m = shotStats(mine);
  const o = shotStats(theirs);
  const pct = (v: number, n: number) => (n === 0 ? '–' : `%${Math.round(v * 100)}`);
  const rows = [
    { label: t('battle.shots'), me: String(m.shots), them: String(o.shots) },
    { label: t('battle.hits'), me: String(m.hits), them: String(o.hits) },
    { label: t('battle.accuracy'), me: pct(m.accuracy, m.shots), them: pct(o.accuracy, o.shots) },
  ];
  return (
    <Card title={t('battle.stats').toLocaleUpperCase('tr')}>
      <View style={styles.statsRow}>
        {rows.map((r) => (
          <View key={r.label} style={styles.stat}>
            <AppText variant="h2">{r.me}</AppText>
            <AppText variant="caption" tone="muted">
              {r.label}
            </AppText>
            <AppText variant="caption" tone="disabled">
              {t('battle.versus', { n: r.them })}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Düşman filosu: hangi gemiler battı (yerleri değil, yalnızca türleri). */
export function EnemyFleetPanel({ sunk }: { sunk: readonly ShipType[] }) {
  return (
    <Card
      title={t('battle.enemyFleet').toLocaleUpperCase('tr')}
      headerRight={
        <AppText variant="label" tone="secondary">
          {`${FLEET.length - sunk.length}/${FLEET.length}`}
        </AppText>
      }
    >
      <View style={styles.fleet}>
        {FLEET.map(({ ship }) => {
          const isSunk = sunk.includes(ship);
          return (
            <View key={ship} style={styles.fleetRow}>
              <View style={styles.sprite}>
                <ShipSprite ship={ship} cell={14} look={isSunk ? 'sunk' : 'afloat'} />
              </View>
              <AppText variant="label" tone={isSunk ? 'disabled' : 'primary'} style={styles.flex}>
                {t(`ships.${ship}`)}
              </AppText>
              {isSunk ? <Pill label={t('battle.sunk')} tone="fire" dot /> : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/** Kendi filonun hasar raporu. */
export function DamagePanel({ report }: { report: readonly DamageEntry[] }) {
  return (
    <Card title={t('battle.damage').toLocaleUpperCase('tr')}>
      <View style={styles.fleet}>
        {report.map((r) => (
          <View key={r.ship} style={styles.fleetRow}>
            <AppText variant="label" tone={r.sunk ? 'disabled' : 'primary'} style={styles.flex}>
              {t(`ships.${r.ship}`)}
            </AppText>
            {r.sunk ? (
              <Pill label={t('battle.sunk')} tone="fire" dot />
            ) : (
              <View
                style={styles.hp}
                accessibilityLabel={t('battle.hitsOn', { hits: r.hits, size: r.size })}
              >
                {Array.from({ length: r.size }, (_, i) => (
                  <View key={i} style={[styles.hpCell, i < r.hits && styles.hpHit]} />
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </Card>
  );
}

export function CaptainsLog({
  entries,
  opponentName,
  maxHeight = 240,
}: {
  entries: readonly LogEntry[];
  opponentName: string;
  maxHeight?: number;
}) {
  return (
    <Card title={t('battle.log').toLocaleUpperCase('tr')}>
      {entries.length === 0 ? (
        <AppText variant="label" tone="muted">
          {t('battle.logEmpty')}
        </AppText>
      ) : (
        <ScrollView style={{ maxHeight }} nestedScrollEnabled>
          <View style={styles.log}>
            {entries.map((e) => {
              const result =
                e.result === 'sunk' && e.ship
                  ? t('battle.result.sunk', { ship: t(`ships.${e.ship}`) })
                  : t(`battle.result.${e.result === 'sunk' ? 'hit' : e.result}`);
              const text =
                e.actor === 'me'
                  ? t('battle.logYou', { cell: e.cell, result })
                  : t('battle.logThem', { name: opponentName, cell: e.cell, result });
              return (
                <View key={e.key} style={styles.logRow}>
                  <AppText variant="caption" tone="disabled" style={styles.logTurn}>
                    {e.turn}
                  </AppText>
                  <View
                    style={[
                      styles.logMark,
                      {
                        backgroundColor:
                          e.result === 'miss'
                            ? withAlpha(colors.iron, 0.35)
                            : e.result === 'sunk'
                              ? colors.accent
                              : colors.fire,
                      },
                    ]}
                  />
                  <AppText
                    variant="label"
                    tone={e.actor === 'me' ? 'primary' : 'secondary'}
                    style={styles.flex}
                  >
                    {text}
                    {e.auto ? t('battle.logAuto') : ''}
                  </AppText>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Card>
  );
}

/** Rakip koptu: geri sayımlı uyarı. */
export function DisconnectBanner({ name, endsAt }: { name: string; endsAt: number }) {
  const left = useCountdown(endsAt) ?? 0;
  return (
    <Glass style={styles.disconnect} role="alert">
      <AppText variant="label" style={{ color: colors.danger }}>
        {t('battle.disconnected', { name, time: formatSeconds(left) })}
      </AppText>
    </Glass>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  bannerMine: { backgroundColor: colors.accent, borderColor: colors.accentHover },
  bannerTheirs: { backgroundColor: 'rgba(22, 32, 43, 0.06)', borderColor: colors.hairline },
  dot: { width: 10, height: 10, borderRadius: 5 },
  timer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  timerUrgent: { backgroundColor: colors.fire },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  stat: { gap: 0 },
  fleet: { gap: spacing.xs },
  fleetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  sprite: { width: 14 * 5 },
  hp: { flexDirection: 'row', gap: 3 },
  hpCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: withAlpha(colors.seaOwnFrom, 0.5),
  },
  hpHit: { backgroundColor: colors.fire },
  log: { gap: spacing.xs },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logTurn: { width: 20, textAlign: 'right' },
  logMark: { width: 8, height: 8, borderRadius: 4 },
  disconnect: { padding: spacing.md, borderColor: withAlpha(colors.danger, 0.4) },
});
