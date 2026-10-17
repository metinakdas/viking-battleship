import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  COIN_PACKS,
  DEFAULT_EQUIPPED,
  ECONOMY,
  itemById,
  type CosmeticKind,
} from '@/features/shop/catalog';

import { useAuthStore } from './authStore';

export type Wallet = {
  gold: number;
  /** Satın alınan kozmetikler (ücretsiz varsayılanlar her zaman sahiplidir). */
  owned: string[];
  equipped: Record<CosmeticKind, string>;
};

export type BuyResult = 'ok' | 'owned' | 'poor' | 'unknown';

type WalletState = {
  /** Oyuncu kimliğine göre cüzdanlar (cihazda; gerçek sunucu gelince oradan). */
  wallets: Record<string, Wallet>;
  /** Ödülü verilmiş maç kayıtları (aynı maç iki kez ödüllenmesin). */
  rewarded: string[];
  /** Maç sonu: kazanınca altın eklenir, kaybedince düşer (0'ın altına inmez). */
  reward(playerId: string, recordId: string, delta: number): void;
  /** Bedel öder; yetmezse false. */
  spend(playerId: string, amount: number): boolean;
  buyItem(playerId: string, itemId: string): BuyResult;
  equip(playerId: string, itemId: string): void;
  /** Market altın paketi (demo: gerçek ödeme alınmaz). */
  buyPack(playerId: string, packId: string): void;
};

export const newWallet = (): Wallet => ({
  gold: ECONOMY.start,
  owned: [],
  equipped: { ...DEFAULT_EQUIPPED },
});

export const walletOf = (s: Pick<WalletState, 'wallets'>, playerId: string | undefined): Wallet =>
  (playerId && s.wallets[playerId]) || newWallet();

export const isOwned = (w: Wallet, itemId: string) =>
  w.owned.includes(itemId) || itemById(itemId)?.price === 0;

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => {
      const update = (playerId: string, fn: (w: Wallet) => Wallet) =>
        set((s) => ({ wallets: { ...s.wallets, [playerId]: fn(walletOf(s, playerId)) } }));
      return {
        wallets: {},
        rewarded: [],
        reward: (playerId, recordId, delta) => {
          if (get().rewarded.includes(recordId)) return;
          set((s) => ({ rewarded: [...s.rewarded, recordId].slice(-300) }));
          update(playerId, (w) => ({ ...w, gold: Math.max(0, w.gold + delta) }));
        },
        spend: (playerId, amount) => {
          const w = walletOf(get(), playerId);
          if (w.gold < amount) return false;
          update(playerId, (x) => ({ ...x, gold: x.gold - amount }));
          return true;
        },
        buyItem: (playerId, itemId) => {
          const item = itemById(itemId);
          if (!item) return 'unknown';
          const w = walletOf(get(), playerId);
          if (isOwned(w, itemId)) return 'owned';
          if (w.gold < item.price) return 'poor';
          update(playerId, (x) => ({
            ...x,
            gold: x.gold - item.price,
            owned: [...x.owned, itemId],
          }));
          return 'ok';
        },
        equip: (playerId, itemId) => {
          const item = itemById(itemId);
          if (!item) return;
          update(playerId, (x) =>
            isOwned(x, itemId) ? { ...x, equipped: { ...x.equipped, [item.kind]: itemId } } : x,
          );
        },
        buyPack: (playerId, packId) => {
          const pack = COIN_PACKS.find((p) => p.id === packId);
          if (!pack) return;
          update(playerId, (x) => ({ ...x, gold: x.gold + pack.gold }));
        },
      };
    },
    {
      name: 'wallet',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ wallets: s.wallets, rewarded: s.rewarded }),
    },
  ),
);

/** Girişli oyuncunun cüzdanı (yoksa yeni kese). */
export function useWallet(): Wallet & { playerId: string | undefined } {
  const playerId = useAuthStore((s) => s.player?.id);
  const wallet = useWalletStore((s) => (playerId ? s.wallets[playerId] : undefined));
  return { ...(wallet ?? newWallet()), playerId };
}
