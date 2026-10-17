/**
 * Gece denizi: tasarım dosyasındaki (amiral-batti.html) ilk canvas betiğinin birebir aktarımı.
 * Mantık ve sayılar değiştirilmedi; yalnızca TypeScript tipleri eklendi ve dış kabuk
 * (DIM parametresi, durdurma, hareketi azalt) fonksiyon parametrelerine taşındı.
 * Yalnızca web'de (gerçek <canvas>) çağrılır.
 */
import { playSound } from '@/services/sound';

type Ctx = CanvasRenderingContext2D;
type ShipState = {
  x: number;
  y: number;
  s: number;
  v: number;
  p: number;
  f: number;
  fire?: number;
  /** Batma ilerlemesi (0 → 1.3); tanımsızsa gemi yüzüyor. */
  sink?: number;
};

/** Kontrol: durdur + (giriş ekranında) tıklanan noktaya top at. */
export type NightSeaController = {
  stop(): void;
  /** x, y: 480×270 tuval pikseli. Gemi vurulursa onHit(puan) çağrılır. */
  shoot(x: number, y: number): void;
};

export type NightSeaOptions = {
  /** Kare sonunda üstüne boyanan karartma (giriş 0, kapak 0.3, oyun 0.55). */
  dim: number;
  /** Hareketi azalt: tek kare çiz, döngü yok (gemiler durur, yıldızlar sabit). */
  still: boolean;
  /** Gündüz ("güneşli"): mavi gök, güneş, turkuaz deniz; yıldız ve fener ışığı yok. */
  day?: boolean;
  /** Atış oyunu: batırılan gemi başına puan (uzaktaki küçük gemi daha değerli). */
  onHit?: (points: number) => void;
};

/** Gece (tasarım) ve gündüz renkleri. */
const SKY_NIGHT = [
  '#06061a',
  '#0a0a26',
  '#0f1034',
  '#161542',
  '#1f1a50',
  '#2b1f5c',
  '#3b2568',
  '#4f2c72',
];
const SKY_DAY = [
  '#2f8fe8',
  '#3d9bef',
  '#4ea7f3',
  '#62b3f6',
  '#78bff8',
  '#90cbfa',
  '#a9d8fb',
  '#c4e6fd',
];
const SEA_NIGHT = [
  '#2c2a7a',
  '#24246c',
  '#1d1e5e',
  '#171952',
  '#121446',
  '#0e103b',
  '#0a0c30',
  '#08092a',
];
const SEA_DAY = [
  '#2aa4d8',
  '#2399d0',
  '#1d8dc6',
  '#1882bb',
  '#1477b0',
  '#106ca4',
  '#0d6298',
  '#0a588c',
];

