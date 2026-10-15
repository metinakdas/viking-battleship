import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type SettingsState = {
  /** Ses efektleri (top atışı, su sıçraması, batma). Varsayılan kapalı. */
  sound: boolean;
  /** Hareketi azalt: sistem tercihine ek olarak uygulama içinden de açılabilir. */
  reduceMotion: boolean;
  setSound(on: boolean): void;
  setReduceMotion(on: boolean): void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sound: false,
      reduceMotion: false,
      setSound: (sound) => set({ sound }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    {
      name: 'prefs.settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ sound: s.sound, reduceMotion: s.reduceMotion }),
    },
  ),
);
