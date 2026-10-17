import { useEffect, useReducer, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { coordLabel, FLEET, shipCells, type Coord, type Fleet, type ShipType } from '@/game';
import {
  dropPreview,
  initialPlacement,
  isComplete,
  isPlaced,
  originFromGrab,
  placementReducer,
  shipAt,
  unplacedShips,
  useBoardDrag,
  type DropPreview,
  type PlacementAction,
  type PlacementState,
} from '@/features/placement';
import { t, upperLocale } from '@/i18n';
import { lookFrom } from '@/features/shop/catalog';
import { playSound } from '@/services/sound';
import { useWallet } from '@/store/walletStore';

import type { GridShip } from '../canvas/pixelGrid';
import { GameHeader } from '../chrome';
import { GridBoard, GridInFlow } from '../GridBoard';
import { Chip, Panel, PixelArtView, PxButton, Stage, stageLayout, Txt } from '../kit';
import { A, DIM, themed } from '../theme';

const CELL = 68; // tasarım: 680 px ızgara
const P_CELL = 58; // mobil (720 px tuval): 580 px ızgara
const GRID = { left: 120, top: 268, size: 680 };

export type PlacementScreenProps = {
  /** Üst çubuktaki mod etiketi ("TEK OYUNCU · CPU"); tıklanınca mod menüsü. */
  modeLabel: string;
  onModePress?: () => void;
  /** Üst çubuktaki "◀" — mod menüsüne dön. */
  onBack?: () => void;
  /** "RAKİP: CPU" */
  opponentName: string;
  opponentReady: boolean;
  /** Aynı cihaz: "LAGERTHA, FİLONU DİZ" gibi başlık (yoksa "KENDİ SULARIN"). */
  title?: string;
  onReady: (fleet: Fleet) => void;
};

/** Filo yerleştirme (tasarım §5.2): solda kendi sularım, sağda filo listesi ve kontroller. */
export function PlacementScreen({
  modeLabel,
  onModePress,
  onBack,
  opponentName,
  opponentReady,
  title,
  onReady,
}: PlacementScreenProps) {
  const [state, dispatch] = useReducer(placementReducer, initialPlacement);
  const [hover, setHover] = useState<Coord | null>(null);
  const { width, height } = useWindowDimensions();
  const { portrait, k } = stageLayout(width, height);
  const cell = portrait ? P_CELL : CELL;
  const { drag, ghost, rootRef, boardRef, boardPan, listPan, measure, shouldSuppressPress } =
    useBoardDrag({ state, dispatch, cellSize: cell * k, gridOffset: 0 });

  usePlacementKeys(state, dispatch);
  const { equipped } = useWallet();
  usePlaceSound(state.fleet);

  // Önizleme: sürüklerken imlecin altı; değilse seçili gemi için üzerine gelinen boş hücre.
  let preview: DropPreview | null = null;
  if (drag?.cell) {
    preview = dropPreview(
      state,
      drag.ship,
      originFromGrab(drag.cell, drag.offset, drag.orientation),
    );
  } else if (!drag && hover && state.selected && !shipAt(state.fleet, hover)) {
    preview = dropPreview(state, state.selected, hover);
  }

  const ships: GridShip[] = state.fleet
    .filter((p) => !(drag && p.ship === drag.ship))
    .map((p) => toGridShip(p.ship, p.origin, p.orientation === 'vertical', ''));
  const ghostCfg = preview
    ? ([
        preview.placement.origin.col,
        preview.placement.origin.row,
        shipCells(preview.placement).length,
        preview.placement.orientation === 'vertical' ? 1 : 0,
        preview.placement.ship,
      ] as const)
    : null;

  const placed = FLEET.length - unplacedShips(state.fleet).length;
  const complete = isComplete(state.fleet);

  const onCellPress = (c: Coord) => {
    if (shouldSuppressPress()) return;
    const p = shipAt(state.fleet, c);
    if (p) {
      dispatch(
        p.ship === state.selected
          ? { type: 'rotate', ship: p.ship }
          : { type: 'select', ship: p.ship },
      );
    } else if (state.selected) {
      dispatch({ type: 'drop', ship: state.selected, origin: c });
    }
  };
  const rotateAt = (c: Coord) => {
    const p = shipAt(state.fleet, c);
    dispatch({ type: 'rotate', ship: p?.ship });
  };

  const note = state.problem ? t(`arcade.placement.problems.${state.problem}`) : null;
  const showFloating = drag?.source === 'list' && !drag.cell;
  const dragArt = drag ? (drag.ship as keyof typeof FLOAT_ART) : null;

  const gridProps = {
    frameColor: A.cyan,
    highlight: hover,
    config: {
      C: 17,
      ships,
      ghost: ghostCfg,
      ghostInvalid: preview ? !preview.valid : false,
      look: lookFrom(equipped, true),
    },
    onCellPress,
    onCellHover: setHover,
    onCellLongPress: rotateAt,
    onCellContextMenu: rotateAt,
    cellLabel: (c: Coord) => cellA11y(state, c),
    gesture: boardPan,
    boardRef: (v: View | null) => {
      boardRef.current = v;
    },
    accessibilityLabel: t('arcade.placement.ownWaters'),
  };
  const fleetRows = FLEET.map(({ ship, size }) => (
    <GestureDetector key={ship} gesture={listPan(ship)}>
      <View style={portrait ? styles.pChipBox : null}>
        <FleetRow
          ship={ship}
          size={size}
          compact={portrait}
          placed={isPlaced(state.fleet, ship)}
          dragging={drag?.ship === ship}
          selected={state.selected === ship}
          onPress={() => dispatch({ type: 'select', ship })}
        />
      </View>
    </GestureDetector>
  ));
  const bs = portrait ? 24 : undefined;
  const controls = (
    <View style={styles.controls}>
      <PxButton
        label={t('arcade.placement.rotate')}
        variant="secondary"
        size={bs}
        style={{ flex: 1 }}
        disabled={!state.selected}
        onPress={() => dispatch({ type: 'rotate' })}
      />
      <PxButton
        label={t('arcade.placement.random')}
        variant="secondary"
        size={bs}
        style={{ flex: 1 }}
        onPress={() => dispatch({ type: 'random', seed: Date.now() })}
      />
      <PxButton
        label={t('arcade.placement.clear')}
        variant="secondary"
        size={bs}
        style={{ flex: 1 }}
        disabled={state.fleet.length === 0}
        onPress={() => dispatch({ type: 'clear' })}
      />
    </View>
  );
  const readyButton = (
    <PxButton
      disabled={!complete}
      onPress={() => onReady(state.fleet)}
      accessibilityLabel={t('arcade.placement.readyButton')}
      style={styles.ready}
    >
      <Txt font="press" size={portrait ? 24 : 28} color={A.ink}>
        {t('arcade.placement.readyButton')}
      </Txt>
    </PxButton>
  );
  const header = (
    <GameHeader
      steps={[
        { label: t('arcade.steps.placement'), state: 'active' },
        { label: t('arcade.steps.battle'), state: 'todo' },
      ]}
      onBack={onBack}
      right={<Chip label={modeLabel} onPress={onModePress} />}
    />
  );
  const os = portrait ? 28 : 32;
  const opponentLine = (
    <Txt size={os} align="right" color={A.muted} numberOfLines={1}>
      {t('arcade.placement.opponent', { name: opponentName })}
      <Txt size={os} color={opponentReady ? A.yellow : A.muted}>
        {opponentReady ? t('arcade.placement.ready') : t('arcade.placement.waiting')}
      </Txt>
    </Txt>
  );

  const floating =
    showFloating && dragArt ? (
      <Animated.View
        pointerEvents="none"
        style={[styles.floating, { transform: ghost.getTranslateTransform() }]}
      >
        <View style={drag.orientation === 'vertical' ? { transform: [{ rotate: '90deg' }] } : null}>
          <PixelArtView art={dragArt} width={FLOAT_ART[dragArt] * cell * k} height={cell * k} />
        </View>
      </Animated.View>
    ) : null;

  if (portrait) {
    // Mobil (dikey): başlık + sayaç, büyük ızgara, iki sütun filo, kontroller, hazır.
    return (
      <View ref={rootRef} style={styles.root} onLayout={measure}>
        <Stage dim={DIM.game}>
          {header}
          <View style={styles.pCol}>
            <View style={styles.between}>
              <Txt font="press" size={24} numberOfLines={1} style={{ flexShrink: 1 }}>
                {title ?? t('arcade.placement.ownWaters')}
              </Txt>
              <Txt font="press" size={24} color={A.yellow}>
                {placed + '/' + FLEET.length}
              </Txt>
            </View>
            {note ? (
              <Txt size={28} color={A.red} numberOfLines={1} accessibilityLiveRegion="polite">
                {note}
              </Txt>
            ) : title ? (
              <View style={{ height: 31 }} />
            ) : (
              opponentLine
            )}
            <GridInFlow size={P_CELL * 10} style={{ alignSelf: 'center' }} {...gridProps} />
            <View style={styles.pFleet}>{fleetRows}</View>
            <View style={{ flex: 1 }} />
            {controls}
            {readyButton}
          </View>
        </Stage>
        {floating}
      </View>
    );
  }

  return (
    <View ref={rootRef} style={styles.root} onLayout={measure}>
      <Stage dim={DIM.game}>
        {header}

        {/* Sol panel: kendi sularım */}
        <Panel style={styles.leftPanel} />
        <Txt
          font="press"
          size={24}
          style={[styles.leftTitle, title ? { width: 680 } : null]}
          numberOfLines={1}
        >
          {title ?? t('arcade.placement.ownWaters')}
        </Txt>
        {/* Aynı cihazda başlık uzun ve rakibin durumu zaten perdeyle belli: satır gizlenir. */}
        {title ? null : <View style={styles.opponent}>{opponentLine}</View>}
        <GridBoard {...GRID} labels={{ lettersTop: 228, numbersLeft: 56 }} {...gridProps} />

        {/* Sağ panel: filo */}
        <Panel style={styles.rightPanel}>
          <View style={styles.between}>
            <Txt font="press" size={28} accessibilityRole="header">
              {t('arcade.placement.fleet')}
            </Txt>
            <Txt size={34} lh={1} color={A.muted}>
              <Txt size={34} color={A.yellow}>
                {`${placed} / ${FLEET.length}`}
              </Txt>
            </Txt>
          </View>
          <View
            style={styles.segments}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={FLEET.length}
            aria-valuenow={placed}
          >
            {FLEET.map((f, i) => (
              <View key={f.ship} style={[styles.segment, i < placed ? styles.segmentOn : null]} />
            ))}
          </View>
          <View style={{ gap: 8 }}>{fleetRows}</View>
          {/* Yalnızca bir sorun varsa (çakışma, taşma) kısa uyarı. */}
          {note ? (
            <View style={styles.note}>
              <Txt size={32} color={A.red} accessibilityLiveRegion="polite">
                {note}
              </Txt>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          {controls}
          {readyButton}
        </Panel>
      </Stage>

      {/* Listeden sürüklenen gemi: tahtanın dışındayken imleçle hareket eder (ekran koordinatı). */}
      {floating}
    </View>
  );
}

const FLOAT_ART = { galleon: 5, frigate: 4, corvette: 3, brig: 3, sloop: 2 } as const;

function toGridShip(ship: ShipType, origin: Coord, vertical: boolean, st: '' | 's'): GridShip {
  return [origin.col, origin.row, FLOAT_ART[ship], vertical ? 1 : 0, st, ship];
}

function cellA11y(state: PlacementState, c: Coord): string {
  const p = shipAt(state.fleet, c);
  return p ? `${coordLabel(c)}, ${t(`ships.${p.ship}`)}` : coordLabel(c);
}

function FleetRow({
  ship,
  size,
  placed,
  dragging,
  selected,
  compact,
  onPress,
}: {
  ship: ShipType;
  size: number;
  /** Mobil: iki sütunlu küçük kart. */
  compact?: boolean;
  placed: boolean;
  dragging: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const active = dragging || (selected && !placed);
  const name = t(`ships.${ship}`).toLocaleUpperCase(upperLocale());
  const badge = dragging
    ? { label: t('arcade.placement.dragging'), solid: true }
    : placed
      ? { label: '✓', solid: false, color: A.yellow }
      : selected
        ? { label: t('arcade.placement.selected'), solid: true }
        : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      aria-selected={selected}
      accessibilityLabel={`${name}, ${t('arcade.placement.cells', { n: size })}${badge ? `, ${badge.label}` : ''}`}
      style={[
        styles.row,
        compact && styles.rowC,
        active && styles.rowActive,
        selected && placed && { borderColor: A.yellow },
      ]}
    >
      <View style={compact ? styles.rowArtC : styles.rowArt}>
        <PixelArtView art={ship} width={size * (compact ? 20 : 40)} height={compact ? 20 : 40} />
      </View>
      <Txt size={compact ? 28 : 36} lh={1} style={{ flex: 1 }} numberOfLines={1}>
        {name}
      </Txt>
      {/* Mobilde yer dar: yalnızca ✓; seçili/sürüklenen kart sarı kenarla belli. */}
      {!badge || (compact && badge.solid) ? null : badge.solid ? (
        <View style={styles.badgeSolid}>
          <Txt font="press" size={24} color={A.ink} numberOfLines={1}>
            {badge.label}
          </Txt>
        </View>
      ) : (
        <View style={[styles.badge, { borderColor: badge.color }]}>
          <Txt size={32} lh={1} color={badge.color} numberOfLines={1}>
            {badge.label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

/** Gemi tahtaya konunca, taşınınca ya da dönünce tok bir "yerleşti" sesi (ilk çizimde değil). */
function usePlaceSound(fleet: Fleet) {
  const prev = useRef<Fleet | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = fleet;
    if (before && fleet.length > 0 && fleet !== before) playSound('place');
  }, [fleet]);
}

/** Web klavyesi: R döndür, Esc bırak, Delete/Backspace seçili gemiyi kaldır. */
function usePlacementKeys(state: PlacementState, dispatch: (a: PlacementAction) => void) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') dispatch({ type: 'rotate' });
      else if (e.key === 'Escape') dispatch({ type: 'select', ship: null });
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        const ship = state.fleet.find((p) => p.ship === state.selected)?.ship;
        if (!ship) return;
        dispatch({ type: 'remove', ship });
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, dispatch]);
}

const styles = themed(() =>
  StyleSheet.create({
    root: { flex: 1 },
    leftPanel: { position: 'absolute', left: 56, top: 164, width: 768, height: 880 },
    leftTitle: { position: 'absolute', left: 120, top: 184, width: 400 },
    opponent: { position: 'absolute', left: 420, top: 184, width: 380 },
    rightPanel: {
      position: 'absolute',
      left: 872,
      top: 164,
      width: 992,
      height: 880,
      gap: 12,
      paddingVertical: 28,
      paddingHorizontal: 32,
    },
    between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    segments: { flexDirection: 'row', gap: 8 },
    segment: { flex: 1, height: 24, backgroundColor: A.slot, borderWidth: 4, borderColor: A.line },
    segmentOn: { backgroundColor: A.yellow, borderColor: A.yellowHi },
    pCol: { position: 'absolute', left: 20, top: 120, width: 680, bottom: 20, gap: 12 },
    pFleet: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pChipBox: { width: 336 },
    rowC: { height: 60, paddingHorizontal: 10, paddingVertical: 0, gap: 10 },
    rowArtC: { width: 100 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 24,
      paddingVertical: 6,
      paddingHorizontal: 20,
      borderWidth: 4,
      borderColor: A.lineDim,
      backgroundColor: A.input,
    },
    rowActive: {
      borderColor: A.yellow,
      backgroundColor: A.slot,
      boxShadow: `6px 6px 0px ${A.bgDeep}`,
    },
    rowArt: { width: 200, flexDirection: 'row', alignItems: 'center' },
    badge: { borderWidth: 4, paddingVertical: 6, paddingHorizontal: 14 },
    badgeSolid: { backgroundColor: A.yellow, paddingVertical: 8, paddingHorizontal: 14 },
    note: {
      gap: 6,
      backgroundColor: A.input,
      borderLeftWidth: 8,
      borderLeftColor: A.pink,
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    controls: { flexDirection: 'row', gap: 12 },
    ready: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 18,
      paddingHorizontal: 28,
      boxShadow: `0px 8px 0px ${A.orangeSh}`,
    },
    floating: { position: 'absolute', left: 0, top: 0 },
  }),
);
