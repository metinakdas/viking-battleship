import { describe, expect, it } from 'vitest';

import { MemoryStore } from '../storage';
import { parseAvatar, randomAvatar, randomNickname } from './identity';
import { MockAuthService } from './MockAuthService';
import { AuthError, type Player } from './types';
import { checkNickname, isValidEmail, normalizeNickname } from './validation';

function setup(store = new MemoryStore()) {
  let n = 0;
  const auth = new MockAuthService(store, {
    latencyMs: 0,
    idFactory: (p) => `${p}_${++n}`,
    now: () => new Date('2026-10-15T12:00:00Z'),
  });
  return { auth, store };
}

const ACCOUNT = { email: 'Ragnar@Kattegat.no', password: 'valhalla', displayName: 'Ragnar' };

async function expectAuthError(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(AuthError);
  await expect(p).rejects.toMatchObject({ code });
}

describe('doğrulama', () => {
  it('takma ad', () => {
    expect(checkNickname('Ivar')).toBeNull();
    expect(checkNickname('Freydís Ø')).toBeNull();
    expect(checkNickname('Kızıl Şahin_2')).toBeNull();
    expect(checkNickname('ab')).toBe('too_short');
    expect(checkNickname('   ab   ')).toBe('too_short');
    expect(checkNickname('a'.repeat(17))).toBe('too_long');
    expect(checkNickname('<script>')).toBe('invalid_chars');
    expect(normalizeNickname('  Demir   Björn ')).toBe('Demir Björn');
  });

  it('e-posta', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.de')).toBe(false);
  });

  it('rastgele takma adlar her zaman geçerli', () => {
    for (let i = 0; i < 200; i++) expect(checkNickname(randomNickname())).toBeNull();
  });

  it('avatar üretimi ve ayrıştırma', () => {
    const a = randomAvatar(() => 0);
    expect(a).toBe('algiz:red');
    expect(parseAvatar('tiwaz:blue')).toEqual({ rune: 'tiwaz', color: 'blue' });
    expect(parseAvatar('bozuk')).toEqual({ rune: 'algiz', color: 'red' });
  });
});

describe('MockAuthService: misafir', () => {
  it('misafir girişi: takma ad normalize, isGuest, oturum kalıcı', async () => {
    const { auth, store } = setup();
    const p = await auth.continueAsGuest('  Demir  Björn ', 'tiwaz:gold');
    expect(p).toEqual({
      id: 'guest_1',
      displayName: 'Demir Björn',
      avatar: 'tiwaz:gold',
      isGuest: true,
    });
    // Uygulama yeniden açılınca (yeni servis örneği, aynı depo) oturum sürer.
    expect(await setup(store).auth.getCurrentUser()).toEqual(p);
  });

  it('guestId cihazda saklanır: çıkış yapıp yeniden misafir olunca aynı kimlik', async () => {
    const { auth } = setup();
    const a = await auth.continueAsGuest('Ivar');
    await auth.logout();
    expect(await auth.getCurrentUser()).toBeNull();
    const b = await auth.continueAsGuest('Başka Ad');
    expect(b.id).toBe(a.id);
    expect(b.displayName).toBe('Başka Ad');
  });

  it('geçersiz takma ad reddedilir', async () => {
    await expectAuthError(setup().auth.continueAsGuest('x'), 'invalid_nickname');
  });
});

describe('MockAuthService: hesap', () => {
  it('kayıt → çıkış → giriş (e-posta büyük/küçük harf duyarsız)', async () => {
    const { auth } = setup();
    const reg = await auth.register(ACCOUNT);
    expect(reg).toMatchObject({ id: 'usr_1', displayName: 'Ragnar', isGuest: false });
    await auth.logout();
    const login = await auth.login('  ragnar@kattegat.NO ', 'valhalla');
    expect(login).toEqual(reg);
    expect(await auth.getProfile(reg.id)).toMatchObject({
      email: 'ragnar@kattegat.no',
      createdAt: '2026-10-15T12:00:00.000Z',
      stats: { played: 0, won: 0 },
    });
  });

  it('kullanıcı adıyla giriş (büyük/küçük harf duyarsız); ad benzersiz', async () => {
    const { auth } = setup();
    const reg = await auth.register(ACCOUNT);
    await auth.logout();
    expect(await auth.login('  RAGNAR ', 'valhalla')).toEqual(reg);
    await expectAuthError(
      auth.register({ ...ACCOUNT, email: 'baska@kattegat.no', displayName: 'ragnar' }),
      'name_taken',
    );
  });

  it('yanlış şifre ve bilinmeyen e-posta aynı hatayı verir (hesap varlığı sızmaz)', async () => {
    const { auth } = setup();
    await auth.register(ACCOUNT);
    await expectAuthError(auth.login(ACCOUNT.email, 'yanlış1'), 'invalid_credentials');
    await expectAuthError(auth.login('yok@yok.com', 'valhalla'), 'invalid_credentials');
  });

  it('kayıt doğrulamaları', async () => {
    const { auth } = setup();
    await expectAuthError(auth.register({ ...ACCOUNT, email: 'bozuk' }), 'invalid_email');
    await expectAuthError(auth.register({ ...ACCOUNT, password: '123' }), 'weak_password');
    await expectAuthError(auth.register({ ...ACCOUNT, displayName: '!' }), 'invalid_nickname');
    await auth.register(ACCOUNT);
    await expectAuthError(auth.register({ ...ACCOUNT, displayName: 'Başka' }), 'email_taken');
  });

  it('şifre düz metin olarak saklanmaz', async () => {
    const { auth, store } = setup();
    await auth.register(ACCOUNT);
    expect(await store.getItem('mockAuth.accounts')).not.toContain('valhalla');
  });
});

describe('MockAuthService: misafiri hesaba yükseltme', () => {
  it('kimlik ve avatar korunur, misafir rozeti kalkar', async () => {
    const { auth } = setup();
    const guest = await auth.continueAsGuest('Lagertha', 'othala:green');
    const upgraded = await auth.upgradeGuestToAccount({ ...ACCOUNT, displayName: 'Lagertha' });
    expect(upgraded).toEqual({ ...guest, isGuest: false });
    expect(await auth.getCurrentUser()).toEqual(upgraded);
    // Cihazdaki bir sonraki misafir yeni kimlik alır.
    await auth.logout();
    const next = await auth.continueAsGuest('Yeni Misafir');
    expect(next.id).not.toBe(guest.id);
  });

  it('girişsiz ya da zaten hesaplıyken reddedilir', async () => {
    const { auth } = setup();
    await expectAuthError(auth.upgradeGuestToAccount(ACCOUNT), 'not_signed_in');
    await auth.register(ACCOUNT);
    await expectAuthError(auth.upgradeGuestToAccount({ ...ACCOUNT, email: 'b@b.co' }), 'not_guest');
  });
});

describe('MockAuthService: değişiklik bildirimi', () => {
  it('giriş ve çıkışta dinleyiciler çağrılır; abonelikten çıkılabilir', async () => {
    const { auth } = setup();
    const seen: (Player | null)[] = [];
    const off = auth.onAuthChange((p) => seen.push(p));
    await auth.continueAsGuest('Ulf');
    await auth.logout();
    off();
    await auth.continueAsGuest('Ylva');
    expect(seen.map((p) => p?.displayName ?? null)).toEqual(['Ulf', null]);
  });

  it('bozuk depo verisi oturumsuz sayılır', async () => {
    const store = new MemoryStore();
    await store.setItem('auth.session', '{bozuk json');
    expect(await setup(store).auth.getCurrentUser()).toBeNull();
  });
});
