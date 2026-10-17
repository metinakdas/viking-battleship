import { createContext, useContext, useEffect, useState, type ReactNode, type Ref } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useReducedMotion } from '@/features/game/hooks';
import { isRtl } from '@/i18n';
import { playSound } from '@/services/sound';

import { NightSeaBackground } from './NightSeaBackground';
import { PIXEL_ART } from './pixelArt';
import { A, doubleFrame, FONT, hudShadow, panelStyle, STAGE_H, STAGE_W, themed } from './theme';

/* ───────────── Sahne: tasarım tuvali, ekrana en-boy oranı korunarak ölçeklenir ───────────── */

/** Dikey (telefon) tuvali: 720×1280. Yatay: tasarımın 1920×1080'i. */
export const PORTRAIT_W = 720;
export const PORTRAIT_H = 1280;

export type StageLayout = {
  /** Dikey ekran: her ekranın tek sütunlu mobil yerleşimi kullanılır. */
  portrait: boolean;
  /** İçerik kutusu (tasarım pikseli) */
  W: number;
  H: number;
  /** Tasarım pikseli → ekran pikseli */
  k: number;
};

export function stageLayout(width: number, height: number): StageLayout {
  const portrait = height > width;
  const W = portrait ? PORTRAIT_W : STAGE_W;
  const H = portrait ? PORTRAIT_H : STAGE_H;
  return { portrait, W, H, k: Math.min(width / W, height / H) };
}

/** Geçerli yerleşim (pencere boyutu değişince güncellenir). */
export function useLayout(): StageLayout {
  const { width, height } = useWindowDimensions();
  return stageLayout(width, height);
}

const StageScale = createContext(1);

/** Sahne düzeyinde pencere: küçük kutuların içindeki düğmeler (ör. dil) pencereyi tuvalin ortasında açar. */
const StageModal = createContext<(node: ReactNode | null) => void>(() => {});
export const useStageModal = () => useContext(StageModal);

/** Tuvalin ekrandaki ölçeği (dokunma koordinatlarını tuval pikseline çevirmek için). */
export function useStageScale(): number {
  return useContext(StageScale);
}

export type StageProps = {
  /** Gece denizi karartması: giriş 0, kapak 0.3, oyun 0.55. */
  dim: number;
  children: ReactNode;
  /** Tuvalin dışında (ekran koordinatında) çizilecekler: sürüklenen gemi hayaleti vb. */
  overlay?: ReactNode;
  /** Giriş ekranı: denize tıklayınca top atılır, batan gemi puanı buraya gelir. */
  onShipHit?: (points: number) => void;
};

/**
 * Tasarım tuvali (HTML'deki #stage + fit()). Yatayda 1920×1080, dikeyde (telefon) 720×1280.
 * Ölçek k = min(genişlik/W, yükseklik/H): arayüz her zaman ekrana sığar. Sahne pencerenin
 * tamamını kaplar; deniz tüm ekranı doldurur, içerik kutusu ortada durur.
 */
export function Stage({ dim, children, overlay, onShipHit }: StageProps) {
  const { width, height } = useWindowDimensions();
  const [modal, setModal] = useState<ReactNode | null>(null);
  const { W, H, k } = stageLayout(width, height);
  const sw = width / k;
  const sh = height / k;
  return (
    <View style={styles.root}>
      <View
        style={[
          styles.stage,
          {
            width: sw,
            height: sh,
            left: width / 2 - sw / 2,
            top: height / 2 - sh / 2,
            transform: [{ scale: k }],
          },
        ]}
      >
        <StageScale.Provider value={k}>
          <StageModal.Provider value={setModal}>
            <NightSeaBackground dim={dim} onShipHit={onShipHit} />
            {/* box-none: boş alana tıklama alttaki denize (atış oyunu) geçer. */}
            <View
              pointerEvents="box-none"
              style={[
                styles.content,
                { width: W, height: H, left: (sw - W) / 2, top: (sh - H) / 2 },
              ]}
            >
              {children}
              {modal}
            </View>
          </StageModal.Provider>
        </StageScale.Provider>
      </View>
      {overlay}
    </View>
  );
}

