/** Avatar: "run:renk", ör. "algiz:red". Kalkan üstünde run olarak çizilir (features/auth/Avatar). */
export type AvatarId = `${string}:${string}`;

/** Her yerde kullanılan oyuncu kimliği. Misafir ve girişli aynı şekle sahiptir. */
export type Player = {
  readonly id: string;
  readonly displayName: string;
  readonly avatar: AvatarId;
  readonly isGuest: boolean;
};

export type PlayerStats = {
  readonly played: number;
  readonly won: number;
  readonly shots: number;
  readonly hits: number;
};

/** Girişli kullanıcının ek bilgileri (şimdilik mock). */
export type AccountProfile = {
  readonly email: string;
  readonly createdAt: string;
  readonly stats: PlayerStats;
};

export type AuthErrorCode =
  | 'invalid_email'
  | 'weak_password'
  | 'invalid_nickname'
  | 'email_taken'
  | 'invalid_credentials'
  | 'not_guest'
  | 'not_signed_in';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
  }
}

export type RegisterInput = { email: string; password: string; displayName: string };

export type AuthListener = (player: Player | null) => void;

/**
 * Kimlik servisi. Şimdilik MockAuthService (cihazda saklar); gerçek sağlayıcı (ör. Supabase)
 * aynı arayüzle sonra takılacak.
 */
export interface AuthService {
  /** Uygulama açılışında kayıtlı oturumu yükler. */
  getCurrentUser(): Promise<Player | null>;
  loginWithEmail(email: string, password: string): Promise<Player>;
  register(input: RegisterInput): Promise<Player>;
  continueAsGuest(nickname: string, avatar?: AvatarId): Promise<Player>;
  /** Misafiri hesaba yükseltir; oyuncu kimliği (id) korunur. */
  upgradeGuestToAccount(input: RegisterInput): Promise<Player>;
  getProfile(playerId: string): Promise<AccountProfile | null>;
  logout(): Promise<void>;
  onAuthChange(listener: AuthListener): () => void;
}
