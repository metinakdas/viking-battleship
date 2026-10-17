import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput, type TextStyle } from 'react-native';

import { t, upperLocale } from '@/i18n';
import {
  AuthError,
  checkNickname,
  isValidEmail,
  isValidPassword,
  randomAvatar,
  randomNickname,
  type AuthErrorCode,
} from '@/services/auth';
import { hudScore } from '@/features/records/score';
import { useAuthStore } from '@/store/authStore';

import { BackIcon, SettingsButton } from '../chrome';
import {
  Frame,
  Hud,
  PixelArtView,
  PxButton,
  PxInput,
  Stage,
  Txt,
  useLayout,
  IconButton,
} from '../kit';
import { A, DIM, hudShadow, titleShadow, themed } from '../theme';

type Mode = 'login' | 'guest' | 'register';
type Errors = Partial<Record<'name' | 'email' | 'password' | 'form', string>>;

const err = (code: AuthErrorCode) => t(`auth.errors.${code}`).toLocaleUpperCase(upperLocale());

/**
 * Giriş (tasarım §5.1): ortada çift çerçeveli kart, HUD, alt satır.
 * Tasarımda yalnızca giriş hâli var; misafir ve kayıt hâlleri aynı kartta, aynı dille.
 */
export function LoginScreen({
  initialMode = 'login',
  hiScore = '050000',
  onSuccess,
  onBack,
}: {
  /** "◀": misafir/kayıt formundan girişe; girişten kapağa. */
  onBack?: () => void;
  initialMode?: Mode;
  /** HUD: rekor tablosunun zirvesi. */
  hiScore?: string;
  onSuccess: () => void;
}) {
  const store = useAuthStore();
  const { portrait } = useLayout();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState(() => randomNickname().toLocaleUpperCase(upperLocale()));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  // Atış oyunu: denize tıklayıp batırılan gemilerin puanı (1UP).
  const [shipScore, setShipScore] = useState(0);
  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const go = (next: Mode) => {
    setMode(next);
    setErrors({});
  };

  const run = async (check: Errors, action: () => Promise<void>) => {
    setErrors(check);
    if (Object.values(check).some(Boolean)) return;
    setBusy(true);
    try {
      await action();
      onSuccess();
    } catch (e) {
      const code: AuthErrorCode | null = e instanceof AuthError ? e.code : null;
      if (code === 'invalid_email' || code === 'email_taken') setErrors({ email: err(code) });
      else if (code === 'weak_password') setErrors({ password: err(code) });
      else if (code === 'invalid_nickname' || code === 'name_taken') setErrors({ name: err(code) });
      else
        setErrors({
          form: code ? err(code) : t('auth.errors.unknown').toLocaleUpperCase(upperLocale()),
        });
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (mode === 'login') {
      return run(
        {
          name: name.trim()
            ? undefined
            : t('auth.errors.required').toLocaleUpperCase(upperLocale()),
          password: password
            ? undefined
            : t('auth.errors.required').toLocaleUpperCase(upperLocale()),
        },
        () => store.login(name, password),
      );
    }
    if (mode === 'guest') {
      return run({ name: checkNickname(nickname) ? err('invalid_nickname') : undefined }, () =>
        store.continueAsGuest(nickname, randomAvatar()),
      );
    }
    return run(
      {
        name: checkNickname(name) ? err('invalid_nickname') : undefined,
        email: isValidEmail(email) ? undefined : err('invalid_email'),
        password: isValidPassword(password) ? undefined : err('weak_password'),
      },
      () => store.register({ displayName: name, email, password }),
    );
  };

  const primaryLabel =
    mode === 'login'
      ? t('arcade.login.submit')
      : mode === 'guest'
        ? t('arcade.login.sail')
        : t('arcade.login.registerSubmit');

  return (
    <Stage dim={DIM.login} onShipHit={(p) => setShipScore((v) => v + p)}>
      <View style={styles.center} pointerEvents="box-none">
        <Frame color={A.text} shadow={18} style={styles.card}>
          <PixelArtView art="emblem" width={112} height={98} />
          <View style={styles.titleBlock}>
            <Txt
              font="press"
              size={40}
              ls={4}
              align="center"
              color={A.yellow}
              shadow={titleShadow(4).textShadow}
              numberOfLines={1}
              accessibilityRole="header"
            >
              AMİRAL BATTI
            </Txt>
            <Txt size={34} ls={6} color={A.cyan} align="center">
              {t('arcade.login.tagline')}
            </Txt>
          </View>

          <View style={styles.fields}>
            {mode === 'guest' ? (
              <PxInput
                label={t('arcade.login.captainName')}
                placeholder={t('arcade.login.captainName')}
                value={nickname}
                onChangeText={setNickname}
                maxLength={16}
                autoCapitalize="characters"
                error={errors.name}
                returnKeyType="go"
                onSubmitEditing={submit}
                autoFocus
              />
            ) : (
              <>
                <PxInput
                  label={t('arcade.login.username')}
                  placeholder={t('arcade.login.username')}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="none"
                  autoComplete="username"
                  error={errors.name}
                  returnKeyType="next"
                  onSubmitEditing={() =>
                    (mode === 'register' ? emailRef : passwordRef).current?.focus()
                  }
                  autoFocus
                />
                {mode === 'register' ? (
                  <PxInput
                    ref={emailRef}
                    label={t('arcade.login.email')}
                    placeholder={t('arcade.login.email')}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    error={errors.email}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                ) : null}
                <PxInput
                  ref={passwordRef}
                  label={t('arcade.login.password')}
                  placeholder={t('arcade.login.password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  error={errors.password}
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
              </>
            )}
          </View>

          {errors.form ? (
            <Txt size={30} color={A.red} align="center" role="alert">
              {errors.form}
            </Txt>
          ) : null}

          <PxButton
            label={busy ? t('arcade.login.wait') : primaryLabel}
            onPress={submit}
            disabled={busy}
            style={styles.stretch}
          />

          {/* Hesabı olmayan için en kısa yol: misafir. Girişin hemen altında, tam genişlik ve dikkat çekici. */}
          {mode === 'login' ? (
            <>
              <View style={styles.orRow} aria-hidden>
                <View style={styles.orLine} />
                <Txt size={28} color={A.muted}>
                  {t('arcade.login.or')}
                </Txt>
                <View style={styles.orLine} />
              </View>
              <PxButton
                variant="secondary"
                accessibilityLabel={t('arcade.login.guest')}
                onPress={() => go('guest')}
                style={[styles.stretch, styles.guestBtn]}
              >
                <Txt font="press" size={24} align="center" color={A.cyan}>
                  {t('arcade.login.guestCta')}
                </Txt>
              </PxButton>
            </>
          ) : null}

          <View style={styles.links}>
            {mode === 'login' ? (
              <View />
            ) : (
              <TextLink
                label={t('arcade.login.back')}
                color={A.periwinkle}
                onPress={() => go('login')}
              />
            )}
            {mode === 'register' ? null : (
              <TextLink
                label={t('arcade.login.register')}
                color={A.pink}
                onPress={() => go('register')}
              />
            )}
          </View>
        </Frame>
      </View>

      {/* 1UP: bu ekranda batırdığın gemilerin puanı. HI-SCORE: rekor tablosunun zirvesi. */}
      {portrait ? (
        <>
          <Hud
            label="1UP"
            value={hudScore(shipScore)}
            style={[styles.hud, { left: 96, top: 40, width: 330 }]}
          />
          <Hud
            label="HI-SCORE"
            value={hiScore}
            style={[styles.hud, { left: 96, top: 82, width: 330 }]}
          />
        </>
      ) : (
        <>
          <Hud
            label="1UP"
            value={hudScore(shipScore)}
            style={[styles.hud, { left: 96, width: 480 }]}
          />
          <Hud
            label="HI-SCORE"
            value={hiScore}
            align="center"
            style={[styles.hud, { left: 660, width: 600 }]}
          />
        </>
      )}
      <SettingsButton style={portrait ? { right: 20, top: 24 } : undefined} />
      {onBack || mode !== 'login' ? (
        <View style={[styles.back, portrait && { left: 20, top: 24 }]}>
          <IconButton
            label={t('arcade.nav.back')}
            onPress={() => (mode !== 'login' ? go('login') : onBack?.())}
          >
            <BackIcon />
          </IconButton>
        </View>
      ) : null}
      <Txt
        font="press"
        size={24}
        align="center"
        color={A.hudSoft}
        shadow={hudShadow.textShadow}
        style={portrait ? styles.footerP : styles.footer}
      >
        {t('arcade.login.footer')}
      </Txt>
    </Stage>
  );
}

function TextLink({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}>
      {({ hovered }: { hovered?: boolean }) => (
        <Txt size={34} color={color} style={hovered ? styles.underline : undefined}>
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    center: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 128,
    },
    card: {
      width: 640,
      gap: 24,
      alignItems: 'center',
      padding: 48,
      backgroundColor: A.panel,
      backdropFilter: 'blur(4px)',
    } as object,
    titleBlock: { gap: 16, alignItems: 'center' },
    fields: { gap: 16, alignSelf: 'stretch' },
    stretch: { alignSelf: 'stretch' },
    orRow: { flexDirection: 'row', alignItems: 'center', gap: 14, alignSelf: 'stretch' },
    orLine: { flex: 1, height: 3, backgroundColor: A.lineDim },
    guestBtn: { borderColor: A.cyan, paddingVertical: 20 },
    links: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignSelf: 'stretch',
      paddingTop: 8,
    },
    hud: { position: 'absolute', top: 48 },
    back: { position: 'absolute', left: 24, top: 36, zIndex: 20 },
    footer: { position: 'absolute', bottom: 0, left: 447.32, width: 1000 },
    footerP: { position: 'absolute', bottom: 24, left: 20, width: 680 },
    underline: { textDecorationLine: 'underline' } as TextStyle,
  }),
);
