import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Share, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Avatar } from '@/features/auth';
import { ChatPanel } from '@/features/chat/ChatPanel';
import { AppHeader } from '@/features/common/AppHeader';
import { TURN_SECONDS_OPTIONS, type GameSettings } from '@/game';
import { t } from '@/i18n';
import { services } from '@/services';
import type { Player } from '@/services/auth';
import { RoomError, type Room, type RoomPlayer } from '@/services/room/types';
import {
  AppText,
  Button,
  Card,
  colors,
  Pill,
  RuneText,
  Screen,
  Segmented,
  spacing,
  Toggle,
} from '@/ui';

/** Oda bekleme salonu: kod + link, iki oyuncu kartı, ayarlar (kurucu), sohbet, hazır/başlat. */
export function RoomView({ room, me, onLeave }: { room: Room; me: Player; onLeave: () => void }) {
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const isHost = room.hostId === me.id;
  const mine = room.players.find((p) => p.player.id === me.id);
  const other = room.players.find((p) => p.player.id !== me.id) ?? null;
  const allReady = room.players.length === 2 && room.players.every((p) => p.ready);
  const [notice, setNotice] = useState<string | null>(null);

  const act = (fn: () => void) => {
    try {
      fn();
      setNotice(null);
    } catch (e) {
      setNotice(e instanceof RoomError ? t(`room.errors.${e.code}`) : t('auth.errors.unknown'));
    }
  };
  const patch = (p: Partial<GameSettings>) =>
    act(() => services.rooms.updateSettings(room.code, me.id, p));

  const copyCode = async () => {
    await Clipboard.setStringAsync(room.code);
    setNotice(t('room.copied'));
  };
  const share = async () => {
    const message = t('room.shareText', { url: room.url });
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      if (nav?.share) {
        try {
          await nav.share({ title: t('app.title'), text: message, url: room.url });
          return;
        } catch {
          // Kullanıcı vazgeçti ya da desteklenmiyor: panoya kopyala.
        }
      }
      await Clipboard.setStringAsync(room.url);
      setNotice(t('room.linkCopied'));
      return;
    }
    await Share.share({ message, url: room.url });
  };

  const codeCard = (
    <Card highlighted>
      <View style={styles.codeBody}>
        <AppText variant="overline" tone="muted">
          {t('room.code').toLocaleUpperCase('tr')}
        </AppText>
        <AppText
          variant="h1"
          style={styles.code}
          selectable
          accessibilityLabel={`${t('room.code')}: ${room.code.split('').join(' ')}`}
        >
          {room.code}
        </AppText>
        <RuneText text={room.code.replace(/[0-9]/g, '')} height={12} dotted />
        <AppText variant="caption" tone="muted" selectable numberOfLines={1}>
          {room.url}
        </AppText>
        <View style={styles.row}>
          <Button label={t('room.copy')} variant="secondary" onPress={copyCode} />
          <Button label={t('room.share')} onPress={share} />
        </View>
        {notice ? (
          <AppText variant="label" tone="gold" accessibilityLiveRegion="polite">
            {notice}
          </AppText>
        ) : null}
      </View>
    </Card>
  );

  const players = (
    <View style={styles.players}>
      {[mine, other].map((rp, i) => (
        <PlayerSlot
          key={rp?.player.id ?? `empty-${i}`}
          entry={rp ?? null}
          isHost={rp?.player.id === room.hostId}
          canKick={isHost && rp !== undefined && rp?.player.id !== me.id && rp !== null}
          onKick={() => rp && act(() => services.rooms.kickPlayer(room.code, me.id, rp.player.id))}
        />
      ))}
    </View>
  );

  const settings = (
    <Card title={t('room.settings').toLocaleUpperCase('tr')}>
      <View style={styles.stack}>
        <Toggle
          label={t('room.extraShot')}
          hint={t('room.extraShotHint')}
          value={room.settings.extraShotOnHit}
          onChange={isHost ? (v) => patch({ extraShotOnHit: v }) : undefined}
        />
        <AppText variant="label" tone="secondary">
          {t('room.turnTime')}
        </AppText>
        <SettingSegment
          enabled={isHost}
          value={String(room.settings.turnSeconds)}
          options={TURN_SECONDS_OPTIONS.map((n) => ({
            value: String(n),
            label: n === 0 ? t('room.unlimited') : t('room.seconds', { n }),
          }))}
          onChange={(v) => patch({ turnSeconds: Number(v) })}
          label={t('room.turnTime')}
        />
        <AppText variant="label" tone="secondary">
          {t('room.timeout')}
        </AppText>
        <SettingSegment
          enabled={isHost}
          value={room.settings.timeoutPolicy}
          options={[
            { value: 'randomShot', label: t('room.randomShot') },
            { value: 'skipTurn', label: t('room.skipTurn') },
          ]}
          onChange={(v) => patch({ timeoutPolicy: v as GameSettings['timeoutPolicy'] })}
          label={t('room.timeout')}
        />
        {isHost ? null : (
          <AppText variant="caption" tone="muted">
            {t('room.onlyHost')}
          </AppText>
        )}
      </View>
    </Card>
  );

  const actions = (
    <Card>
      <View style={styles.stack}>
        <Button
          label={mine?.ready ? t('room.unsetReady') : t('room.setReady')}
          variant={mine?.ready ? 'secondary' : 'primary'}
          fullWidth
          size="lg"
          onPress={() => act(() => services.rooms.setReady(room.code, me.id, !mine?.ready))}
        />
        {isHost ? (
          <Button
            label={t('room.start')}
            fullWidth
            size="lg"
            disabled={!allReady}
            onPress={() => act(() => services.rooms.startGame(room.code, me.id))}
          />
        ) : null}
        <AppText variant="caption" tone="muted" align="center">
          {isHost ? t('room.startHint') : t('room.guestStartHint')}
        </AppText>
        <Button label={t('room.leave')} variant="ghost" fullWidth onPress={onLeave} />
      </View>
    </Card>
  );

  const chat = <ChatPanel channel={room.code} me={me} opponent={other?.player ?? null} />;

  return (
    <Screen scroll contentStyle={styles.content}>
      <AppHeader right={<Pill label={t('room.title')} tone="gold" />} />
      {wide ? (
        <View style={styles.wide}>
          <View style={styles.col}>
            {codeCard}
            {players}
            {actions}
          </View>
          <View style={styles.col}>
            {settings}
            {chat}
          </View>
        </View>
      ) : (
        <View style={styles.stack}>
          {codeCard}
          {players}
          {actions}
          {settings}
          {chat}
        </View>
      )}
    </Screen>
  );
}

