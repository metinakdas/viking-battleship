/**
 * Yerleştirme ekranının saf durumu. Kurallar src/game/placement'ta; burada yalnızca ekranın
 * kendi durumu var: seçili gemi, elde tutulan geminin yönü, sıradaki gemiyi otomatik seçme.
 * React import'u yok: Vitest ile test edilir.
 */
import {
  checkShipPlacement,
  FLEET,
  inBounds,
  placeShip,
  randomFleet,
  removeShip,
  rotateShip,
  sameCoord,
  shipCells,
  type Coord,
  type Fleet,
  type Orientation,
  type Placement,
  type PlacementProblem,
  type ShipType,
} from '@/game';

export type PlacementState = {
  readonly fleet: Fleet;
  /** Seçili gemi: tıklama/hover bunu yerleştirir, R bunu döndürür. */
  readonly selected: ShipType | null;
  /** Henüz yerleşmemiş seçili geminin yönü. Yerleşmiş gemiler kendi yönünü taşır. */
  readonly orientation: Orientation;
  /** Son başarısız denemenin sebebi (kullanıcıya ipucu). */
  readonly problem: PlacementProblem | null;
};

export const initialPlacement: PlacementState = {
  fleet: [],
  selected: FLEET[0]?.ship ?? null,
  orientation: 'horizontal',
  problem: null,
};

export type PlacementAction =
  | { readonly type: 'select'; readonly ship: ShipType | null }
  /** Gemiyi origin'e koy (yerleşmemişse ekle, yerleşmişse taşı). */
  | { readonly type: 'drop'; readonly ship: ShipType; readonly origin: Coord }
  /** Verilen (yoksa seçili) gemiyi döndür. */
  | { readonly type: 'rotate'; readonly ship?: ShipType }
  | { readonly type: 'remove'; readonly ship: ShipType }
  | { readonly type: 'random'; readonly seed: number | string }
  | { readonly type: 'clear' };

export function placementReducer(state: PlacementState, action: PlacementAction): PlacementState {
  switch (action.type) {
    case 'select':
      return { ...state, selected: action.ship, problem: null };

    case 'drop': {
      const candidate = candidateFor(state, action.ship, action.origin);
      const problem = checkShipPlacement(state.fleet, candidate);
      if (problem) return { ...state, problem };
      const wasPlaced = isPlaced(state.fleet, action.ship);
      const fleet = placeShip(state.fleet, candidate) as Fleet;
      // Yeni gemi yerleşince sıradakine geç; taşınan gemi seçili kalır.
      const selected = wasPlaced ? action.ship : nextUnplaced(fleet);
      return { ...state, fleet, selected, problem: null };
    }

    case 'rotate': {
      const ship = action.ship ?? state.selected;
      if (!ship) return state;
      if (!isPlaced(state.fleet, ship)) {
        return { ...state, selected: ship, orientation: flip(state.orientation), problem: null };
      }
      const fleet = rotateShip(state.fleet, ship);
      if (!fleet) return { ...state, selected: ship, problem: 'touching' };
      return { ...state, fleet, selected: ship, problem: null };
    }

    case 'remove': {
      const fleet = removeShip(state.fleet, action.ship);
      return { ...state, fleet, selected: action.ship, problem: null };
    }

    case 'random':
      return { ...state, fleet: randomFleet(action.seed), selected: null, problem: null };

    case 'clear':
      return { ...initialPlacement, orientation: state.orientation };
  }
}

function flip(o: Orientation): Orientation {
  return o === 'horizontal' ? 'vertical' : 'horizontal';
}

export function isPlaced(fleet: Fleet, ship: ShipType): boolean {
  return fleet.some((p) => p.ship === ship);
}

export function unplacedShips(fleet: Fleet): ShipType[] {
  return FLEET.map((f) => f.ship).filter((s) => !isPlaced(fleet, s));
}

export function nextUnplaced(fleet: Fleet): ShipType | null {
  return unplacedShips(fleet)[0] ?? null;
}

export function isComplete(fleet: Fleet): boolean {
  return unplacedShips(fleet).length === 0;
}

/** Bırakılırsa oluşacak konum: yerleşmiş gemi kendi yönünü, yenisi ekranın yönünü kullanır. */
export function candidateFor(state: PlacementState, ship: ShipType, origin: Coord): Placement {
  const existing = state.fleet.find((p) => p.ship === ship);
  return { ship, origin, orientation: existing?.orientation ?? state.orientation };
}

export type DropPreview = {
  readonly placement: Placement;
  /** Tahta içinde kalan hücreler (taşan kısım çizilmez). */
  readonly cells: Coord[];
  readonly valid: boolean;
};

export function dropPreview(state: PlacementState, ship: ShipType, origin: Coord): DropPreview {
  const placement = candidateFor(state, ship, origin);
  return {
    placement,
    cells: shipCells(placement).filter(inBounds),
    valid: checkShipPlacement(state.fleet, placement) === null,
  };
}

/** Hücredeki gemi. */
export function shipAt(fleet: Fleet, cell: Coord): Placement | null {
  return fleet.find((p) => shipCells(p).some((c) => sameCoord(c, cell))) ?? null;
}

/** Sürüklemeye geminin hangi hücresinden tutulduğu (baştan itibaren). */
export function grabOffset(placement: Placement, cell: Coord): number {
  return Math.max(
    0,
    shipCells(placement).findIndex((c) => sameCoord(c, cell)),
  );
}

/** İmlecin altındaki hücre ve tutma noktasından geminin origin'i. */
export function originFromGrab(cell: Coord, offset: number, orientation: Orientation): Coord {
  return orientation === 'horizontal'
    ? { row: cell.row, col: cell.col - offset }
    : { row: cell.row - offset, col: cell.col };
}
