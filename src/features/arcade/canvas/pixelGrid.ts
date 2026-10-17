/**
 * Piksel ızgara: tasarım dosyasındaki (amiral-batti.html) ızgara canvas betiğinin birebir aktarımı.
 * Mantık ve sayılar değiştirilmedi. Eklenenler: G her karede getConfig()'ten okunur (canlı oyun
 * durumu), geçersiz yerleştirme önizlemesi kırmızı (rehber §4), hareketi azalt kipinde tek kare.
 * Yalnızca web'de (gerçek <canvas>) çağrılır.
 */
import { isDay } from '../theme';

type Ctx = CanvasRenderingContext2D;

/**
 * [koyu kare, açık kare, parlak köpük, köpük, ızgara çizgisi, ıska karesi (durgun su),
 *  isabet karesi, ıska halkası]
 */
const SEA_NIGHT = [
  '#16206a',
  '#192574',
  '#7f98ff',
  '#3446a8',
  '#6f7fe0',
  '#0c1244',
  '#4a0f1e',
  '#dfe9ff',
] as const;
const SEA_DAY = [
  '#1f86c8',
  '#238fd0',
  '#bfe6fb',
  '#5eb2e3',
  '#bfe6ff',
  '#14598f',
  '#7a1626',
  '#ffffff',
] as const;

export type ShipKind = 'galleon' | 'frigate' | 'corvette' | 'brig' | 'sloop';

/** [sütun, satır, uzunluk, dikey(0|1), durum(''|'s' = batık), tip (yoksa uzunluktan)] */
export type GridShip = readonly [number, number, number, 0 | 1, '' | 's', ShipKind?];
export type GridCell = readonly [number, number];

/** Özelleştirme: gemi boyası (yalnız bu ızgaradaki gemiler). */
export type ShipSkin = {
  outline: string;
  side: string;
  deck: string;
  deck2: string;
  castle: string;
  stripe: string;
  sail: string;
  sailShade: string;
  flag: string;
};
/** Özelleştirme: isabet ateşi ve patlama renkleri. */
export type FlameLook = {
  /** dış hale, sıcak orta, beyaz çekirdek */
  glow: string;
  hot: string;
  core: string;
  /** kıvılcım/alev pikselleri (4 ton) */
  sparks: readonly [string, string, string, string];
  /** isabet karesinin iç çerçevesi ve parıltısı */
  border: string;
  shimmer: string;
};
/** Özelleştirme: gülle gövdesi, parlaklık, iz. */
export type BallLook = { body: string; shine: string; trail: string };
/** Özelleştirme: harita (deniz) — gece/gündüz için 8 renk (bkz. SEA_NIGHT). */
export type Sea8 = readonly [string, string, string, string, string, string, string, string];
export type SeaLook = { night: Sea8; day: Sea8 };
export type GridLook = { ship?: ShipSkin; flame?: FlameLook; ball?: BallLook; sea?: SeaLook };

export type GridConfig = {
  /** Kozmetik görünüm (market). Yoksa varsayılan. */
  readonly look?: GridLook;
  /** Mantıksal hücre (px). Görüntüdeki hücre = C × 4. */
  readonly C: number;
  readonly ships?: readonly GridShip[];
  readonly hit?: readonly GridCell[];
  readonly miss?: readonly GridCell[];
  readonly aim?: GridCell | null;
  readonly tint?: GridCell | null;
  readonly last?: GridCell | null;
  /** [sütun, satır, uzunluk, dikey, tip] */
  readonly ghost?: readonly [number, number, number, 0 | 1, ShipKind?] | null;
  readonly ghostInvalid?: boolean;
};

export type PixelGridController = { stop(): void; redraw(): void };