/* ───────────── Yazı ───────────── */

export type TxtProps = TextProps & {
  /** press: Press Start 2P (başlık, buton, HUD). vt: VT323 (gövde). */
  font?: 'press' | 'vt';
  size: number;
  color?: string;
  /** Satır yüksekliği çarpanı (CSS line-height). */
  lh?: number;
  ls?: number;
  align?: TextStyle['textAlign'];
  shadow?: string;
};

/** Tasarım tuvali yazısı. Hiçbir metin 24 px'ten küçük değil (rehber §2.2). */
export function Txt({
  font = 'vt',
  size,
  color = A.text,
  lh,
  ls,
  align,
  shadow,
  style,
  children,
  ...rest
}: TxtProps) {
  // Arapça: piksel yazı tiplerinde Arapça glif yok; sistem yazı tipi devralır. VT323'ün küçük
  // görünen harfleriyle aynı boyda dursun diye küçültülür, sağdan sola yazılır ve harfler
  // bitişsin diye sembol bölme (ayrı span) yapılmaz.
  const rtl = isRtl();
  const fs = rtl ? Math.round(size * (font === 'press' ? 1 : 0.85)) : size;
  return (
    <Text
      style={[
        {
          fontFamily: font === 'press' ? FONT.press : FONT.vt,
          fontSize: fs,
          lineHeight: size * (lh ?? (font === 'press' ? 1.2 : 1.1)),
          color,
          letterSpacing: rtl ? undefined : ls,
          textAlign: rtl && (align === undefined || align === 'left') ? 'right' : align,
          writingDirection: rtl ? 'rtl' : undefined,
        },
        shadow ? ({ textShadow: shadow } as TextStyle) : null,
        style,
      ]}
      {...rest}
    >
      {Platform.OS === 'web' && !rtl ? withSymbolFallback(children) : children}
    </Text>
  );
}

/**
 * Google Fonts yazı tiplerini Unicode alt kümeleriyle sunar; tasarım dosyasında Latin/Latin-Ext
 * dışındaki semboller (▶ → ■ ✓ ✕ ↻ ● ▸) tarayıcının eş aralıklı yazı tipinden gelir. Paket
 * yazı tipimiz tam olduğu için aynı görünüm için bu karakterleri açıkça yedek yazı tipine veriyoruz.
 */
function inGoogleLatinSubsets(cp: number): boolean {
  return (
    cp <= 0x02ff ||
    (cp >= 0x1d00 && cp <= 0x1dbf) ||
    (cp >= 0x1e00 && cp <= 0x1eff) ||
    (cp >= 0x2000 && cp <= 0x206f) ||
    (cp >= 0x20a0 && cp <= 0x20c0) ||
    cp === 0x2113 ||
    cp === 0x2122 ||
    cp === 0x2191 ||
    cp === 0x2193 ||
    cp === 0x2212 ||
    cp === 0x2215 ||
    (cp >= 0x2c60 && cp <= 0x2c7f) ||
    (cp >= 0xa720 && cp <= 0xa7ff) ||
    cp === 0xfeff ||
    cp === 0xfffd
  );
}

const symbolStyle = { fontFamily: 'monospace' } as const;

/** Web: tarayıcının kendi odak çerçevesi yok; odak sarı kenarla gösteriliyor. RN tiplerinde yok. */
const noBrowserOutline = { outlineStyle: 'none' } as unknown as TextStyle;

