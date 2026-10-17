import { readJson, writeJson, type KeyValueStore } from '../storage';
import { newId, randomAvatar } from './identity';
import {
  AuthError,
  type AccountProfile,
  type AuthListener,
  type AuthService,
  type AvatarId,
  type Player,
  type RegisterInput,
} from './types';
import {
  checkNickname,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  normalizeNickname,
} from './validation';

const KEYS = {
  accounts: 'mockAuth.accounts',
  session: 'auth.session',
  guestId: 'auth.guestId',
} as const;

type StoredAccount = {
  player: Player;
  /** YALNIZCA MOCK: güvenlik sağlamaz. Gerçek sağlayıcı şifreyi hiç görmeyecek. */
  passwordHash: string;
  profile: AccountProfile;
};

type Accounts = Record<string, StoredAccount>;
type Session = { player: Player; email: string | null };

export type MockAuthOptions = {
  /** Ağ gecikmesi taklidi (ms). Testlerde 0. */
  latencyMs?: number;
  /** Tarih/kimlik üretimini testte sabitlemek için. */
  now?: () => Date;
  idFactory?: (prefix: string) => string;
};

/** Cihazda saklayan sahte kimlik servisi. Arayüz gerçek sağlayıcıyla aynı. */
export class MockAuthService implements AuthService {
  private readonly listeners = new Set<AuthListener>();
  private readonly latencyMs: number;
  private readonly now: () => Date;
  private readonly idFactory: (prefix: string) => string;

  constructor(
    private readonly store: KeyValueStore,
    options: MockAuthOptions = {},
  ) {
    this.latencyMs = options.latencyMs ?? 300;
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? newId;
  }

  async getCurrentUser(): Promise<Player | null> {
    const session = await readJson<Session>(this.store, KEYS.session);
    return session?.player ?? null;
  }

  /** Kullanıcı adı ya da e-posta ile giriş. */
  async login(identifier: string, password: string): Promise<Player> {
    await this.delay();
    const accounts = await this.accounts();
    const name = normalizeNickname(identifier).toLocaleLowerCase('tr');
    const account =
      accounts[normalizeEmail(identifier)] ??
      Object.values(accounts).find((a) => a.player.displayName.toLocaleLowerCase('tr') === name);
    if (!account || account.passwordHash !== mockHash(password)) {
      throw new AuthError('invalid_credentials');
    }
    await this.setSession({ player: account.player, email: account.profile.email });
    return account.player;
  }

  async register(input: RegisterInput): Promise<Player> {
    await this.delay();
    const player = await this.createAccount(input, this.idFactory('usr'));
    await this.setSession({ player, email: normalizeEmail(input.email) });
    return player;
  }

  async continueAsGuest(nickname: string, avatar?: AvatarId): Promise<Player> {
    await this.delay();
    if (checkNickname(nickname)) throw new AuthError('invalid_nickname');
    let guestId = await this.store.getItem(KEYS.guestId);
    if (!guestId) {
      guestId = this.idFactory('guest');
      await this.store.setItem(KEYS.guestId, guestId);
    }
    const player: Player = {
      id: guestId,
      displayName: normalizeNickname(nickname),
      avatar: avatar ?? randomAvatar(),
      isGuest: true,
    };
    await this.setSession({ player, email: null });
    return player;
  }

  async upgradeGuestToAccount(input: RegisterInput): Promise<Player> {
    await this.delay();
    const session = await readJson<Session>(this.store, KEYS.session);
    if (!session) throw new AuthError('not_signed_in');
    if (!session.player.isGuest) throw new AuthError('not_guest');
    const player = await this.createAccount(input, session.player.id, session.player.avatar);
    // Kimlik artık hesaba ait: bu cihazdaki bir sonraki misafir yeni kimlik alır.
    await this.store.removeItem(KEYS.guestId);
    await this.setSession({ player, email: normalizeEmail(input.email) });
    return player;
  }

  async getProfile(playerId: string): Promise<AccountProfile | null> {
    const account = Object.values(await this.accounts()).find((a) => a.player.id === playerId);
    return account?.profile ?? null;
  }

  async logout(): Promise<void> {
    await this.store.removeItem(KEYS.session);
    this.emit(null);
  }

  onAuthChange(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async createAccount(
    input: RegisterInput,
    id: string,
    avatar: AvatarId = randomAvatar(),
  ): Promise<Player> {
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) throw new AuthError('invalid_email');
    if (!isValidPassword(input.password)) throw new AuthError('weak_password');
    if (checkNickname(input.displayName)) throw new AuthError('invalid_nickname');

    const accounts = await this.accounts();
    if (accounts[email]) throw new AuthError('email_taken');
    // Kullanıcı adıyla giriş yapılabildiği için ad da benzersiz olmalı (misafirin kendi adı hariç).
    const wanted = normalizeNickname(input.displayName).toLocaleLowerCase('tr');
    if (
      Object.values(accounts).some((a) => a.player.displayName.toLocaleLowerCase('tr') === wanted)
    ) {
      throw new AuthError('name_taken');
    }

    const player: Player = {
      id,
      displayName: normalizeNickname(input.displayName),
      avatar,
      isGuest: false,
    };
    accounts[email] = {
      player,
      passwordHash: mockHash(input.password),
      profile: {
        email,
        createdAt: this.now().toISOString(),
        stats: { played: 0, won: 0, shots: 0, hits: 0 },
      },
    };
    await writeJson(this.store, KEYS.accounts, accounts);
    return player;
  }

  private async accounts(): Promise<Accounts> {
    return (await readJson<Accounts>(this.store, KEYS.accounts)) ?? {};
  }

  private async setSession(session: Session): Promise<void> {
    await writeJson(this.store, KEYS.session, session);
    this.emit(session.player);
  }

  private emit(player: Player | null): void {
    for (const l of this.listeners) l(player);
  }

  private delay(): Promise<void> {
    return this.latencyMs > 0
      ? new Promise((resolve) => setTimeout(resolve, this.latencyMs))
      : Promise.resolve();
  }
}

/** YALNIZCA MOCK: düz metni saklamamak için FNV-1a. Kriptografik DEĞİL. */
function mockHash(password: string): string {
  let h = 2166136261;
  const salted = `amiral-batti:${password}`;
  for (let i = 0; i < salted.length; i++) h = Math.imul(h ^ salted.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}
