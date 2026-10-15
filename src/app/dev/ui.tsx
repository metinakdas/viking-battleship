// Geliştirici vitrini (/dev/ui): tema, bileşenler, tahta ve gemiler. Ürün akışında bağlantısı yok.
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Board, ShipSprite, type BoardShip } from '@/features/board';
import {
  applyAction,
  createGame,
  FLEET,
  getPlayerView,
  randomFleet,
  shipCells,
  tryApplyAction,
  type Coord,
  type GameState,
  type Placement,
} from '@/game';
import { t } from '@/i18n';
import {
  AppText,
  Button,
  Card,
  colors,
  Input,
  Logo,
  Pill,
  RuneText,
  Screen,
  spacing,
  typography,
  type TypographyVariant,
} from '@/ui';

const OWN_FLEET = randomFleet('vitrin-kendi');
const ENEMY_FLEET = randomFleet('vitrin-dusman');

/** Vitrin için gerçek motor: seat 0 sensin, seat 1 her sırasını pas geçer. */
function demoGame(): GameState {
  let s = createGame({
    seed: 'vitrin',
    settings: { extraShotOnHit: true, timeoutPolicy: 'skipTurn' },
  });
  s = applyAction(s, { type: 'join', seat: 0, playerId: 'sen' });
  s = applyAction(s, { type: 'join', seat: 1, playerId: 'jarl' });
  s = applyAction(s, { type: 'startPlacement' });
  s = applyAction(s, { type: 'placeFleet', seat: 0, fleet: OWN_FLEET });
  s = applyAction(s, { type: 'placeFleet', seat: 1, fleet: ENEMY_FLEET });
  // Başlangıçta birkaç atış: bir gemi batık, bir isabet, birkaç ıska görünsün.
  const opening: Coord[] = [
    ...shipCells(ENEMY_FLEET.find((p) => p.ship === 'faering') as Placement),
    shipCells(ENEMY_FLEET.find((p) => p.ship === 'drakkar') as Placement)[1] as Coord,
  ];
  for (const at of opening) s = fireAt(s, at);
  return s;
}

function fireAt(s: GameState, at: Coord): GameState {
  const r = tryApplyAction(s, { type: 'fire', seat: 0, at });
  if (!r.ok) return s;
  let next = r.state;
  if (next.phase === 'battle' && next.turn === 1) {
    next = applyAction(next, { type: 'timeout', seat: 1 });
  }
  return next;
}

const swatches: (keyof typeof colors)[] = [
  'wallpaper',
  'auroraIce',
  'auroraTeal',
  'auroraLilac',
  'auroraAmber',
  'accent',
  'gold',
  'iron',
  'fire',
  'fireCore',
  'seaOwnFrom',
  'seaEnemyFrom',
  'hull',
  'deck',
  'sailCream',
  'sunkHull',
];

