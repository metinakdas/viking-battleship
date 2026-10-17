import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/features/arcade/kit';
import { PxChat } from '@/features/arcade/PxChat';
import { BattleScreen } from '@/features/arcade/screens/BattleScreen';
import {
  GameOverScreen,
  HandoffScreen,
  WaitingScreen,
} from '@/features/arcade/screens/FlowScreens';
import { PlacementScreen } from '@/features/arcade/screens/PlacementScreen';
import { A, themed } from '@/features/arcade/theme';
import { arcadeScore, leaderboard } from '@/features/records/score';
import { goldDelta } from '@/features/shop/catalog';
import { shotStats, type Seat } from '@/game';
import { t, upperLocale } from '@/i18n';
import { endSession, type GameSession } from '@/services/transport/sessions';
import type { GameSnapshot, GameTransport } from '@/services/transport/types';
import { useRecordsStore } from '@/store/recordsStore';
import { useWalletStore } from '@/store/walletStore';

import { formatSeconds, useCountdown, useGameSnapshot } from './hooks';

/** Tasarımdaki mod etiketi: "TEK OYUNCU · CPU". */
export function arcadeModeLabel(session: GameSession): string {
  if (session.mode === 'ai') return t('arcade.modes.ai');
  return session.mode === 'hotseat' ? t('arcade.modes.hotseat') : t('arcade.modes.online');
}

const up = (s: string) => s.toLocaleUpperCase(upperLocale());

/**
 * Biten oyunu kaydeder (rekor tablosu, kaptan kartı). Kimlik oyunun izinden türetilir: aynı oyun iki
 * kez yazılmaz (Strict Mode, yeniden render), rövanş yeni kayıt olur.
 */
function useGameResult(session: GameSession, snapshot: GameSnapshot, opponentName: string) {
  const add = useRecordsStore((s) => s.add);
  const reward = useWalletStore((s) => s.reward);
  const records = useRecordsStore((s) => s.records);
  const { view, me } = snapshot;
  const finished = view.phase === 'finished';
  const stats = shotStats(view.opponent.incoming);
  const won = view.winner === view.mySeat;
  const score = arcadeScore({ won, shots: stats.shots, hits: stats.hits });
  const gold = goldDelta({
    won,
    mode: session.mode,
    level: session.mode === 'ai' ? session.level : undefined,
  });
  const id = `${session.id}:${view.turnNumber}:${view.me.incoming.length}:${view.opponent.incoming.length}`;

  useEffect(() => {
    if (!finished) return;
    add({
      id,
      at: Date.now(),
      playerId: me.id,
      playerName: me.displayName,
      mode: session.mode,
      opponentName,
      won,
      shots: stats.shots,
      hits: stats.hits,
      turns: Math.ceil(view.turnNumber / 2),
      score,
    });
    // Altın: zaferde ödül, yenilgide ceza (aynı maç bir kez).
    reward(me.id, id, gold);
  }, [
    reward,
    gold,
    finished,
    add,
    id,
    me.id,
    me.displayName,
    session.mode,
    opponentName,
    won,
    stats.shots,
    stats.hits,
    view.turnNumber,
    score,
  ]);

  // Bu oyun tabloda birinci mi? (kendi kaydı hariç en yüksek skordan büyükse)
  const others = records.filter((r) => r.id !== id);
  const top = leaderboard(others, 1)[0]?.score ?? 0;
  return { score, newHigh: finished && score > top, gold };
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
  const label = arcadeModeLabel(session);
  const online = session.mode === 'online';
  const opponentName = session.mode === 'ai' ? 'CPU' : up(snapshot.opponent.displayName);
  const result = useGameResult(session, snapshot, opponentName);

  if (view.phase === 'placement' && !view.me.ready) {
    return (
      <PlacementScreen
        modeLabel={label}
        onModePress={() => toLobby(session)}
        onBack={() => toLobby(session)}
        opponentName={opponentName}
        opponentReady={view.opponent.ready}
        onReady={(fleet) => transport.send({ type: 'placeFleet', fleet })}
      />
    );
  }
  if (view.phase === 'placement') {
    return (
      <WaitingScreen
        opponentName={opponentName}
        modeLabel={label}
        onLeave={() => toLobby(session)}
      />
    );
  }
  if (view.phase === 'finished') {
    return (
      <GameOverScreen
        snapshot={snapshot}
        opponentName={opponentName}
        score={result.score}
        newHigh={result.newHigh}
        gold={result.gold}
        onRematch={() => transport.send({ type: 'rematch' })}
        onLobby={() => toLobby(session)}
      />
    );
  }
  return (
    <BattleScreen
      snapshot={snapshot}
      onFire={(at) => transport.send({ type: 'fire', at })}
      onResign={() => transport.send({ type: 'forfeit', reason: 'resign' })}
      onLeave={() => {
        transport.send({ type: 'forfeit', reason: 'resign' });
        toLobby(session);
      }}
      notice={online ? <ConnectionNotice session={session} snapshot={snapshot} /> : undefined}
      chat={
        online ? (
          <PxChat channel={session.channel} me={snapshot.me} opponent={snapshot.opponent} compact />
        ) : undefined
      }
    />
  );
}

