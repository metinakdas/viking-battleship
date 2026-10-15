import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/features/auth';
import { cachedSource } from '@/features/game/hooks';
import { t } from '@/i18n';
import { services } from '@/services';
import type { Player } from '@/services/auth';
import { CHAT_MAX_LENGTH, ChatError, QUICK_PHRASES, type ChatMessage } from '@/services/chat/types';
import { AppText, Button, Card, colors, Input, radii, spacing, withAlpha } from '@/ui';

/** Kanaldaki mesajlar (sessize alınanlar hariç). */
function useChannel(channel: string): readonly ChatMessage[] {
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

export type ChatPanelProps = {
  channel: string;
  me: Player;
  /** Sessize alma düğmesi için. */
  opponent?: Player | null;
  height?: number;
};

/** Oda ve oyun içi sohbet: mesajlar, hızlı ifadeler, sessize alma. */
export function ChatPanel({ channel, me, opponent, height = 260 }: ChatPanelProps) {
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
      setError(e instanceof ChatError ? t(`chat.errors.${e.code}`) : t('auth.errors.unknown'));
    }
  };

  const toggleMute = () => {
    if (!opponent) return;
    if (muted) services.chat.unmute(opponent.id);
    else services.chat.mute(opponent.id);
    setMuted(!muted);
  };

  return (
    <Card
      title={t('chat.title').toLocaleUpperCase('tr')}
      headerRight={
        opponent ? (
          <Button
            label={muted ? t('chat.unmute') : t('chat.mute')}
            variant="ghost"
            onPress={toggleMute}
          />
        ) : null
      }
    >
      <View style={styles.stack}>
        <ScrollView
          ref={scroll}
          style={{ height }}
          contentContainerStyle={styles.list}
          nestedScrollEnabled
          accessibilityLabel={t('chat.title')}
        >
          {messages.length === 0 ? (
            <AppText variant="label" tone="muted" align="center">
              {t('chat.empty')}
            </AppText>
          ) : (
            messages.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                mine={m.kind === 'player' && m.from.id === me.id}
              />
            ))
          )}
        </ScrollView>
        {muted && opponent ? (
          <AppText variant="caption" tone="muted">
            {t('chat.muted', { name: opponent.displayName })}
          </AppText>
        ) : null}
        <View style={styles.quick}>
          {QUICK_PHRASES.map((q) => (
            <QuickChip
              key={q}
              label={t(`chat.quick.${q}`)}
              onPress={() => send(t(`chat.quick.${q}`))}
            />
          ))}
        </View>
        <View style={styles.inputRow}>
          <Input
            aria-label={t('chat.placeholder')}
            placeholder={t('chat.placeholder')}
            value={text}
            onChangeText={(v) => {
              setText(v);
              setError(undefined);
            }}
            maxLength={CHAT_MAX_LENGTH}
            showCount
            error={error}
            returnKeyType="send"
            onSubmitEditing={() => send(text)}
            style={styles.flex}
          />
          <Button label={t('chat.send')} disabled={!text.trim()} onPress={() => send(text)} />
        </View>
      </View>
    </Card>
  );
}

function MessageRow({ message, mine }: { message: ChatMessage; mine: boolean }) {
  if (message.kind === 'system') {
    const params = { ...message.params };
    if (params.ship) params.ship = t(`ships.${params.ship as 'drakkar'}`);
    return (
      <AppText variant="caption" tone="muted" align="center" style={styles.system}>
        {t(`chat.system.${message.key}`, params)}
      </AppText>
    );
  }
  return (
    <View style={[styles.msg, mine && styles.msgMine]}>
      {mine ? null : <Avatar avatar={message.from.avatar} size={24} />}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {mine ? null : (
          <AppText variant="caption" tone="gold">
            {message.from.displayName}
          </AppText>
        )}
        <AppText variant="label" style={mine ? { color: colors.textOnAccent } : undefined}>
          {message.text}
        </AppText>
      </View>
    </View>
  );
}

function QuickChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
    >
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: spacing.sm },
  list: { gap: spacing.sm, paddingVertical: spacing.xs },
  system: { fontStyle: 'italic', paddingHorizontal: spacing.md },
  msg: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, maxWidth: '90%' },
  msgMine: { alignSelf: 'flex-end' },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 14,
    flexShrink: 1,
  },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: 'rgba(255, 255, 255, 0.85)', borderBottomLeftRadius: 4 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: withAlpha(colors.gold, 0.4),
    backgroundColor: withAlpha(colors.gold, 0.08),
  },
  chipPressed: { backgroundColor: withAlpha(colors.gold, 0.2) },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
});
