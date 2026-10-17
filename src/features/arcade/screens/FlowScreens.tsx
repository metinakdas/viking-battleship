import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { shotStats, shipCells, type Placement } from '@/game';
import { t, upperLocale } from '@/i18n';
import { playSound } from '@/services/sound';
import type { GameSnapshot } from '@/services/transport/types';

import type { GridShip } from '../canvas/pixelGrid';
import { GameHeader } from '../chrome';
import { GridBoard, GridInFlow } from '../GridBoard';
import {
  Chip,
  Frame,
  Panel,
  PixelArtView,
  PxButton,
  Stage,
  Txt,
  useBlink,
  useLayout,
  CoinIcon,
} from '../kit';
import { hudScore } from '@/features/records/score';

import { A, DIM, titleShadow, themed } from '../theme';

const up = (s: string) => s.toLocaleUpperCase(upperLocale());

/** Ortada çift çerçeveli kart (giriş kartıyla aynı dil). */
export function CenterCard({ children, chip }: { children: ReactNode; chip?: string }) {
  const { portrait } = useLayout();
  return (
    <Stage dim={DIM.cover}>
      <View style={styles.center}>
        <Frame color={A.text} shadow={18} style={[styles.card, portrait && styles.cardP]}>
          <PixelArtView art="emblem" width={112} height={98} />
          {children}
        </Frame>
      </View>
      {chip ? (
        <View style={[styles.cornerChip, portrait && { left: 20, top: 36 }]}>
          <Chip label={chip} color={A.cyan} />
        </View>
      ) : null}
    </Stage>
  );
}

export function BigTitle({ children, color = A.yellow }: { children: string; color?: string }) {
  const { portrait } = useLayout();
  return (
    <Txt
      font="press"
      size={portrait ? 32 : 40}
      ls={3}
      align="center"
      color={color}
      shadow={titleShadow(4).textShadow}
      accessibilityRole="header"
    >
      {children}
    </Txt>
  );
}

/** Kendi filon hazır, rakip hâlâ diziyor. */
export function WaitingScreen({
  opponentName,
  modeLabel,
  onLeave,
}: {
  opponentName: string;
  modeLabel: string;
  onLeave: () => void;
}) {
  const blink = useBlink(600);
  return (
    <CenterCard chip={modeLabel}>
      <BigTitle>{t('arcade.flow.readyTitle')}</BigTitle>
      <Txt
        size={36}
        align="center"
        color={A.textSoft}
        role="status"
        accessibilityLiveRegion="polite"
      >
        {t('arcade.flow.waiting', { name: up(opponentName) })}
        <Txt size={36} color={A.yellow}>
          {blink ? ' ■' : '  '}
        </Txt>
      </Txt>
      <PxButton
        label={t('arcade.flow.menu')}
        variant="secondary"
        onPress={onLeave}
        style={styles.stretch}
      />
    </CenterCard>
  );
}

/** Aynı cihaz: sıra değişiminde perde. Perde inene kadar hiçbir tahta görünmez. */
export function HandoffScreen({
  to,
  from,
  onReady,
}: {
  to: string;
  from: string;
  onReady: () => void;
}) {
  const blink = useBlink(500);
  return (
    <CenterCard chip={t('arcade.modes.hotseat')}>
      <Txt font="press" size={24} align="center" color={A.cyan} ls={2}>
        {t('arcade.flow.handoffKicker')}
      </Txt>
      <BigTitle>{t('arcade.flow.handoffTitle', { name: up(to) })}</BigTitle>
      <Txt size={34} align="center" color={A.textSoft} accessibilityLiveRegion="assertive">
        {t('arcade.flow.handoffHint', { other: up(from) })}
      </Txt>
      <PxButton label={t('arcade.flow.handoffReady')} onPress={onReady} style={styles.stretch} />
      <Txt
        font="press"
        size={24}
        align="center"
        color={blink ? A.yellow : 'transparent'}
        aria-hidden
      >
        {t('arcade.flow.handoffBlink')}
      </Txt>
    </CenterCard>
  );
}