export function startPixelGrid(
  cv: HTMLCanvasElement,
  getConfig: () => GridConfig,
  still: boolean,
): PixelGridController {
  const C = getConfig().C,
    N = 10,
    W = N * C,
    S = Math.sin,
    x = cv.getContext('2d') as Ctx;
  cv.width = W;
  cv.height = W;
  const P = (a: number, b: number, w: number, h: number, col: string) => {
    x.fillStyle = col;
    x.fillRect(a, b, w, h);
  };
  // Geçerli kozmetik görünüm (her karede config'ten).
  let look: GridLook = {};
  const FL = (): FlameLook => look.flame ?? DEFAULT_FLAME;
  const BL = (): BallLook => look.ball ?? DEFAULT_BALL;
  /**
   * Tepeden görünüş gemi; her tipin kendi gövdesi, boyası, direk sayısı ve yelken düzeni var
   * (SHIP_STYLE). Batık: kömürleşmiş gövde, kırık direkler, gövdeyi yalayan dalgalar.
   */
  function ship(
    c: number,
    r: number,
    n: number,
    v: 0 | 1,
    st: string,
    t: number,
    kind?: ShipKind,
    dx?: number,
    dy?: number,
    al?: number,
  ) {
    const K = SHIP_STYLE[kind ?? defaultKind(n)],
      X0 = c * C + (dx || 0),
      Y0 = r * C + (dy || 0),
      L = n * C,
      m = Math.max(1, Math.round(C * K.margin)),
      sunk = st === 's',
      mid = C >> 1,
      a1 = al || 1;
    const p = (a: number, b: number, w: number, h: number, col: string) =>
      v ? P(X0 + b, Y0 + a, h, w, col) : P(X0 + a, Y0 + b, w, h, col);
    const skin = look.ship;
    const pal: Palette = sunk ? SUNK : (skin ?? K);
    const sail = skin?.sail ?? '#efe6c8',
      sailShade = skin?.sailShade ?? '#b9ad8c';
    x.globalAlpha = a1;
    // Gövde: kıç (a=0) küt, pruva (a=L) sivri. Her sütun: dış çizgi, borda kuşağı, güverte.
    const bs = L - C * K.taper;
    const castle = Math.round(L * K.castleLen);
    for (let a = 1; a < L - 1; a++) {
      let i = m;
      if (a > bs) {
        const k = (a - bs) / (C * K.taper);
        i = m + Math.round(k * k * (mid - m));
      }
      if (a < 2) i = m + 1;
      const w = C - 2 * i;
      if (w < 1) continue;
      p(a, i, 1, w, pal.outline);
      if (w > 2) p(a, i + 1, 1, w - 2, pal.side);
      if (w > 4) {
        p(a, i + 2, 1, w - 4, a < castle ? pal.castle : pal.deck);
        // Tahta kaplama: boyuna derzler + aralıklı enine ekler.
        for (let b = i + 3; b < i + w - 2; b += 3) p(a, b, 1, 1, pal.deck2);
        if (a % Math.max(4, Math.round(C * 0.7)) === 0) p(a, i + 2, 1, w - 4, pal.deck2);
        if (a === castle) p(a, i + 1, 1, w - 2, pal.outline);
      }
      const stripe = skin ? skin.stripe : K.stripe;
      if (!sunk && stripe && w > 4) {
        p(a, i + 1, 1, 1, stripe);
        p(a, i + w - 2, 1, 1, stripe);
      }
    }
    if (!sunk) {
      // Top lumbarları (yanıp sönen fener ışığı) yalnızca savaş gemilerinde.
      if (K.guns)
        for (let a = castle + 2; a < bs; a += Math.max(3, Math.round(C * 0.4))) {
          const on = S(t * 6 + a + c * 3) > -0.6;
          p(a, m + 1, 1, 1, on ? '#ffd23f' : '#2a1608');
          p(a, C - m - 2, 1, 1, on ? '#ffd23f' : '#2a1608');
        }
      // Kıç pencereleri
      if (K.castleLen > 0) for (let b = mid - 2; b <= mid + 1; b += 2) p(1, b, 1, 1, '#ffe08a');
      // Cıvadra (pruvadan uzanan direk) + flok yelkeni
      const bw = Math.round(C * 0.5);
      p(L - bw, mid, bw, 1, pal.outline);
      if (K.jib)
        for (let j = 0; j < bw - 1; j++)
          p(L - bw + j, mid + 1, 1, Math.max(1, (bw - j) >> 1), '#e9dfc0');
      // Direkler ve yelkenler
      K.masts.forEach((fr, k) => {
        const a0 = Math.round(fr * L),
          sway = S(t * 3 + k + c) > 0.4 ? 1 : 0;
        if (K.sail === 'square') {
          const big = k === K.main,
            sw = Math.max(3, Math.round(C * (big ? 0.4 : 0.3))),
            span = C - 2 * m + (big ? 6 : 4),
            b0 = mid - (span >> 1);
          p(a0 - 1, b0, 1, span, '#3a2210'); // seren
          p(a0, b0, sw, span, sail);
          p(a0 + sw - 1, b0 + sway, 1, span - sway, sailShade); // rüzgâr gölgesi
          p(a0 + (sw >> 1), b0 + 1, 1, span - 2, '#fff8e0');
          p(a0, b0, sw, 1, '#cfc3a2'); // yelken kenarı (kalınlık)
          p(a0, b0 + span - 1, sw, 1, '#cfc3a2');
        } else {
          // Yan yelken: direkten kıça uzanan, rüzgâraltına şişen üçgen.
          const len = Math.round(C * 0.95);
          for (let j = 0; j < len; j++) {
            const h = 1 + Math.round(((len - j) / len) * C * 0.4);
            p(a0 - j, sway ? mid + 1 : mid - h, 1, h, j % 3 === 0 ? sailShade : sail);
          }
          p(a0 - len, mid, len, 1, '#3a2210'); // bumba
        }
        p(a0, mid - 1, 2, 2, '#2a1608'); // direk
      });
      // Kıç sancağı
      p(0, mid - 1, 1, 3, '#3a2210');
      p(1, mid - 3, 2, 2, skin?.flag ?? K.flag);
    } else {
      // Kırık direk kütükleri, devrilmiş bir direk, yüzen yelken parçaları
      K.masts.forEach((fr, k) => {
        const a0 = Math.round(fr * L);
        p(a0, mid - 1, 2, 2, '#0a0806');
        if (k === 0)
          for (let j = 0; j < Math.round(C * 0.6); j++)
            p(a0 + j, mid - 1 - (j >> 1), 1, 1, '#4a3a2c');
        p(a0 + 2, mid + 2, 2, 1, '#8a8474');
      });
      // Gövdeyi yalayan dalgalar: batmakta olduğu belli olsun
      x.globalAlpha = a1 * 0.8;
      for (let a = 2; a < L - 2; a++) {
        const wv = Math.round(S(a * 0.6 + t * 3) * 1.5);
        p(a, mid + 2 + wv, 1, 1, '#6f86e8');
        p(a, mid - 3 - wv, 1, 1, '#3446a8');
      }
      x.globalAlpha = a1;
    }
    x.globalAlpha = 1;
  }
  /** Batan geminin çevresi: nabız gibi atan kırmızı çerçeve + açık köşe parantezleri. */
  function sunkFrame(sh: GridShip, t: number) {
    const X0 = sh[0] * C,
      Y0 = sh[1] * C,
      w = sh[3] ? C : sh[2] * C,
      h = sh[3] ? sh[2] * C : C,
      col = S(t * 5) > -0.2 ? '#ff4f6a' : '#ffb0bc',
      k = Math.max(3, C >> 2);
    x.globalAlpha = 0.14;
    P(X0, Y0, w, h, '#ff4f6a');
    x.globalAlpha = 1;
    P(X0, Y0, w, 1, col);
    P(X0, Y0 + h - 1, w, 1, col);
    P(X0, Y0, 1, h, col);
    P(X0 + w - 1, Y0, 1, h, col);
    P(X0, Y0, k, 2, '#fff3b0');
    P(X0, Y0, 2, k, '#fff3b0');
    P(X0 + w - k, Y0, k, 2, '#fff3b0');
    P(X0 + w - 2, Y0, 2, k, '#fff3b0');
    P(X0, Y0 + h - 2, k, 2, '#fff3b0');
    P(X0, Y0 + h - k, 2, k, '#fff3b0');
    P(X0 + w - k, Y0 + h - 2, k, 2, '#fff3b0');
    P(X0 + w - 2, Y0 + h - k, 2, k, '#fff3b0');
  }
  /** Batan gemideki isabet: alev karesi yerine köz ve duman (gemi görünür kalsın). */
  function embers(c: number, r: number, t: number, f: number) {
    const cx = c * C + C / 2,
      cy = r * C + C / 2;
    let sd = (f >> 3) * 17 + c * 5 + r * 11;
    const R = () => (sd = (sd * 16807 + 11) % 2147483647) / 2147483647;
    for (let k = 0; k < 6; k++)
      P(
        Math.round(cx + (R() - 0.5) * C * 0.5),
        Math.round(cy + (R() - 0.5) * C * 0.4),
        1,
        1,
        R() < 0.5 ? FL().sparks[1] : FL().sparks[0],
      );
    for (let k = 0; k < 3; k++) {
      const u = (t * 0.5 + k / 3 + c * 0.13 + r * 0.07) % 1;
      x.globalAlpha = 0.5 * (1 - u);
      P(Math.round(cx - 1 + S(t * 2 + k) * 2), Math.round(cy - u * C * 0.9), 2, 2, '#6a6880');
    }
    x.globalAlpha = 1;
  }
  function fire(c: number, r: number, t: number, f: number) {
    const cx = c * C + C / 2,
      cy = r * C + C / 2,
      rr = C * 0.3;
    // İsabet karesi: kırmızı iç çerçeve + nabız gibi atan turuncu parıltı (koyu kırmızı zemin üstünde).
    const fl = FL();
    P(c * C + 1, r * C + 1, C - 2, 1, fl.border);
    P(c * C + 1, r * C + C - 2, C - 2, 1, fl.border);
    P(c * C + 1, r * C + 1, 1, C - 2, fl.border);
    P(c * C + C - 2, r * C + 1, 1, C - 2, fl.border);
    x.globalAlpha = 0.22 + 0.1 * S(t * 10 + c);
    P(c * C + 2, r * C + 2, C - 4, C - 4, fl.shimmer);
    x.globalAlpha = 1;
    const col = fl.sparks;
    let sd = (f >> 2) * 31 + c * 7 + r * 13;
    const R = () => (sd = (sd * 16807 + 11) % 2147483647) / 2147483647;
    for (let k = 0; k < C * 2; k++) {
      const a = R() * 6.28,
        d = R() * rr;
      P(
        Math.round(cx + Math.cos(a) * d),
        Math.round(cy + Math.sin(a) * d * 0.8 - R() * rr * 0.6),
        1 + (R() < 0.3 ? 1 : 0),
        1,
        col[(R() * 4) | 0] as string,
      );
    }
    P(Math.round(cx) - 1, Math.round(cy), 2, 2, fl.core);
    for (let k = 0; k < 3; k++) {
      const u = (t * 0.8 + k / 3 + c * 0.13) % 1;
      x.globalAlpha = 0.6 * (1 - u);
      P(
        Math.round(cx - 2 + k * 2 + S(t * 2 + k) * 1.5),
        Math.round(cy - rr - u * C * 0.7),
        2,
        2,
        '#9a98bf',
      );
    }
    x.globalAlpha = 1;
  }
  /**
   * Iska: durgun (dalgasız) koyu kare üstünde net beyaz halka + merkez noktası; çok hafif bir
   * halka dışa doğru kayar (canlı ama işareti bozmaz).
   */
  function splash(c: number, r: number, t: number, ring: string) {
    const cx = c * C + C / 2,
      cy = r * C + C / 2,
      rr = Math.max(2, Math.round(C * 0.26));
    for (let a = 0; a < 20; a++)
      P(
        Math.round(cx + Math.cos((a / 20) * 6.283) * rr),
        Math.round(cy + Math.sin((a / 20) * 6.283) * rr),
        1,
        1,
        ring,
      );
    P(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2, ring);
    const u = (t * 0.5 + c * 0.21 + r * 0.17) % 1;
    x.globalAlpha = 0.35 * (1 - u);
    for (let a = 0; a < 16; a++)
      P(
        Math.round(cx + Math.cos((a / 16) * 6.283) * (rr + 1 + u * C * 0.2)),
        Math.round(cy + Math.sin((a / 16) * 6.283) * (rr + 1 + u * C * 0.2)),
        1,
        1,
        ring,
      );
    x.globalAlpha = 1;
  }
  function dash(x0: number, y0: number, w: number, h: number, col: string, ph: number) {
    x.fillStyle = col;
    for (let i = 0; i < w; i++)
      if (((i + ph) >> 1) % 2 === 0) {
        x.fillRect(x0 + i, y0, 1, 1);
        x.fillRect(x0 + i, y0 + h - 1, 1, 1);
      }
    for (let i = 0; i < h; i++)
      if (((i + ph) >> 1) % 2 === 0) {
        x.fillRect(x0, y0 + i, 1, 1);
        x.fillRect(x0 + w - 1, y0 + i, 1, 1);
      }
  }
  /* ── atış efektleri: gülle uçuşu → isabet patlaması / su sıçraması; batan gemide zincir patlama ── */
  type Fx = { k: 'hit' | 'miss' | 'sunk'; c: number; r: number; t0: number; n?: number; v?: 0 | 1 };
  const FLIGHT = 0.38;
  const fxs: Fx[] = [];
  let seen: Set<string> | null = null;
  const disc = (cx: number, cy: number, rad: number, col: string) => {
    x.fillStyle = col;
    const rr = Math.round(rad);
    for (let y = -rr; y <= rr; y++) {
      const w = Math.floor(Math.sqrt(rr * rr - y * y));
      x.fillRect(Math.round(cx) - w, Math.round(cy) + y, w * 2 + 1, 1);
    }
  };
  /** Yeni atışları ve yeni batan gemileri bul (ilk karede mevcutlar canlandırılmaz). */
  function track(G: GridConfig, t: number) {
    const keys = new Set<string>();
    (G.hit || []).forEach((q) => keys.add('h' + q[0] + ',' + q[1]));
    (G.miss || []).forEach((q) => keys.add('m' + q[0] + ',' + q[1]));
    (G.ships || []).forEach((sh) => sh[4] === 's' && keys.add('s' + sh[0] + ',' + sh[1]));
    if (seen && !still)
      for (const k of keys) {
        if (seen.has(k)) continue;
        const [c, r] = k.slice(1).split(',').map(Number) as [number, number];
        if (k[0] === 's') {
          const sh = (G.ships || []).find((q) => q[0] === c && q[1] === r);
          fxs.push({ k: 'sunk', c, r, t0: t + FLIGHT, n: sh?.[2] ?? 1, v: sh?.[3] ?? 0 });
        } else fxs.push({ k: k[0] === 'h' ? 'hit' : 'miss', c, r, t0: t });
      }
    seen = keys;
  }
  /** Gülle henüz düşmediyse kare işareti (ateş/sıçrama) ve batık gemi gizli kalır. */
  const pending = (t: number, k: Fx['k'], c: number, r: number) =>
    fxs.some((e) => e.k === k && e.c === c && e.r === r && t < e.t0 + (k === 'sunk' ? 0 : FLIGHT));
  /** Patlama: şok halkası, büyüyen ateş topu (dış hale, turuncu, beyaz çekirdek), kıvılcım, duman. */
  function boom(cx: number, cy: number, u: number, size: number) {
    if (u < 0.55) {
      const k = u / 0.55;
      x.globalAlpha = 0.45 * (1 - k * 0.5);
      disc(cx, cy, (0.35 + k * 0.75) * size, FL().glow);
      x.globalAlpha = 1;
      disc(cx, cy, (0.25 + k * 0.45) * size * (1 - k * 0.3), FL().hot);
      disc(cx, cy, (0.14 + k * 0.2) * size * (1 - k * 0.6), FL().core);
    }
    if (u < 0.6) {
      const rr = (u / 0.6) * size * 1.2;
      x.globalAlpha = 1 - u / 0.6;
      x.fillStyle = FL().core;
      for (let a = 0; a < 28; a++)
        x.fillRect(
          Math.round(cx + Math.cos((a / 28) * Math.PI * 2) * rr),
          Math.round(cy + Math.sin((a / 28) * Math.PI * 2) * rr),
          1,
          1,
        );
    }
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + k,
        d = u * (0.6 + (k % 4) * 0.22) * size;
      x.globalAlpha = Math.max(0, 1 - u);
      x.fillStyle = k % 3 ? FL().sparks[2] : FL().sparks[0];
      x.fillRect(
        Math.round(cx + Math.cos(a) * d),
        Math.round(cy + Math.sin(a) * d - u * size * 0.25),
        2,
        2,
      );
    }
    x.globalAlpha = Math.max(0, 0.55 * (1 - u));
    disc(cx - 1, cy - u * size * 0.9, (0.1 + u * 0.35) * size, '#5a5870');
    x.globalAlpha = 1;
  }
  function drawFx(t: number) {
    for (let i = fxs.length - 1; i >= 0; i--) {
      const e = fxs[i] as Fx;
      const cx = e.c * C + C / 2,
        cy = e.r * C + C / 2;
      if (e.k === 'sunk') {
        const n = e.n ?? 1,
          dt = t - e.t0;
        if (dt < 0) continue;
        // Gemi bir an beyaz parlar, sonra kareleri sırayla patlar.
        if (dt < 0.25) {
          x.globalAlpha = 0.55 * (1 - dt / 0.25);
          P(e.c * C, e.r * C, e.v ? C : n * C, e.v ? n * C : C, '#ffffff');
          x.globalAlpha = 1;
        }
        for (let k = 0; k < n; k++) {
          const u = (dt - k * 0.15) / 0.9;
          if (u < 0 || u > 1) continue;
          const kx = e.v ? cx : cx + k * C,
            ky = e.v ? cy + k * C : cy;
          boom(kx, ky, u, C * 1.9);
        }
        if (dt > n * 0.15 + 0.95) fxs.splice(i, 1);
        continue;
      }
      const u = (t - e.t0) / FLIGHT;
      if (u < 1) {
        // Gülle: ızgaranın alt ortasından hedefe yay çizerek.
        const sx = W / 2,
          sy = W + C,
          px = sx + (cx - sx) * u,
          py = sy + (cy - sy) * u - Math.sin(Math.PI * u) * C * 2.2;
        x.globalAlpha = 0.35;
        const bl = BL();
        x.fillStyle = bl.trail;
        x.fillRect(Math.round(px - (cx - sx) * 0.04), Math.round(py + 2), 2, 2);
        x.fillRect(Math.round(px - (cx - sx) * 0.08), Math.round(py + 4), 2, 2);
        x.globalAlpha = 1;
        disc(px, py, Math.max(1.5, C * 0.16 * (1 - u * 0.4)), bl.body);
        x.fillStyle = bl.shine;
        x.fillRect(Math.round(px - 1), Math.round(py - 1), 1, 1);
        continue;
      }
      const v = (t - e.t0 - FLIGHT) / (e.k === 'hit' ? 0.9 : 0.7);
      if (v > 1) {
        fxs.splice(i, 1);
        continue;
      }
      if (e.k === 'hit') boom(cx, cy, v, C * 1.6);
      else {
        const hgt = Math.sin(Math.PI * Math.min(1, v * 1.4)) * C * 0.9;
        x.globalAlpha = Math.max(0, 1 - v);
        x.fillStyle = '#eef6ff';
        x.fillRect(Math.round(cx - 1), Math.round(cy - hgt), 3, Math.round(hgt));
        x.fillStyle = '#9fd0ff';
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2,
            rr = v * C * 0.6;
          x.fillRect(
            Math.round(cx + Math.cos(a) * rr),
            Math.round(cy + Math.sin(a) * rr * 0.6),
            1,
            1,
          );
        }
        x.globalAlpha = 1;
      }
    }
  }
  let f = 0;
  let raf = 0;
  let lastMs = 2000;
  function frame(ms: number) {
    const G = getConfig();
    look = G.look ?? {};
    // Gündüz: turkuaz su, açık köpük, beyaz ızgara çizgileri. Harita (market) bunu değiştirir.
    const sea = look.sea
      ? isDay()
        ? look.sea.day
        : look.sea.night
      : isDay()
        ? SEA_DAY
        : SEA_NIGHT;
    const t = ms / 1000;
    f++;
    track(G, t);
    // Atış yapılmış kareler dalgasız: ıska durgun koyu su, isabet koyu kırmızı. Böylece
    // vurulan alanlar dalga deseninden ayrışır.
    const shot = new Uint8Array(N * N); // 0 boş, 1 ıska, 2 isabet
    (G.miss || []).forEach((q) => (shot[q[1] * N + q[0]] = 1));
    (G.hit || []).forEach((q) => (shot[q[1] * N + q[0]] = 2));
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) P(c * C, r * C, C, C, (r + c) % 2 ? sea[0] : sea[1]);
    const thr = isDay() ? 1.68 : 1.55;
    for (let y = 0; y < W; y += 2)
      for (let X = 0; X < W; X++) {
        if (shot[((y / C) | 0) * N + ((X / C) | 0)]) continue;
        const v = S(X * 0.35 + y * 0.9 + t * 2) + S(X * 0.13 - y * 0.4 - t * 1.3);
        if (v > thr) P(X, y, 1, 1, v > 1.85 ? sea[2] : sea[3]);
      }
    for (let i = 0; i < N * N; i++)
      if (shot[i] && !pending(t, shot[i] === 2 ? 'hit' : 'miss', i % N, (i / N) | 0))
        P((i % N) * C, ((i / N) | 0) * C, C, C, shot[i] === 2 ? sea[6] : sea[5]);
    if (G.tint) {
      x.globalAlpha = 0.14;
      P(0, G.tint[1] * C, W, C, '#ffd23f');
      P(G.tint[0] * C, 0, C, W, '#ffd23f');
      x.globalAlpha = 1;
    }
    x.globalAlpha = 0.35;
    for (let i = 1; i < N; i++) {
      P(i * C, 0, 1, W, sea[4]);
      P(0, i * C, W, 1, sea[4]);
    }
    x.globalAlpha = 1;
    // Gülle düşmeden yeni batık gemi görünmesin (rakip gemisi o ana kadar gizliydi).
    const ships = (G.ships || []).filter(
      (sh) => !(sh[4] === 's' && pending(t, 'sunk', sh[0], sh[1])),
    );
    ships.forEach((sh) => ship(sh[0], sh[1], sh[2], sh[3], sh[4], t, sh[5]));
    (G.miss || []).forEach((q) => !pending(t, 'miss', q[0], q[1]) && splash(q[0], q[1], t, sea[7]));
    // Batan gemilerin kareleri: alev değil köz (gövde görünsün), üstüne çerçeve.
    const wreck = new Set<number>();
    ships.forEach((sh) => {
      if (sh[4] !== 's') return;
      for (let k = 0; k < sh[2]; k++)
        wreck.add(sh[3] ? (sh[1] + k) * N + sh[0] : sh[1] * N + sh[0] + k);
    });
    (G.hit || []).forEach((q) =>
      pending(t, 'hit', q[0], q[1])
        ? null
        : wreck.has(q[1] * N + q[0])
          ? embers(q[0], q[1], t, f)
          : fire(q[0], q[1], t, f),
    );
    ships.forEach((sh) => sh[4] === 's' && sunkFrame(sh, t));
    drawFx(t);
    if (G.last)
      dash(G.last[0] * C, G.last[1] * C, C, C, ((t * 3) | 0) % 2 ? '#ff4f6a' : '#ffb0bc', f >> 2);
    if (G.ghost) {
      const g = G.ghost,
        w = g[3] ? C : g[2] * C,
        h = g[3] ? g[2] * C : C,
        gc = G.ghostInvalid ? '#ff4f6a' : '#ffd23f';
      x.globalAlpha = 0.18;
      P(g[0] * C, g[1] * C, w, h, gc);
      x.globalAlpha = 1;
      dash(g[0] * C, g[1] * C, w, h, gc, f >> 2);
      // "Havaya kalkma": ızgara kenarındaysa kalkış o yöne yapılmaz (tuval dışına taşıp kesilmesin).
      const ly = g[1] === 0 ? 0 : -3 + Math.round(S(t * 3)) - 2,
        lx = g[0] === 0 ? 0 : -2;
      x.globalAlpha = 0.45;
      P(
        g[0] * C + 3,
        g[1] * C + 4,
        Math.min(w - 2, W - g[0] * C - 3),
        Math.min(h - 4, W - g[1] * C - 4),
        '#03030c',
      );
      x.globalAlpha = 1;
      ship(g[0], g[1], g[2], g[3], '', t, g[4], lx, ly, 0.95);
    }
    if (G.aim) {
      const a = G.aim,
        X0 = a[0] * C,
        Y0 = a[1] * C,
        pu = ((t * 4) | 0) % 2,
        k = Math.max(3, C >> 2);
      x.globalAlpha = 0.28;
      P(X0, Y0, C, C, '#ffd23f');
      x.globalAlpha = 1;
      const o = pu ? 0 : 1,
        col = '#ffd23f';
      P(X0 + o, Y0 + o, k, 1, col);
      P(X0 + o, Y0 + o, 1, k, col);
      P(X0 + C - o - k, Y0 + o, k, 1, col);
      P(X0 + C - o - 1, Y0 + o, 1, k, col);
      P(X0 + o, Y0 + C - o - 1, k, 1, col);
      P(X0 + o, Y0 + C - o - k, 1, k, col);
      P(X0 + C - o - k, Y0 + C - o - 1, k, 1, col);
      P(X0 + C - o - 1, Y0 + C - o - k, 1, k, col);
      const cx = X0 + (C >> 1);
      P(cx, Y0 + 3, 1, (C >> 1) - 5, col);
      P(cx, Y0 + (C >> 1) + 2, 1, (C >> 1) - 5, col);
      P(X0 + 3, Y0 + (C >> 1), (C >> 1) - 5, 1, col);
      P(X0 + (C >> 1) + 2, Y0 + (C >> 1), (C >> 1) - 5, 1, col);
    }
    lastMs = ms;
    if (!still) raf = requestAnimationFrame(frame);
  }
  if (still) frame(lastMs);
  else raf = requestAnimationFrame(frame);
  return {
    stop: () => cancelAnimationFrame(raf),
    // Hareketi azalt kipinde döngü yok: durum değişince tek kare yeniden çizilir.
    redraw: () => {
      if (still) frame(lastMs);
    },
  };
}

