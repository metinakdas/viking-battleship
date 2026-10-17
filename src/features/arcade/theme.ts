import { Platform } from 'react-native';

/**
 * Atari / piksel tema token'ları. Tek doğru kaynak: amiral-batti.html.
 * Ölçüler 1920×1080 tasarım tuvali pikselidir; Stage tüm sahneyi ekrana ölçekler.
 */
const NIGHT = {
  bg: '#07071c',
  bgDeep: '#03030c',
  panel: 'rgba(9,8,34,0.92)',
  panelSolid: '#090822',
  input: '#05041a',
  line: '#4a4ab0',
  lineDim: '#2c2c7a',
  frameOuter: '#3b2f8f',
  text: '#e8e8ff',
  textSoft: '#c8ccff',
  periwinkle: '#b8c0ff',
  muted: '#8b8bd0',
  faded: '#5a5a9a',
  yellow: '#ffd23f',
  yellowHi: '#fff3b0',
  /** Birincil tuşun üzerine gelince */
  yellowHover: '#ffe066',
  orangeSh: '#c2410c',
  red: '#ff4f6a',
  redHi: '#ffb0bc',
  titleSh1: '#d9452b',
  titleSh2: '#2a0f3a',
  cyan: '#4fe3ff',
  pink: '#ff5fa2',
  ink: '#1a0a2a',
  slot: '#1a1a52',
  /** Gökyüzü üstündeki HUD yazısı (skor, alt satır) */
  hud: '#e8e8ff',
  hudSoft: '#b8c0ff',
};

export type Palette = typeof NIGHT;
export type ThemeName = 'night' | 'day';

/**
 * Gündüz ("güneşli"): açık gök mavisi zemin, krem paneller, koyu lacivert yazı. Vurgu renkleri
 * (sarı tuş, kırmızı isabet, camgöbeği) aynı kalır; yalnızca okunurluk için koyulaştırıldı.
 */
const DAY: Palette = {
  bg: '#9fd6ff',
  bgDeep: '#1d3557',
  panel: 'rgba(255,250,236,0.94)',
  panelSolid: '#fffaec',
  input: '#ffffff',
  line: '#2e6db4',
  lineDim: '#a9c8e8',
  frameOuter: '#e8a93a',
  text: '#14203f',
  textSoft: '#2c3a66',
  periwinkle: '#2f4a9a',
  muted: '#56688f',
  faded: '#8796b8',
  yellow: '#ffc61a',
  yellowHi: '#fff0a0',
  yellowHover: '#ffd84a',
  orangeSh: '#c2410c',
  red: '#d92c4a',
  redHi: '#ffb3c0',
  titleSh1: '#d9452b',
  titleSh2: '#5a2a0a',
  cyan: '#0a7fae',
  pink: '#c42a72',
  ink: '#1a0a2a',
  slot: '#d7e8f8',
  hud: '#ffffff',
  hudSoft: '#ffffff',
};

const PALETTES: Record<ThemeName, Palette> = { night: NIGHT, day: DAY };

/**
 * Geçerli palet. Nesne yerinde güncellenir (applyTheme); ekranlar render sırasında okur.
 * StyleSheet'ler themed() ile kurulur ve tema değişince yeniden oluşturulur.
 */
export const A: Palette = { ...NIGHT };

let current: ThemeName = 'night';
const rebuilders = new Set<() => void>();

export const themeName = () => current;
export const isDay = () => current === 'day';

export function applyTheme(name: ThemeName): void {
  if (name === current) return;
  current = name;
  Object.assign(A, PALETTES[name]);
  Object.assign(panelStyle, makePanelStyle());
  hudShadow.textShadow = `3px 3px 0px ${A.bgDeep}`;
  rebuilders.forEach((r) => r());
}

/**
 * Temaya bağlı stil sayfası: StyleSheet.create(...) tema değişince yeniden kurulur. Kök düzen
 * tema değişince ağacı yeniden bağlar (key), böylece her bileşen yeni değerleri okur.
 */
export function themed<T extends object>(make: () => T): T {
  let sheet = make();
  rebuilders.add(() => {
    sheet = make();
  });
  return new Proxy({} as T, { get: (_, k) => sheet[k as keyof T] });
}

/**
 * Web'de tasarımdaki gibi "monospace" yedeği: VT323'te olmayan glifler (→ ▶ ■ ✓ ✕ ↻ …)
 * tarayıcının eş aralıklı yazı tipinden gelir. Native virgüllü listeyi desteklemez.
 */
const fallback = Platform.OS === 'web' ? ', monospace' : '';
export const FONT = {
  press: `PressStart2P_400Regular${fallback}`,
  vt: `VT323_400Regular${fallback}`,
} as const;

/** Panel: düz zemin, 4 px çerçeve, sert gölge. Köşe yuvarlaklığı hiç yok. */
const makePanelStyle = () => ({
  backgroundColor: A.panel,
  borderWidth: 4,
  borderColor: A.line,
  boxShadow: `8px 8px 0px ${A.bgDeep}`,
});
export const panelStyle = makePanelStyle();

/** Çift çerçeve: renkli iç halka + mor dış halka + sert gölge. */
export function doubleFrame(color: string, shadow = 14) {
  return {
    borderWidth: 6,
    borderColor: color,
    boxShadow: `0px 0px 0px 6px ${A.frameOuter}, ${shadow}px ${shadow}px 0px 6px ${A.bgDeep}`,
  } as const;
}

/** Logo/başlık gölgesi (kapakta 6/12, girişte 4/8, header'da 3). */
export function titleShadow(step: number, double = true) {
  return {
    textShadow: double
      ? `${step}px ${step}px 0px ${A.titleSh1}, ${step * 2}px ${step * 2}px 0px ${A.titleSh2}`
      : `${step}px ${step}px 0px ${A.titleSh1}`,
  } as const;
}

/** HUD yazı gölgesi. */
export const hudShadow = { textShadow: `3px 3px 0px ${A.bgDeep}` };

/** Arka plan kararması (DIM): giriş 0, kapak 0.3, yerleştirme/savaş 0.55. */
export const DIM = { login: 0, cover: 0.3, game: 0.55 } as const;

export const STAGE_W = 1920;
export const STAGE_H = 1080;
