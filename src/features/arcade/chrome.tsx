import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Svg, { Rect } from 'react-native-svg';

import { LOCALES, t } from '@/i18n';
import { useLocale, useSettingsStore } from '@/store/settingsStore';
import { useWallet } from '@/store/walletStore';

import {
  GearIcon,
  IconButton,
  Panel,
  PixelArtView,
  PxButton,
  Steps,
  Txt,
  type StepState,
  useLayout,
  useStageModal,
  hoverable,
  CoinIcon,
} from './kit';
import { A, titleShadow, themed } from './theme';

/** Üst çubuk paneli (tasarım §5.2): ikon + başlık | adım hapları | chip'ler + ayarlar. */
export function GameHeader({
  steps,
  right,
  onBack,
  backLabel,
}: {
  steps?: readonly { label: string; state: StepState }[];
  right?: ReactNode;
  /** Sol başta "◀" geri düğmesi (ör. yerleştirmeden menüye). */
  onBack?: () => void;
  backLabel?: string;
}) {
  const [settings, setSettings] = useState(false);
  const { portrait } = useLayout();
  return (
    <>
      <Panel style={portrait ? styles.headerP : styles.header}>
        <View style={styles.brand}>
          {onBack ? (
            <IconButton label={backLabel ?? t('arcade.nav.back')} onPress={onBack}>
              <BackIcon />
            </IconButton>
          ) : null}
          {/* Dikeyde sağdaki düğmelere yer kalsın diye logo gizli. */}
          {portrait ? null : <PixelArtView art="headerShip" width={120} height={40} />}
          {/* Dikeyde yer dar: başlık kapak ve girişte zaten var; adımlar gizlenir. */}
          {portrait ? null : (
            <View style={{ gap: 6 }}>
              <Txt
                font="press"
                size={28}
                ls={2}
                color={A.yellow}
                shadow={titleShadow(3, false).textShadow}
                numberOfLines={1}
                accessibilityRole="header"
              >
                AMİRAL BATTI
              </Txt>
              <Txt size={28} lh={1} ls={3} color={A.cyan}>
                {t('arcade.header.tagline')}
              </Txt>
            </View>
          )}
        </View>
        {steps && !portrait ? <Steps steps={steps} /> : null}
        <View style={styles.right}>
          {right}
          <MuteButton />
          <IconButton label={t('common.settings')} onPress={() => setSettings(true)}>
            <GearIcon />
          </IconButton>
        </View>
      </Panel>
      {settings ? <SettingsModal onClose={() => setSettings(false)} /> : null}
    </>
  );
}

/** Tuvalin üstünde ortalanmış piksel pencere (arka plan kararır). */
export function PxModal({
  title,
  children,
  onClose,
  width = 760,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
}) {
  // Mobilde (720 px tuval) pencere ekrana sığsın.
  const { portrait, W } = useLayout();
  const w = portrait ? Math.min(width, W - 40) : width;
  return (
    <View style={styles.backdrop} accessibilityViewIsModal>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel={t('common.close')}
      />
      <Panel style={[styles.modal, { width: w }, portrait && { padding: 28, gap: 22 }]}>
        <Txt font="press" size={28} color={A.yellow} accessibilityRole="header">
          {title}
        </Txt>
        {children}
      </Panel>
    </View>
  );
}

/** Header'sız ekranlar (kapak, giriş) için sağ üst köşede ayarlar düğmesi. */
export function SettingsButton({ style }: { style?: object }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={[styles.cornerGear, style]}>
        <LangButton />
        <ThemeButton />
        <MuteButton />
        <IconButton label={t('common.settings')} onPress={() => setOpen(true)}>
          <GearIcon />
        </IconButton>
      </View>
      {open ? <SettingsModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Kese: altın bakiyesi; dokununca market. */
export function CoinChip() {
  const { gold } = useWallet();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('arcade.shop.title') + ': ' + gold}
      onPress={() => router.push('/shop')}
      style={hoverable(styles.coinChip)}
    >
      <CoinIcon size={28} />
      <Txt font="press" size={24} color={A.yellow} shadow={'2px 2px 0px ' + A.bgDeep}>
        {String(gold)}
      </Txt>
    </Pressable>
  );
}

/** Gece/gündüz: tek dokunuşla tema değişir. Simge şu anki temayı gösterir (güneş / ay). */
export function ThemeButton() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const day = theme === 'day';
  return (
    <IconButton
      label={
        t('arcade.settings.theme') +
        ': ' +
        (day ? t('arcade.settings.day') : t('arcade.settings.night'))
      }
      onPress={() => setTheme(day ? 'night' : 'day')}
    >
      <SunMoonIcon day={day} />
    </IconButton>
  );
}