/** Oyun sonu: sonuç, sebep, iki tahta (rakip filosu açık), istatistikler, rövanş. */
export function GameOverScreen({
  snapshot,
  neutral,
  opponentName,
  score,
  newHigh,
  gold,
  onRematch,
  onLobby,
}: {
  /** Arcade skoru (aynı cihazda gösterilmez). */
  score?: number;
  /** Rekor tablosunun zirvesi. */
  newHigh?: boolean;
  /** Maçta kazanılan/kaybedilen altın. */
  gold?: number;
  snapshot: GameSnapshot;
  /** Bilgisayara karşı: "CPU". */
  opponentName?: string;
  /** Aynı cihaz: "LAGERTHA KAZANDI!" gibi tarafsız başlık. */
  neutral?: boolean;
  onRematch?: () => void;
  onLobby: () => void;
}) {
  const { view, me, opponent } = snapshot;
  const iWon = view.winner === view.mySeat;
  const winner = iWon ? me : opponent;
  const loser = iWon ? opponent : me;
  const blink = useBlink(400);
  const theirName = opponentName ?? up(opponent.displayName);
  const { portrait } = useLayout();

  useEffect(() => {
    playSound(iWon ? 'victory' : 'defeat');
  }, [iWon]);

  const title = neutral
    ? t('arcade.over.winnerIs', { name: up(winner.displayName) })
    : iWon
      ? t('arcade.over.victory')
      : t('arcade.over.defeat');
  const reason = view.finishReason
    ? up(t(`gameOver.reasons.${view.finishReason}`, { name: loser.displayName }))
    : '';

  const ship = (p: Placement, sunk: boolean): GridShip => [
    p.origin.col,
    p.origin.row,
    shipCells(p).length,
    p.orientation === 'vertical' ? 1 : 0,
    sunk ? 's' : '',
    p.ship,
  ];
  const split = (shots: GameSnapshot['view']['me']['incoming']) => ({
    hit: shots.filter((s) => s.result !== 'miss').map((s) => [s.at.col, s.at.row] as const),
    miss: shots.filter((s) => s.result === 'miss').map((s) => [s.at.col, s.at.row] as const),
  });

  const sides = [
    {
      key: 'enemy',
      title: t('arcade.over.theirFleet', { name: theirName }),
      x: 56,
      frame: A.red,
      ships: (view.opponent.revealedFleet ?? []).map((p) =>
        ship(
          p,
          view.opponent.sunk.some((s) => s.ship === p.ship),
        ),
      ),
      shots: view.opponent.incoming,
      statsName: neutral ? up(me.displayName) : t('arcade.over.you'),
    },
    {
      key: 'own',
      title: neutral
        ? t('arcade.over.theirFleet', { name: up(me.displayName) })
        : t('arcade.battle.ownFleet'),
      x: 976,
      frame: A.cyan,
      ships: (view.me.fleet ?? []).map((p) => ship(p, view.me.sunk.includes(p.ship))),
      shots: view.me.incoming,
      statsName: theirName,
    },
  ];

  const header = (
    <GameHeader
      steps={[
        { label: t('arcade.steps.placementDone'), state: 'done' },
        { label: t('arcade.steps.battleDone'), state: 'done' },
      ]}
      right={
        <Chip
          label={t('arcade.battle.round', { n: Math.ceil(view.turnNumber / 2) })}
          color={A.yellow}
        />
      }
    />
  );
  const titleColor = iWon || neutral ? A.yellow : A.red;
  const pct = (st: { shots: number; accuracy: number }) =>
    st.shots === 0 ? '%0' : '%' + Math.round(st.accuracy * 100);

  if (portrait) {
    // Mobil: sonuç kartı (başlık, sebep, skor, tuşlar) + yan yana iki küçük tahta.
    return (
      <Stage dim={DIM.game}>
        {header}
        <View style={styles.pCol}>
          <Panel style={styles.pHero}>
            <Txt
              font="press"
              size={44}
              color={titleColor}
              shadow={titleShadow(4).textShadow}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Txt>
            <Txt size={28} align="center" color={A.cyan}>
              {reason}
            </Txt>
            {score !== undefined ? (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Txt font="press" size={32} color={A.text}>
                  {t('arcade.over.score') + ' ' + hudScore(score)}
                </Txt>
                {gold ? <GoldDelta gold={gold} /> : null}
                {newHigh ? (
                  <Txt font="press" size={24} color={blink ? A.yellow : A.pink}>
                    {t('arcade.over.newHigh')}
                  </Txt>
                ) : null}
              </View>
            ) : null}
            <View style={styles.pActions}>
              {onRematch ? (
                <PxButton
                  label={t('arcade.over.rematch')}
                  size={24}
                  onPress={onRematch}
                  style={{ flex: 1 }}
                />
              ) : null}
              <PxButton
                label={t('arcade.over.menu')}
                variant="secondary"
                onPress={onLobby}
                style={{ flex: 1 }}
              />
            </View>
          </Panel>
          <View style={styles.pBoards}>
            {sides.map((sd) => {
              const st = shotStats(sd.shots);
              return (
                <Panel key={sd.key} style={styles.pSide}>
                  <Txt font="press" size={24} numberOfLines={1}>
                    {sd.statsName}
                  </Txt>
                  <GridInFlow
                    size={300}
                    labels={false}
                    frameColor={sd.frame}
                    config={{ C: 12, ships: sd.ships, ...split(sd.shots) }}
                    accessibilityLabel={sd.title}
                  />
                  <View style={styles.pStats}>
                    <OverStat
                      value={String(st.shots)}
                      label={t('arcade.battle.shots')}
                      color={A.text}
                      small
                    />
                    <OverStat
                      value={String(st.hits)}
                      label={t('arcade.battle.hits')}
                      color={A.red}
                      small
                    />
                    <OverStat
                      value={pct(st)}
                      label={t('arcade.battle.accuracy')}
                      color={A.yellow}
                      small
                    />
                  </View>
                </Panel>
              );
            })}
          </View>
        </View>
      </Stage>
    );
  }

  return (
    <Stage dim={DIM.game}>
      {header}

      <Panel style={styles.hero}>
        <View style={styles.heroText}>
          <Txt
            font="press"
            size={64}
            ls={4}
            color={iWon || neutral ? A.yellow : A.red}
            shadow={titleShadow(6).textShadow}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Txt>
          <Txt size={36} color={A.cyan} numberOfLines={1}>
            {reason}
          </Txt>
        </View>
        {score !== undefined ? (
          <View style={styles.scoreBox}>
            <Txt font="press" size={24} color={A.muted}>
              {t('arcade.over.score')}
            </Txt>
            <Txt font="press" size={44} color={A.text} shadow={`4px 4px 0px ${A.bgDeep}`}>
              {hudScore(score)}
            </Txt>
            <Txt
              font="press"
              size={24}
              color={newHigh && blink ? A.yellow : newHigh ? A.pink : 'transparent'}
            >
              {t('arcade.over.newHigh')}
            </Txt>
            {gold ? <GoldDelta gold={gold} /> : null}
          </View>
        ) : null}
        <View style={styles.heroActions}>
          {onRematch ? <PxButton label={t('arcade.over.rematch')} onPress={onRematch} /> : null}
          <PxButton label={t('arcade.over.menu')} variant="secondary" onPress={onLobby} />
        </View>
      </Panel>

      {sides.map((s) => {
        const stats = shotStats(s.shots);
        const gx = s.x + 80;
        return (
          <View key={s.key} style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Panel style={[styles.side, { left: s.x }]} />
            <Txt
              font="press"
              size={24}
              style={[styles.sideTitle, { left: s.x + 32 }]}
              numberOfLines={1}
            >
              {s.title}
            </Txt>
            <GridBoard
              left={gx}
              top={520}
              size={480}
              frameColor={s.frame}
              labels={{ lettersTop: 468, numbersLeft: gx - 62 }}
              config={{ C: s.key === 'enemy' ? 16 : 12, ships: s.ships, ...split(s.shots) }}
              accessibilityLabel={s.title}
            />
            <View style={[styles.stats, { left: gx + 520 }]}>
              <Txt font="press" size={24} color={A.muted} numberOfLines={1}>
                {s.statsName}
              </Txt>
              <OverStat
                value={String(stats.shots)}
                label={t('arcade.battle.shots')}
                color={A.text}
              />
              <OverStat value={String(stats.hits)} label={t('arcade.battle.hits')} color={A.red} />
              <OverStat
                value={stats.shots === 0 ? '%0' : `%${Math.round(stats.accuracy * 100)}`}
                label={t('arcade.battle.accuracy')}
                color={A.yellow}
              />
            </View>
          </View>
        );
      })}
    </Stage>
  );
}

