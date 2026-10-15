import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar, SeaBackdrop } from '@/features/auth';
import { BattleView, GameOverView } from '@/features/battle';
import { ChatPanel } from '@/features/chat/ChatPanel';
import { AppHeader } from '@/features/common/AppHeader';
import { PlacementView } from '@/features/placement';
import type { Seat } from '@/game';
import { t } from '@/i18n';
import type { Player } from '@/services/auth';
import { endSession, type GameSession } from '@/services/transport/sessions';
import type { GameSnapshot, GameTransport } from '@/services/transport/types';
import { AppText, Button, Card, colors, Pill, Screen, spacing, Vegvisir } from '@/ui';

import { useGameSnapshot } from './hooks';

export function modeLabelFor(session: GameSession): string {
  if (session.mode === 'ai') {
    return t('modes.ai', { level: t(`lobby.ai.levels.${session.level}`) });
  }
  return session.mode === 'hotseat' ? t('modes.hotseat') : t('modes.online');
}

function toLobby(session: GameSession) {
  endSession(session.id);
  router.replace('/lobby');
}

/** Bilgisayara karşı ve çevrimiçi: tek koltuk, tek taşıyıcı. */
export function SingleSeatGame({
  session,
}: {
  session: Extract<GameSession, { mode: 'ai' | 'online' }>;
}) {
  const transport: GameTransport = session.transport;
  const snapshot = useGameSnapshot(transport);
  const { view } = snapshot;
  const label = modeLabelFor(session);
  const online = session.mode === 'online';

  if (view.phase === 'placement' && !view.me.ready) {
    return (
      <PlacementView
        modeLabel={label}
        onReady={(fleet) => transport.send({ type: 'placeFleet', fleet })}
      />
    );
  }
  if (view.phase === 'placement') {
    return <WaitingForOpponent snapshot={snapshot} modeLabel={label} />;
  }
  if (view.phase === 'finished') {
    return (
      <GameOverView
        snapshot={snapshot}
        modeLabel={label}
        onRematch={() => transport.send({ type: 'rematch' })}
        onLobby={() => toLobby(session)}
      />
    );
  }
  return (
    <BattleView
      snapshot={snapshot}
      modeLabel={label}
      onFire={(at) => transport.send({ type: 'fire', at })}
      onResign={() => transport.send({ type: 'forfeit', reason: 'resign' })}
      sidePanel={
        online ? (
          <ChatPanel channel={session.channel} me={snapshot.me} opponent={snapshot.opponent} />
        ) : null
      }
      extra={
        online && __DEV__ ? <DevConnectionTools session={session} snapshot={snapshot} /> : null
      }
    />
  );
}

/** Geliştirici: bağlantı kopmasını dene (yalnızca __DEV__ ve sahte çevrimiçi). */
function DevConnectionTools({
  session,
  snapshot,
}: {
  session: Extract<GameSession, { mode: 'online' }>;
  snapshot: GameSnapshot;
}) {
  const down = snapshot.opponentConnection === 'disconnected';
  return (
    <View style={styles.devRow}>
      <Button
        label={down ? t('battle.devReconnect') : t('battle.devDisconnect')}
        variant="ghost"
        onPress={() =>
          down
            ? session.transport.simulateOpponentReconnect()
            : session.transport.simulateOpponentDisconnect()
        }
      />
    </View>
  );
}

function WaitingForOpponent({
  snapshot,
  modeLabel,
}: {
  snapshot: GameSnapshot;
  modeLabel: string;
}) {
  return (
    <Screen contentStyle={styles.content}>
      <AppHeader right={<Pill label={modeLabel} />} />
      <Card style={styles.waitCard}>
        <View style={styles.waitBody}>
          <ActivityIndicator color={colors.gold} />
          <AppText tone="secondary" align="center">
            {t('battle.waitingPlacement', { name: snapshot.opponent.displayName })}
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}

/**
 * Aynı cihazda iki kişi: iki koltuğun görünümü; her sıra değişiminde "cihazı devret" perdesi.
 * Perde inene kadar hiçbir tahta görünmez (rakibin gemileri gizli kalır).
 */
export function HotseatGame({ session }: { session: Extract<GameSession, { mode: 'hotseat' }> }) {
  const snaps = [
    useGameSnapshot(session.transports[0]),
    useGameSnapshot(session.transports[1]),
  ] as const;
  const [viewer, setViewer] = useState<Seat>(0);
  const [armed, setArmed] = useState(false);
  const phase = snaps[0].view.phase;

  // Bu anda cihazı kimin tutması gerektiği.
  const desired: Seat =
    phase === 'placement'
      ? snaps[0].view.me.ready
        ? 1
        : 0
      : phase === 'battle'
        ? snaps[0].view.turn
        : viewer;
  const needsHandoff = desired !== viewer;

  // Savaşta atış sonucunu kısa süre göster, sonra perdeyi indir.
  useEffect(() => {
    if (!needsHandoff || phase !== 'battle') return;
    const id = setTimeout(() => setArmed(true), 1200);
    return () => clearTimeout(id);
  }, [needsHandoff, phase, desired]);

  const label = modeLabelFor(session);
  const showHandoff = needsHandoff && (phase !== 'battle' || armed);

  if (showHandoff) {
    return (
      <HandoffScreen
        to={snaps[desired].me}
        from={snaps[viewer].me}
        onReady={() => {
          setViewer(desired);
          setArmed(false);
        }}
      />
    );
  }

  const snapshot = snaps[viewer];
  const transport = session.transports[viewer];
  if (phase === 'placement') {
    return (
      <PlacementView
        key={viewer}
        modeLabel={label}
        heading={t('hotseat.placeHeading', { name: snapshot.me.displayName })}
        onReady={(fleet) => transport.send({ type: 'placeFleet', fleet })}
      />
    );
  }
  if (phase === 'finished') {
    return (
      <GameOverView
        snapshot={snapshot}
        modeLabel={label}
        neutral
        onRematch={() => transport.send({ type: 'rematch' })}
        onLobby={() => toLobby(session)}
      />
    );
  }
  return (
    <BattleView
      snapshot={snapshot}
      modeLabel={`${label} · ${snapshot.me.displayName}`}
      onFire={(at) => transport.send({ type: 'fire', at })}
      onResign={() => transport.send({ type: 'forfeit', reason: 'resign' })}
    />
  );
}

/** "Cihazı devret" perdesi. */
function HandoffScreen({ to, from, onReady }: { to: Player; from: Player; onReady: () => void }) {
  return (
    <Screen backdrop={<SeaBackdrop />} contentStyle={styles.handoff}>
      <Card highlighted style={styles.handoffCard}>
        <View style={styles.handoffBody} accessibilityLiveRegion="assertive">
          <Vegvisir size={56} />
          <Avatar avatar={to.avatar} size={72} />
          <AppText variant="h2" align="center">
            {t('hotseat.handoffTitle', { name: to.displayName })}
          </AppText>
          <AppText tone="muted" align="center">
            {t('hotseat.handoffHint', { other: from.displayName })}
          </AppText>
          <Button label={t('hotseat.handoffReady')} size="lg" fullWidth onPress={onReady} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  waitCard: { alignSelf: 'center', maxWidth: 480, width: '100%' },
  waitBody: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  devRow: { alignItems: 'center' },
  handoff: { justifyContent: 'center', alignItems: 'center' },
  handoffCard: { width: '100%', maxWidth: 420 },
  handoffBody: { alignItems: 'center', gap: spacing.md },
});