export function startNightSea(
  c: HTMLCanvasElement,
  { dim: DIM, still, day = false, onHit }: NightSeaOptions,
): NightSeaController {
  const x = c.getContext('2d') as Ctx;
  x.imageSmoothingEnabled = false;
  const W = 480,
    H = 270,
    HZ = 150,
    S = Math.sin,
    PI = Math.PI;
  let sd = 11;
  const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const mk = (w: number, h: number) => {
    const g = document.createElement('canvas');
    g.width = w;
    g.height = h;
    return g;
  };
  const disc = (g: Ctx, cx: number, cy: number, r: number, col: string) => {
    g.fillStyle = col;
    r = Math.round(r);
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      g.fillRect(Math.round(cx) - w, Math.round(cy) + y, w * 2 + 1, 1);
    }
  };
  /* static sky + islands */
  const sky = mk(W, H),
    s = sky.getContext('2d') as Ctx;
  const band = day ? SKY_DAY : SKY_NIGHT,
    bh = HZ / band.length;
  band.forEach((b, i) => {
    s.fillStyle = b;
    s.fillRect(0, Math.round(i * bh), W, Math.ceil(bh) + 1);
    if (i < band.length - 1) {
      s.fillStyle = band[i + 1] as string;
      const yb = Math.round((i + 1) * bh) - 3;
      for (let X = 0; X < W; X += 4) s.fillRect(X + (i % 2) * 2, yb, 1, 1);
      for (let X = 0; X < W; X += 2) s.fillRect(X, yb + 1, 1, 1);
      for (let X = 1; X < W; X += 2) s.fillRect(X, yb + 2, 1, 1);
    }
  });
  if (day) {
    // Güneş: sıcak hale + parlak disk + birkaç piksel ışın.
    s.globalAlpha = 0.18;
    disc(s, 372, 40, 38, '#fff6c0');
    s.globalAlpha = 0.3;
    disc(s, 372, 40, 26, '#fff1a0');
    s.globalAlpha = 1;
    disc(s, 372, 40, 16, '#ffd23f');
    disc(s, 372, 40, 11, '#fff3b0');
    s.fillStyle = '#fff3b0';
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      for (let r = 21; r < 27; r++)
        s.fillRect(Math.round(372 + Math.cos(ang) * r), Math.round(40 + Math.sin(ang) * r), 1, 1);
    }
  } else {
    s.globalAlpha = 0.05;
    disc(s, 372, 40, 34, '#d8d0ff');
    s.globalAlpha = 0.08;
    disc(s, 372, 40, 24, '#efe8ff');
    s.globalAlpha = 1;
    disc(s, 372, 40, 15, '#f6f0c8');
    disc(s, 366, 35, 3, '#dcd3a0');
    disc(s, 377, 45, 4, '#dcd3a0');
    disc(s, 379, 32, 2, '#dcd3a0');
    disc(s, 369, 47, 1, '#dcd3a0');
  }
  for (let X = 0; X < W; X++) {
    const h = 7 + 4 * S(X * 0.03) + 3 * S(X * 0.11 + 1);
    s.fillStyle = day ? '#6a9fd0' : '#2a1e56';
    s.fillRect(X, Math.round(HZ - h), 1, Math.round(h) + 1);
  }
  for (let X = 0; X < 170; X++) {
    const h = Math.max(0, 20 * S(((X + 6) / 176) * PI)) + (X % 7 < 3 ? 1 : 0);
    s.fillStyle = day ? '#3f8a5a' : '#140c2c';
    s.fillRect(X, Math.round(HZ - h), 1, Math.round(h) + 1);
  }
  for (let X = 370; X < W; X++) {
    let h = Math.max(0, 36 * (1 - Math.abs(X - 430) / 62)) + (X % 5 < 2 ? 1 : 0);
    if (X > 440) h = Math.max(h, 10);
    s.fillStyle = day ? '#3f8a5a' : '#140c2c';
    s.fillRect(X, Math.round(HZ - h), 1, Math.round(h) + 1);
  }
  const palm = (px: number, py: number, hg: number, ln: number) => {
    s.fillStyle = day ? '#245c38' : '#0c0720';
    let tx = px,
      ty = py;
    for (let i = 0; i < hg; i++) {
      tx = px + Math.round(((ln * i * i) / hg / hg) * 5);
      ty = py - i;
      s.fillRect(tx, ty, 2, 1);
    }
    (
      [
        [-1, 0.7],
        [1, 0.7],
        [-1, 0.15],
        [1, 0.15],
        [-0.4, 1.1],
        [0.5, 1],
      ] as const
    ).forEach(([d, l]) => {
      for (let k = 0; k < 10; k++)
        s.fillRect(Math.round(tx + d * k), Math.round(ty - l * k + 0.1 * k * k), 2, 1);
    });
  };
  palm(38, HZ - 16, 24, 1);
  palm(64, HZ - 19, 30, -1);
  palm(100, HZ - 17, 20, 1);
  palm(122, HZ - 13, 16, -1);
  /* lighthouse */
  const LX = 462,
    LY = HZ - 40;
  for (let i = 0; i < 26; i++) {
    s.fillStyle = (i >> 2) % 2 ? '#b0385a' : '#cfc8e6';
    s.fillRect(LX - 3 + (i < 10 ? 0 : 0), HZ - 12 - i, 6, 1);
  }
  s.fillStyle = day ? '#245c38' : '#0c0720';
  s.fillRect(LX - 4, LY - 1, 8, 2);
  s.fillRect(LX - 3, LY - 6, 6, 1);
  s.fillRect(LX - 1, LY - 8, 2, 2);
  /* sea bands */
  const sea = mk(W, H),
    q = sea.getContext('2d') as Ctx,
    sb = day ? SEA_DAY : SEA_NIGHT;
  for (let i = 0; i < sb.length; i++) {
    const y0 = HZ + Math.round((H - HZ) * Math.pow(i / sb.length, 1.4)),
      y1 = HZ + Math.round((H - HZ) * Math.pow((i + 1) / sb.length, 1.4));
    q.fillStyle = sb[i] as string;
    q.fillRect(0, y0, W, y1 - y0);
  }
  /* stars, sparkles */
  const st: { x: number; y: number; p: number; v: number; b: boolean }[] = [];
  for (let i = 0; i < 90; i++)
    st.push({
      x: (R() * W) | 0,
      y: (R() * (HZ - 20)) | 0,
      p: R() * 7,
      v: 0.5 + R() * 2.5,
      b: R() < 0.15,
    });
  const sp: { x: number; y: number; p: number; v: number }[] = [];
  for (let i = 0; i < 50; i++)
    sp.push({
      x: (R() * W) | 0,
      y: (HZ + 4 + R() * (H - HZ - 20)) | 0,
      p: R() * 7,
      v: 1 + R() * 3,
    });
  /* ship sprite */
  function ship() {
    const g = mk(56, 44),
      f = (a: number, b: number, w: number, h: number, col: string) => {
        (g.getContext('2d') as Ctx).fillStyle = col;
        (g.getContext('2d') as Ctx).fillRect(a, b, w, h);
      },
      ox = 4,
      oy = 32,
      L = 42,
      lt: [number, number][] = [];
    (
      [
        [12, 26],
        [22, 30],
        [32, 21],
      ] as const
    ).forEach(([m, h]) => {
      f(ox + m, oy - h, 1, h, '#3a2210');
      const w = m === 22 ? 13 : 11;
      const sail = (y0: number, y1: number, ww: number) => {
        f(ox + m - (ww >> 1) - 1, y0 - 1, ww + 2, 1, '#3a2210');
        f(ox + m - (ww >> 1), y0, ww, y1 - y0, '#d9cfb0');
        f(ox + m + (ww >> 1) - 2, y0, 2, y1 - y0, '#a3977a');
        f(ox + m - (ww >> 1), y1 - 1, ww, 1, '#b8ad8e');
      };
      sail(oy - Math.round(h * 0.72), oy - Math.round(h * 0.3), w);
      sail(oy - h + 3, oy - Math.round(h * 0.72) - 2, w - 4);
      f(ox + m + 1, oy - h, 4, 2, '#e8434f');
      f(ox + m + 1, oy - h + 2, 2, 1, '#e8434f');
    });
    f(ox, oy - 6, 10, 6, '#7a4622');
    f(ox, oy - 6, 10, 1, '#c08a4a');
    lt.push([ox + 2, oy - 4], [ox + 6, oy - 4]);
    f(ox + 33, oy - 3, 8, 3, '#7a4622');
    f(ox + 33, oy - 3, 8, 1, '#c08a4a');
    for (let i = 0; i < 8; i++) f(ox + L - 1 + i, oy - 1 - (i >> 1), 1, 1, '#3a2210');
    for (let r = 0; r < 8; r++) {
      const xs = Math.floor(r * r * 0.12) + (r ? 1 : 0),
        xe = L - Math.floor(r * r * 0.3) - (r >> 1);
      f(
        ox + xs,
        oy + r,
        xe - xs,
        1,
        r === 0
          ? '#c08a4a'
          : r < 3
            ? '#8a5228'
            : r === 3
              ? '#d4a94e'
              : r < 5
                ? '#6a3c1c'
                : '#4a2810',
      );
    }
    for (let X = 8; X < 36; X += 5) lt.push([ox + X, oy + 2]);
    const fl = mk(56, 44),
      fx = fl.getContext('2d') as Ctx;
    fx.translate(56, 0);
    fx.scale(-1, 1);
    fx.drawImage(g, 0, 0);
    return { g, fl, lt, lan: [ox - 1, oy - 7] as [number, number] };
  }
  const SP = ship();
  const ships: ShipState[] = [
    { x: 60, y: 160, s: 1, v: 5, p: 0, f: 2 },
    { x: 420, y: 196, s: 2, v: -9, p: 2, f: 4 },
    { x: -60, y: 250, s: 3, v: 13, p: 4, f: 7 },
  ];
  function drawShip(o: ShipState, t: number) {
    if (o.sink !== undefined) {
      drawSinking(o, t);
      return;
    }
    const sc = o.s,
      fl = o.v < 0,
      img = fl ? SP.fl : SP.g,
      wl = 37,
      bob = Math.round(S(t * 1.6 + o.p) * sc * 0.8),
      bx = Math.round(o.x),
      by = Math.round(o.y - wl * sc + bob),
      fxp = (a: number) => (fl ? 55 - a : a);
    x.globalAlpha = 0.2;
    for (let r = wl; r > 2; r--) {
      const off = Math.round(S(t * 3 + r * 0.6) * sc * 1.5);
      x.drawImage(img, 0, r, 56, 1, bx + off, by + (2 * wl - r) * sc, 56 * sc, sc);
    }
    x.globalAlpha = 1;
    x.drawImage(img, 0, 0, 56, 44, bx, by, 56 * sc, 44 * sc);
    const L = [...SP.lt, SP.lan];
    L.forEach(([a, b], i) => {
      const k = 0.7 + 0.3 * S(t * 9 + a * 3 + o.p),
        px = bx + fxp(a) * sc,
        py = by + b * sc,
        big = i === L.length - 1;
      x.globalAlpha = (big ? 0.22 : 0.16) * k;
      x.fillStyle = '#ffcf5a';
      const g = big ? 4 * sc : 2 * sc;
      x.fillRect(px - g, py - g, sc + 2 * g, sc + 2 * g);
      x.globalAlpha = 1;
      x.fillStyle = k > 0.9 ? '#fff6c0' : '#ffd84a';
      x.fillRect(px, py, sc, sc);
      if (big)
        for (let j = 1; j < 5; j++)
          if (S(t * 6 + j * 2 + o.p) > -0.2) {
            x.globalAlpha = 0.5 - j * 0.08;
            x.fillRect(
              (px - (j * sc * (fl ? -1 : 1)) / 2) | 0,
              o.y + bob + j * 2 * sc,
              (sc * (1 + j / 2)) | 0,
              sc,
            );
            x.globalAlpha = 1;
          }
    });
    const sx = bx + fxp(4) * sc,
      dir = fl ? 1 : -1;
    x.fillStyle = '#cfd8ff';
    for (let i = 0; i < 7; i++) {
      if ((i + Math.floor(t * 8)) % 3 === 0) continue;
      x.globalAlpha = 0.7 - i * 0.09;
      x.fillRect(sx + dir * i * 2 * sc, o.y + bob + (i % 2) * sc, 2 * sc, sc);
    }
    x.globalAlpha = 1;
    if (!still) {
      o.f -= 1 / 60;
      if (o.f < 0) {
        o.f = 3 + R() * 5;
        o.fire = 0;
      }
    }
    if (o.fire !== undefined && o.fire < 1) {
      const p = o.fire,
        gx = bx + fxp((SP.lt[2 + (((o.p * 3) | 0) % 5)] as [number, number])[0]) * sc,
        gy = by + ((SP.lt[2] as [number, number])[1] + 2) * sc;
      if (p < 0.25) {
        x.globalAlpha = 0.25;
        disc(x, gx, gy, ((6 + p * 30) * sc) / 2, '#ffb347');
        x.globalAlpha = 1;
        disc(x, gx, gy, ((2 + p * 10) * sc) / 2, '#ff7a2a');
        disc(x, gx, gy, ((1 + p * 5) * sc) / 2, '#fff3b0');
      }
      for (let j = 0; j < 3; j++) {
        x.globalAlpha = Math.max(0, (1 - p) * 0.45);
        disc(
          x,
          gx + (j - 1) * 3 * sc,
          gy - p * 14 * sc - j * 2 * sc,
          ((1.5 + p * 4) * sc) / 2,
          '#9a98bf',
        );
      }
      x.globalAlpha = 1;
      o.fire += 1 / 60;
    }
    if (still) return;
    o.x += o.v / 60;
    const w = 56 * sc;
    if (o.v > 0 && o.x > W + 20) o.x = -w - 20;
    if (o.v < 0 && o.x < -w - 20) o.x = W + 20;
  }
  /* gündüz bulutları: yavaş kayan piksel kümeleri */
  const clouds = [
    { x: 40, y: 22, w: 46, s: 2.2 },
    { x: 190, y: 44, w: 34, s: 1.4 },
    { x: 300, y: 16, w: 28, s: 1.8 },
    { x: 420, y: 60, w: 40, s: 1.1 },
  ];
  function drawClouds(t: number) {
    clouds.forEach((cl) => {
      const cx = ((((cl.x + (still ? 0 : t * cl.s)) % (W + 80)) + W + 80) % (W + 80)) - 60;
      x.fillStyle = '#ffffff';
      x.globalAlpha = 0.9;
      x.fillRect(Math.round(cx), cl.y, cl.w, 4);
      x.fillRect(Math.round(cx + cl.w * 0.15), cl.y - 3, Math.round(cl.w * 0.5), 3);
      x.fillRect(Math.round(cx + cl.w * 0.45), cl.y - 6, Math.round(cl.w * 0.3), 3);
      x.fillStyle = '#d6ecfb';
      x.fillRect(Math.round(cx + 2), cl.y + 4, cl.w - 4, 2);
      x.globalAlpha = 1;
    });
  }
  /* ── atış oyunu: gülle, patlama, sıçrama, batan gemi ── */
  type Ball = { sx: number; sy: number; tx: number; ty: number; u: number };
  type Burst = { x: number; y: number; u: number; s: number; kind: 'boom' | 'splash' | 'puff' };
  const balls: Ball[] = [];
  const bursts: Burst[] = [];
  const shipBox = (o: ShipState, t: number) => {
    const sc = o.s,
      bob = Math.round(S(t * 1.6 + o.p) * sc * 0.8),
      by = Math.round(o.y - 37 * sc + bob);
    return { x0: o.x + 2 * sc, x1: o.x + 52 * sc, y0: by + 4 * sc, y1: by + 42 * sc };
  };
  let now = 0;
  function shoot(tx: number, ty: number) {
    if (still) return;
    // Namlu: ekranın alt ortası (oyuncunun kıyı topu).
    balls.push({ sx: W / 2, sy: H + 4, tx, ty, u: 0 });
    playSound('cannon');
    bursts.push({ x: W / 2, y: H - 6, u: 0, s: 1, kind: 'puff' });
  }
  function resolve(b: Ball) {
    const hitShip = ships.find((o) => {
      if (o.sink !== undefined) return false;
      const bx = shipBox(o, now);
      return b.tx >= bx.x0 && b.tx <= bx.x1 && b.ty >= bx.y0 && b.ty <= bx.y1;
    });
    if (hitShip) {
      hitShip.sink = 0;
      bursts.push({ x: b.tx, y: b.ty, u: 0, s: hitShip.s, kind: 'boom' });
      onHit?.(hitShip.s === 1 ? 500 : hitShip.s === 2 ? 300 : 100);
      playSound('hit');
      playSound('sink', 450);
    } else if (b.ty > HZ) {
      bursts.push({ x: b.tx, y: b.ty, u: 0, s: 1 + ((b.ty - HZ) / (H - HZ)) * 2, kind: 'splash' });
      playSound('splash');
    } else {
      bursts.push({ x: b.tx, y: b.ty, u: 0, s: 1, kind: 'puff' });
    }
  }
  function drawBalls() {
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i] as Ball;
      b.u += 1 / 30; // ~0.5 sn uçuş
      const u = Math.min(1, b.u),
        px = b.sx + (b.tx - b.sx) * u,
        py = b.sy + (b.ty - b.sy) * u - S(PI * u) * 46,
        r = 3 - u * 1.6;
      x.globalAlpha = 0.35;
      x.fillStyle = '#ffb347';
      x.fillRect(Math.round(px - (b.tx - b.sx) * 0.03), Math.round(py + 2), 2, 2); // iz
      x.globalAlpha = 1;
      disc(x, px, py, r, '#141018');
      x.fillStyle = '#8a8aa8';
      x.fillRect(Math.round(px - 1), Math.round(py - 1), 1, 1);
      if (b.u >= 1) {
        balls.splice(i, 1);
        resolve(b);
      }
    }
  }
  function drawBursts() {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const e = bursts[i] as Burst;
      const u = e.u;
      if (e.kind === 'boom') {
        // Patlama: parlak çekirdek, turuncu top, dağılan kıvılcım ve duman.
        if (u < 0.35) {
          x.globalAlpha = 0.35;
          disc(x, e.x, e.y, (6 + u * 50) * e.s * 0.6, '#ffb347');
          x.globalAlpha = 1;
          disc(x, e.x, e.y, (3 + u * 22) * e.s * 0.6, '#ff7a2a');
          disc(x, e.x, e.y, (1 + u * 10) * e.s * 0.6, '#fff3b0');
        }
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * PI * 2 + k,
            d = u * (16 + (k % 4) * 6) * e.s * 0.7;
          x.globalAlpha = Math.max(0, 1 - u);
          x.fillStyle = k % 3 ? '#ffd23f' : '#ff4f2a';
          x.fillRect(
            Math.round(e.x + Math.cos(a) * d),
            Math.round(e.y + Math.sin(a) * d * 0.7 - u * 6),
            2,
            2,
          );
        }
        x.globalAlpha = Math.max(0, 0.5 * (1 - u));
        disc(x, e.x - 3, e.y - u * 22 * e.s, (2 + u * 8) * e.s * 0.6, '#5a5870');
        x.globalAlpha = 1;
        e.u += 1 / 60;
      } else if (e.kind === 'splash') {
        // Iska: yükselip düşen su sütunu + yayılan halka.
        const hgt = S(PI * Math.min(1, u * 1.4)) * 14 * e.s;
        x.fillStyle = '#eef6ff';
        x.globalAlpha = Math.max(0, 1 - u);
        x.fillRect(
          Math.round(e.x - e.s),
          Math.round(e.y - hgt),
          Math.max(2, Math.round(e.s * 2)),
          Math.round(hgt),
        );
        x.fillStyle = '#9fd0ff';
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * PI * 2,
            rr = u * 10 * e.s;
          x.fillRect(
            Math.round(e.x + Math.cos(a) * rr),
            Math.round(e.y + Math.sin(a) * rr * 0.35),
            1,
            1,
          );
        }
        x.globalAlpha = 1;
        e.u += 1 / 50;
      } else {
        x.globalAlpha = Math.max(0, 0.6 * (1 - u));
        disc(x, e.x, e.y - u * 8, 2 + u * 6, '#c8c6dc');
        x.globalAlpha = 1;
        e.u += 1 / 30;
      }
      if (e.u >= 1) bursts.splice(i, 1);
    }
  }
  /** Batan gemi: yan yatar, suya gömülür, üstünde alev ve duman; sonra ufuktan yeniden gelir. */
  function drawSinking(o: ShipState, t: number) {
    const sc = o.s,
      fl = o.v < 0,
      img = fl ? SP.fl : SP.g,
      p = o.sink as number,
      wl = 37,
      bx = Math.round(o.x),
      by = Math.round(o.y - wl * sc + p * 30 * sc),
      vis = Math.max(0, Math.round((44 - p * 34) * 1)); // su üstünde kalan satırlar
    x.save();
    x.translate(bx + 28 * sc, by + 32 * sc);
    x.rotate((fl ? -1 : 1) * p * 0.45);
    x.globalAlpha = Math.max(0, 1 - p * 0.6);
    if (vis > 0) x.drawImage(img, 0, 0, 56, vis, -28 * sc, -32 * sc, 56 * sc, vis * sc);
    x.restore();
    x.globalAlpha = 1;
    // Alev + duman
    if (p < 0.9)
      for (let k = 0; k < 6; k++) {
        const fx = o.x + (12 + k * 6) * sc,
          fy = o.y - 10 * sc + p * 20 * sc - (S(t * 12 + k) + 1) * 2 * sc;
        x.fillStyle = k % 2 ? '#ff7a2a' : '#ffd23f';
        x.fillRect(Math.round(fx), Math.round(fy), sc + 1, sc + 1);
        x.globalAlpha = 0.4;
        disc(x, fx, fy - 8 * sc - ((t * 20 + k * 7) % 14), 1.5 * sc, '#5a5870');
        x.globalAlpha = 1;
      }
    // Batma köpüğü
    x.fillStyle = '#eef6ff';
    for (let k = 0; k < 10; k++)
      if ((k + Math.floor(t * 10)) % 3)
        x.fillRect(Math.round(o.x + k * 5 * sc), Math.round(o.y + (k % 2) * sc), 2 * sc, sc);
    if (!still) o.sink = p + 1 / 140;
    if ((o.sink as number) > 1.3) {
      // Yeniden doğ: gittiği yönün tersinden, ekran dışından.
      o.sink = undefined;
      o.x = o.v > 0 ? -56 * sc - 20 : W + 20;
    } else if (!still) {
      o.x += o.v / 180;
    }
  }
  let ss = { on: 0, x: 0, y: 0, vx: 0, vy: 0, l: 0 };
  let raf = 0;
  function frame(ms: number) {
    const t = ms / 1000;
    now = t;
    x.drawImage(sky, 0, 0);
    if (day) drawClouds(t);
    if (!day)
      st.forEach((o) => {
        const b = 0.5 + 0.5 * S(t * o.v + o.p);
        x.fillStyle = b > 0.8 ? '#ffffff' : b > 0.4 ? '#b8b8ff' : '#4d4d8f';
        x.fillRect(o.x, o.y, 1, 1);
        if (o.b && b > 0.85) {
          x.fillStyle = '#8f8fe0';
          x.fillRect(o.x - 1, o.y, 1, 1);
          x.fillRect(o.x + 1, o.y, 1, 1);
          x.fillRect(o.x, o.y - 1, 1, 1);
          x.fillRect(o.x, o.y + 1, 1, 1);
        }
      });
    if (!still && !day) {
      if (!ss.on && R() < 0.004)
        ss = { on: 1, x: 40 + R() * 300, y: 8 + R() * 40, vx: 3 + R() * 2, vy: 1 + R(), l: 0 };
      if (ss.on) {
        for (let i = 0; i < 10; i++) {
          x.globalAlpha = 1 - i / 10;
          x.fillStyle = i < 2 ? '#ffffff' : '#b8c4ff';
          x.fillRect((ss.x - (i * ss.vx) / 1.5) | 0, (ss.y - (i * ss.vy) / 1.5) | 0, 1, 1);
        }
        x.globalAlpha = 1;
        ss.x += ss.vx;
        ss.y += ss.vy;
        if (++ss.l > 40) ss.on = 0;
      }
    }
    const a = t * 0.9,
      dx = Math.cos(a),
      fv = S(a);
    x.globalAlpha = day ? 0 : 0.11 * Math.abs(dx);
    x.fillStyle = '#fff2b0';
    x.beginPath();
    x.moveTo(LX, LY - 3);
    x.lineTo(LX + dx * 700, LY - 34);
    x.lineTo(LX + dx * 700, LY + 22);
    x.fill();
    x.globalAlpha = 0.25 + 0.25 * Math.max(0, fv);
    disc(x, LX, LY - 3, 3 + Math.max(0, fv) * 5, '#ffe9a0');
    x.globalAlpha = 1;
    x.fillStyle = '#fff6c8';
    x.fillRect(LX - 2, LY - 5, 4, 3);
    x.drawImage(sea, 0, 0);
    for (let y = HZ + 1; y < H; y += 2) {
      const k = (y - HZ) / (H - HZ),
        w = Math.round(3 + k * 22 * (0.6 + 0.4 * S(t * 3 + y * 0.7))),
        o = Math.round(S(t * 2 + y * 0.5) * k * 6);
      if (S(y * 1.3 + t * 4) > -0.35) {
        x.fillStyle = (y >> 1) % 3 ? (day ? '#fffbe6' : '#f3edc6') : day ? '#bfe8ff' : '#9aa8ff';
        x.globalAlpha = 0.85 - k * 0.4;
        x.fillRect(372 - w + o, y, w, 1);
        x.fillRect(372 + o + 2, y, Math.round(w * 0.6), 1);
      }
    }
    x.globalAlpha = 1;
    for (let y = HZ + 2; y < H - 14; y += 2 + Math.floor((y - HZ) / 22)) {
      const k = (y - HZ) / (H - HZ),
        pw = 1 + Math.floor(k * 3);
      x.fillStyle = day ? (k < 0.45 ? '#6cc6f0' : '#bfeaff') : k < 0.45 ? '#4e58b8' : '#7f8ff0';
      for (let X = 0; X < W; X += pw) {
        const v = S(X * (0.22 - 0.15 * k) + t * (1 + k * 2) + y * 1.7) + S(X * 0.06 - t * 0.6 + y);
        if (v > 1.5) x.fillRect(X, y, pw, 1);
      }
    }
    sp.forEach((o) => {
      if (S(t * o.v + o.p) > 0.93) {
        x.fillStyle = '#ffffff';
        x.fillRect(o.x, o.y, 1, 1);
        x.fillStyle = '#8fd8ff';
        x.fillRect(o.x - 1, o.y, 1, 1);
        x.fillRect(o.x + 1, o.y, 1, 1);
      }
    });
    ships.forEach((o) => drawShip(o, t));
    drawBalls();
    drawBursts();
    for (let y = H - 16; y < H; y++) {
      const thr = 1.75 - (y - (H - 16)) * 0.05;
      for (let X = 0; X < W; X += 2) {
        const v =
          S(X * 0.09 + t * 1.2 + y * 0.4) + S(X * 0.023 - t * 0.7) + 0.5 * S(X * 0.31 + t * 2);
        if (v > thr) {
          x.fillStyle = v > thr + 0.25 ? '#eef2ff' : day ? '#a8e0ff' : '#8fa0ff';
          x.fillRect(X, y, 2, 1);
        }
      }
    }
    if (DIM) {
      // Gündüz: karartma yerine açık sis (paneller okunur kalsın).
      x.fillStyle = day ? 'rgba(235,246,255,' + DIM * 0.55 + ')' : 'rgba(4,4,16,' + DIM + ')';
      x.fillRect(0, 0, W, H);
    }
    if (!still) raf = requestAnimationFrame(frame);
  }
  if (still) frame(2000);
  else raf = requestAnimationFrame(frame);
  return { stop: () => cancelAnimationFrame(raf), shoot };
}
