import { memo, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

import {
  BOARD_SIZE,
  cellIndex,
  COLUMN_LABELS,
  coordLabel,
  shipCells,
  type Coord,
  type Placement,
  type ShipType,
  type ShotResult,
} from '@/game';
import { t } from '@/i18n';
import { AppText, colors, gradients, opacity, radii, shadows, useSvgId } from '@/ui';

import { HitMarker, MissMarker, PreviewCell, Reticle, SunkFrame } from './Markers';
import { ShipShape, type ShipLook } from './ShipSprite';

export type BoardShip = { readonly placement: Placement; readonly look?: ShipLook };
export type BoardShot = { readonly at: Coord; readonly result: ShotResult };
export type BoardPreview = { readonly cells: readonly Coord[]; readonly valid: boolean };

export type BoardProps = {
  /** Hücre boyutu (px). Dokunma için en az minTouchSize önerilir. */
  cellSize: number;
  /** own: kendi filon (gemiler görünür). enemy: düşman suları (nişangah, daha soğuk deniz). */
  variant: 'own' | 'enemy';
  ships?: readonly BoardShip[];
  shots?: readonly BoardShot[];
  /** Yerleştirmede sürüklenen geminin hücreleri. */
  preview?: BoardPreview | null;
  onCellPress?: (c: Coord) => void;
  /** Uzun basma (dokunmatik): yerleştirmede döndür. */
  onCellLongPress?: (c: Coord) => void;
  onCellHover?: (c: Coord | null) => void;
  /** Altın çerçeveyle vurgulanan gemi (yerleştirmede seçili gemi). */
  highlight?: Placement | null;
  /** Klavye imleci: üzerine gelme gibi satır/sütun vurgusu + nişangah. */
  focusCell?: Coord | null;
  /** Son atış: kısa bir dalga halkasıyla gösterilir. */
  lastShot?: Coord | null;
  /** Hareketi azalt: dalga halkası hareketsiz çizilir. */
  reduceMotion?: boolean;
  /** Rakibin sırası: soluk ve tıklanamaz. */
  disabled?: boolean;
  showLabels?: boolean;
  accessibilityLabel?: string;
};

/** 10×10 tahta: etiketler (A–J, 1–10), fiyort denizi, ızgara, gemiler, işaretler. */
export function Board({
  cellSize,
  variant,
  ships = [],
  shots = [],
  preview = null,
  onCellPress,
  onCellLongPress,
  onCellHover,
  highlight = null,
  focusCell = null,
  lastShot = null,
  reduceMotion = false,
  disabled = false,
  showLabels = true,
  accessibilityLabel,
}: BoardProps) {
  const id = useSvgId('b');
  const [pointerHover, setHover] = useState<Coord | null>(null);
  const hover = pointerHover ?? focusCell;
  const { grid, gutter } = boardGeometry(cellSize, showLabels);
  const interactive = Boolean(onCellPress || onCellHover || onCellLongPress);

  const shotByCell = useMemo(() => new Map(shots.map((s) => [cellIndex(s.at), s.result])), [shots]);
  const shipByCell = useMemo(() => {
    const m = new Map<number, ShipType>();
    for (const { placement } of ships)
      for (const c of shipCells(placement)) m.set(cellIndex(c), placement.ship);
    return m;
  }, [ships]);

  const setHovered = (c: Coord | null) => {
    setHover(c);
    onCellHover?.(c);
  };

  return (
    <View
      style={styles.root}
      accessibilityRole={interactive ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
    >
      {showLabels ? (
        <View style={[styles.colLabels, { marginLeft: gutter, width: grid, height: gutter }]}>
          {COLUMN_LABELS.map((l, i) => (
            <AppText
              key={l}
              variant="caption"
              tone={hover?.col === i ? 'gold' : 'muted'}
              style={[styles.label, { width: cellSize }]}
              aria-hidden
            >
              {l}
            </AppText>
          ))}
        </View>
      ) : null}
      <View style={styles.row}>
        {showLabels ? (
          <View style={{ width: gutter, height: grid }}>
            {Array.from({ length: BOARD_SIZE }, (_, i) => (
              <View key={i} style={[styles.rowLabel, { height: cellSize }]}>
                <AppText variant="caption" tone={hover?.row === i ? 'gold' : 'muted'} aria-hidden>
                  {i + 1}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        <View
          style={[
            styles.board,
            // +2: 1 px kenarlık içeriği kırpmasın.
            { width: grid + 2, height: grid + 2, boxShadow: shadows.card },
            disabled && styles.disabled,
          ]}
        >
          <BoardLayer
            id={id}
            cellSize={cellSize}
            variant={variant}
            ships={ships}
            shots={shots}
            preview={preview}
          />

          {highlight ? (
            <Svg style={StyleSheet.absoluteFill} width={grid} height={grid} pointerEvents="none">
              <HighlightFrame placement={highlight} cellSize={cellSize} />
            </Svg>
          ) : null}

          {hover && !disabled ? (
            <Svg style={StyleSheet.absoluteFill} width={grid} height={grid} pointerEvents="none">
              <Rect
                x={0}
                y={hover.row * cellSize}
                width={grid}
                height={cellSize}
                fill="#ffffff"
                opacity={0.1}
              />
              <Rect
                x={hover.col * cellSize}
                y={0}
                width={cellSize}
                height={grid}
                fill="#ffffff"
                opacity={0.1}
              />
              {variant === 'enemy' && !shotByCell.has(cellIndex(hover)) ? (
                <Reticle x={hover.col * cellSize} y={hover.row * cellSize} s={cellSize} />
              ) : null}
            </Svg>
          ) : null}

          {lastShot ? (
            <ShotRipple
              key={`${lastShot.row}-${lastShot.col}`}
              cell={lastShot}
              cellSize={cellSize}
              still={reduceMotion}
            />
          ) : null}

          {interactive ? (
            <View style={StyleSheet.absoluteFill}>
              {Array.from({ length: BOARD_SIZE }, (_, row) => (
                <View key={row} style={styles.row}>
                  {Array.from({ length: BOARD_SIZE }, (_, col) => {
                    const c = { row, col };
                    const i = cellIndex(c);
                    return (
                      <Pressable
                        key={col}
                        style={{ width: cellSize, height: cellSize }}
                        disabled={disabled}
                        accessibilityRole="button"
                        aria-disabled={disabled}
                        accessibilityLabel={cellA11yLabel(c, shotByCell.get(i), shipByCell.get(i))}
                        onPress={() => onCellPress?.(c)}
                        onLongPress={onCellLongPress ? () => onCellLongPress(c) : undefined}
                        delayLongPress={450}
                        onHoverIn={() => setHovered(c)}
                        onHoverOut={() => setHovered(null)}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/**
 * Tahta ölçüleri. Izgara, etiket boşluğu + 1 px kenarlıktan sonra başlar:
 * sürüklemede imleç konumunu hücreye çevirmek için.
 */
export function boardGeometry(cellSize: number, showLabels = true) {
  const grid = cellSize * BOARD_SIZE;
  const gutter = showLabels ? Math.max(16, Math.round(cellSize * 0.55)) : 0;
  return { grid, gutter, gridOffset: gutter + 1, total: gutter + grid + 2 };
}

/** Izgaraya göre (x, y) px → hücre; dışındaysa null. */
export function cellFromPoint(x: number, y: number, cellSize: number): Coord | null {
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) return null;
  return { row, col };
}

/** Son atışın çevresinde genişleyip sönen halka (su sıçraması). */
function ShotRipple({
  cell,
  cellSize: s,
  still,
}: {
  cell: Coord;
  cellSize: number;
  still: boolean;
}) {
  const [progress] = useState(() => new Animated.Value(still ? 1 : 0));
  useEffect(() => {
    if (still) return;
    const anim = Animated.timing(progress, { toValue: 1, duration: 700, useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [progress, still]);
  const size = s * 1.6;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cell.col * s + s / 2 - size / 2,
        top: cell.row * s + s / 2 - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: '#ffffff',
        opacity: still ? 0.5 : progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
        transform: [
          {
            scale: still
              ? 0.7
              : progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
          },
        ],
      }}
    />
  );
}

function HighlightFrame({ placement, cellSize: s }: { placement: Placement; cellSize: number }) {
  const cells = shipCells(placement);
  const first = cells[0];
  const last = cells[cells.length - 1];
  if (!first || !last) return null;
  const pad = 2;
  return (
    <Rect
      x={first.col * s + pad}
      y={first.row * s + pad}
      width={(last.col - first.col + 1) * s - pad * 2}
      height={(last.row - first.row + 1) * s - pad * 2}
      rx={s * 0.3}
      fill="none"
      stroke={colors.gold}
      strokeWidth={2.5}
    />
  );
}

function cellA11yLabel(c: Coord, shot?: ShotResult, ship?: ShipType): string {
  const cell = coordLabel(c);
  if (shot === 'miss') return t('board.cell.miss', { cell });
  if (shot === 'sunk') return t('board.cell.sunk', { cell });
  if (shot === 'hit') return t('board.cell.hit', { cell });
  if (ship) return t('board.cell.ship', { cell, ship: t(`ships.${ship}`) });
  return cell;
}

type LayerProps = {
  id: string;
  cellSize: number;
  variant: 'own' | 'enemy';
  ships: readonly BoardShip[];
  shots: readonly BoardShot[];
  preview: BoardPreview | null;
};

/** Sabit katman: yalnızca oyun durumu değişince yeniden çizilir (üzerine gelme ayrı katmanda). */
const BoardLayer = memo(function BoardLayer({
  id,
  cellSize: s,
  variant,
  ships,
  shots,
  preview,
}: LayerProps) {
  const grid = s * BOARD_SIZE;
  const [from, to] = variant === 'own' ? gradients.seaOwn : gradients.seaEnemy;
  const sunkCells = ships.filter((b) => b.look === 'sunk').flatMap((b) => shipCells(b.placement));
  const sunkSet = new Set(sunkCells.map(cellIndex));
  const wave = s * 1.2;

  return (
    <Svg width={grid} height={grid} viewBox={`0 0 ${grid} ${grid}`}>
      <Defs>
        <LinearGradient id={`${id}-sea`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
        <Pattern id={`${id}-waves`} patternUnits="userSpaceOnUse" width={wave * 2} height={wave}>
          <Path
            d={`M0 ${wave * 0.6} Q${wave * 0.5} ${wave * 0.3} ${wave} ${wave * 0.6} T${wave * 2} ${wave * 0.6}`}
            stroke="#ffffff"
            strokeWidth={1}
            fill="none"
          />
        </Pattern>
      </Defs>

      <Rect width={grid} height={grid} fill={`url(#${id}-sea)`} />
      <Rect width={grid} height={grid} fill={`url(#${id}-waves)`} opacity={opacity.seaWaves} />

      <G stroke={colors.gridLine} strokeWidth={1} opacity={opacity.gridLine}>
        {Array.from({ length: BOARD_SIZE - 1 }, (_, i) => (i + 1) * s).map((p) => (
          <G key={p}>
            <Line x1={p} y1={0} x2={p} y2={grid} />
            <Line x1={0} y1={p} x2={grid} y2={p} />
          </G>
        ))}
      </G>

      {sunkCells.map((c) => (
        <SunkFrame key={`sf${cellIndex(c)}`} x={c.col * s} y={c.row * s} s={s} />
      ))}

      {ships.map(({ placement, look }) => (
        <ShipShape
          key={placement.ship}
          ship={placement.ship}
          orientation={placement.orientation}
          x={placement.origin.col * s}
          y={placement.origin.row * s}
          cell={s}
          look={look}
          idPrefix={id}
        />
      ))}

      {preview?.cells.map((c) => (
        <PreviewCell
          key={`pv${c.row}-${c.col}`}
          x={c.col * s}
          y={c.row * s}
          s={s}
          valid={preview.valid}
        />
      ))}

      {shots.map((shot) =>
        shot.result === 'miss' ? (
          <MissMarker key={cellIndex(shot.at)} x={shot.at.col * s} y={shot.at.row * s} s={s} />
        ) : (
          <HitMarker
            key={cellIndex(shot.at)}
            x={shot.at.col * s}
            y={shot.at.row * s}
            s={s}
            compact={sunkSet.has(cellIndex(shot.at))}
          />
        ),
      )}
    </Svg>
  );
});

const styles = StyleSheet.create({
  root: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row' },
  colLabels: { flexDirection: 'row', alignItems: 'center' },
  label: { textAlign: 'center' },
  rowLabel: { justifyContent: 'center', alignItems: 'center' },
  board: {
    borderRadius: radii.board,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  disabled: { opacity: 0.55 },
});