function SettingSegment({
  enabled,
  value,
  options,
  onChange,
  label,
}: {
  enabled: boolean;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  label: string;
}) {
  if (!enabled) {
    return (
      <AppText variant="bodyStrong">
        {options.find((o) => o.value === value)?.label ?? value}
      </AppText>
    );
  }
  return (
    <Segmented accessibilityLabel={label} value={value} options={options} onChange={onChange} />
  );
}

function PlayerSlot({
  entry,
  isHost,
  canKick,
  onKick,
}: {
  entry: RoomPlayer | null;
  isHost: boolean;
  canKick: boolean;
  onKick: () => void;
}) {
  if (!entry) {
    return (
      <Card style={styles.slot}>
        <View style={styles.slotBody}>
          <View style={styles.emptyAvatar} />
          <AppText tone="muted">{t('room.waiting')}</AppText>
        </View>
      </Card>
    );
  }
  const { player, ready } = entry;
  return (
    <Card style={styles.slot}>
      <View style={styles.slotBody}>
        <Avatar avatar={player.avatar} size={56} />
        <AppText variant="bodyStrong" numberOfLines={1}>
          {player.displayName}
        </AppText>
        <View style={styles.pills}>
          {isHost ? <Pill label={t('room.host')} tone="gold" /> : null}
          {player.isGuest ? <Pill label={t('common.guest')} tone="muted" /> : null}
        </View>
        <Pill
          label={ready ? t('room.ready') : t('room.notReady')}
          tone={ready ? 'accent' : 'muted'}
          solid={ready}
          dot
        />
        {canKick ? <Button label={t('room.kick')} variant="ghost" onPress={onKick} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  wide: { flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' },
  col: { flex: 1, gap: spacing.lg },
  stack: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  codeBody: { alignItems: 'center', gap: spacing.sm },
  code: { fontSize: 44, lineHeight: 52, letterSpacing: 10, color: colors.text },
  players: { flexDirection: 'row', gap: spacing.md },
  slot: { flex: 1 },
  slotBody: { alignItems: 'center', gap: spacing.sm, minHeight: 170, justifyContent: 'center' },
  pills: { flexDirection: 'row', gap: spacing.xs },
  emptyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.hairlineStrong,
  },
});
