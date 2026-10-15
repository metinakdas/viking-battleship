import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PlayerChip } from '@/features/auth';
import { Board, type BoardShip } from '@/features/board';
import { AppHeader } from '@/features/common/AppHeader';
import { PhaseSteps } from '@/features/common/PhaseSteps';
import { useReducedMotion } from '@/features/game/hooks';
import { BOARD_SIZE, cellIndex, type Coord, type ShotRecord } from '@/game';
import { t } from '@/i18n';
import { playSound } from '@/services/sound';
import type { GameSnapshot } from '@/services/transport/types';
import { AppText, Button, Card, Pill, Screen, spacing } from '@/ui';

import { buildLog, damageReport } from './log';
import {
  CaptainsLog,
  DamagePanel,
  DisconnectBanner,
  EnemyFleetPanel,
  StatsPanel,
  TurnBanner,
} from './Panels';

export type BattleViewProps = {
  snapshot: GameSnapshot;
  modeLabel: string;
  onFire: (at: Coord) => void;
  onResign: () => void;
  /** Sağ sütunun altına (çevrimiçide sohbet). */
  sidePanel?: ReactNode;
  /** Sıra şeridinin altına (geliştirici düğmeleri vb.). */
  extra?: ReactNode;
};

/**
 * Savaş ekranı. Geniş: 3 sütun (kendi filon | düşman tahtası | paneller).
 * Tablet: düşman tahtası üstte, gerisi altta. Telefon: tek sütun, kendi tahtan küçük önizleme.
 */
export function BattleView({
  snapshot,
  modeLabel,
  onFire,
  onResign,
  sidePanel,
  extra,
}: BattleViewProps) {
  const { view, opponent, turnEndsAt } = snapshot;
  const { width, height } = useWindowDimensions();
  const layout = width >= 1200 ? 'wide' : width >= 768 ? 'tablet' : 'phone';
  const reduceMotion = useReducedMotion();
  const [cursor, setCursor] = useState<Coord | null>(null);
  const [ownLarge, setOwnLarge] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);

  const fired = useMemo(
    () => new Set(view.opponent.incoming.map((s) => cellIndex(s.at))),
    [view.opponent.incoming],
  );
  const canFire = view.isMyTurn;
  const fire = (c: Coord) => {
    if (!canFire || fired.has(cellIndex(c))) return;
    playSound('cannon');
    onFire(c);
  };

  useBattleKeyboard({ cursor, setCursor, fire, enabled: canFire });
  useShotSounds(view.opponent.incoming, view.me.incoming);

  const enemyCell = enemyCellSize(layout, width, height);
  const ownCell = layout === 'wide' ? 24 : layout === 'tablet' ? 24 : ownLarge ? 30 : 16;

  const enemyShips: BoardShip[] = view.opponent.sunk.map((placement) => ({
    placement,
    look: 'sunk',
  }));
  const ownShips: BoardShip[] = (view.me.fleet ?? []).map((placement) => ({
    placement,
    look: view.me.sunk.includes(placement.ship) ? 'sunk' : 'afloat',
  }));
  const log = buildLog(view);
  const lastMine = view.opponent.incoming.at(-1)?.at ?? null;
  const lastTheirs = view.me.incoming.at(-1)?.at ?? null;

  const enemy = (
    <View style={styles.enemyColumn}>
      <TurnBanner
        isMyTurn={view.isMyTurn}
        opponentName={opponent.displayName}
        turnEndsAt={turnEndsAt}
      />
      {snapshot.opponentConnection === 'disconnected' && snapshot.reconnectEndsAt ? (
        <DisconnectBanner name={opponent.displayName} endsAt={snapshot.reconnectEndsAt} />
      ) : null}
      <View style={styles.opponentRow}>
        <AppText variant="overline" tone="muted">
          {t('battle.enemyWaters').toLocaleUpperCase('tr')}
        </AppText>
        <PlayerChip player={opponent} size={28} />
      </View>
      <View style={styles.center}>
        <Board
          variant="enemy"
          cellSize={enemyCell}
          ships={enemyShips}
          shots={view.opponent.incoming}
          onCellPress={fire}
          onCellHover={() => setCursor(null)}
          focusCell={canFire ? cursor : null}
          disabled={!canFire}
          lastShot={lastMine}
          reduceMotion={reduceMotion}
          accessibilityLabel={t('battle.enemyWaters')}
        />
      </View>
      {Platform.OS === 'web' && layout !== 'phone' ? (
        <AppText variant="caption" tone="muted" align="center">
          {t('battle.keyboardHint')}
        </AppText>
      ) : null}
      {extra}
    </View>
  );

  const own = (
    <Card
      title={t('battle.ownFleet').toLocaleUpperCase('tr')}
      headerRight={
        layout === 'phone' ? (
          <Button
            label={ownLarge ? t('battle.shrink') : t('battle.enlarge')}
            variant="ghost"
            onPress={() => setOwnLarge((v) => !v)}
          />
        ) : null
      }
    >
      <View style={styles.center}>
        <Board
          variant="own"
          cellSize={ownCell}
          ships={ownShips}
          shots={view.me.incoming}
          showLabels={ownCell >= 20}
          lastShot={lastTheirs}
          reduceMotion={reduceMotion}
          accessibilityLabel={t('battle.ownFleet')}
        />
      </View>
    </Card>
  );

  const resign = confirmResign ? (
    <Card>
      <View style={styles.stack}>
        <AppText variant="label">{t('battle.resignConfirm')}</AppText>
        <View style={styles.row}>
          <Button label={t('common.yes')} onPress={onResign} />
          <Button label={t('common.no')} variant="ghost" onPress={() => setConfirmResign(false)} />
        </View>
      </View>
    </Card>
  ) : (
    <Button label={t('battle.resign')} variant="ghost" onPress={() => setConfirmResign(true)} />
  );

  const panels = (
    <>
      <StatsPanel mine={view.opponent.incoming} theirs={view.me.incoming} />
      <EnemyFleetPanel sunk={view.opponent.sunk.map((p) => p.ship)} />
      <CaptainsLog entries={log} opponentName={opponent.displayName} />
      {sidePanel}
    </>
  );

  const header = (
    <AppHeader
      center={<PhaseSteps active={1} />}
      right={
        <>
          <Pill label={modeLabel} />
          <Pill label={t('battle.round', { n: view.turnNumber })} tone="gold" />
        </>
      }
    />
  );

  return (
    <Screen scroll contentStyle={styles.content}>
      {header}
      {layout === 'wide' ? (
        <View style={styles.wide}>
          <View style={styles.left}>
            {own}
            <DamagePanel report={damageReport(view)} />
            {resign}
          </View>
          {enemy}
          <View style={styles.right}>{panels}</View>
        </View>
      ) : (
        <View style={styles.stack}>
          {enemy}
          <View style={layout === 'tablet' ? styles.tabletRow : styles.stack}>
            <View style={layout === 'tablet' ? styles.tabletCol : styles.stack}>
              {own}
              <DamagePanel report={damageReport(view)} />
            </View>
            <View style={layout === 'tablet' ? styles.tabletCol : styles.stack}>{panels}</View>
          </View>
          {resign}
        </View>
      )}
    </Screen>
  );
}