type Palette = { outline: string; side: string; deck: string; deck2: string; castle: string };

type ShipStyle = Palette & {
  /** Borda payı (hücrenin oranı): küçük = geniş gövde */
  margin: number;
  /** Pruva incelmesi (hücre) */
  taper: number;
  /** Kıç kasarası boyu (geminin oranı); 0 = yok */
  castleLen: number;
  /** Top kuşağı / süs şeridi */
  stripe: string | null;
  /** Direklerin yeri (geminin oranı, kıçtan) */
  masts: readonly number[];
  /** En büyük yelkenli direk */
  main: number;
  sail: 'square' | 'fore';
  jib: boolean;
  guns: boolean;
  flag: string;
};

const SUNK: Palette = {
  outline: '#120406',
  side: '#5a2016',
  deck: '#6a4632',
  deck2: '#4e3226',
  castle: '#5a3a2a',
};

/** Tipler: kalyon > fırkateyn > korvet / brik > şalupa. Renkler tasarım paletinin ahşap tonlarından. */
const SHIP_STYLE: Record<ShipKind, ShipStyle> = {
  // Geniş, yaldız kuşaklı, yüksek kıç kasaralı; 3 kare yelken + flok.
  galleon: {
    margin: 0.1,
    taper: 1.3,
    castleLen: 0.22,
    outline: '#1a0c05',
    side: '#6a2e12',
    deck: '#a8723a',
    deck2: '#8e5e2e',
    castle: '#7a4420',
    stripe: '#e0b048',
    masts: [0.3, 0.52, 0.74],
    main: 1,
    sail: 'square',
    jib: true,
    guns: true,
    flag: '#ff4f6a',
  },
  // Siyah gövde, sarı top kuşağı (Nelson damalı); 3 kare yelken.
  frigate: {
    margin: 0.14,
    taper: 1.1,
    castleLen: 0.15,
    outline: '#06060a',
    side: '#1d1d26',
    deck: '#b0844a',
    deck2: '#96703e',
    castle: '#8a6236',
    stripe: '#ffd23f',
    masts: [0.28, 0.52, 0.76],
    main: 1,
    sail: 'square',
    jib: true,
    guns: true,
    flag: '#4fe3ff',
  },
  // Gri-mavi, beyaz şeritli; 2 yan yelken (uskuna donanımı) + flok.
  corvette: {
    margin: 0.18,
    taper: 1.0,
    castleLen: 0,
    outline: '#0c1420',
    side: '#3a5270',
    deck: '#bc9058',
    deck2: '#a07a4a',
    castle: '#bc9058',
    stripe: '#e9e4d0',
    masts: [0.42, 0.78],
    main: 0,
    sail: 'fore',
    jib: true,
    guns: true,
    flag: '#ffd23f',
  },
  // Kızıl gövde, alçak kıç; 2 kare yelken, topsuz tüccar-korsan.
  brig: {
    margin: 0.16,
    taper: 0.9,
    castleLen: 0.12,
    outline: '#1e0806',
    side: '#8a2a1a',
    deck: '#c89c60',
    deck2: '#aa8452',
    castle: '#9a6a3a',
    stripe: null,
    masts: [0.34, 0.66],
    main: 1,
    sail: 'square',
    jib: false,
    guns: false,
    flag: '#ff5fa2',
  },
  // Dar, açık çam; tek direk yan yelken + büyük flok.
  sloop: {
    margin: 0.24,
    taper: 0.8,
    castleLen: 0,
    outline: '#2a1a0a',
    side: '#9a7440',
    deck: '#dab87e',
    deck2: '#c4a06a',
    castle: '#dab87e',
    stripe: '#f3e6c0',
    masts: [0.55],
    main: 0,
    sail: 'fore',
    jib: true,
    guns: false,
    flag: '#e8e8ff',
  },
};

/** Tipi bilinmeyen gemi (kapak demosu): uzunluktan tahmin. */
function defaultKind(n: number): ShipKind {
  return n >= 5 ? 'galleon' : n === 4 ? 'frigate' : n === 3 ? 'corvette' : 'sloop';
}

const DEFAULT_FLAME: FlameLook = {
  glow: '#ffb347',
  hot: '#ff7a2a',
  core: '#fff3b0',
  sparks: ['#ff4f2a', '#ff9a2a', '#ffd23f', '#fff3b0'],
  border: '#ff4f6a',
  shimmer: '#ff5a2a',
};
const DEFAULT_BALL: BallLook = { body: '#141018', shine: '#9a98bf', trail: '#ffb347' };