export default function UiShowcase() {
  const { width } = useWindowDimensions();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [game, setGame] = useState(demoGame);

  const enemyCell = Math.max(32, Math.min(44, Math.floor((width - 96) / 11)));
  const view = getPlayerView(game, 0);
  const enemyShips: BoardShip[] = (view.opponent.revealedFleet ?? view.opponent.sunk).map(
    (placement) => ({
      placement,
      look: view.opponent.sunk.some((p) => p.ship === placement.ship) ? 'sunk' : 'afloat',
    }),
  );
  const ownShips: BoardShip[] = OWN_FLEET.map((placement) => ({ placement }));
  const ownShots = useMemo(
    () => [
      { at: shipCells(OWN_FLEET[0] as Placement)[2] as Coord, result: 'hit' as const },
      { at: { row: 0, col: 0 }, result: 'miss' as const },
      { at: { row: 9, col: 9 }, result: 'miss' as const },
    ],
    [],
  );

  const ghost: Placement = { ship: 'snekkja', origin: { row: 3, col: 3 }, orientation: 'vertical' };
  const badGhost: Placement = {
    ship: 'snekkja',
    origin: { row: 7, col: 7 },
    orientation: 'horizontal',
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Logo />
        <View style={styles.row}>
          <Pill label="1 · Filonu Yerleştir" tone="muted" />
          <Pill label="2 · Savaş" tone="accent" solid />
        </View>
      </View>

      <View style={styles.titleBlock}>
        <AppText variant="h1">{t('uiShowcase.title')}</AppText>
        <AppText tone="muted">{t('uiShowcase.description')}</AppText>
      </View>

      <View style={styles.grid}>
        <Card
          title={t('uiShowcase.enemyBoard').toLocaleUpperCase('tr')}
          headerRight={
            <Pill
              label={view.phase === 'finished' ? 'Zafer!' : 'Sıra sende, Kaptan!'}
              tone="accent"
              dot
            />
          }
          style={styles.cellWide}
        >
          <View style={styles.boardWrap}>
            <Board
              variant="enemy"
              cellSize={enemyCell}
              ships={enemyShips}
              shots={view.opponent.incoming}
              onCellPress={(c) => setGame((g) => fireAt(g, c))}
              accessibilityLabel={t('board.enemy')}
            />
            <View style={styles.side}>
              <AppText variant="label" tone="muted">
                {t('uiShowcase.hoverHint')}
              </AppText>
              <Button label="Sıfırla" variant="secondary" onPress={() => setGame(demoGame())} />
              <Board
                variant="own"
                cellSize={22}
                ships={ownShips}
                shots={ownShots}
                accessibilityLabel={t('board.own')}
              />
            </View>
          </View>
        </Card>

        <Card title={t('uiShowcase.fleet').toLocaleUpperCase('tr')} style={styles.cell}>
          <View style={styles.stack}>
            {FLEET.map(({ ship, size }) => (
              <View key={ship} style={styles.fleetRow}>
                <View style={styles.fleetSprite}>
                  <ShipSprite ship={ship} cell={30} />
                </View>
                <AppText variant="bodyStrong" style={styles.flex}>
                  {t(`ships.${ship}`)}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {size}
                </AppText>
              </View>
            ))}
            <View style={styles.fleetRow}>
              <View style={styles.fleetSprite}>
                <ShipSprite ship="drakkar" cell={30} look="sunk" />
              </View>
              <Pill label="Batırıldı" tone="fire" dot />
            </View>
          </View>
        </Card>

        <Card title={t('uiShowcase.placement').toLocaleUpperCase('tr')} style={styles.cell}>
          <View style={styles.row}>
            <Board
              variant="own"
              cellSize={20}
              showLabels={false}
              ships={[...ownShips.slice(0, 1), { placement: ghost, look: 'ghost' }]}
              preview={{ cells: shipCells(ghost), valid: true }}
            />
            <Board
              variant="own"
              cellSize={20}
              showLabels={false}
              ships={ownShips.slice(0, 1)}
              preview={{
                cells: shipCells(badGhost).filter((c) => c.col < 10),
                valid: false,
              }}
            />
          </View>
        </Card>

        <Card title={t('uiShowcase.buttons').toLocaleUpperCase('tr')} style={styles.cell}>
          <View style={styles.stack}>
            <Button label={t('uiShowcase.primary')} size="lg" fullWidth />
            <View style={styles.row}>
              <Button label="Döndür" variant="secondary" shortcut="R" />
              <Button label={t('uiShowcase.secondary')} variant="secondary" />
              <Button label={t('uiShowcase.ghost')} variant="ghost" />
            </View>
            <View style={styles.row}>
              <Button label={t('uiShowcase.disabled')} disabled />
              <Button label="Yükleniyor" loading />
            </View>
            <View style={styles.row}>
              <Pill label="Bilgisayara Karşı" />
              <Pill label="Tur 12" tone="gold" />
              <Pill label="Misafir" tone="muted" />
              <Pill label="Hazır" tone="gold" dot />
              <Pill label="Batırıldı" tone="fire" dot />
            </View>
          </View>
        </Card>

        <Card
          title={t('uiShowcase.inputs').toLocaleUpperCase('tr')}
          highlighted
          style={styles.cell}
        >
          <View style={styles.stack}>
            <Logo layout="stacked" size="lg" />
            <Input
              label={t('uiShowcase.username')}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              error={
                username.length > 0 && username.length < 3
                  ? t('uiShowcase.usernameError')
                  : undefined
              }
            />
            <Input
              label={t('uiShowcase.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Button label="Giriş Yap" fullWidth />
          </View>
        </Card>

        <Card title={t('uiShowcase.typography').toLocaleUpperCase('tr')} style={styles.cell}>
          <View style={styles.stack}>
            {(Object.keys(typography) as TypographyVariant[]).map((v) => (
              <View key={v} style={styles.typeRow}>
                <AppText variant="caption" tone="disabled" style={styles.typeName}>
                  {v}
                </AppText>
                <AppText variant={v} style={styles.flex}>
                  {v === 'overline' ? 'KENDİ FİLON' : 'Sıra sende, Kaptan!'}
                </AppText>
              </View>
            ))}
            <RuneText text="Odin seni korusun" height={16} dotted />
          </View>
        </Card>

        <Card title={t('uiShowcase.colors').toLocaleUpperCase('tr')} style={styles.cellWide}>
          <View style={styles.row}>
            {swatches.map((name) => (
              <View key={name} style={styles.swatch}>
                <View style={[styles.swatchChip, { backgroundColor: colors[name] }]} />
                <AppText variant="caption" tone="secondary">
                  {name}
                </AppText>
                <AppText variant="caption" tone="disabled">
                  {colors[name]}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  titleBlock: { gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  cell: { flexGrow: 1, flexBasis: 340 },
  cellWide: { flexGrow: 1, flexBasis: '100%' },
  boardWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
  side: { gap: spacing.md, maxWidth: 280 },
  stack: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  fleetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fleetSprite: { width: 150 },
  typeRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  typeName: { width: 72 },
  flex: { flex: 1 },
  swatch: { width: 96, gap: spacing.xxs },
  swatchChip: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
});
