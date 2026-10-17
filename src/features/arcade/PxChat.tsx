import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { cachedSource } from '@/features/game/hooks';
import { t, upperLocale } from '@/i18n';
import { services } from '@/services';
import type { Player } from '@/services/auth';
import { CHAT_MAX_LENGTH, ChatError, QUICK_PHRASES, type ChatMessage } from '@/services/chat/types';

import { hoverable, PxButton, PxInput, Txt } from './kit';
import { A, themed } from './theme';

/** Kanaldaki mesajlar (sessize alınanlar hariç). */
export function useChannel(channel: string): readonly ChatMessage[] {
  const source = useMemo(
    () =>
      cachedSource(
        () => services.chat.history(channel),
        (cb) => services.chat.onMessage(channel, cb),
      ),
    [channel],
  );
  return useSyncExternalStore(source.subscribe, source.get, source.get);
}

/** Piksel sohbet: terminal satırları, hızlı ifadeler, sessize alma. */
export function PxChat({
  channel,
  me,
  opponent,
  compact,
}: {
  channel: string;
  me: Player;
  opponent?: Player | null;
  /** Savaş ekranının dar sütunu: hızlı ifadeler tek satır, kısa. */
  compact?: boolean;
}) {
  const messages = useChannel(channel);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [muted, setMuted] = useState(() => (opponent ? services.chat.isMuted(opponent.id) : false));
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: false });
  }, [messages.length]);

  const send = (raw: string) => {
    try {
      services.chat.sendMessage(channel, me, raw);
      setText('');
      setError(undefined);
    } catch (e) {
      setError(
        (e instanceof ChatError
          ? t(`chat.errors.${e.code}`)
          : t('auth.errors.unknown')
        ).toLocaleUpperCase(upperLocale()),
      );
    }
  };

  const toggleMute = () => {
    if (!opponent) return;
    if (muted) services.chat.unmute(opponent.id);
    else services.chat.mute(opponent.id);
    setMuted(!muted);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroll}
        style={styles.list}
        contentContainerStyle={{ gap: 6 }}
        nestedScrollEnabled
        accessibilityLabel={t('chat.title')}
      >
        {messages.length === 0 ? (
          <Txt size={28} color={A.muted}>
            {t('chat.empty')}
          </Txt>
        ) : (
          messages.map((m) => (
            <Line key={m.id} m={m} mine={m.kind === 'player' && m.from.id === me.id} />
          ))
        )}
      </ScrollView>
      {muted && opponent ? (
        <Txt size={26} color={A.faded}>
          {t('chat.muted', { name: opponent.displayName })}
        </Txt>
      ) : null}
      <View style={styles.quick}>
        {(compact ? QUICK_PHRASES.slice(0, 2) : QUICK_PHRASES).map((q) => (
          <Quick key={q} label={t(`chat.quick.${q}`)} onPress={() => send(t(`chat.quick.${q}`))} />
        ))}
        {opponent ? (
          <Quick
            label={muted ? t('arcade.chat.unmute') : t('arcade.chat.mute')}
            onPress={toggleMute}
            dim
          />
        ) : null}
      </View>
      <View style={styles.inputRow}>
        <PxInput
          label={t('chat.placeholder')}
          placeholder={t('arcade.chat.placeholder')}
          value={text}
          onChangeText={(v) => {
            setText(v);
            setError(undefined);
          }}
          maxLength={CHAT_MAX_LENGTH}
          error={error}
          returnKeyType="send"
          onSubmitEditing={() => send(text)}
          style={{ flex: 1 }}
        />
        <PxButton
          label="▶"
          accessibilityLabel={t('chat.send')}
          size={24}
          disabled={!text.trim()}
          onPress={() => send(text)}
          style={styles.send}
        />
      </View>
    </View>
  );
}

function Line({ m, mine }: { m: ChatMessage; mine: boolean }) {
  if (m.kind === 'system') {
    const params = { ...m.params };
    if (params.ship) params.ship = t(`ships.${params.ship as 'galleon'}`);
    return (
      <Txt size={28} color={A.faded}>
        {`* ${t(`chat.system.${m.key}`, params)}`}
      </Txt>
    );
  }
  return (
    <Txt size={28} color={A.text}>
      <Txt size={28} color={mine ? A.yellow : A.cyan}>
        {`${(mine ? t('arcade.battle.logYou') : m.from.displayName).toLocaleUpperCase(upperLocale())}: `}
      </Txt>
      {m.text}
    </Txt>
  );
}

function Quick({ label, onPress, dim }: { label: string; onPress: () => void; dim?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={hoverable(styles.chip)}
    >
      <Txt size={26} lh={1} color={dim ? A.muted : A.periwinkle} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    root: { flex: 1, gap: 10, minHeight: 0 },
    list: { flex: 1, minHeight: 60 },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 3,
      borderColor: A.lineDim,
      backgroundColor: A.input,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    inputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    send: { paddingHorizontal: 18, paddingVertical: 18 },
  }),
);