function withSymbolFallback(children: ReactNode): ReactNode {
  const split = (text: string, key: number): ReactNode => {
    const parts: ReactNode[] = [];
    let buf = '';
    let i = 0;
    for (const ch of text) {
      if (inGoogleLatinSubsets(ch.codePointAt(0) ?? 0)) {
        buf += ch;
        continue;
      }
      if (buf) parts.push(buf);
      buf = '';
      parts.push(
        <Text key={`${key}-${i++}`} style={symbolStyle}>
          {ch}
        </Text>,
      );
    }
    if (buf) parts.push(buf);
    return parts.length === 1 ? parts[0] : parts;
  };
  if (typeof children === 'string') return split(children, 0);
  if (Array.isArray(children)) {
    return children.map((c, k) => (typeof c === 'string' ? split(c, k) : c));
  }
  return children;
}

/** HUD: "1UP 000000" — etiket renkli, değer beyaz, sert gölge. */
export function Hud({
  label,
  value,
  labelColor = A.red,
  style,
  align,
}: {
  label: string;
  value: string;
  labelColor?: string;
  style?: StyleProp<TextStyle>;
  align?: TextStyle['textAlign'];
}) {
  return (
    <Txt
      font="press"
      size={24}
      align={align}
      color={A.hud}
      shadow={hudShadow.textShadow}
      style={style}
    >
      <Txt font="press" size={24} color={labelColor}>
        {label}
      </Txt>{' '}
      {value}
    </Txt>
  );
}

/* ───────────── Kutular ───────────── */

