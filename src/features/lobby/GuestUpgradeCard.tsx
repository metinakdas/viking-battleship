import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { AuthError, isValidEmail, isValidPassword, type Player } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { AppText, Button, Card, colors, Input, spacing } from '@/ui';

/**
 * Misafire: "İlerlemen yalnızca bu cihazda. Hesaba dönüştür."
 * Oyuncu kimliği ve kalkanı korunur (upgradeGuestToAccount).
 */
export function GuestUpgradeCard({
  player,
  initiallyOpen = false,
  onClose,
}: {
  player: Player;
  /** Kart bir "Hesap oluştur" bağlantısıyla açıldıysa form doğrudan görünür. */
  initiallyOpen?: boolean;
  /** İptal: kartı tamamen kapat (verilmezse yalnızca form kapanır). */
  onClose?: () => void;
}) {
  const upgrade = useAuthStore((s) => s.upgradeGuestToAccount);
  const [open, setOpen] = useState(initiallyOpen);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next = {
      email: isValidEmail(email) ? undefined : t('auth.errors.invalid_email'),
      password: isValidPassword(password) ? undefined : t('auth.errors.weak_password'),
    };
    setErrors(next);
    if (next.email || next.password) return;
    setBusy(true);
    try {
      await upgrade({ email, password, displayName: player.displayName });
    } catch (e) {
      const code = e instanceof AuthError ? e.code : 'unknown';
      if (code === 'email_taken' || code === 'invalid_email') {
        setErrors({ email: t(`auth.errors.${code}`) });
      } else {
        setErrors({ form: t(`auth.errors.${code}`) });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.text}>
          <AppText variant="bodyStrong">{t('lobby.upgrade.title')}</AppText>
          <AppText variant="label" tone="muted">
            {t('lobby.upgrade.description')}
          </AppText>
        </View>
        {open ? null : (
          <Button
            label={t('lobby.upgrade.open')}
            variant="secondary"
            onPress={() => setOpen(true)}
          />
        )}
      </View>
      {open ? (
        <View style={styles.form}>
          <Input
            label={t('auth.register.email')}
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={styles.field}
          />
          <Input
            label={t('auth.register.password')}
            placeholder={t('auth.register.passwordHint')}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            autoComplete="new-password"
            onSubmitEditing={submit}
            style={styles.field}
          />
          <View style={styles.actions}>
            <Button label={t('lobby.upgrade.submit')} loading={busy} onPress={submit} />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              onPress={() => (onClose ? onClose() : setOpen(false))}
            />
          </View>
          {errors.form ? (
            <AppText variant="label" style={{ color: colors.danger }} accessibilityRole="alert">
              {errors.form}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  // Sütun düzeninde: tam genişlik, içerik kadar yükseklik (flexBasis burada yüksekliği büyütür).
  card: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  text: { flex: 1, minWidth: 220, gap: spacing.xxs },
  form: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  field: { flexGrow: 1, flexBasis: 220, alignSelf: 'auto' },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: 22 },
});
