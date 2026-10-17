import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { GameRecord } from '@/features/records/score';

const MAX_RECORDS = 200;

type RecordsState = {
  records: readonly GameRecord[];
  add(record: GameRecord): void;
};

/** Biten oyunlar (cihazda). Rekor tablosu, HUD skorları ve kaptan kartı buradan okur. */
export const useRecordsStore = create<RecordsState>()(
  persist(
    (set) => ({
      records: [],
      add: (record) =>
        set((s) =>
          s.records.some((r) => r.id === record.id)
            ? s
            : { records: [...s.records, record].slice(-MAX_RECORDS) },
        ),
    }),
    {
      name: 'records.games',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ records: s.records }),
    },
  ),
);
