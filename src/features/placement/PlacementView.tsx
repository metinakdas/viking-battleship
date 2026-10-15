import { useEffect, useReducer, useState } from 'react';
import { Animated, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { Board, boardGeometry, ShipSprite, type BoardShip } from '@/features/board';
import { AppHeader } from '@/features/common/AppHeader';
import { PhaseSteps } from '@/features/common/PhaseSteps';
import { FLEET, type Coord, type Fleet } from '@/game';
import { t } from '@/i18n';
import { AppText, Button, Card, Pill, ProgressBar, Screen, spacing } from '@/ui';

import { FleetList } from './FleetList';
import {
  dropPreview,
  initialPlacement,
  isComplete,
  originFromGrab,
  placementReducer,
  shipAt,
  unplacedShips,
  type DropPreview,
} from './model';
import { useBoardDrag } from './useBoardDrag';

export type PlacementViewProps = {
  /** Üst çubuktaki mod etiketi, ör. "Bilgisayara Karşı · Zor". */
  modeLabel: string;
  /** Aynı cihaz modunda "Ragnar, filonu yerleştir" gibi başlık. */
  heading?: string;
  onReady: (fleet: Fleet) => void;
};

const SIDE_WIDTH = 360;

/**
 * Filo yerleştirme: solda büyük tahta, sağda filo listesi ve kontroller.
 * Gemiyi seç → tahtaya tıkla; ya da listeden/tahtadan sürükle. R döndürür, uzun basma da.
 */
export function PlacementView({ modeLabel, heading, onReady }: PlacementViewProps) {
  const [state, dispatch] = useReducer(placementReducer, initialPlacement);
  const [hover, setHover] = useState<Coord | null>(null);
  const { width, height } = useWindowDimensions();
  const wide = width >= 960;
  const cell = cellSizeFor(width, height, wide);
  const geo = boardGeometry(cell);
  const { drag, ghost, rootRef, boardRef, boardPan, listPan, measure, shouldSuppressPress } =
    useBoardDrag({ state, dispatch, cellSize: cell, gridOffset: geo.gridOffset });

  useKeyboardShortcuts(state, dispatch);

  const onCellPress = (c: Coord) => {
    if (shouldSuppressPress()) return;
    const p = shipAt(state.fleet, c);
    if (p) {
      // Seçili gemiye tekrar tıklamak onu döndürür.
      dispatch(
        p.ship === state.selected
          ? { type: 'rotate', ship: p.ship }
          : { type: 'select', ship: p.ship },
      );
    } else if (state.selected) {
      dispatch({ type: 'drop', ship: state.selected, origin: c });
    }
  };

  const onCellLongPress = (c: Coord) => {
    const p = shipAt(state.fleet, c);
    if (p) dispatch({ type: 'rotate', ship: p.ship });
  };

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

  const ships: BoardShip[] = [
    ...state.fleet
      .filter((p) => !(drag && p.ship === drag.ship))
      .map((placement) => ({ placement })),
    ...(preview ? [{ placement: preview.placement, look: 'ghost' as const }] : []),
  ];
  const highlight =
    !drag && state.selected ? (state.fleet.find((p) => p.ship === state.selected) ?? null) : null;

  const placed = FLEET.length - unplacedShips(state.fleet).length;
  const progress = t('placement.progress', { placed, total: FLEET.length });
  const complete = isComplete(state.fleet);
  const showGhost = drag?.source === 'list' && !drag.cell;

  return (
    <View ref={rootRef} style={styles.root} onLayout={measure}>
      <Screen scroll contentStyle={styles.content}>
        <AppHeader center={<PhaseSteps active={0} />} right={<Pill label={modeLabel} />} />
        {heading ? <AppText variant="h2">{heading}</AppText> : null}

        <View style={[styles.main, wide ? styles.mainWide : styles.mainNarrow]}>
          <View style={styles.boardColumn}>
            <GestureDetector gesture={boardPan}>
              <View ref={boardRef} onLayout={measure} style={styles.boardWrap}>
                <Board
                  variant="own"
                  cellSize={cell}
                  ships={ships}
                  preview={preview ? { cells: preview.cells, valid: preview.valid } : null}
                  highlight={highlight}
                  onCellPress={onCellPress}
                  onCellLongPress={onCellLongPress}
                  onCellHover={setHover}
                  accessibilityLabel={t('board.own')}
                />
              </View>
            </GestureDetector>
            <AppText
              variant="label"
              tone={state.problem ? 'fire' : 'muted'}
              accessibilityLiveRegion="polite"
              role={state.problem ? 'alert' : undefined}
              style={{ maxWidth: geo.total }}
            >
              {state.problem
                ? t(`placement.problems.${state.problem}`)
                : complete
                  ? t('placement.hintDone')
                  : t('placement.hint')}
            </AppText>
          </View>

          <Card
            title={t('placement.fleet').toLocaleUpperCase('tr')}
            headerRight={
              <AppText variant="label" tone="secondary">
                {progress}
              </AppText>
            }
            style={wide ? styles.sideWide : styles.sideNarrow}
          >
            <View style={styles.sideBody}>
              <ProgressBar value={placed / FLEET.length} label={progress} />
              <FleetList
                fleet={state.fleet}
                selected={state.selected}
                onSelect={(ship) => dispatch({ type: 'select', ship })}
                dragGesture={listPan}
              />
              <View style={styles.controls}>
                <Button
                  label={t('placement.rotate')}
                  variant="secondary"
                  shortcut="R"
                  disabled={!state.selected}
                  onPress={() => dispatch({ type: 'rotate' })}
                />
                <Button
                  label={t('placement.random')}
                  variant="secondary"
                  onPress={() => dispatch({ type: 'random', seed: Date.now() })}
                />
                <Button
                  label={t('placement.clear')}
                  variant="ghost"
                  disabled={state.fleet.length === 0}
                  onPress={() => dispatch({ type: 'clear' })}
                />
              </View>
              <Button
                label={t('placement.ready')}
                size="lg"
                fullWidth
                disabled={!complete}
                onPress={() => onReady(state.fleet)}
              />
            </View>
          </Card>
        </View>
      </Screen>

      {showGhost && drag ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.ghost, { transform: ghost.getTranslateTransform() }]}
        >
          <ShipSprite ship={drag.ship} cell={cell} orientation={drag.orientation} look="ghost" />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Web klavyesi: R döndür, Esc bırak, Delete/Backspace seçili gemiyi kaldır. */
function useKeyboardShortcuts(
  state: { selected: string | null; fleet: Fleet },
  dispatch: (a: Parameters<typeof placementReducer>[1]) => void,
) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') {
        dispatch({ type: 'rotate' });
      } else if (e.key === 'Escape') {
        dispatch({ type: 'select', ship: null });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const ship = state.fleet.find((p) => p.ship === state.selected)?.ship;
        if (!ship) return;
        dispatch({ type: 'remove', ship });
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, dispatch]);
}

/** Hücre boyutu: geniş ekranda tahta + yan panel sığsın; dar ekranda tam genişlik. En az 32 px dokunma. */
function cellSizeFor(width: number, height: number, wide: boolean): number {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(v)));
  if (wide) {
    const avail = Math.min(width - 32 - SIDE_WIDTH - spacing.xl, height - 170);
    return clamp((avail - 2) / 10.55, 32, 56);
  }
  return clamp((width - 32 - 2) / 10.55, 28, 48);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: spacing.lg, maxWidth: 1280, width: '100%', alignSelf: 'center' },
  main: { gap: spacing.xl },
  mainWide: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  mainNarrow: { flexDirection: 'column', alignItems: 'center' },
  boardColumn: { gap: spacing.md },
  boardWrap: { alignSelf: 'flex-start' },
  sideWide: { width: SIDE_WIDTH },
  sideNarrow: { alignSelf: 'stretch' },
  sideBody: { gap: spacing.md },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ghost: { position: 'absolute', left: 0, top: 0 },
});