/** "+50 ⛁" / "−20 ⛁": altın değişimi. */
function GoldDelta({ gold }: { gold: number }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      accessibilityLabel={String(gold)}
    >
      <CoinIcon size={28} />
      <Txt
        font="press"
        size={28}
        color={gold > 0 ? A.yellow : A.red}
        shadow={'2px 2px 0px ' + A.bgDeep}
      >
        {(gold > 0 ? '+' : '-') + Math.abs(gold)}
      </Txt>
    </View>
  );
}

function OverStat({
  value,
  label,
  color,
  small,
}: {
  value: string;
  label: string;
  color: string;
  small?: boolean;
}) {
  return (
    <View style={{ gap: 6, alignItems: small ? 'center' : undefined }}>
      <Txt font="press" size={small ? 28 : 44} color={color} shadow={`4px 4px 0px ${A.bgDeep}`}>
        {value}
      </Txt>
      <Txt size={small ? 24 : 30} lh={1} color={A.muted}>
        {label}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
    card: { width: 760, gap: 28, alignItems: 'center', padding: 48, backgroundColor: A.panel },
    cardP: { width: 640, padding: 36, gap: 22 },
    pCol: { position: 'absolute', left: 20, top: 118, width: 680, bottom: 16, gap: 14 },
    pHero: { padding: 24, gap: 14, alignItems: 'center' },
    pActions: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
    pBoards: { flexDirection: 'row', gap: 12 },
    pSide: { flex: 1, padding: 8, gap: 10, alignItems: 'center' },
    pStats: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch' },
    stretch: { alignSelf: 'stretch' },
    cornerChip: { position: 'absolute', left: 56, top: 48 },
    hero: {
      position: 'absolute',
      left: 56,
      top: 164,
      width: 1808,
      height: 200,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 48,
    },
    heroText: { gap: 16, flexShrink: 1, flex: 1 },
    scoreBox: { alignItems: 'center', gap: 10, marginHorizontal: 32 },
    heroActions: { gap: 20, width: 420 },
    side: { position: 'absolute', top: 388, width: 888, height: 656 },
    sideTitle: { position: 'absolute', top: 412, width: 820 },
    stats: { position: 'absolute', top: 520, width: 240, gap: 24 },
  }),
);
