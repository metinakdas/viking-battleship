import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppHeader } from '@/features/common/AppHeader';
import { aiOpponent } from '@/features/game/aiOpponent';
import {
  GuestUpgradeCard,
  HowToSteps,
  JarlPicker,
  JoinByCodeCard,
  LobbyHero,
  SectionTitle,
  VoyageCard,
} from '@/features/lobby';
import { FjordScene, useHorizon } from '@/features/scene/FjordScene';
import { t } from '@/i18n';
import { createAiSession } from '@/services/transport/sessions';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { AppText, breakpoints, Button, Screen, spacing } from '@/ui';

/**
 * Liman: alacakaranlıkta fiyort sahnesi. Gökyüzünde selamlama, denizde yüzen sefer kartları.
 * Limanda (tek cihaz): jarla meydan oku, dost kavgası. Açık deniz (çevrimiçi): rakip, oda, kod.
 */
export default function LobbyScreen() {
  const player = useAuthStore((s) => s.player);
  const aiLevel = useSessionStore((s) => s.aiLevel);
  const setAiLevel = useSessionStore((s) => s.setAiLevel);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { width } = useWindowDimensions();
  const compact = width < breakpoints.tablet;
  const wide = width >= 1100;
  const horizon = useHorizon();

  if (!player) return null; // (app) düzeni girişsizi zaten yönlendirir.
  const jarl = aiOpponent(aiLevel);

  return (
    <Screen scroll background={<FjordScene />} contentStyle={styles.content}>
      <AppHeader tone="scene" />
      {/* Selamlama gökyüzünde; kartlar ufukta denize iner. */}
      <LobbyHero
        player={player}
        minHeight={Math.max(compact ? 220 : 280, horizon - (compact ? 150 : 110))}
        compact={compact}
        onUpgrade={() => setUpgradeOpen((v) => !v)}
      />
      {player.isGuest && upgradeOpen ? (
        <GuestUpgradeCard player={player} initiallyOpen onClose={() => setUpgradeOpen(false)} />
      ) : null}

      <SectionTitle title={t('lobby.localTitle')} sub={t('lobby.localSub')} />
      <View style={styles.grid}>
        <VoyageCard
          art="duel"
          artPlacement={wide ? 'side' : 'top'}
          artHeight={150}
          title={t('lobby.ai.title')}
          description={t('lobby.ai.description')}
          style={wide ? styles.featured : undefined}
          action={
            <View style={styles.cta}>
              <Button
                label={`${t('lobby.ai.start')}  →`}
                // Ok süs: ekran okuyucu yalnızca eylemi duysun.
                accessibilityLabel={t('lobby.ai.start')}
                size="lg"
                fullWidth
                onPress={() => router.push(`/game/${createAiSession(player, jarl, aiLevel).id}`)}
              />
              <AppText variant="caption" tone="muted" align="center">
                {t('lobby.ai.waiting', { name: jarl.displayName })}
              </AppText>
            </View>
          }
        >
          <AppText variant="overline" tone="gold" style={styles.pickLabel}>
            {t('lobby.ai.pick').toLocaleUpperCase('tr')}
          </AppText>
          <JarlPicker value={aiLevel} onChange={setAiLevel} />
        </VoyageCard>
        <VoyageCard
          art="hotseat"
          title={t('lobby.hotseat.title')}
          description={t('lobby.hotseat.description')}
          action={
            <Button
              label={t('lobby.hotseat.start')}
              variant="secondary"
              fullWidth
              onPress={() => router.push('/hotseat')}
            />
          }
        >
          <HowToSteps
            steps={[t('lobby.hotseat.step1'), t('lobby.hotseat.step2'), t('lobby.hotseat.step3')]}
          />
        </VoyageCard>
      </View>

      <SectionTitle title={t('lobby.onlineTitle')} sub={t('lobby.onlineSub')} />
      <View style={styles.grid}>
        <VoyageCard
          art="compass"
          title={t('lobby.random.title')}
          description={t('lobby.random.description')}
          action={
            <Button
              label={t('lobby.random.start')}
              variant="secondary"
              fullWidth
              onPress={() => router.push('/matchmaking')}
            />
          }
        />
        <VoyageCard
          art="longhouse"
          title={t('lobby.room.title')}
          description={t('lobby.room.description')}
          action={
            <Button
              label={t('lobby.room.start')}
              variant="secondary"
              fullWidth
              onPress={() => router.push('/room/new')}
            />
          }
        />
        <JoinByCodeCard onJoin={(code) => router.push(`/room/${code}`)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.xxxl,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'stretch' },
  featured: { flexBasis: 640 },
  cta: { gap: spacing.xs },
  pickLabel: { marginTop: spacing.sm },
});
