import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AiLevel } from '@/game';

type SessionState = {
  /** Kalıcı tercih: son seçilen zorluk. */
  aiLevel: AiLevel;
  setAiLevel(level: AiLevel): void;
};

/** Lobi tercihleri. Canlı oyun oturumları services/transport/sessions'ta (serileştirilemez). */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      aiLevel: 'normal',
      setAiLevel: (aiLevel) => set({ aiLevel }),
    }),
    {
      name: 'prefs.session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ aiLevel: s.aiLevel }),
    },
  ),
);
