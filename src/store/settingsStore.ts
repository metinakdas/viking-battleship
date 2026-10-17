import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { applyTheme, type ThemeName } from '@/features/arcade/theme';
import { deviceLocale, isLocale, setLocale, type Locale } from '@/i18n';

type SettingsState = {
  /** Efekt ses seviyesi 0–1 (top, isabet, sıçrama, tıklama). 0 = kapalı. */
  sfxVolume: number;
  /** Müzik ses seviyesi 0–1. 0 = kapalı. */
  musicVolume: number;
  /** Hızlı sessiz: tüm ses kapalı (seviyeler korunur). Ekrandaki hoparlör düğmesi. */
  muted: boolean;
  /** Hareketi azalt: sistem tercihine ek olarak uygulama içinden de açılabilir. */
  reduceMotion: boolean;
  /** Seçilen arayüz dili; null = seçilmedi, tarayıcı/cihaz dili kullanılır. */
  locale: Locale | null;
  /** Gündüz ("güneşli", varsayılan) ya da gece (tasarımın özgün teması). */
  theme: ThemeName;
  setSfxVolume(v: number): void;
  setMusicVolume(v: number): void;
  setMuted(m: boolean): void;
  /** Tüm ayarlar fabrika değerlerine: gündüz, otomatik dil, ses açık (%50 müzik, %80 efekt). */
  resetDefaults(): void;
  setReduceMotion(on: boolean): void;
  /** null = otomatik (tarayıcı/cihaz dili). */
  setLocale(locale: Locale | null): void;
  setTheme(theme: ThemeName): void;
};

/** Fabrika ayarları (ilk açılış ve "varsayılana döndür"). */
const DEFAULTS = {
  sfxVolume: 0.8,
  musicVolume: 0.5,
  muted: false,
  reduceMotion: false,
  locale: null,
  theme: 'day',
} as const satisfies Partial<SettingsState>;

/**
 * Dil ve tema modül düzeyinde uygulanır (t() ve A paleti); kök düzen bu iki değeri anahtar
 * yapıp ağacı yeniden bağlar, böylece her ekran yeni metin ve renklerle çizilir.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setSfxVolume: (v) => set({ sfxVolume: clamp01(v) }),
      setMusicVolume: (v) => set({ musicVolume: clamp01(v) }),
      setMuted: (muted) => set({ muted }),
      resetDefaults: () => {
        applyTheme('day');
        setLocale(deviceLocale());
        set({ ...DEFAULTS });
      },
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setLocale: (locale) => {
        setLocale(locale ?? deviceLocale());
        set({ locale });
      },
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'prefs.settings',
      // v1: varsayılan tema gündüz oldu (eski kendiliğinden yazılmış "gece" sıfırlanır).
      // v2: açık/kapalı ses yerine efekt ve müzik ses seviyeleri.
      version: 2,
      migrate: (persisted, version) => {
        const p = { ...(persisted as Record<string, unknown>) };
        if (version < 1) p.theme = 'day';
        if (version < 2) {
          p.sfxVolume = 0.8;
          p.musicVolume = 0.5;
          delete p.sound;
        }
        return p as Partial<SettingsState>;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        sfxVolume: s.sfxVolume,
        musicVolume: s.musicVolume,
        muted: s.muted,
        reduceMotion: s.reduceMotion,
        locale: s.locale,
        theme: s.theme,
      }),
      onRehydrateStorage: () => (state) => {
        setLocale(state && isLocale(state.locale) ? state.locale : deviceLocale());
        applyTheme(state?.theme === 'night' ? 'night' : 'day');
      },
    },
  ),
);

// İlk açılışta (kayıt yoksa) tarayıcı/cihaz dili hemen geçerli olsun.
setLocale(useSettingsStore.getState().locale ?? deviceLocale());

/** Ekranda geçerli dil (seçilmediyse cihaz dili). */
export const useLocale = (): Locale => useSettingsStore((s) => s.locale) ?? deviceLocale();

function clamp01(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 10) / 10;
}
