import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { damageReport } from '@/features/battle/log';
import { formatSeconds, useCountdown } from '@/features/game/hooks';
import {
  BOARD_SIZE,
  cellIndex,
  coordLabel,
  FLEET,
  shipCells,
  shotStats,
  type Coord,
  type Placement,
  type ShotRecord,
} from '@/game';
import { t, upperLocale } from '@/i18n';
import { lookFrom } from '@/features/shop/catalog';
import { playSound } from '@/services/sound';
import { useWallet } from '@/store/walletStore';
import type { GameSnapshot } from '@/services/transport/types';

import type { GridCell, GridShip } from '../canvas/pixelGrid';
import { ConfirmModal, GameHeader, PxModal } from '../chrome';
import { GridBoard, GridInFlow } from '../GridBoard';
import { Chip, Panel, PixelArtView, Stage, Txt, useLayout } from '../kit';
import { A, DIM, themed } from '../theme';

const ENEMY = { left: 712, top: 300, size: 640 };
/** Mobil (720 px tuval): düşman 600, kendi filon 300 px. */
const P_ENEMY = 600;
const P_OWN = 330;
const OWN = { left: 112, top: 300, size: 480 };

export type BattleScreenProps = {
  snapshot: GameSnapshot;
  onFire: (at: Coord) => void;
  onResign: () => void;
  /** Üst çubuktaki "◀": onaydan sonra teslim olup menüye döner. */
  onLeave?: () => void;
  /** Ortadaki ipucu satırının yerine (bağlantı kopması uyarısı). */
  notice?: ReactNode;
  /** Çevrimiçi sohbet: yatayda sağ sütunda panel, mobilde üst çubuktaki "SOHBET" chip'i. */
  chat?: ReactNode;
};

/** Raunt: tasarımda aynı turda hem sen hem rakip ateş eder (T19 SEN / T19 RAKİP). */
export const roundOf = (turnNumber: number) => Math.ceil(turnNumber / 2);

