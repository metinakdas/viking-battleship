import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';

import { BOARD_SIZE, COLUMN_LABELS, type Coord } from '@/game';

import type { GridConfig } from './canvas/pixelGrid';
import { Frame, Txt } from './kit';
import { PixelGrid } from './PixelGrid';
import { A, themed } from './theme';

export type GridBoardProps = {
  /** Izgaranın sol üst köşesi ve boyutu (tasarım tuvali px). */
  left: number;
  top: number;
  size: number;
  config: GridConfig;
  /** Çift çerçeve rengi (kendi: camgöbeği, düşman: kırmızı, kapak: beyaz). */
  frameColor: string;
  /** Harf satırının üstü ve rakam sütununun sol kenarı (yoksa etiket çizilmez). */
  labels?: { lettersTop: number; numbersLeft: number };
  /** Sarıya dönen harf/rakam (nişan). */
  highlight?: Coord | null;
  /** Etkileşim: tanımlıysa her hücre erişilebilir bir düğmedir. */
  onCellPress?: (c: Coord) => void;
  onCellHover?: (c: Coord | null) => void;
  onCellLongPress?: (c: Coord) => void;
  /** Web sağ tık (yerleştirmede döndür). */
  onCellContextMenu?: (c: Coord) => void;
  cellLabel?: (c: Coord) => string;
  disabled?: boolean;
  /** Sürükle-bırak hareketi (yerleştirme). */
  gesture?: GestureType;
  /** Izgara üstünde mutlak konumlu ek katman (ör. "E5 ATEŞ!" etiketi). */
  children?: ReactNode;
  boardRef?: (v: View | null) => void;
  accessibilityLabel?: string;
};

/** Tasarımdaki ızgara bloğu: çift çerçeve + canlı piksel ızgara + A–J / 1–10 + etkileşim. */
export function GridBoard({
  left,
  top,
  size,
  config,
  frameColor,
  labels,
  highlight,
  onCellPress,
  onCellHover,
  onCellLongPress,
  onCellContextMenu,
  cellLabel,
  disabled,
  gesture,
  children,
  boardRef,
  accessibilityLabel,
}: GridBoardProps) {
  const cell = size / BOARD_SIZE;
  const interactive = Boolean(onCellPress || onCellHover || onCellLongPress);
  const overlayRef = useRef<View | null>(null);

  // Web: sağ tık → hücre (sayfa menüsü açılmaz).
  useEffect(() => {
    if (Platform.OS !== 'web' || !onCellContextMenu) return;
    const el = overlayRef.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const handler = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const col = Math.floor(((e.clientX - r.left) / r.width) * BOARD_SIZE);
      const row = Math.floor(((e.clientY - r.top) / r.height) * BOARD_SIZE);
      if (col < 0 || row < 0 || col >= BOARD_SIZE || row >= BOARD_SIZE) return;
      e.preventDefault();
      onCellContextMenu({ row, col });
    };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [onCellContextMenu]);

  const overlay = (
    <View
      ref={(v) => {
        overlayRef.current = v;
        boardRef?.(v);
      }}
      style={[styles.abs, { left, top, width: size, height: size }]}
      accessibilityLabel={accessibilityLabel}
      {...({ dataSet: { grid: '1' } } as object)}
    >
      {interactive
        ? Array.from({ length: BOARD_SIZE }, (_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({ length: BOARD_SIZE }, (_, col) => {
                const c = { row, col };
                return (
                  <Pressable
                    key={col}
                    style={{ width: cell, height: cell }}
                    disabled={disabled}
                    accessibilityRole="button"
                    aria-disabled={Boolean(disabled)}
                    accessibilityLabel={cellLabel?.(c) ?? `${COLUMN_LABELS[col]}${row + 1}`}
                    onPress={() => onCellPress?.(c)}
                    onLongPress={onCellLongPress ? () => onCellLongPress(c) : undefined}
                    delayLongPress={450}
                    onHoverIn={() => onCellHover?.(c)}
                    onHoverOut={() => onCellHover?.(null)}
                  />
                );
              })}
            </View>
          ))
        : null}
      {children}
    </View>
  );

  return (
    <>
      <Frame
        color={frameColor}
        style={[styles.abs, { left: left - 6, top: top - 6, width: size + 12, height: size + 12 }]}
      />
      <View style={[styles.abs, { left, top, width: size, height: size }]} pointerEvents="none">
        <PixelGrid {...config} size={size} />
      </View>
      {labels ? (
        <>
          <View style={[styles.abs, styles.row, { left, top: labels.lettersTop, width: size }]}>
            {COLUMN_LABELS.map((l, i) => (
              <Txt
                key={l}
                font="press"
                size={24}
                align="center"
                color={highlight?.col === i ? A.yellow : A.muted}
                style={{ width: cell }}
                aria-hidden
              >
                {l}
              </Txt>
            ))}
          </View>
          <View style={[styles.abs, { left: labels.numbersLeft, top, width: 52 }]}>
            {Array.from({ length: BOARD_SIZE }, (_, i) => (
              <Txt
                key={i}
                font="press"
                size={24}
                align="right"
                color={highlight?.row === i ? A.yellow : A.muted}
                style={{ height: cell, lineHeight: cell }}
                aria-hidden
              >
                {i + 1}
              </Txt>
            ))}
          </View>
        </>
      ) : null}
      {gesture ? <GestureDetector gesture={gesture}>{overlay}</GestureDetector> : overlay}
    </>
  );
}

/**
 * Akış (flex) yerleşiminde ızgara: harf/rakam payıyla birlikte boyutlu bir kutu. Dikey (mobil)
 * ekranlarda mutlak koordinat hesaplamadan kullanılır.
 */
export function GridInFlow({
  size,
  labels = true,
  style,
  ...rest
}: Omit<GridBoardProps, 'left' | 'top' | 'labels'> & {
  labels?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const gl = labels ? 64 : 8;
  const gt = labels ? 46 : 8;
  return (
    <View style={[{ width: size + gl + 8, height: size + gt + 8 }, style]}>
      <GridBoard
        {...rest}
        size={size}
        left={gl}
        top={gt}
        labels={labels ? { lettersTop: gt - 40, numbersLeft: gl - 62 } : undefined}
      />
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    abs: { position: 'absolute' },
    row: { flexDirection: 'row' },
  }),
);
