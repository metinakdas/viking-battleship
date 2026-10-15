/**
 * Tasarım token'ları: Viking teması + macOS tarzı buzlu cam (açık zemin).
 * Karar kaydı: docs/design/viking-tema.md. Yeni renk eklemeden önce oraya bak.
 */

export const colors = {
  // Zemin ("kuzey ışığı" duvar kâğıdı): açık buz mavisi taban + yumuşak renk lekeleri
  wallpaper: '#eaf0f5',
  auroraIce: '#bcdaea',
  auroraTeal: '#b8e3d9',
  auroraLilac: '#d9cdee',
  auroraAmber: '#f6dcbc',

  // Buzlu cam yüzeyler (BlurView üstüne yarı saydam beyaz)
  glass: 'rgba(255, 255, 255, 0.55)',
  glassStrong: 'rgba(255, 255, 255, 0.78)',
  glassBorder: 'rgba(255, 255, 255, 0.75)',
  hairline: 'rgba(22, 32, 43, 0.10)',
  hairlineStrong: 'rgba(22, 32, 43, 0.18)',
  shadow: '#16202b',

  // Metin (mürekkep)
  text: '#16202b',
  textSecondary: '#3d4a57',
  textMuted: '#66727e',
  textDisabled: '#9aa3ad',
  textOnAccent: '#fff8ee',

  // Vurgular
  /** Kırmızı yelken: birincil buton, aktif adım. */
  accent: '#b2382a',
  accentHover: '#9e2f23',
  /** Bronz/altın: nişangah, yerleştirme çerçevesi, rozetler. */
  gold: '#c08a2c',
  goldDeep: '#8a621c',
  /** Demir: ikincil öğeler. */
  iron: '#4f5d6b',
  /** Ateş / isabet. */
  fire: '#e0561f',
  fireCore: '#ffc76b',
  /** Geçersiz yerleştirme. */
  danger: '#d8452b',

  // Fiyort denizi (tahta)
  seaOwnFrom: '#2f8a99',
  seaOwnTo: '#155563',
  seaEnemyFrom: '#3a6f8c',
  seaEnemyTo: '#1b3d55',
  gridLine: '#ffffff',
  boardFrame: '#3b2a1c',

  // Drakkar
  hull: '#7a4a28',
  hullDark: '#5b351b',
  deck: '#b07d45',
  plank: '#8d5f31',
  shipOutline: '#2e1b0e',
  sailRed: '#b2382a',
  sailCream: '#f3e7cf',
  shieldRed: '#b2382a',
  shieldGold: '#d9a441',
  shieldCream: '#efe2c4',
  shieldBlue: '#3c5f7d',
  shieldGreen: '#3f7a64',
  shieldBoss: '#6b6f73',

  // Fiyort sahnesi (alacakaranlık): lobi ve sahne arka planları
  skyTop: '#0b1f33',
  skyMid: '#1f4a68',
  skyLow: '#5f7f93',
  horizonGlow: '#f3b46b',
  horizonHaze: '#f8d9aa',
  aurora1: '#5ee6c4',
  aurora2: '#9df29b',
  moon: '#fff1d0',
  mountainFar: '#4a6f86',
  mountainMid: '#2b4e66',
  mountainNear: '#173449',
  seaTop: '#1d4e66',
  seaDeep: '#081f2d',
  foam: '#a8d8e6',
  /** Sahne üstündeki açık metin (sıcak krem). */
  onScene: '#fff6e6',
  onSceneMuted: 'rgba(255, 246, 230, 0.72)',

  // Batık gemi: doygunluğu düşük, yanık kahve
  sunkHull: '#4d4039',
  sunkDeck: '#6e5f54',
  sunkSail: '#9b928a',
} as const;

export const opacity = {
  gridLine: 0.22,
  seaWaves: 0.12,
  disabled: 0.45,
  pressed: 0.85,
} as const;

/** İki duraklı geçişler: [başlangıç, bitiş]. Deniz geçişleri çaprazdır (sol üst → sağ alt). */
export const gradients = {
  seaOwn: [colors.seaOwnFrom, colors.seaOwnTo],
  seaEnemy: [colors.seaEnemyFrom, colors.seaEnemyTo],
} as const;

/** Buzlu cam ayarları (expo-blur). */
export const glass = {
  intensity: 40,
  tint: 'light',
} as const;

/** Yumuşak, katmanlı macOS gölgesi (web + yeni mimari boxShadow). */
export const shadows = {
  card: '0 1px 1px rgba(22,32,43,0.04), 0 8px 24px rgba(22,32,43,0.10)',
  raised: '0 2px 4px rgba(22,32,43,0.08), 0 16px 40px rgba(22,32,43,0.16)',
  button: '0 1px 2px rgba(22,32,43,0.12)',
} as const;

export const radii = {
  card: 16,
  button: 12,
  input: 10,
  pill: 999,
  board: 12,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** React Native'de özel fontlarda fontWeight güvenilir değil; her ağırlık ayrı aile adı. */
export const fonts = {
  /** Destansı başlıklar (yazıt havası): Cinzel. Küçük harfleri küçük büyük harf olarak çizer. */
  epic: 'Cinzel_700Bold',
  epicSemiBold: 'Cinzel_600SemiBold',
  display: 'SpaceGrotesk_700Bold',
  displaySemiBold: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const typography = {
  /** Lobi kahraman başlığı. */
  hero: { fontFamily: fonts.epic, fontSize: 48, letterSpacing: 1, lineHeight: 56 },
  /** Kart ve bölüm başlıkları (destansı). */
  epicTitle: { fontFamily: fonts.epic, fontSize: 20, letterSpacing: 0.6, lineHeight: 26 },
  epicSection: { fontFamily: fonts.epicSemiBold, fontSize: 14, letterSpacing: 3, lineHeight: 18 },
  logo: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 4, lineHeight: 28 },
  h1: { fontFamily: fonts.display, fontSize: 28, letterSpacing: 0.3, lineHeight: 34 },
  h2: { fontFamily: fonts.displaySemiBold, fontSize: 20, letterSpacing: 0.2, lineHeight: 26 },
  h3: { fontFamily: fonts.displaySemiBold, fontSize: 16, letterSpacing: 0.1, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  /** Küçük, büyük harfli, harf aralıklı başlıklar (ör. "KENDİ FİLON"). */
  overline: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1.5, lineHeight: 14 },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 15, letterSpacing: 0.2, lineHeight: 20 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const breakpoints = {
  /** Tasarımdaki 3 sütun. */
  wide: 1200,
  /** Tablet / dar web. Altı telefon. */
  tablet: 768,
} as const;

/** Dokunma hedefi alt sınırı (hücreler dahil). */
export const minTouchSize = 32;

export const theme = {
  colors,
  opacity,
  gradients,
  glass,
  shadows,
  radii,
  spacing,
  fonts,
  typography,
  breakpoints,
  minTouchSize,
} as const;

export type Theme = typeof theme;