const SUN = [
  '.....#.....',
  '.#.......#.',
  '...#####...',
  '..#######..',
  '..#######..',
  '#.#######.#',
  '..#######..',
  '..#######..',
  '...#####...',
  '.#.......#.',
  '.....#.....',
];
const MOON = [
  '....####...',
  '..###......',
  '.###.......',
  '.##........',
  '###........',
  '###........',
  '###.......#',
  '.###.....##',
  '.#######.#.',
  '..######...',
  '....###....',
];

function SunMoonIcon({ day }: { day: boolean }) {
  const rows = day ? SUN : MOON;
  const c = day ? A.yellow : A.periwinkle;
  return (
    <Svg
      width={33}
      height={33}
      viewBox="0 0 11 11"
      {...({ shapeRendering: 'crispEdges' } as Record<string, string>)}
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === '#' ? <Rect key={x + '-' + y} x={x} y={y} width={1} height={1} fill={c} /> : null,
        ),
      )}
    </Svg>
  );
}

const BACK = [
  '....#......',
  '...##......',
  '..###......',
  '.##########',
  '###########',
  '.##########',
  '..###......',
  '...##......',
  '....#......',
];

/** Piksel "◀" geri oku. */
export function BackIcon() {
  return (
    <Svg
      width={30}
      height={26}
      viewBox="0 0 11 9"
      {...({ shapeRendering: 'crispEdges' } as Record<string, string>)}
    >
      {BACK.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === '#' ? (
            <Rect key={x + '-' + y} x={x} y={y} width={1} height={1} fill={A.text} />
          ) : null,
        ),
      )}
    </Svg>
  );
}

/** Hızlı sessiz: tek dokunuşla tüm ses (müzik + efekt) kapanır/açılır; seviyeler korunur. */
export function MuteButton() {
  const muted = useSettingsStore((s) => s.muted);
  const setMuted = useSettingsStore((s) => s.setMuted);
  return (
    <IconButton
      label={muted ? t('arcade.settings.unmute') : t('arcade.settings.mute')}
      onPress={() => setMuted(!muted)}
    >
      <SpeakerIcon on={!muted} />
    </IconButton>
  );
}

/**
 * Ayarlar düğmesinin yanındaki dil düğmesi: geçerli dilin kodu ("TR"). Açılan listede 6 dil ve
 * "otomatik" (tarayıcı dili). Seçim hemen uygulanır; ekran yeni dille yeniden kurulur.
 */