export function Panel({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return <View style={[panelStyle, style]}>{children}</View>;
}

/** Çift çerçeve (giriş kartı beyaz, kendi ızgaran camgöbeği, düşman kırmızı). */
export function Frame({
  color,
  shadow,
  style,
  children,
}: {
  color: string;
  shadow?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return <View style={[doubleFrame(color, shadow), style]}>{children}</View>;
}

/* ───────────── Butonlar ───────────── */

export type PxButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label?: string;
  variant?: 'primary' | 'secondary';
  /** Etiket boyutu (birincil 28, ikincil 24). */
  size?: number;
  /** Özel içerik (ör. sağda "1 GEMİ KALDI"). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/**
 * Arcade tuşu. Birincil: sarı, açık sarı kenar, turuncu "3B" alt gölge; basılınca 8 px iner ve
 * gölge kaybolur. İkincil: koyu zemin, mavi çerçeve. Pasif: %50 opaklık.
 */
export function PxButton({
  label,
  variant = 'primary',
  size,
  children,
  disabled,
  style,
  textStyle,
  ...rest
}: PxButtonProps) {
  const primary = variant === 'primary';
  const fs = size ?? (primary ? 28 : 24);
  return (
    <Pressable
      accessibilityRole="button"
      aria-disabled={Boolean(disabled)}
      disabled={disabled}
      // Web'de tık sesi tüm düğmeler için genel dinleyicide; native'de buradan.
      onPressIn={(e) => {
        if (Platform.OS !== 'web') playSound('click');
        rest.onPressIn?.(e);
      }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        primary ? styles.primary : styles.secondary,
        hovered && !pressed && !disabled
          ? primary
            ? styles.primaryHover
            : styles.secondaryHover
          : null,
        pressed && !disabled
          ? { transform: [{ translateY: primary ? 8 : 6 }], boxShadow: 'none' }
          : null,
        disabled ? { opacity: 0.5 } : null,
        style,
      ]}
      {...rest}
    >
      {children ?? (
        <Txt
          font="press"
          size={fs}
          align="center"
          color={primary ? A.ink : A.text}
          style={textStyle}
        >
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

/** Chip: "TEK OYUNCU · CPU", "TUR 20". İsteğe bağlı tıklanabilir. */
export function Chip({
  label,
  color = A.text,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  color?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const body = (
    <Txt size={32} lh={1} color={color} numberOfLines={1}>
      {label}
    </Txt>
  );
  if (!onPress) return <View style={styles.chip}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={hoverable(styles.chip)}
    >
      {body}
    </Pressable>
  );
}

/* ───────────── Adım hapları ───────────── */

export type StepState = 'done' | 'active' | 'todo';

/** "1 · FİLONU DİZ" ━ "2 · SAVAŞ": aktif = birincil buton stili, tamam = sarı çerçeve + ✓. */
export function Steps({ steps }: { steps: readonly { label: string; state: StepState }[] }) {
  return (
    <View style={styles.stepsRow} accessibilityRole="list">
      {steps.map((s, i) => (
        <View key={s.label} style={styles.stepsRow}>
          {i > 0 ? (
            <View
              style={[
                styles.stepBar,
                { backgroundColor: steps[i - 1]?.state === 'done' ? A.yellow : A.line },
              ]}
            />
          ) : null}
          <View
            aria-current={s.state === 'active' ? 'step' : undefined}
            style={[
              styles.step,
              s.state === 'active' && styles.stepActive,
              s.state === 'done' && { borderColor: A.yellow },
            ]}
          >
            <Txt
              font="press"
              size={24}
              color={s.state === 'active' ? A.ink : s.state === 'done' ? A.yellow : A.muted}
              numberOfLines={1}
            >
              {s.state === 'done' ? `✓ ${s.label}` : s.label}
            </Txt>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ───────────── Giriş alanı ───────────── */

/** Yanıp sönme (0,5 sn). Hareketi azalt açıkken hep görünür. */
export function useBlink(ms = 500): boolean {
  const reduced = useReducedMotion();
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setOn((v) => !v), ms);
    return () => clearInterval(id);
  }, [ms, reduced]);
  return reduced || on;
}

export type PxInputProps = Omit<TextInputProps, 'style'> & {
  ref?: Ref<TextInput>;
  /** Alan adı (ekran okuyucu) — görünen yer tutucu ile aynı olabilir. */
  label: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Terminal girişi: başta sarı ">", VT323 36. Odakta çerçeve sarı ve sonda yanıp sönen "_".
 * Yerel imleç gizli; "_" metnin hemen arkasında aynı yazı tipiyle çizilir.
 */
export function PxInput({
  ref,
  label,
  error,
  value = '',
  placeholder,
  secureTextEntry,
  onFocus,
  onBlur,
  style,
  ...rest
}: PxInputProps) {
  const [focused, setFocused] = useState(false);
  const blink = useBlink();
  const shown = value ? (secureTextEntry ? '•'.repeat(value.length) : value) : (placeholder ?? '');
  return (
    <View style={[{ gap: 6 }, style]}>
      <View
        style={[
          styles.input,
          focused && { borderColor: A.yellow },
          error ? { borderColor: A.red } : null,
        ]}
      >
        <Txt size={36} color={A.yellow} style={styles.prompt}>
          {'>'}
        </Txt>
        <View style={styles.inputBox}>
          {/* Görünür metin + imleç (TextInput'un üstünde, dokunmayı engellemez) */}
          <Txt
            size={36}
            color={value ? A.text : A.muted}
            style={styles.mirror}
            pointerEvents="none"
            numberOfLines={1}
          >
            {shown}
            <Txt size={36} color={A.text}>
              {focused && blink ? '_' : ' '}
            </Txt>
          </Txt>
          <TextInput
            ref={ref}
            value={value}
            aria-label={label}
            secureTextEntry={secureTextEntry}
            caretHidden
            selectionColor={A.yellow}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[styles.realInput, noBrowserOutline]}
            {...rest}
          />
        </View>
      </View>
      {error ? (
        <Txt size={28} color={A.red} accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

/* ───────────── Piksel sanat ───────────── */

export function PixelArtView({
  art,
  width,
  height,
}: {
  art: keyof typeof PIXEL_ART;
  width: number;
  height: number;
}) {
  const a = PIXEL_ART[art];
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${a.w} ${a.h}`}
      // Tiplerde yok ama web'de DOM'a geçer: piksel kareleri arasında bulanık çizgi oluşmaz.
      {...({ shapeRendering: 'crispEdges' } as Record<string, string>)}
      aria-hidden
    >
      {a.rects.map(([x, y, w, h, fill], i) => (
        <Rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </Svg>
  );
}

/** Ayarlar dişlisi (56×56) — tasarımdaki ikon yolu birebir. */
export function GearIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={A.text}
      strokeWidth={2}
      aria-hidden
    >
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </Svg>
  );
}

const COIN = [
  '..oooo..',
  '.oyyyyo.',
  'oyhyysyo',
  'oyhoosyo',
  'oyhoosyo',
  'oyyyysyo',
  '.oyssso.',
  '..oooo..',
];
const COIN_COL: Record<string, string> = { o: '#7a4a00', y: '#ffc61a', h: '#fff3b0', s: '#e09a10' };

/** Piksel altın sikke. */
export function CoinIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      {...({ shapeRendering: 'crispEdges' } as Record<string, string>)}
    >
      {COIN.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === '.' ? null : (
            <Rect key={x + '-' + y} x={x} y={y} width={1} height={1} fill={COIN_COL[ch]} />
          ),
        ),
      )}
    </Svg>
  );
}

/**
 * Tıklanabilir kutular için ortak durum stili (web): üzerine gelince sarı kenar, hafif kalkış ve
 * belirgin gölge; basınca aşağı iner. Seçili (sarı) kutularda kenar zaten sarı, kalkış yine görünür.
 */
export function hoverable(base: StyleProp<ViewStyle>) {
  return ({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
    base,
    hovered && !pressed ? styles.boxHover : null,
    pressed ? styles.boxPressed : null,
  ];
}

export function IconButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={hoverable(styles.iconBtn)}
    >
      {children}
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: A.bgDeep, overflow: 'hidden' },
    stage: { position: 'absolute', backgroundColor: A.bg, overflow: 'hidden' },
    content: { position: 'absolute' },
    primary: {
      backgroundColor: A.yellow,
      borderWidth: 4,
      borderColor: A.yellowHi,
      boxShadow: `0px 8px 0px ${A.orangeSh}, 0px 14px 0px ${A.bgDeep}`,
      paddingVertical: 22,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryHover: {
      backgroundColor: A.yellowHover,
      transform: [{ translateY: -3 }],
      boxShadow: `0px 11px 0px ${A.orangeSh}, 0px 17px 0px ${A.bgDeep}`,
    },
    secondaryHover: {
      borderColor: A.yellow,
      backgroundColor: A.slot,
      transform: [{ translateY: -2 }],
      boxShadow: `0px 8px 0px ${A.bgDeep}`,
    },
    boxHover: {
      borderColor: A.yellow,
      transform: [{ translateY: -2 }],
      boxShadow: `0px 4px 0px ${A.bgDeep}`,
    },
    boxPressed: { transform: [{ translateY: 3 }], boxShadow: 'none' },
    secondary: {
      backgroundColor: A.input,
      borderWidth: 4,
      borderColor: A.line,
      boxShadow: `0px 6px 0px ${A.bgDeep}`,
      paddingVertical: 16,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chip: {
      backgroundColor: A.input,
      borderWidth: 4,
      borderColor: A.line,
      paddingVertical: 10,
      paddingHorizontal: 18,
    },
    stepsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    stepBar: { width: 48, height: 8 },
    step: {
      borderWidth: 4,
      borderColor: A.line,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    stepActive: {
      backgroundColor: A.yellow,
      borderColor: A.yellowHi,
      boxShadow: `0px 6px 0px ${A.orangeSh}`,
    },
    input: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: A.input,
      borderWidth: 4,
      borderColor: A.line,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    prompt: {},
    inputBox: { flex: 1, height: 40, justifyContent: 'center' },
    mirror: { position: 'absolute', left: 0, right: 0 },
    realInput: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      fontFamily: FONT.vt,
      fontSize: 36,
      color: 'transparent',
      outlineWidth: 0,
      backgroundColor: 'transparent',
    },
    iconBtn: {
      width: 56,
      height: 56,
      backgroundColor: A.input,
      borderWidth: 4,
      borderColor: A.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);
