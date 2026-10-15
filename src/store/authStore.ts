import { create } from 'zustand';

import { services } from '@/services';
import type { AvatarId, Player, RegisterInput } from '@/services/auth';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: AuthStatus;
  player: Player | null;
  /** Uygulama açılışında bir kez: kayıtlı oturumu yükler ve değişikliklere abone olur. */
  init(): Promise<void>;
  loginWithEmail(email: string, password: string): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  continueAsGuest(nickname: string, avatar?: AvatarId): Promise<void>;
  upgradeGuestToAccount(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
};

let unsubscribe: (() => void) | null = null;

/**
 * İnce bir köprü: durum servisten gelir (onAuthChange). Eylemler AuthError fırlatabilir;
 * hatayı form gösterir.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  player: null,

  async init() {
    const { auth } = services;
    unsubscribe?.();
    unsubscribe = auth.onAuthChange((player) =>
      set({ player, status: player ? 'signedIn' : 'signedOut' }),
    );
    const player = await auth.getCurrentUser();
    set({ player, status: player ? 'signedIn' : 'signedOut' });
  },

  async loginWithEmail(email, password) {
    await services.auth.loginWithEmail(email, password);
  },
  async register(input) {
    await services.auth.register(input);
  },
  async continueAsGuest(nickname, avatar) {
    await services.auth.continueAsGuest(nickname, avatar);
  },
  async upgradeGuestToAccount(input) {
    await services.auth.upgradeGuestToAccount(input);
  },
  async logout() {
    await services.auth.logout();
  },
}));