export function LangButton() {
  const showModal = useStageModal();
  const current = useLocale();
  const chosen = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const close = () => showModal(null);
  const pick = (l: Parameters<typeof setLocale>[0]) => {
    close();
    setLocale(l);
  };
  const setOpen = (open: boolean) => (open ? showModal(modal) : close());
  const modal = (
    <PxModal title={t('arcade.lang.title')} onClose={close} width={600}>
      <View style={{ gap: 10 }} role="radiogroup" aria-label={t('arcade.lang.title')}>
        {[{ id: null, name: t('arcade.lang.auto') }, ...LOCALES].map((l) => {
          const on = chosen === l.id;
          return (
            <Pressable
              key={l.id ?? 'auto'}
              role="radio"
              aria-checked={on}
              accessibilityLabel={l.name}
              onPress={() => pick(l.id)}
              style={hoverable([styles.switchOpt, styles.langRow, on && styles.switchOn])}
            >
              <Txt size={34} lh={1} color={on ? A.ink : A.text}>
                {l.name}
              </Txt>
              <Txt font="press" size={24} color={on ? A.ink : A.muted}>
                {l.id ? l.id.toUpperCase() : current.toUpperCase()}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </PxModal>
  );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          t('arcade.lang.title') + ': ' + (LOCALES.find((l) => l.id === current)?.name ?? '')
        }
        onPress={() => setOpen(true)}
        style={hoverable(styles.langBtn)}
      >
        <Txt font="press" size={24} color={A.text}>
          {current.toUpperCase()}
        </Txt>
      </Pressable>
    </>
  );
}

/** Tema (gece/gündüz). Dil, ayarlar düğmesinin yanındaki dil düğmesinde. */
function PrefsPicker() {
  const { theme, setTheme, locale: chosen, setLocale } = useSettingsStore();
  const current = useLocale();
  return (
    <>
      {/* Dil: otomatik (tarayıcı) + 6 dil, iki sütun. Kapak ve girişte ayrıca dil düğmesi var. */}
      <View style={{ gap: 12 }}>
        <Txt size={34} lh={1}>
          {t('arcade.lang.title')}
        </Txt>
        <View style={styles.langGrid} role="radiogroup" aria-label={t('arcade.lang.title')}>
          {[{ id: null, name: t('arcade.lang.auto') }, ...LOCALES].map((l) => {
            const on = chosen === l.id;
            return (
              <Pressable
                key={l.id ?? 'auto'}
                role="radio"
                aria-checked={on}
                accessibilityLabel={l.name}
                onPress={() => setLocale(l.id)}
                style={hoverable([
                  styles.switchOpt,
                  styles.langRow,
                  styles.langCell,
                  on && styles.switchOn,
                ])}
              >
                <Txt
                  size={30}
                  lh={1}
                  color={on ? A.ink : A.text}
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {l.name}
                </Txt>
                <Txt font="press" size={24} color={on ? A.ink : A.muted}>
                  {l.id ? l.id.toUpperCase() : current.toUpperCase()}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.switchRow}>
        <Txt size={34} lh={1} style={{ flex: 1 }}>
          {t('arcade.settings.theme')}
        </Txt>
        <View style={styles.switch} role="radiogroup" aria-label={t('arcade.settings.theme')}>
          {(['night', 'day'] as const).map((k) => (
            <Pressable
              key={k}
              role="radio"
              aria-checked={theme === k}
              onPress={() => setTheme(k)}
              style={hoverable([styles.switchOpt, theme === k && styles.switchOn])}
            >
              <Txt font="press" size={24} color={theme === k ? A.ink : A.muted}>
                {`${k === 'night' ? '☾' : '☀'} ${t(`arcade.settings.${k}`)}`}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const {
    reduceMotion,
    setReduceMotion,
    musicVolume,
    sfxVolume,
    setMusicVolume,
    setSfxVolume,
    resetDefaults,
  } = useSettingsStore();
  // İki adım: ilk dokunuş sorar, ikincisi sıfırlar (yanlışlıkla silinmesin).
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <PxModal title={t('arcade.settings.title')} onClose={onClose} width={860}>
      <PrefsPicker />
      <VolumeRow label={t('arcade.settings.music')} value={musicVolume} onChange={setMusicVolume} />
      <VolumeRow label={t('arcade.settings.sfx')} value={sfxVolume} onChange={setSfxVolume} />
      <PxSwitch
        label={t('arcade.settings.motion')}
        value={reduceMotion}
        onChange={setReduceMotion}
      />
      <View style={styles.actions}>
        <PxButton
          label={confirmReset ? t('arcade.settings.resetConfirm') : t('arcade.settings.reset')}
          variant="secondary"
          size={24}
          onPress={() => {
            if (!confirmReset) return setConfirmReset(true);
            setConfirmReset(false);
            resetDefaults();
          }}
          style={[{ flex: 1 }, confirmReset && { borderColor: A.red }]}
          textStyle={confirmReset ? { color: A.red } : undefined}
        />
        <PxButton
          label={t('arcade.settings.close')}
          variant="secondary"
          size={24}
          onPress={onClose}
          style={{ flex: 1 }}
        />
      </View>
    </PxModal>
  );
}

/**
 * Ses seviyesi: hoparlör (dokununca sessiz / geri aç) + 10 parçalı piksel çubuk (her parça %10,
 * dokunulan parçaya kadar dolar) + yüzde.
 */
function VolumeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [last, setLast] = useState(value > 0 ? value : 0.6);
  const level = Math.round(value * 10);
  return (
    <View style={styles.switchRow}>
      <Txt size={34} lh={1} style={{ width: 200 }} numberOfLines={1}>
        {label}
      </Txt>
      <Pressable
        role="switch"
        aria-checked={value > 0}
        accessibilityLabel={label}
        onPress={() => {
          if (value > 0) {
            setLast(value);
            onChange(0);
          } else onChange(last);
        }}
        style={hoverable(styles.speaker)}
      >
        <SpeakerIcon on={value > 0} />
      </Pressable>
      <View
        style={styles.volBar}
        role="slider"
        aria-valuenow={level * 10}
        aria-valuemin={0}
        aria-valuemax={100}
        accessibilityLabel={label}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <Pressable
            key={i}
            accessibilityLabel={label + ' %' + (i + 1) * 10}
            onPress={() => onChange((i + 1) / 10)}
            style={({ hovered }: { hovered?: boolean }) => [
              styles.volCell,
              { height: 18 + i * 3 },
              i < level && styles.volOn,
              hovered && styles.volHover,
            ]}
          />
        ))}
      </View>
      <Txt
        font="press"
        size={24}
        color={value > 0 ? A.text : A.muted}
        align="right"
        style={{ width: 92 }}
      >
        {'%' + level * 10}
      </Txt>
    </View>
  );
}

function SpeakerIcon({ on }: { on: boolean }) {
  const c = on ? A.text : A.muted;
  return (
    <Svg
      width={30}
      height={30}
      viewBox="0 0 10 10"
      {...({ shapeRendering: 'crispEdges' } as Record<string, string>)}
    >
      <Rect x={1} y={3} width={2} height={4} fill={c} />
      <Rect x={3} y={2} width={1} height={6} fill={c} />
      <Rect x={4} y={1} width={1} height={8} fill={c} />
      {on ? (
        <>
          <Rect x={6} y={4} width={1} height={2} fill={c} />
          <Rect x={7} y={2} width={1} height={1} fill={c} />
          <Rect x={8} y={3} width={1} height={4} fill={c} />
          <Rect x={7} y={7} width={1} height={1} fill={c} />
        </>
      ) : (
        <>
          <Rect x={6} y={3} width={1} height={1} fill={A.red} />
          <Rect x={7} y={4} width={1} height={2} fill={A.red} />
          <Rect x={8} y={3} width={1} height={1} fill={A.red} />
          <Rect x={6} y={6} width={1} height={1} fill={A.red} />
          <Rect x={8} y={6} width={1} height={1} fill={A.red} />
        </>
      )}
    </Svg>
  );
}

/** Piksel anahtar: [AÇIK] [KAPALI] — seçili olan sarı. */
export function PxSwitch({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt size={34} lh={1}>
          {label}
        </Txt>
        {hint ? (
          <Txt size={26} lh={1} color={A.muted}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <View style={styles.switch} role="switch" aria-checked={value} accessibilityLabel={label}>
        {[true, false].map((v) => (
          <Pressable
            key={String(v)}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${v ? t('arcade.settings.on') : t('arcade.settings.off')}`}
            style={hoverable([styles.switchOpt, value === v && styles.switchOn])}
          >
            <Txt font="press" size={24} color={value === v ? A.ink : A.muted}>
              {v ? t('arcade.settings.on') : t('arcade.settings.off')}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Evet/Hayır onay penceresi (ör. teslim ol). */
export function ConfirmModal({
  title,
  message,
  confirm,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirm: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <PxModal title={title} onClose={onCancel} width={700}>
      <Txt size={34} color={A.textSoft}>
        {message}
      </Txt>
      <View style={styles.actions}>
        <PxButton label={confirm} onPress={onConfirm} style={{ flex: 1 }} size={24} />
        <PxButton
          label={t('arcade.confirm.cancel')}
          variant="secondary"
          onPress={onCancel}
          style={{ flex: 1 }}
        />
      </View>
    </PxModal>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    header: {
      position: 'absolute',
      left: 56,
      top: 36,
      width: 1808,
      height: 96,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 28,
    },
    headerP: {
      position: 'absolute',
      left: 20,
      top: 20,
      width: 680,
      height: 84,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    right: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    backdrop: {
      // İçerik kutusunun dışına taşar: geniş/uzun ekranda kenarlar da kararsın (simetrik, merkez aynı).
      position: 'absolute',
      top: -2000,
      bottom: -2000,
      left: -2000,
      right: -2000,
      backgroundColor: 'rgba(3,3,12,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    },
    modal: { padding: 40, gap: 28 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
    switch: { flexDirection: 'row', gap: 8 },
    switchOpt: {
      borderWidth: 4,
      borderColor: A.line,
      backgroundColor: A.input,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    optGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    optCell: { width: 250, alignItems: 'center' },
    langBtn: {
      height: 56,
      minWidth: 72,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: A.line,
      backgroundColor: A.input,
      boxShadow: `0px 4px 0px ${A.bgDeep}`,
    },
    coinChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 56,
      paddingHorizontal: 14,
      borderWidth: 4,
      borderColor: A.yellow,
      backgroundColor: A.input,
    },
    speaker: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: A.line,
      backgroundColor: A.input,
    },
    volBar: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 48 },
    volCell: { flex: 1, backgroundColor: A.input, borderWidth: 3, borderColor: A.lineDim },
    volOn: { backgroundColor: A.yellow, borderColor: A.orangeSh },
    volHover: { borderColor: A.yellow },
    langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    langCell: { width: '48.5%', gap: 12 },
    langRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cornerGear: {
      position: 'absolute',
      right: 56,
      top: 36,
      zIndex: 20,
      flexDirection: 'row',
      gap: 12,
    },
    switchOn: { backgroundColor: A.yellow, borderColor: A.yellowHi },
    actions: { flexDirection: 'row', gap: 16 },
  }),
);
