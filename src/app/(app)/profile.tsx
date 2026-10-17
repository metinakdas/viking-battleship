import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { PxButton, PxInput, Txt } from '@/features/arcade/kit';
import { ProfileScreen } from '@/features/arcade/screens/InfoScreens';
import { A } from '@/features/arcade/theme';
import { summarize } from '@/features/records/score';
import { t, upperLocale } from '@/i18n';
import { services } from '@/services';
import { AuthError, isValidEmail, isValidPassword } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { useRecordsStore } from '@/store/recordsStore';

const up = (s: string) => s.toLocaleUpperCase(upperLocale());

/** Kaptan kartı: istatistikler, son seferler, misafiri hesaba dönüştürme, çıkış. */
export default function Profile() {
  const player = useAuthStore((s) => s.player);
  const upgrade = useAuthStore((s) => s.upgradeGuestToAccount);
  const logout = useAuthStore((s) => s.logout);
  const records = useRecordsStore((s) => s.records);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!player || player.isGuest) return;
    let alive = true;
    void services.auth.getProfile(player.id).then((p) => alive && setEmail(p?.email ?? null));
    return () => {
      alive = false;
    };
  }, [player]);

  if (!player) return null;
  const mine = records.filter((r) => r.playerId === player.id);

  return (
    <ProfileScreen
      name={player.displayName}
      isGuest={player.isGuest}
      email={email}
      summary={summarize(records, player.id)}
      recent={mine.slice(-6).reverse()}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/lobby'))}
      account={
        player.isGuest ? (
          <>
            <UpgradeForm
              onSubmit={(input) => upgrade({ ...input, displayName: player.displayName })}
            />
            <PxButton
              label={t('arcade.profile.logout')}
              variant="secondary"
              onPress={() => {
                void logout().then(() => router.replace('/'));
              }}
            />
          </>
        ) : (
          <>
            <Txt font="press" size={28} color={A.yellow} accessibilityRole="header">
              {t('arcade.profile.accountTitle')}
            </Txt>
            <Txt size={34} color={A.textSoft}>
              {t('arcade.profile.accountText')}
            </Txt>
            <View style={{ flex: 1 }} />
            <PxButton
              label={t('arcade.profile.scores')}
              variant="secondary"
              onPress={() => router.push('/scores')}
            />
            <PxButton
              label={t('arcade.profile.logout')}
              variant="secondary"
              onPress={() => {
                void logout().then(() => router.replace('/'));
              }}
            />
          </>
        )
      }
    />
  );
}

function UpgradeForm({
  onSubmit,
}: {
  onSubmit: (input: { email: string; password: string }) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const check = {
      email: isValidEmail(email) ? undefined : up(t('auth.errors.invalid_email')),
      password: isValidPassword(password) ? undefined : up(t('auth.errors.weak_password')),
    };
    setErrors(check);
    if (check.email || check.password) return;
    setBusy(true);
    try {
      await onSubmit({ email, password });
    } catch (e) {
      const code = e instanceof AuthError ? e.code : null;
      if (code === 'email_taken' || code === 'invalid_email')
        setErrors({ email: up(t(`auth.errors.${code}`)) });
      else setErrors({ form: up(code ? t(`auth.errors.${code}`) : t('auth.errors.unknown')) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Txt font="press" size={28} color={A.yellow} accessibilityRole="header">
        {t('arcade.profile.upgradeTitle')}
      </Txt>
      <Txt size={34} color={A.textSoft}>
        {t('arcade.profile.upgradeText')}
      </Txt>
      <PxInput
        label={t('arcade.login.email')}
        placeholder={t('arcade.login.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        error={errors.email}
      />
      <PxInput
        label={t('arcade.login.password')}
        placeholder={t('arcade.login.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        error={errors.password}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {errors.form ? (
        <Txt size={30} color={A.red} role="alert">
          {errors.form}
        </Txt>
      ) : null}
      <View style={{ flex: 1 }} />
      <PxButton
        label={busy ? t('arcade.login.wait') : t('arcade.profile.upgradeSubmit')}
        disabled={busy}
        onPress={submit}
      />
    </>
  );
}
