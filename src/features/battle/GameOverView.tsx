import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Board, type BoardShip } from '@/features/board';
import { AppHeader } from '@/features/common/AppHeader';
import { shotStats } from '@/game';
import { t } from '@/i18n';
import { playSound } from '@/services/sound';
import type { GameSnapshot } from '@/services/transport/types';
import { AppText, Button, Card, colors, Pill, RuneText, Screen, spacing } from '@/ui';

export type GameOverViewProps = {
  snapshot: GameSnapshot;
  modeLabel: string;
  /** Aynı cihaz: "Ragnar kazandı!" gibi tarafsız başlık. */
  neutral?: boolean;
  onRematch?: () => void;
  onLobby: () => void;
};

/** Oyun sonu: kazanan, sebep, iki tarafın istatistiği, iki tahta (rakip filosu açık). */
export function GameOverView({
  snapshot,
  modeLabel,
  neutral,
  onRematch,
  onLobby,
}: GameOverViewProps) {
  const { view, me, opponent } = snapshot;
  const { width } = useWindowDimensions();
  const iWon = view.winner === view.mySeat;
  const winner = iWon ? me : opponent;
  const loser = iWon ? opponent : me;

  useEffect(() => {
    playSound(iWon ? 'victory' : 'defeat');
  }, [iWon]);

  const title = neutral
    ? t('gameOver.winnerIs', { name: winner.displayName })
    : iWon
      ? t('gameOver.victory')
      : t('gameOver.defeat');
  const reason = view.finishReason
    ? t(`gameOver.reasons.${view.finishReason}`, { name: loser.displayName })
    : '';

  const mine = shotStats(view.opponent.incoming);
  const theirs = shotStats(view.me.incoming);
  const pct = (a: number, n: number) => (n === 0 ? '–' : `%${Math.round(a * 100)}`);

  const cell = Math.max(20, Math.min(34, Math.floor((width - 32 - 48) / 2 / 10.6)));
  const narrow = width < 760;
  const boardCell = narrow ? Math.max(24, Math.min(34, Math.floor((width - 66) / 10.6))) : cell;

  const enemyShips: BoardShip[] = (view.opponent.revealedFleet ?? []).map((placement) => ({
    placement,
    look: view.opponent.sunk.some((p) => p.ship === placement.ship) ? 'sunk' : 'afloat',
  }));
  const ownShips: BoardShip[] = (view.me.fleet ?? []).map((placement) => ({
    placement,
    look: view.me.sunk.includes(placement.ship) ? 'sunk' : 'afloat',
  }));

  return (
    <Screen scroll contentStyle={styles.content}>
      <AppHeader right={<Pill label={modeLabel} />} />

      <Card highlighted style={styles.hero}>
        <View style={styles.heroBody}>
          <AppText
            variant="h1"
            align="center"
            style={[styles.title, { color: iWon || neutral ? colors.accent : colors.iron }]}
            accessibilityRole="header"
          >
            {title}
          </AppText>
          {iWon || neutral ? <RuneText text={t('gameOver.valhalla')} height={14} dotted /> : null}
          <AppText tone="secondary" align="center">
            {reason}
          </AppText>
          <AppText variant="caption" tone="muted">
            {t('gameOver.turns', { n: view.turnNumber })}
          </AppText>

          <View style={styles.versus}>
            {[
              { name: neutral ? me.displayName : t('gameOver.you'), s: mine },
              { name: opponent.displayName, s: theirs },
            ].map((side) => (
              <View key={side.name} style={styles.side}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {side.name}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {`${t('battle.shots')} ${side.s.shots} · ${t('battle.hits')} ${side.s.hits} · ${pct(side.s.accuracy, side.s.shots)}`}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            {onRematch ? (
              <Button label={t('gameOver.rematch')} size="lg" onPress={onRematch} />
            ) : null}
            <Button label={t('gameOver.lobby')} variant="secondary" size="lg" onPress={onLobby} />
          </View>
        </View>
      </Card>

      <View style={[styles.boards, narrow && styles.boardsNarrow]}>
        <Card title={t('gameOver.theirFleet').toLocaleUpperCase('tr')}>
          <Board
            variant="enemy"
            cellSize={boardCell}
            ships={enemyShips}
            shots={view.opponent.incoming}
            accessibilityLabel={t('gameOver.theirFleet')}
          />
        </Card>
        <Card title={t('gameOver.yourFleet').toLocaleUpperCase('tr')}>
          <Board
            variant="own"
            cellSize={boardCell}
            ships={ownShips}
            shots={view.me.incoming}
            accessibilityLabel={t('gameOver.yourFleet')}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  hero: { alignSelf: 'center', width: '100%', maxWidth: 640 },
  heroBody: { alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 40, lineHeight: 46 },
  versus: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  side: { alignItems: 'center', minWidth: 160 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  boards: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center', flexWrap: 'wrap' },
  boardsNarrow: { flexDirection: 'column', alignItems: 'center' },
});
