/* eslint-disable react-hooks/refs, react-hooks/purity --
 * react-native-gesture-handler 2.x'in builder API'si (Gesture.Pan().onStart(fn)) geri çağrıları
 * render sırasında alır ama YALNIZCA dokunma olaylarında (runOnJS) çağırır. React Compiler bunu
 * göremediği için içlerindeki ref okumalarını "render sırasında" sayıyor. Hareketler arası hızlı
 * olaylarda güncel değer gerektiğinden ref şart; istisna yalnızca bu dosyayla sınırlı.
 */
import { useLayoutEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { Animated, type View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';

import {
  BOARD_SIZE,
  sameCoord,
  shipSize,
  type Coord,
  type Orientation,
  type ShipType,
} from '@/game';

import {
  grabOffset,
  originFromGrab,
  shipAt,
  type PlacementAction,
  type PlacementState,
} from './model';

export type DragState = {
  readonly ship: ShipType;
  /** Geminin tutulduğu hücre (baştan itibaren). */
  readonly offset: number;
  readonly orientation: Orientation;
  /** İmlecin altındaki tahta hücresi; tahta dışındaysa null. */
  readonly cell: Coord | null;
  readonly source: 'board' | 'list';
};

type Options = {
  state: PlacementState;
  dispatch: Dispatch<PlacementAction>;
  cellSize: number;
  /** Board kökünden ızgaranın başlangıcına uzaklık (etiket + kenarlık). */
  gridOffset: number;
};

/**
 * Sürükle-bırak: tahtadaki gemiyi taşı ya da listeden tahtaya çek.
 * Tahta dışına bırakılan yerleşik gemi listeye döner.
 */
export function useBoardDrag({ state, dispatch, cellSize, gridOffset }: Options) {
  const [drag, setDragState] = useState<DragState | null>(null);
  const [ghost] = useState(() => new Animated.ValueXY());

  const rootRef = useRef<View>(null);
  const boardRef = useRef<View>(null);
  /** Olay geri çağrılarının okuduğu güncel değerler. */
  const live = useRef({
    state,
    cellSize,
    gridOffset,
    drag: null as DragState | null,
    rootOrigin: { x: 0, y: 0 },
    gridOrigin: { x: 0, y: 0 },
    suppressPressUntil: 0,
    /** İlk dokunulan nokta (tahta koordinatı). */
    pressPoint: { x: 0, y: 0 },
  });

  useLayoutEffect(() => {
    live.current.state = state;
    live.current.cellSize = cellSize;
    live.current.gridOffset = gridOffset;
  }, [state, cellSize, gridOffset]);

  const api = useMemo(() => {
    const l = live.current;

    const setDrag = (d: DragState | null) => {
      l.drag = d;
      setDragState(d);
    };

    const measure = () => {
      rootRef.current?.measureInWindow((x, y) => (l.rootOrigin = { x, y }));
      boardRef.current?.measureInWindow(
        (x, y) => (l.gridOrigin = { x: x + l.gridOffset, y: y + l.gridOffset }),
      );
    };

    const updateCell = (c: Coord | null) => {
      const d = l.drag;
      if (!d) return;
      const same = c === d.cell || (c !== null && d.cell !== null && sameCoord(c, d.cell));
      if (!same) setDrag({ ...d, cell: c });
    };

    const finish = () => {
      const d = l.drag;
      if (!d) return;
      if (d.cell) {
        dispatch({
          type: 'drop',
          ship: d.ship,
          origin: originFromGrab(d.cell, d.offset, d.orientation),
        });
      } else if (d.source === 'board') {
        dispatch({ type: 'remove', ship: d.ship });
      }
    };

    // onFinalize, sürükleme hiç başlamasa da (basıp bırakma = tıklama) çağrılır;
    // yalnızca gerçek bir sürüklemeden sonra gelen tıklamayı yut.
    const end = () => {
      if (!l.drag) return;
      setDrag(null);
      l.suppressPressUntil = Date.now() + 250;
    };

    const moveGhost = (ax: number, ay: number, d: Pick<DragState, 'offset' | 'orientation'>) => {
      const s = l.cellSize;
      const along = d.offset * s + s / 2;
      ghost.setValue({
        x: ax - l.rootOrigin.x - (d.orientation === 'horizontal' ? along : s / 2),
        y: ay - l.rootOrigin.y - (d.orientation === 'vertical' ? along : s / 2),
      });
    };

    const local = (x: number, y: number) =>
      cellFromPoint(x - l.gridOffset, y - l.gridOffset, l.cellSize);

    const boardPan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(4)
      // onStart, hareketin ETKİNLEŞTİĞİ andaki konumu verir (minDistance kadar kaymış; web'de
      // translation da 0 gelir). Hangi gemiyi tuttuğumuzu ilk dokunulan noktadan bul.
      .onBegin((e) => {
        l.pressPoint = { x: e.x, y: e.y };
      })
      .onStart(() => {
        const c = local(l.pressPoint.x, l.pressPoint.y);
        const p = c ? shipAt(l.state.fleet, c) : null;
        if (!c || !p) return;
        measure();
        dispatch({ type: 'select', ship: p.ship });
        setDrag({
          ship: p.ship,
          offset: grabOffset(p, c),
          orientation: p.orientation,
          cell: c,
          source: 'board',
        });
      })
      .onUpdate((e) => updateCell(local(e.x, e.y)))
      .onEnd(finish)
      .onFinalize(end);

    const listPans = new Map<ShipType, ReturnType<typeof Gesture.Pan>>();
    const listPan = (ship: ShipType) => {
      const cached = listPans.get(ship);
      if (cached) return cached;
      const g = Gesture.Pan()
        .runOnJS(true)
        .minDistance(6)
        .onStart((e) => {
          measure();
          const st = l.state;
          const orientation = st.fleet.find((p) => p.ship === ship)?.orientation ?? st.orientation;
          const d: DragState = {
            ship,
            offset: Math.floor(shipSize(ship) / 2),
            orientation,
            cell: null,
            source: 'list',
          };
          dispatch({ type: 'select', ship });
          setDrag(d);
          moveGhost(e.absoluteX, e.absoluteY, d);
        })
        .onUpdate((e) => {
          const d = l.drag;
          if (!d) return;
          moveGhost(e.absoluteX, e.absoluteY, d);
          updateCell(
            cellFromPoint(e.absoluteX - l.gridOrigin.x, e.absoluteY - l.gridOrigin.y, l.cellSize),
          );
        })
        .onEnd(finish)
        .onFinalize(end);
      listPans.set(ship, g);
      return g;
    };

    return {
      boardPan,
      listPan,
      measure,
      /** Hücre tıklaması sürüklemenin artığı mı? (olay işleyicide çağrılır) */
      shouldSuppressPress: () => Date.now() < l.suppressPressUntil,
    };
  }, [dispatch, ghost]);

  return { drag, ghost, rootRef, boardRef, ...api };
}

/** Izgaranın sol üstüne göre bir noktanın hücresi (dışındaysa null). */
export function cellFromPoint(x: number, y: number, cellSize: number): Coord | null {
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) return null;
  return { row, col };
}