/** Rakip koptuysa kırmızı uyarı + geri sayım; geliştirmede kopmayı dene düğmesi. */
function ConnectionNotice({
  session,
  snapshot,
}: {
  session: Extract<GameSession, { mode: 'online' }>;
  snapshot: GameSnapshot;
}) {
  const down = snapshot.opponentConnection === 'disconnected';
  const left = useCountdown(snapshot.reconnectEndsAt);
  return (
    <View style={styles.notice}>
      {down ? (
        <Txt size={32} align="center" color={A.red} role="alert">
          {t('arcade.battle.disconnected', { time: left === null ? '' : formatSeconds(left) })}
        </Txt>
      ) : null}
      {__DEV__ ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            down
              ? session.transport.simulateOpponentReconnect()
              : session.transport.simulateOpponentDisconnect()
          }
        >
          <Txt size={26} align="center" color={A.faded}>
            {down ? t('battle.devReconnect') : t('battle.devDisconnect')}
          </Txt>
        </Pressable>
      ) : null}
    </View>
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
  // Kayıt, cihazın sahibi (1. koltuk) adına.
  useGameResult(session, snaps[0], up(snaps[0].opponent.displayName));

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

  if (needsHandoff && (phase !== 'battle' || armed)) {
    return (
      <HandoffScreen
        to={snaps[desired].me.displayName}
        from={snaps[viewer].me.displayName}
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
      <PlacementScreen
        key={viewer}
        modeLabel={arcadeModeLabel(session)}
        onModePress={() => toLobby(session)}
        onBack={() => toLobby(session)}
        title={t('arcade.flow.placeTitle', { name: up(snapshot.me.displayName) })}
        opponentName={up(snapshot.opponent.displayName)}
        opponentReady={snapshot.view.opponent.ready}
        onReady={(fleet) => transport.send({ type: 'placeFleet', fleet })}
      />
    );
  }
  if (phase === 'finished') {
    return (
      <GameOverScreen
        snapshot={snapshot}
        neutral
        onRematch={() => transport.send({ type: 'rematch' })}
        onLobby={() => toLobby(session)}
      />
    );
  }
  return (
    <BattleScreen
      key={viewer}
      snapshot={snapshot}
      onFire={(at) => transport.send({ type: 'fire', at })}
      onResign={() => transport.send({ type: 'forfeit', reason: 'resign' })}
      onLeave={() => {
        transport.send({ type: 'forfeit', reason: 'resign' });
        toLobby(session);
      }}
    />
  );
}

const styles = themed(() =>
  StyleSheet.create({
    notice: { gap: 6, alignItems: 'center' },
  }),
);