/** Savaş (tasarım §5.3). */
export function BattleScreen({
  snapshot,
  onFire,
  onResign,
  onLeave,
  notice,
  chat,
}: BattleScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const { portrait } = useLayout();
  const [chatOpen, setChatOpen] = useState(false);
  const { view, turnEndsAt } = snapshot;
  const [cursor, setCursor] = useState<Coord | null>(null);
  const [confirm, setConfirm] = useState(false);
  const left = useCountdown(turnEndsAt);
  const mine = view.isMyTurn;

  const fired = useMemo(
    () => new Set(view.opponent.incoming.map((s) => cellIndex(s.at))),
    [view.opponent.incoming],
  );
  const fire = (c: Coord) => {
    if (!mine || fired.has(cellIndex(c))) return;
    onFire(c);
  };
  useBattleKeys({ cursor, setCursor, fire, enabled: mine });
  useShotSounds(view.opponent.incoming, view.me.incoming);

  const aim: Coord | null = mine ? cursor : null;
  const aimCell: GridCell | null = aim ? [aim.col, aim.row] : null;

  const enemyShips: GridShip[] = (view.opponent.revealedFleet ?? view.opponent.sunk).map((p) =>
    gridShip(
      p,
      view.opponent.sunk.some((s) => s.ship === p.ship),
    ),
  );
  const ownShips: GridShip[] = (view.me.fleet ?? []).map((p) =>
    gridShip(p, view.me.sunk.includes(p.ship)),
  );
  const split = (shots: readonly ShotRecord[]) => ({
    hit: shots.filter((s) => s.result !== 'miss').map((s) => [s.at.col, s.at.row] as const),
    miss: shots.filter((s) => s.result === 'miss').map((s) => [s.at.col, s.at.row] as const),
  });
  const lastTheirs = view.me.incoming.at(-1)?.at;
  const stats = shotStats(view.opponent.incoming);
  const afloat = FLEET.length - view.me.sunk.length;
  const enemyLeft = FLEET.length - view.opponent.sunk.length;
  // Tasarım: batanlar listenin sonuna, üstü çizili.
  const enemyRows = FLEET.map((f) => ({
    ...f,
    sunk: view.opponent.sunk.some((s) => s.ship === f.ship),
  })).sort((a, b) => Number(a.sunk) - Number(b.sunk));

  const header = (
    <GameHeader
      onBack={onLeave ? () => setLeaving(true) : undefined}
      steps={[
        { label: t('arcade.steps.placementDone'), state: 'done' },
        { label: t('arcade.steps.battle'), state: 'active' },
      ]}
      right={
        <>
          <Chip
            label={t('arcade.battle.round', { n: roundOf(view.turnNumber) })}
            color={A.yellow}
          />
          {portrait && chat ? (
            <Chip label={t('arcade.chat.tab')} color={A.cyan} onPress={() => setChatOpen(true)} />
          ) : null}
          <Chip
            label={t('arcade.battle.resign')}
            color={A.muted}
            onPress={() => setConfirm(true)}
          />
        </>
      }
    />
  );
  const strip = (
    <View
      style={[styles.strip, portrait && styles.stripP, !mine && styles.stripIdle]}
      role="status"
      accessibilityLiveRegion="polite"
    >
      <Txt font="press" size={24} color={mine ? A.ink : A.textSoft} style={styles.noShrink}>
        {mine ? t('arcade.battle.yourTurn') : t('arcade.battle.theirTurn')}
      </Txt>
      {left !== null ? (
        <View style={[styles.timer, !mine && styles.timerIdle]}>
          <Txt font="press" size={28} color={mine ? A.ink : A.textSoft}>
            {formatSeconds(left)}
          </Txt>
        </View>
      ) : (
        <View />
      )}
    </View>
  );
  // Kozmetik: harita/gülle/alev iki ızgarada; gemi boyası yalnız kendi filonda.
  const { equipped } = useWallet();
  const enemyProps = {
    frameColor: A.red,
    highlight: aim,
    config: {
      look: lookFrom(equipped, false),
      C: 16,
      ships: enemyShips,
      ...split(view.opponent.incoming),
      aim: aimCell,
      tint: aimCell,
    },
    onCellPress: fire,
    onCellHover: (c: Coord | null) => setCursor(c),
    disabled: !mine,
    cellLabel: (c: Coord) => enemyCellLabel(c, view.opponent.incoming),
    accessibilityLabel: t('arcade.battle.enemyWaters'),
  };
  const ownConfig = {
    look: lookFrom(equipped, true),
    C: 12,
    ships: ownShips,
    ...split(view.me.incoming),
    last: lastTheirs ? ([lastTheirs.col, lastTheirs.row] as const) : null,
  };
  const modals = (
    <>
      {leaving && onLeave ? (
        <ConfirmModal
          title={t('arcade.nav.leaveTitle')}
          message={t('arcade.nav.leaveMessage')}
          confirm={t('arcade.nav.leaveConfirm')}
          onConfirm={() => {
            setLeaving(false);
            onLeave();
          }}
          onCancel={() => setLeaving(false)}
        />
      ) : null}
      {confirm ? (
        <ConfirmModal
          title={t('arcade.battle.resignTitle')}
          message={t('arcade.battle.resignMessage')}
          confirm={t('arcade.battle.resignConfirm')}
          onConfirm={() => {
            setConfirm(false);
            onResign();
          }}
          onCancel={() => setConfirm(false)}
        />
      ) : null}
      {chatOpen && chat ? (
        <PxModal title={t('arcade.chat.tab')} onClose={() => setChatOpen(false)} width={680}>
          <View style={styles.chatBox}>{chat}</View>
        </PxModal>
      ) : null}
    </>
  );

  if (portrait) {
    // Mobil (dikey): sıra şeridi, büyük düşman ızgarası; altta kendi filon + skor + düşman listesi.
    return (
      <Stage dim={DIM.game}>
        {header}
        <View style={styles.pCol}>
          {strip}
          {notice}
          <GridInFlow size={P_ENEMY} style={{ alignSelf: 'center' }} {...enemyProps}>
            {aim && !fired.has(cellIndex(aim)) ? <AimTag aim={aim} gridSize={P_ENEMY} /> : null}
          </GridInFlow>
          <Panel style={styles.pBottom}>
            <GridInFlow
              size={P_OWN}
              labels={false}
              frameColor={A.cyan}
              config={ownConfig}
              accessibilityLabel={t('arcade.battle.ownFleet')}
            />
            <View style={styles.pSide}>
              <View style={styles.between}>
                <MiniStat
                  value={String(stats.shots)}
                  label={t('arcade.battle.shots')}
                  color={A.text}
                />
                <MiniStat
                  value={String(stats.hits)}
                  label={t('arcade.battle.hits')}
                  color={A.red}
                />
                <MiniStat
                  value={stats.shots === 0 ? '%0' : '%' + Math.round(stats.accuracy * 100)}
                  label={t('arcade.battle.accuracy')}
                  color={A.yellow}
                />
              </View>
              <View style={{ gap: 2 }}>
                {enemyRows.map(({ ship, size, sunk }) => (
                  <View key={ship} style={styles.between}>
                    <Txt
                      size={26}
                      color={sunk ? A.faded : A.text}
                      style={sunk ? styles.strike : undefined}
                      numberOfLines={1}
                    >
                      {t(`ships.${ship}`).toLocaleUpperCase(upperLocale())}
                    </Txt>
                    <Txt size={26} color={sunk ? A.red : A.lineDim} aria-hidden>
                      {sunk ? '✕' : '■'.repeat(size)}
                    </Txt>
                  </View>
                ))}
              </View>
            </View>
          </Panel>
        </View>
        {modals}
      </Stage>
    );
  }

  return (
    <Stage dim={DIM.game}>
      {header}

      {/* Sol: kendi filon + hasar raporu */}
      <Panel style={styles.leftPanel} />
      <Txt font="press" size={24} style={styles.ownTitle}>
        {t('arcade.battle.ownFleet')}
      </Txt>
      <Txt font="press" size={24} align="right" color={A.yellow} style={styles.afloat}>
        {`${afloat}/${FLEET.length}`}
      </Txt>
      <GridBoard
        {...OWN}
        frameColor={A.cyan}
        labels={{ lettersTop: 248, numbersLeft: 50 }}
        config={ownConfig}
        accessibilityLabel={t('arcade.battle.ownFleet')}
      />
      {/* Kendi gemilerinin durumu: resim + can kareleri (kırmızı = isabet). Yazı yok. */}
      <View style={styles.damage}>
        {damageReport(view).map((d) => (
          <View
            key={d.ship}
            style={styles.healthRow}
            accessibilityLabel={`${t(`ships.${d.ship}`)}: ${d.hits}/${d.size}`}
          >
            <View style={[styles.healthArt, d.hits === d.size && { opacity: 0.35 }]}>
              <PixelArtView art={d.ship} width={d.size * 24} height={24} />
            </View>
            <View style={styles.pips}>
              {Array.from({ length: d.size }, (_, i) => (
                <View key={i} style={[styles.pip, i < d.hits && styles.pipHit]} />
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Orta: sıra şeridi + düşman suları */}
      <Panel style={styles.centerPanel} />
      {strip}
      <GridBoard {...ENEMY} labels={{ lettersTop: 270, numbersLeft: 650 }} {...enemyProps}>
        {aim && !fired.has(cellIndex(aim)) ? <AimTag aim={aim} gridSize={ENEMY.size} /> : null}
      </GridBoard>
      {notice ? <View style={styles.hint}>{notice}</View> : null}

      {/* Sağ: istatistik, düşman, seyir defteri */}
      <View style={styles.rightCol}>
        <Panel style={styles.statsPanel}>
          <Stat value={String(stats.shots)} label={t('arcade.battle.shots')} color={A.text} />
          <Stat value={String(stats.hits)} label={t('arcade.battle.hits')} color={A.red} />
          <Stat
            value={stats.shots === 0 ? '%0' : `%${Math.round(stats.accuracy * 100)}`}
            label={t('arcade.battle.accuracy')}
            color={A.yellow}
          />
        </Panel>
        <Panel style={[styles.enemyPanel, !chat && { flex: 1 }]}>
          <View style={styles.between}>
            <Txt font="press" size={24} accessibilityRole="header">
              {t('arcade.battle.enemy')}
            </Txt>
            <Txt font="press" size={24} color={A.yellow}>
              {`${enemyLeft}/${FLEET.length}`}
            </Txt>
          </View>
          {/* Düşman filosu: gemi resmi + boy kareleri; batan soluk ve kırmızı ✕. */}
          {enemyRows.map(({ ship, size, sunk }) => (
            <View
              key={ship}
              style={[styles.enemyRow, chat ? styles.enemyRowC : null]}
              accessibilityLabel={`${t(`ships.${ship}`)}${sunk ? ' — ' + t('arcade.how.marks.sunk') : ''}`}
            >
              <View style={[styles.enemyArt, sunk && { opacity: 0.3 }]}>
                <PixelArtView art={ship} width={size * (chat ? 28 : 46)} height={chat ? 28 : 46} />
                {sunk ? <View style={styles.sunkLine} /> : null}
              </View>
              {sunk ? (
                <Txt font="press" size={24} color={A.red}>
                  ✕
                </Txt>
              ) : (
                <View style={styles.pips}>
                  {Array.from({ length: size }, (_, i) => (
                    <View key={i} style={[styles.pip, styles.pipEnemy]} />
                  ))}
                </View>
              )}
            </View>
          ))}
        </Panel>
        {chat ? <Panel style={styles.chatPanel}>{chat}</Panel> : null}
      </View>

      {modals}
    </Stage>
  );
}

function gridShip(p: Placement, sunk: boolean): GridShip {
  return [
    p.origin.col,
    p.origin.row,
    shipCells(p).length,
    p.orientation === 'vertical' ? 1 : 0,
    sunk ? 's' : '',
    p.ship,
  ];
}

function enemyCellLabel(c: Coord, shots: readonly ShotRecord[]): string {
  const s = shots.find((x) => x.at.row === c.row && x.at.col === c.col);
  const cell = coordLabel(c);
  if (!s) return t('arcade.battle.fireAt', { cell });
  return s.result === 'miss' ? t('board.cell.miss', { cell }) : t('board.cell.hit', { cell });
}

/** Nişangahın yanındaki kırmızı etiket: "E5 ATEŞ!" (sağda yer yoksa solda). */
function AimTag({ aim, gridSize }: { aim: Coord; gridSize: number }) {
  const cell = gridSize / BOARD_SIZE;
  const width = 236;
  const right = (aim.col + 1) * cell + 8;
  const x = right + width > gridSize + 40 ? aim.col * cell - width - 8 : right;
  return (
    <View pointerEvents="none" style={[styles.aimTag, { left: x, top: aim.row * cell + 10 }]}>
      <Txt font="press" size={24} color={A.ink} numberOfLines={1}>
        {t('arcade.battle.fireTag', { cell: coordLabel(aim) })}
      </Txt>
    </View>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Txt font="press" size={44} color={color} shadow={`4px 4px 0px ${A.bgDeep}`}>
        {value}
      </Txt>
      <Txt size={30} lh={1} color={A.muted}>
        {label}
      </Txt>
    </View>
  );
}

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Txt font="press" size={26} color={color}>
        {value}
      </Txt>
      <Txt size={24} lh={1} color={A.muted}>
        {label}
      </Txt>
    </View>
  );
}

/**
 * Atış sesleri: her yeni atışta (iki taraf, süre dolunca otomatik atış dahil) top sesi; gülle
 * düşünce (~0.38 sn, ızgara efektiyle aynı an) ıska → sıçrama, isabet → patlama, batış → batma.
 * İlk çizimdeki mevcut atışlar çalınmaz.
 */
function useShotSounds(mineShots: readonly ShotRecord[], theirShots: readonly ShotRecord[]) {
  const seen = useRef<[number, number] | null>(null);
  useEffect(() => {
    const prev = seen.current;
    seen.current = [mineShots.length, theirShots.length];
    if (!prev) return;
    const fresh = [...mineShots.slice(prev[0]), ...theirShots.slice(prev[1])];
    fresh.forEach((s) => {
      playSound('cannon');
      playSound(s.result === 'miss' ? 'splash' : s.result === 'sunk' ? 'sink' : 'hit', 380);
    });
  }, [mineShots, theirShots]);
}

/** Web: ok tuşları nişan, Enter/Boşluk ateş. */
function useBattleKeys({
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
      const m = moves[e.key];
      const clamp = (v: number) => Math.max(0, Math.min(BOARD_SIZE - 1, v));
      if (m)
        setCursor(
          cursor
            ? { row: clamp(cursor.row + m[0]), col: clamp(cursor.col + m[1]) }
            : { row: 4, col: 4 },
        );
      else if ((e.key === 'Enter' || e.key === ' ') && cursor) fire(cursor);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, setCursor, fire, enabled]);
}

const styles = themed(() =>
  StyleSheet.create({
    leftPanel: { position: 'absolute', left: 56, top: 164, width: 576, height: 880 },
    ownTitle: { position: 'absolute', left: 112, top: 184, width: 300 },
    afloat: { position: 'absolute', left: 392, top: 182, width: 200 },
    damage: {
      position: 'absolute',
      left: 96,
      top: 820,
      width: 500,
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 18,
      columnGap: 20,
    },
    healthRow: { width: 244, flexDirection: 'row', alignItems: 'center', gap: 10 },
    healthArt: { width: 124 },
    pips: { flexDirection: 'row', gap: 4 },
    pip: { width: 16, height: 16, backgroundColor: A.lineDim, borderWidth: 2, borderColor: A.line },
    pipHit: { backgroundColor: A.red, borderColor: A.redHi },
    pipEnemy: { backgroundColor: A.input },
    enemyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flex: 1,
      paddingVertical: 10,
      borderTopWidth: 2,
      borderColor: A.lineDim,
    },
    enemyRowC: { flex: 0, paddingVertical: 6 },
    enemyArt: { justifyContent: 'center' },
    sunkLine: { position: 'absolute', left: -6, right: -6, height: 4, backgroundColor: A.red },
    chatPanel: { flex: 1, paddingVertical: 20, paddingHorizontal: 24 },
    centerPanel: { position: 'absolute', left: 656, top: 164, width: 720, height: 880 },
    strip: {
      position: 'absolute',
      left: 712,
      top: 184,
      width: 640,
      height: 72,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      overflow: 'hidden',
      backgroundColor: A.yellow,
      borderWidth: 4,
      borderColor: A.yellowHi,
      boxShadow: `0px 6px 0px ${A.orangeSh}`,
    },
    stripIdle: {
      backgroundColor: A.slot,
      borderColor: A.faded,
      boxShadow: `0px 6px 0px ${A.lineDim}`,
    },
    noShrink: { flexShrink: 0 },
    timer: {
      flexShrink: 0,
      backgroundColor: 'rgba(26,10,42,0.15)',
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    timerIdle: { backgroundColor: 'rgba(3,3,12,0.35)' },
    hint: { position: 'absolute', left: 712, top: 964, width: 640 },
    aimTag: {
      position: 'absolute',
      backgroundColor: A.red,
      borderWidth: 4,
      borderColor: A.redHi,
      paddingVertical: 8,
      paddingHorizontal: 12,
      boxShadow: `4px 4px 0px ${A.bgDeep}`,
    },
    rightCol: { position: 'absolute', left: 1400, top: 164, width: 464, height: 880, gap: 16 },
    statsPanel: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 20,
      paddingHorizontal: 24,
    },
    stat: { alignItems: 'center', gap: 8 },
    enemyPanel: { gap: 8, paddingVertical: 20, paddingHorizontal: 24 },
    between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    strike: { textDecorationLine: 'line-through' },

    logList: { gap: 8 },
    pCol: { position: 'absolute', left: 20, top: 118, width: 680, bottom: 16, gap: 10 },
    stripP: { position: 'relative', left: 0, top: 0, width: 680, height: 64 },
    pBottom: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 10 },
    pSide: { flex: 1, gap: 12, paddingTop: 4 },
    chatBox: { height: 760 },
  }),
);
