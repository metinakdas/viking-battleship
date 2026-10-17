/**
 * Oyun motorunun tipleri. Bu klasör saf TypeScript'tir: React/React Native/Expo import'u YOK.
 * Her şey düz JSON olarak serileştirilebilir (sunucu aynı motoru çalıştıracak).
 */

/** 0 tabanlı. row: 0 → "1", col: 0 → "A". Etiket: sütun harfi + satır numarası, ör. "E5". */
export type Coord = { readonly row: number; readonly col: number };

export type Orientation = 'horizontal' | 'vertical';

export type ShipType = 'galleon' | 'frigate' | 'corvette' | 'brig' | 'sloop';

/** Bir geminin tahtadaki yeri. origin: sol üst (yatayda en sol, dikeyde en üst) hücre. */
export type Placement = {
  readonly ship: ShipType;
  readonly origin: Coord;
  readonly orientation: Orientation;
};

/** Filo: her gemi türünden tam olarak bir tane. */
export type Fleet = readonly Placement[];

/** Oyundaki iki koltuk. Motor oyuncu kimliğiyle değil koltukla çalışır. */
export type Seat = 0 | 1;

export type Phase = 'lobby' | 'placement' | 'battle' | 'finished';

export type ShotResult = 'miss' | 'hit' | 'sunk';

export type TimeoutPolicy = 'randomShot' | 'skipTurn';

export type GameSettings = {
  /** İsabette aynı oyuncu tekrar ateş eder. */
  readonly extraShotOnHit: boolean;
  /** Tur süresi (sn). 0 = süresiz. Sayaç taşıma katmanındadır; motor yalnızca `timeout` aksiyonunu işler. */
  readonly turnSeconds: number;
  readonly timeoutPolicy: TimeoutPolicy;
};

export type FinishReason = 'allSunk' | 'resign' | 'disconnect';

export type ShotRecord = {
  /** Ateş eden koltuk. Atış rakibin tahtasına düşer. */
  readonly by: Seat;
  readonly at: Coord;
  readonly result: ShotResult;
  /** Yalnızca result === 'sunk' iken: batan gemi. */
  readonly sunk?: Placement;
  /** Süre dolduğu için motorun attığı rastgele atış. */
  readonly auto?: boolean;
  readonly turn: number;
};

export type SeatState = {
  readonly playerId: string | null;
  /** Yerleştirme tamamlandı (placeFleet kabul edildi). */
  readonly ready: boolean;
  readonly fleet: Fleet | null;
};

export type GameState = {
  readonly phase: Phase;
  readonly settings: GameSettings;
  readonly seats: readonly [SeatState, SeatState];
  /** Savaşta sırası gelen koltuk. */
  readonly turn: Seat;
  /** 1'den başlar; sıra her el değiştiğinde artar. */
  readonly turnNumber: number;
  /** Bu oyunda ilk ateş eden. Rövanşta diğer koltuğa geçer. */
  readonly firstSeat: Seat;
  readonly shots: readonly ShotRecord[];
  readonly winner: Seat | null;
  readonly finishReason: FinishReason | null;
  /** Deterministik rastgelelik (mulberry32 durumu). */
  readonly rngState: number;
  /** Her başarılı aksiyonda artar; istemci/sunucu senkronu için. */
  readonly version: number;
};

export type GameAction =
  | { readonly type: 'join'; readonly seat: Seat; readonly playerId: string }
  | { readonly type: 'leave'; readonly seat: Seat }
  | { readonly type: 'startPlacement' }
  | { readonly type: 'updateSettings'; readonly settings: Partial<GameSettings> }
  | { readonly type: 'placeFleet'; readonly seat: Seat; readonly fleet: Fleet }
  | { readonly type: 'unready'; readonly seat: Seat }
  | { readonly type: 'fire'; readonly seat: Seat; readonly at: Coord }
  | { readonly type: 'timeout'; readonly seat: Seat }
  | { readonly type: 'forfeit'; readonly seat: Seat; readonly reason: 'resign' | 'disconnect' }
  | { readonly type: 'rematch' };

export type GameErrorCode =
  | 'wrong_phase'
  | 'invalid_seat'
  | 'seat_taken'
  | 'seats_not_full'
  | 'invalid_fleet'
  | 'already_ready'
  | 'not_your_turn'
  | 'out_of_bounds'
  | 'already_fired'
  | 'invalid_settings';

/** Bir oyuncuya gönderilen görünüm. Rakibin batmamış gemilerinin yeri ASLA burada olmaz. */
export type PlayerView = {
  readonly phase: Phase;
  readonly settings: GameSettings;
  readonly mySeat: Seat;
  readonly turn: Seat;
  readonly isMyTurn: boolean;
  readonly turnNumber: number;
  readonly version: number;
  readonly me: {
    readonly playerId: string | null;
    readonly ready: boolean;
    readonly fleet: Fleet | null;
    /** Rakibin benim tahtama attıkları. */
    readonly incoming: readonly ShotRecord[];
    readonly sunk: readonly ShipType[];
  };
  readonly opponent: {
    readonly playerId: string | null;
    readonly ready: boolean;
    /** Benim rakibin tahtasına attıklarım. */
    readonly incoming: readonly ShotRecord[];
    /** Batırdığım rakip gemileri (konumlarıyla). */
    readonly sunk: readonly Placement[];
    /** Yalnızca oyun bittiğinde dolu: rakibin tüm filosu. */
    readonly revealedFleet: Fleet | null;
  };
  readonly winner: Seat | null;
  readonly finishReason: FinishReason | null;
};