function enemyCellSize(layout: 'wide' | 'tablet' | 'phone', width: number, height: number): number {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(v)));
  if (layout === 'wide') {
    return clamp(
      (Math.min(width - 32 - 300 - 320 - 2 * spacing.xl, height - 230) - 2) / 10.55,
      32,
      56,
    );
  }
  if (layout === 'tablet') return clamp((Math.min(width - 32, height - 280) - 2) / 10.55, 32, 52);
  return clamp((width - 32 - 2) / 10.55, 28, 44);
}

/** Web: ok tuşları hedefi gezdirir, Enter/Boşluk ateş eder. */
function useBattleKeyboard({
  cursor,
  setCursor,
  fire,
  enabled,
}: {
  cursor: Coord | null;
  setCursor: (c: Coord) => void;
  fire: (c: Coord) => void;
  enabled: boolean;
}) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const moves: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const move = moves[e.key];
      if (move) {
        const base = cursor ?? { row: 4, col: 4 };
        const clampI = (v: number) => Math.max(0, Math.min(BOARD_SIZE - 1, v));
        setCursor(
          cursor ? { row: clampI(base.row + move[0]), col: clampI(base.col + move[1]) } : base,
        );
      } else if ((e.key === 'Enter' || e.key === ' ') && cursor) {
        fire(cursor);
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, setCursor, fire, enabled]);
}

/** Yeni atış sonuçlarında ses (ayarlardan açıksa). */
function useShotSounds(mine: readonly ShotRecord[], theirs: readonly ShotRecord[]) {
  const count = useRef(mine.length + theirs.length);
  useEffect(() => {
    const total = mine.length + theirs.length;
    if (total <= count.current) {
      count.current = total;
      return;
    }
    count.current = total;
    const last = [...mine, ...theirs].sort((a, b) => b.turn - a.turn)[0];
    if (last)
      playSound(last.result === 'miss' ? 'splash' : last.result === 'sunk' ? 'sink' : 'hit');
  }, [mine, theirs]);
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, maxWidth: 1440, width: '100%', alignSelf: 'center' },
  wide: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  left: { width: 300, gap: spacing.md },
  right: { width: 320, gap: spacing.md },
  enemyColumn: { flex: 1, gap: spacing.md, minWidth: 0 },
  center: { alignItems: 'center' },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  stack: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  tabletRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  tabletCol: { flex: 1, gap: spacing.md },
});
