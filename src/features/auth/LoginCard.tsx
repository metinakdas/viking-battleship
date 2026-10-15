import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';

import { t } from '@/i18n';
import {
  AuthError,
  checkNickname,
  isValidEmail,
  isValidPassword,
  randomAvatar,
  randomNickname,
  type AuthErrorCode,
  type AvatarId,
} from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { AppText, Button, Card, colors, Input, Logo, spacing, TextButton } from '@/ui';

import { Avatar } from './Avatar';

type Mode = 'login' | 'guest' | 'register';
type FieldErrors = Partial<Record<'email' | 'password' | 'name', string>>;

const errorText = (code: AuthErrorCode) => t(`auth.errors.${code}`);

/** Giriş ekranındaki tek kart: giriş / misafir / kayıt arasında geçiş yapar. */
export function LoginCard({
  onSuccess,
  initialMode = 'login',
}: {
  onSuccess: () => void;
  /** Oda linkiyle gelen kullanıcıya önce kısa misafir adı sorulur. */
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState(() => randomNickname());
  const [avatar, setAvatar] = useState<AvatarId>(() => randomAvatar());
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const store = useAuthStore();

  const switchMode = (next: Mode) => {
    setMode(next);
    setFieldErrors({});
    setFormError(null);
  };

  /** İstemci doğrulaması geçerse servisi çağırır; servis hatasını alana ya da forma yazar. */
  const run = async (errors: FieldErrors, action: () => Promise<void>) => {
    setFieldErrors(errors);
    setFormError(null);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    try {
      await action();
      onSuccess();
    } catch (e) {
      if (!(e instanceof AuthError)) {
        setFormError(t('auth.errors.unknown'));
      } else if (e.code === 'invalid_email' || e.code === 'email_taken') {
        setFieldErrors({ email: errorText(e.code) });
      } else if (e.code === 'weak_password') {
        setFieldErrors({ password: errorText(e.code) });
      } else if (e.code === 'invalid_nickname') {
        setFieldErrors({ name: errorText(e.code) });
      } else {
        setFormError(errorText(e.code));
      }
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = () =>
    run(
      {
        email: isValidEmail(email) ? undefined : errorText('invalid_email'),
        password: password ? undefined : t('auth.errors.required'),
      },
      () => store.loginWithEmail(email, password),
    );

  const submitRegister = () =>
    run(
      {
        name: checkNickname(name) ? errorText('invalid_nickname') : undefined,
        email: isValidEmail(email) ? undefined : errorText('invalid_email'),
        password: isValidPassword(password) ? undefined : errorText('weak_password'),
      },
      () => store.register({ email, password, displayName: name }),
    );

  const submitGuest = () =>
    run({ name: checkNickname(nickname) ? errorText('invalid_nickname') : undefined }, () =>
      store.continueAsGuest(nickname, avatar),
    );

  return (
    <Card highlighted style={styles.card}>
      <View style={styles.stack}>
        <Logo layout="stacked" size="lg" />

        {mode === 'login' ? (
          <>
            <Input
              label={t('auth.login.email')}
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Input
              ref={passwordRef}
              label={t('auth.login.password')}
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submitLogin}
            />
            <FormError message={formError} />
            <Button label={t('auth.login.submit')} fullWidth loading={busy} onPress={submitLogin} />
            <Divider />
            <Button
              label={t('auth.login.guest')}
              variant="secondary"
              fullWidth
              onPress={() => switchMode('guest')}
            />
            <TextButton
              prefix={t('auth.login.noAccount')}
              label={t('auth.login.register')}
              onPress={() => switchMode('register')}
            />
          </>
        ) : null}

        {mode === 'guest' ? (
          <>
            <View style={styles.guestHeader}>
              <Pressable
                onPress={() => setAvatar(randomAvatar())}
                accessibilityRole="button"
                accessibilityLabel={t('auth.guest.rerollAvatar')}
                style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
              >
                <Avatar avatar={avatar} size={64} />
              </Pressable>
              <View style={styles.flex}>
                <AppText variant="h3">{t('auth.guest.title')}</AppText>
                <AppText variant="caption" tone="muted">
                  {t('auth.guest.hint')}
                </AppText>
              </View>
            </View>
            <Input
              label={t('auth.guest.nickname')}
              value={nickname}
              onChangeText={setNickname}
              error={fieldErrors.name}
              maxLength={16}
              autoCapitalize="words"
              returnKeyType="go"
              onSubmitEditing={submitGuest}
            />
            <View style={styles.row}>
              <TextButton
                label={t('auth.guest.rerollName')}
                onPress={() => setNickname(randomNickname())}
              />
              <TextButton
                label={t('auth.guest.rerollAvatar')}
                onPress={() => setAvatar(randomAvatar())}
              />
            </View>
            <FormError message={formError} />
            <Button label={t('auth.guest.submit')} fullWidth loading={busy} onPress={submitGuest} />
            <TextButton label={`← ${t('common.back')}`} onPress={() => switchMode('login')} />
          </>
        ) : null}

        {mode === 'register' ? (
          <>
            <AppText variant="h3" align="center">
              {t('auth.register.title')}
            </AppText>
            <Input
              label={t('auth.register.displayName')}
              value={name}
              onChangeText={setName}
              error={fieldErrors.name}
              maxLength={16}
              autoComplete="username"
              returnKeyType="next"
            />
            <Input
              label={t('auth.register.email')}
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Input
              ref={passwordRef}
              label={t('auth.register.password')}
              placeholder={t('auth.register.passwordHint')}
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submitRegister}
            />
            <FormError message={formError} />
            <Button
              label={t('auth.register.submit')}
              fullWidth
              loading={busy}
              onPress={submitRegister}
            />
            <TextButton
              prefix={t('auth.register.haveAccount')}
              label={t('auth.register.login')}
              onPress={() => switchMode('login')}
            />
          </>
        ) : null}
      </View>
    </Card>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.formError} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <AppText variant="label" style={{ color: colors.danger }}>
        {message}
      </AppText>
    </View>
  );
}

function Divider() {
  return (
    <View style={styles.divider} aria-hidden>
      <View style={styles.line} />
      <AppText variant="caption" tone="muted">
        {t('common.or')}
      </AppText>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 420 },
  stack: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  flex: { flex: 1, gap: spacing.xxs },
  guestHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarButton: { borderRadius: 32 },
  pressed: { opacity: 0.8, transform: [{ rotate: '-12deg' }] },
  formError: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(216, 69, 43, 0.08)',
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { flex: 1, height: 1, backgroundColor: colors.hairline },
});
