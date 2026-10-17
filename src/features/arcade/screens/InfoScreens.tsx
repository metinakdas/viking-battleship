import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { hudScore, type GameRecord, type ScoreEntry } from '@/features/records/score';
import { FLEET } from '@/game';
import { t, upperLocale } from '@/i18n';

import type { GridConfig } from '../canvas/pixelGrid';
import { GameHeader } from '../chrome';
import { GridBoard, GridInFlow } from '../GridBoard';
import {
  Chip,
  Frame,
  Hud,
  Panel,
  PixelArtView,
  PxButton,
  Stage,
  Txt,
  useBlink,
  useLayout,
} from '../kit';
import { A, DIM, titleShadow, themed } from '../theme';

const up = (s: string) => s.toLocaleUpperCase(upperLocale());
const ART = {
  galleon: 'galleon',
  frigate: 'frigate',
  corvette: 'corvette',
  brig: 'brig',
  sloop: 'sloop',
} as const;

/** Bilgi ekranlarının ortak çerçevesi: üst çubuk + "◀ GERİ" chip'i. */
function InfoStage({
  children,
  onBack,
  dim = DIM.game,
}: {
  children: ReactNode;
  onBack: () => void;
  dim?: number;
}) {
  const { portrait } = useLayout();
  return (
    <Stage dim={dim}>
      <GameHeader right={<Chip label={t('arcade.info.back')} onPress={onBack} />} />
      {/* Mobil: paneller alt alta, kaydırılabilir. */}
      {portrait ? (
        <ScrollView style={styles.pScroll} contentContainerStyle={styles.pScrollBody}>
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </Stage>
  );
}

function Title({ children }: { children: string }) {
  const { portrait } = useLayout();
  return (
    <Txt
      font="press"
      size={portrait ? 32 : 40}
      ls={3}
      color={A.yellow}
      shadow={titleShadow(4).textShadow}
      accessibilityRole="header"
    >
      {children}
    </Txt>
  );
}

/* ───────────── Rekor tablosu ───────────── */

const rankColors = () => [A.yellow, A.cyan, A.pink];
const ordinal = (i: number) => `${i + 1}.`;

/** Arcade "HIGH SCORES": ilk 10, oyuncunun skorları vurgulu; yeni girdi yanıp söner. */
export function ScoresScreen({
  entries,
  highlightId,
  onBack,
}: {
  entries: readonly ScoreEntry[];
  /** Son oynanan oyunun kaydı (yanıp söner). */
  highlightId?: string;
  onBack: () => void;
}) {
  const blink = useBlink(450);
  const { portrait } = useLayout();
  const card = (
    <Frame color={A.text} shadow={18} style={[styles.scoreCard, portrait && styles.scoreCardP]}>
      <Title>{t('arcade.scores.title')}</Title>
      <View style={styles.scoreHead}>
        <Txt font="press" size={24} color={A.muted} style={styles.cRank}>
          {t('arcade.scores.rank')}
        </Txt>
        <Txt font="press" size={24} color={A.muted} style={[styles.cName, portrait && { flex: 1 }]}>
          {t('arcade.scores.name')}
        </Txt>
        {portrait ? null : (
          <Txt font="press" size={24} color={A.muted} style={styles.cMode}>
            {t('arcade.scores.mode')}
          </Txt>
        )}
        <Txt font="press" size={24} color={A.muted} align="right" style={styles.cScore}>
          {t('arcade.scores.score')}
        </Txt>
      </View>
      <View style={{ gap: 14 }} accessibilityRole="list">
        {entries.map((e, i) => {
          const mine = Boolean(e.record);
          const fresh = e.record?.id === highlightId;
          const color = fresh && !blink ? A.bg : (rankColors()[i] ?? (mine ? A.text : A.textSoft));
          return (
            <View key={`${e.name}-${e.score}-${i}`} style={styles.scoreRow}>
              <Txt font="press" size={28} color={color} style={styles.cRank}>
                {ordinal(i)}
              </Txt>
              <Txt
                font="press"
                size={28}
                color={color}
                style={[styles.cName, portrait && { flex: 1 }]}
                numberOfLines={1}
              >
                {e.name}
              </Txt>
              {portrait ? null : (
                <Txt
                  size={32}
                  color={mine ? A.cyan : A.faded}
                  style={styles.cMode}
                  numberOfLines={1}
                >
                  {e.record ? modeShort(e.record) : t('arcade.scores.legend')}
                </Txt>
              )}
              <Txt font="press" size={28} color={color} align="right" style={styles.cScore}>
                {hudScore(e.score)}
              </Txt>
            </View>
          );
        })}
      </View>
      <Txt size={30} color={A.muted} align="center">
        {t('arcade.scores.hint')}
      </Txt>
    </Frame>
  );
  return (
    <InfoStage onBack={onBack} dim={DIM.cover}>
      {portrait ? card : <View style={styles.center}>{card}</View>}
    </InfoStage>
  );
}

function modeShort(r: GameRecord): string {
  const mode = t(`arcade.scores.modes.${r.mode}`);
  return `${mode} · ${r.won ? t('arcade.scores.win') : t('arcade.scores.loss')}`;
}

/* ───────────── Kaptan kartı ───────────── */

export type ProfileSummary = {
  played: number;
  won: number;
  shots: number;
  hits: number;
  best: number;
};

/** Oyuncu kartı: istatistikler + son seferler | hesap (misafir → hesaba dönüştür). */
export function ProfileScreen({
  name,
  isGuest,
  email,
  summary,
  recent,
  account,
  onBack,
}: {
  name: string;
  isGuest: boolean;
  email?: string | null;
  summary: ProfileSummary;
  recent: readonly GameRecord[];
  /** Sağ panelin alt kısmı: misafirde dönüştürme formu, hesapta çıkış. */
  account: ReactNode;
  onBack: () => void;
}) {
  const pct = summary.shots === 0 ? '%0' : `%${Math.round((summary.hits / summary.shots) * 100)}`;
  const { portrait } = useLayout();
  return (
    <InfoStage onBack={onBack}>
      <Panel style={portrait ? styles.panelP : styles.profileLeft}>
        <View style={styles.idRow}>
          <Frame color={A.cyan} shadow={8} style={styles.badge}>
            <PixelArtView art="emblem" width={portrait ? 80 : 128} height={portrait ? 70 : 112} />
          </Frame>
          <View style={{ flex: 1, gap: 12 }}>
            <Txt font="press" size={24} color={A.muted}>
              {t('arcade.profile.kicker')}
            </Txt>
            <Txt
              font="press"
              size={portrait ? 28 : 40}
              color={A.yellow}
              shadow={titleShadow(4).textShadow}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {up(name)}
            </Txt>
            <Txt size={portrait ? 26 : 32} color={isGuest ? A.pink : A.cyan} numberOfLines={2}>
              {isGuest
                ? t('arcade.profile.guest')
                : t('arcade.profile.account', { email: email ?? '' })}
            </Txt>
          </View>
        </View>

        <View style={[styles.statGrid, portrait && styles.statGridP]}>
          <BigStat
            value={String(summary.played)}
            label={t('arcade.profile.played')}
            color={A.text}
          />
          <BigStat value={String(summary.won)} label={t('arcade.profile.won')} color={A.yellow} />
          <BigStat value={pct} label={t('arcade.profile.accuracy')} color={A.red} />
          <BigStat
            size={28}
            value={hudScore(summary.best)}
            label={t('arcade.profile.best')}
            color={A.cyan}
          />
        </View>

        <Txt font="press" size={24} accessibilityRole="header">
          {t('arcade.profile.recent')}
        </Txt>
        <View style={{ gap: 10 }}>
          {recent.length === 0 ? (
            <Txt size={32} color={A.muted}>
              {t('arcade.profile.noGames')}
            </Txt>
          ) : (
            recent.map((r) => (
              <View key={r.id} style={styles.recentRow}>
                <Txt
                  size={32}
                  color={r.won ? A.yellow : A.red}
                  style={{ width: portrait ? 120 : 150 }}
                >
                  {r.won ? t('arcade.scores.win') : t('arcade.scores.loss')}
                </Txt>
                <Txt size={32} color={A.text} style={{ flex: 1 }} numberOfLines={1}>
                  {t('arcade.profile.versus', { name: up(r.opponentName) })}
                  {portrait ? null : (
                    <Txt
                      size={32}
                      color={A.faded}
                    >{` · ${t(`arcade.scores.modes.${r.mode}`)} · T${r.turns}`}</Txt>
                  )}
                </Txt>
                <Txt font="press" size={24} color={A.textSoft}>
                  {hudScore(r.score)}
                </Txt>
              </View>
            ))
          )}
        </View>
      </Panel>

      <Panel style={portrait ? styles.panelP : styles.profileRight}>{account}</Panel>
    </InfoStage>
  );
}

function BigStat({
  value,
  label,
  color,
  size = 40,
}: {
  value: string;
  label: string;
  color: string;
  size?: number;
}) {
  const { portrait } = useLayout();
  return (
    <View style={[styles.bigStat, portrait && styles.bigStatP]}>
      <Txt
        font="press"
        size={size}
        lh={1.25}
        color={color}
        shadow={`4px 4px 0px ${A.bgDeep}`}
        numberOfLines={1}
      >
        {value}
      </Txt>
      <Txt size={30} lh={1} color={A.muted}>
        {label}
      </Txt>
    </View>
  );
}

/* ───────────── Nasıl oynanır ───────────── */

/** Tasarımdaki işaretlerin canlı örneği: iskele/vurulan/batan gemi, ıska, nişangâh. */
const LEGEND: GridConfig = {
  C: 16,
  ships: [
    [0, 1, 5, 0, '', 'galleon'],
    [7, 3, 3, 1, 's', 'brig'],
    [1, 7, 2, 0, '', 'sloop'],
  ],
  hit: [
    [2, 1],
    [7, 3],
    [7, 4],
    [7, 5],
  ],
  miss: [
    [3, 4],
    [5, 8],
    [1, 5],
  ],
  aim: [4, 6],
};

const STEPS = ['place', 'fire', 'sink'] as const;

export function HowToScreen({ onBack, onPlay }: { onBack: () => void; onPlay?: () => void }) {
  const { portrait } = useLayout();
  return (
    <InfoStage onBack={onBack}>
      <Panel style={portrait ? styles.panelP : styles.howLeft}>
        <Title>{t('arcade.how.title')}</Title>
        {STEPS.map((k, i) => (
          <View key={k} style={styles.step}>
            <View style={styles.stepNum}>
              <Txt font="press" size={28} color={A.ink}>
                {String(i + 1)}
              </Txt>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt font="press" size={24} color={A.yellow}>
                {t(`arcade.how.${k}.title`)}
              </Txt>
              <Txt size={32} color={A.textSoft}>
                {t(`arcade.how.${k}.text`)}
              </Txt>
            </View>
          </View>
        ))}
        <Txt font="press" size={24} accessibilityRole="header">
          {t('arcade.how.fleet')}
        </Txt>
        <View style={{ gap: 10 }}>
          {FLEET.map(({ ship, size }) => (
            <View key={ship} style={styles.fleetRow}>
              <View style={styles.fleetArt}>
                <PixelArtView art={ART[ship]} width={size * 30} height={30} />
              </View>
              <Txt size={32} color={A.text}>
                {`${up(t(`ships.${ship}`))} · ${t('arcade.how.cells', { n: size })}`}
              </Txt>
            </View>
          ))}
        </View>
      </Panel>

      <Panel style={portrait ? styles.panelP : styles.howRight}>
        <Txt font="press" size={24} accessibilityRole="header">
          {t('arcade.how.legend')}
        </Txt>
        {portrait ? (
          <GridInFlow
            size={400}
            labels={false}
            frameColor={A.red}
            config={LEGEND}
            style={{ alignSelf: 'center' }}
            accessibilityLabel={t('arcade.how.legend')}
          />
        ) : null}
        <View style={portrait ? styles.legendListP : styles.legendList}>
          {(['ship', 'hit', 'sunk', 'miss', 'aim'] as const).map((k) => (
            <Txt key={k} size={30} color={A.textSoft}>
              <Txt size={30} color={legendColors()[k]}>
                {'■ '}
              </Txt>
              {t(`arcade.how.marks.${k}`)}
            </Txt>
          ))}
        </View>
        <View style={portrait ? { gap: 12 } : styles.keys}>
          <Txt font="press" size={24} accessibilityRole="header">
            {t('arcade.how.controls')}
          </Txt>
          {(['aim', 'fire', 'rotate', 'drag'] as const).map((k) => (
            <View key={k} style={styles.keyRow}>
              <View style={styles.keyCap}>
                <Txt size={30} lh={1} color={A.yellow}>
                  {t(`arcade.how.keys.${k}.key`)}
                </Txt>
              </View>
              <Txt size={30} color={A.textSoft} style={{ flex: 1 }}>
                {t(`arcade.how.keys.${k}.text`)}
              </Txt>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        {onPlay ? <PxButton label={t('arcade.how.play')} onPress={onPlay} /> : null}
      </Panel>
      {/* Izgara tasarım tuvali koordinatında: panelin kardeşi olmalı. */}
      {portrait ? null : (
        <GridBoard
          left={1112}
          top={270}
          size={400}
          frameColor={A.red}
          config={LEGEND}
          accessibilityLabel={t('arcade.how.legend')}
        />
      )}
    </InfoStage>
  );
}

const legendColors = () =>
  ({
    ship: '#c08a4a',
    hit: A.red,
    sunk: A.pink,
    miss: A.periwinkle,
    aim: A.yellow,
  }) as const;

/* ───────────── 404 ───────────── */

export function NotFoundScreen({ onHome }: { onHome: () => void }) {
  const blink = useBlink(500);
  const { portrait } = useLayout();
  return (
    <Stage dim={DIM.cover}>
      <Hud label="1UP" value="000000" style={[styles.hud, portrait && { left: 24, top: 40 }]} />
      <View style={[styles.center, portrait && { top: 0 }]}>
        <Frame color={A.text} shadow={18} style={[styles.lostCard, portrait && styles.lostCardP]}>
          <PixelArtView art="sloop" width={240} height={120} />
          <Txt
            font="press"
            size={portrait ? 72 : 96}
            color={A.red}
            shadow={titleShadow(6).textShadow}
            accessibilityRole="header"
          >
            404
          </Txt>
          <Title>{t('arcade.lost.title')}</Title>
          <Txt size={34} align="center" color={A.textSoft}>
            {t('arcade.lost.text')}
          </Txt>
          <PxButton
            label={t('arcade.lost.home')}
            onPress={onHome}
            style={{ alignSelf: 'stretch' }}
          />
          <Txt font="press" size={24} color={blink ? A.yellow : 'transparent'} aria-hidden>
            GAME OVER
          </Txt>
        </Frame>
      </View>
    </Stage>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    pScroll: { position: 'absolute', left: 20, top: 118, width: 680, bottom: 0 },
    pScrollBody: { gap: 14, paddingBottom: 20 },
    panelP: { padding: 24, gap: 18 },
    scoreCardP: { width: 680, padding: 24, gap: 18 },
    statGridP: { flexWrap: 'wrap' },
    bigStatP: { flexBasis: '45%', flexGrow: 1 },
    legendListP: { gap: 8 },
    lostCardP: { width: 640, padding: 36, gap: 20 },
    center: {
      ...StyleSheet.absoluteFill,
      top: 132,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hud: { position: 'absolute', left: 96, top: 48 },
    scoreCard: {
      width: 1100,
      padding: 48,
      gap: 28,
      alignItems: 'stretch',
      backgroundColor: A.panel,
    },
    scoreHead: {
      flexDirection: 'row',
      paddingBottom: 12,
      borderBottomWidth: 4,
      borderColor: A.lineDim,
    },
    scoreRow: { flexDirection: 'row', alignItems: 'center' },
    cRank: { width: 110 },
    cName: { width: 380 },
    cMode: { flex: 1 },
    cScore: { width: 230 },
    profileLeft: {
      position: 'absolute',
      left: 56,
      top: 164,
      width: 1088,
      height: 880,
      padding: 48,
      gap: 32,
    },
    profileRight: {
      position: 'absolute',
      left: 1168,
      top: 164,
      width: 696,
      height: 880,
      padding: 48,
      gap: 24,
    },
    idRow: { flexDirection: 'row', alignItems: 'center', gap: 40 },
    badge: { padding: 20, backgroundColor: A.input },
    statGrid: { flexDirection: 'row', gap: 16 },
    bigStat: {
      flex: 1,
      alignItems: 'center',
      gap: 12,
      paddingVertical: 24,
      borderWidth: 4,
      borderColor: A.lineDim,
      backgroundColor: A.input,
    },
    recentRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    howLeft: {
      position: 'absolute',
      left: 56,
      top: 164,
      width: 984,
      height: 880,
      padding: 48,
      gap: 26,
    },
    howRight: {
      position: 'absolute',
      left: 1064,
      top: 164,
      width: 800,
      height: 880,
      padding: 48,
      gap: 16,
    },
    step: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
    stepNum: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: A.yellow,
      borderWidth: 4,
      borderColor: A.yellowHi,
      boxShadow: `0px 4px 0px ${A.orangeSh}`,
    },
    fleetRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
    fleetArt: { width: 170, alignItems: 'flex-start' },
    legendList: { position: 'absolute', left: 500, top: 106, width: 240, gap: 10 },
    keys: { marginTop: 436, gap: 12 },
    keyRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    keyCap: {
      minWidth: 190,
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 4,
      borderColor: A.line,
      backgroundColor: A.input,
      boxShadow: `0px 4px 0px ${A.bgDeep}`,
    },
    lostCard: {
      width: 760,
      padding: 48,
      gap: 24,
      alignItems: 'center',
      backgroundColor: A.panel,
    },
  }),
);
