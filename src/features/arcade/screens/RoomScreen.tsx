import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { TURN_SECONDS_OPTIONS, type GameSettings } from '@/game';
import { t, upperLocale } from '@/i18n';
import { services } from '@/services';
import type { Player } from '@/services/auth';
import { RoomError, type Room, type RoomPlayer } from '@/services/room/types';

import { GameHeader, PxSwitch } from '../chrome';
import {
  Chip,
  Panel,
  PixelArtView,
  PxButton,
  Stage,
  Txt,
  useBlink,
  useLayout,
  hoverable,
} from '../kit';
import { PxChat } from '../PxChat';
import { A, DIM, titleShadow, themed } from '../theme';

const up = (s: string) => s.toLocaleUpperCase(upperLocale());

/** Oda bekleme salonu: kod + link, iki kaptan, hazır/başlat | oda ayarları + sohbet. */
export function RoomScreen({ room, me, onLeave }: { room: Room; me: Player; onLeave: () => void }) {
  const isHost = room.hostId === me.id;
  const { portrait } = useLayout();
  const mine = room.players.find((p) => p.player.id === me.id);
  const other = room.players.find((p) => p.player.id !== me.id) ?? null;
  const allReady = room.players.length === 2 && room.players.every((p) => p.ready);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const act = (fn: () => void) => {
    try {
      fn();
      setNotice(null);
    } catch (e) {
      setNotice({
        text: up(e instanceof RoomError ? t(`room.errors.${e.code}`) : t('auth.errors.unknown')),
        error: true,
      });
    }
  };
  const patch = (p: Partial<GameSettings>) =>
    act(() => services.rooms.updateSettings(room.code, me.id, p));

  // Kopyalanan şey düğmenin üstünde kısa süre "KOPYALANDI ✓" olarak görünür.
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const copy = async (what: 'code' | 'link') => {
    await Clipboard.setStringAsync(what === 'code' ? room.code : room.url);
    setCopied(what);
    setTimeout(() => setCopied((c) => (c === what ? null : c)), 1800);
  };
  /** WhatsApp: hazır davet mesajıyla sohbet seçimi açılır (web: yeni sekme, telefonda uygulama). */
  const whatsapp = () => {
    const text =
      t('room.shareText', { url: room.url }) + ' · ' + t('arcade.room.code') + ': ' + room.code;
    void Linking.openURL('https://wa.me/?text=' + encodeURIComponent(text));
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
      setNotice({ text: up(t('room.linkCopied')) });
      return;
    }
    await Share.share({ message, url: room.url });
  };

  const body = (
    <>
      <Panel style={portrait ? styles.leftP : styles.left}>
        {/* Davet bileti: kod + link, ikisi de tek dokunuşla kopyalanır (simge ✓ olur). */}
        <View style={styles.ticket}>
          <View style={styles.codeRow}>
            <View style={{ gap: 6 }}>
              <Txt font="press" size={24} color={A.muted}>
                {t('arcade.room.code')}
              </Txt>
              <Txt
                font="press"
                size={portrait ? 48 : 64}
                ls={portrait ? 8 : 12}
                color={A.yellow}
                shadow={titleShadow(5).textShadow}
                selectable
                accessibilityLabel={`${t('room.code')}: ${room.code.split('').join(' ')}`}
              >
                {room.code}
              </Txt>
            </View>
            <IconAction
              label={t('arcade.room.copyCode')}
              done={copied === 'code'}
              onPress={() => void copy('code')}
            />
          </View>
          <View style={styles.linkRow}>
            <LinkIcon />
            <Txt size={30} color={A.textSoft} numberOfLines={1} selectable style={{ flex: 1 }}>
              {room.url.replace(/^https?:\/\//, '')}
            </Txt>
            <IconAction
              label={t('arcade.room.copyLink')}
              done={copied === 'link'}
              onPress={() => void copy('link')}
              small
            />
          </View>
        </View>
        <View style={styles.row}>
          <PxButton
            accessibilityLabel={t('arcade.room.whatsapp')}
            onPress={whatsapp}
            style={[styles.waBtn, { flex: 1 }]}
          >
            <View style={styles.waInner}>
              <WhatsAppIcon />
              <Txt font="press" size={24} color="#ffffff">
                WHATSAPP
              </Txt>
            </View>
          </PxButton>
          <IconAction label={t('arcade.room.share')} onPress={share} icon="share" />
        </View>
        {notice?.error ? (
          <Txt size={30} color={A.red} accessibilityLiveRegion="polite">
            {notice.text}
          </Txt>
        ) : null}

        <View style={styles.row}>
          {[mine ?? null, other].map((rp, i) => (
            <Slot
              key={rp?.player.id ?? `empty-${i}`}
              entry={rp}
              isHost={rp?.player.id === room.hostId}
              canKick={isHost && rp !== null && rp.player.id !== me.id}
              onKick={() =>
                rp && act(() => services.rooms.kickPlayer(room.code, me.id, rp.player.id))
              }
            />
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <View style={styles.row}>
          <PxButton
            label={mine?.ready ? t('arcade.room.unready') : t('arcade.room.ready')}
            variant={mine?.ready ? 'secondary' : 'primary'}
            size={24}
            onPress={() => act(() => services.rooms.setReady(room.code, me.id, !mine?.ready))}
            style={{ flex: 1 }}
          />
          {isHost ? (
            <PxButton
              label={t('arcade.room.start')}
              size={24}
              disabled={!allReady}
              onPress={() => act(() => services.rooms.startGame(room.code, me.id))}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
        <View style={styles.between}>
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" onPress={onLeave} hitSlop={8}>
            <Txt size={34} color={A.pink}>
              {t('arcade.room.leave')}
            </Txt>
          </Pressable>
        </View>
      </Panel>

      <Panel style={portrait ? styles.rightP : styles.right}>
        <Txt font="press" size={24} accessibilityRole="header">
          {t('arcade.room.settings')}
        </Txt>
        <PxSwitch
          label={up(t('room.extraShot'))}
          value={room.settings.extraShotOnHit}
          onChange={(v) => (isHost ? patch({ extraShotOnHit: v }) : undefined)}
        />
        <Options
          label={up(t('room.turnTime'))}
          enabled={isHost}
          value={String(room.settings.turnSeconds)}
          options={TURN_SECONDS_OPTIONS.map((n) => ({
            value: String(n),
            label: n === 0 ? t('arcade.room.unlimited') : t('arcade.room.seconds', { n }),
          }))}
          onChange={(v) => patch({ turnSeconds: Number(v) })}
        />
        <Options
          label={up(t('room.timeout'))}
          enabled={isHost}
          value={room.settings.timeoutPolicy}
          options={[
            { value: 'randomShot', label: up(t('room.randomShot')) },
            { value: 'skipTurn', label: up(t('room.skipTurn')) },
          ]}
          onChange={(v) => patch({ timeoutPolicy: v as GameSettings['timeoutPolicy'] })}
        />
        {isHost ? null : (
          <Txt size={28} color={A.faded}>
            {up(t('room.onlyHost'))}
          </Txt>
        )}
        <View style={styles.divider} />
        <Txt font="press" size={24} accessibilityRole="header">
          {t('arcade.chat.tab')}
        </Txt>
        <View style={portrait ? styles.chatP : { flex: 1 }}>
          <PxChat channel={room.code} me={me} opponent={other?.player ?? null} />
        </View>
      </Panel>
    </>
  );

  return (
    <Stage dim={DIM.game}>
      <GameHeader
        right={<Chip label={t('arcade.room.chip', { code: room.code })} color={A.cyan} />}
      />
      {/* Mobil: iki panel alt alta, kaydırılabilir. */}
      {portrait ? (
        <ScrollView style={styles.pScroll} contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </Stage>
  );
}

/** Kare simge düğmesi: kopyala (iki üst üste kâğıt), paylaş (kutudan çıkan ok); başarıda ✓. */
function IconAction({
  label,
  onPress,
  done,
  small,
  icon = 'copy',
}: {
  label: string;
  onPress: () => void;
  done?: boolean;
  small?: boolean;
  icon?: 'copy' | 'share';
}) {
  const box = small ? 52 : 72;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={done ? t('arcade.room.copied') : label}
      onPress={onPress}
      style={hoverable([styles.iconAct, { width: box, height: box }, done && styles.iconDone])}
    >
      <PixelGlyph kind={done ? 'check' : icon} size={small ? 26 : 34} />
    </Pressable>
  );
}

const GLYPHS = {
  // 8×8 piksel; her satır bir dizi
  copy: [
    '..######',
    '..#....#',
    '###....#',
    '#.#....#',
    '#.######',
    '#......#',
    '#......#',
    '########',
  ],
  share: [
    '...##...',
    '..####..',
    '.#.##.#.',
    '...##...',
    '#..##..#',
    '#......#',
    '#......#',
    '########',
  ],
  check: [
    '........',
    '.......#',
    '......##',
    '#....##.',
    '##..##..',
    '.####...',
    '..##....',
    '........',
  ],
  link: [
    '..##....',
    '.#..#...',
    '.#..#...',
    '..####..',
    '...#..#.',
    '...#..#.',
    '....##..',
    '........',
  ],
} as const;

function PixelGlyph({
  kind,
  size,
  color,
}: {
  kind: keyof typeof GLYPHS;
  size: number;
  color?: string;
}) {
  const c = color ?? (kind === 'check' ? '#1f9d55' : A.text);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      {...({ shapeRendering: 'crispEdges' } as Record<string, string>)}
    >
      {GLYPHS[kind].flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === '#' ? <Rect key={x + '-' + y} x={x} y={y} width={1} height={1} fill={c} /> : null,
        ),
      )}
    </Svg>
  );
}

function LinkIcon() {
  return <PixelGlyph kind="link" size={26} color={A.muted} />;
}

/** Piksel WhatsApp simgesi: yeşil konuşma balonu + beyaz telefon. */
function WhatsAppIcon() {
  return (
    <Svg
      width={34}
      height={34}
      viewBox="0 0 17 17"
      {...({ shapeRendering: 'crispEdges' } as Record<string, string>)}
    >
      <Rect x={4} y={1} width={9} height={1} fill="#ffffff" />
      <Rect x={2} y={2} width={13} height={2} fill="#ffffff" />
      <Rect x={1} y={4} width={15} height={8} fill="#ffffff" />
      <Rect x={2} y={12} width={13} height={2} fill="#ffffff" />
      <Rect x={1} y={14} width={4} height={2} fill="#ffffff" />
      <Rect x={4} y={14} width={9} height={1} fill="#ffffff" />
      <Path d="M6 5h2v2H7v1l2 2h1V9h2v2l-1 1H9L5 8V6z" fill="#128c4a" />
    </Svg>
  );
}

function Options({
  label,
  enabled,
  value,
  options,
  onChange,
}: {
  label: string;
  enabled: boolean;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Txt size={32} lh={1}>
        {label}
      </Txt>
      <View style={styles.options} role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              role="radio"
              aria-checked={on}
              aria-disabled={!enabled}
              disabled={!enabled}
              onPress={() => onChange(o.value)}
              style={hoverable([
                styles.opt,
                on && styles.optOn,
                !enabled && !on && { opacity: 0.5 },
              ])}
            >
              <Txt size={30} lh={1} color={on ? A.ink : A.text}>
                {o.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Slot({
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
  const blink = useBlink(600);
  if (!entry) {
    return (
      <View style={[styles.slot, styles.slotEmpty]}>
        <Txt font="press" size={24} align="center" color={blink ? A.muted : A.faded}>
          {t('arcade.room.waiting')}
        </Txt>
      </View>
    );
  }
  const { player, ready } = entry;
  return (
    <View style={[styles.slot, ready && { borderColor: A.yellow }]}>
      <PixelArtView art="emblem" width={64} height={56} />
      <Txt font="press" size={24} align="center" numberOfLines={1}>
        {up(player.displayName)}
      </Txt>
      <View style={styles.tags}>
        {isHost ? <Tag label={t('arcade.room.host')} color={A.yellow} /> : null}
        {player.isGuest ? <Tag label={t('arcade.room.guest')} color={A.muted} /> : null}
      </View>
      <Txt size={32} color={ready ? A.yellow : A.muted}>
        {ready ? t('arcade.room.isReady') : t('arcade.room.notReady')}
      </Txt>
      {canKick ? (
        <Pressable accessibilityRole="button" onPress={onKick} hitSlop={8}>
          <Txt size={30} color={A.red}>
            {t('arcade.room.kick')}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Txt size={26} lh={1} color={color}>
        {label}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    ticket: {
      gap: 16,
      padding: 20,
      borderWidth: 4,
      borderStyle: 'dashed',
      borderColor: A.line,
      backgroundColor: A.input,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    iconAct: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: A.line,
      backgroundColor: A.panel,
      boxShadow: `0px 4px 0px ${A.bgDeep}`,
    },
    iconDone: { borderColor: '#1f9d55' },
    copyBtn: { paddingHorizontal: 16, minWidth: 220 },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: 14,
      borderTopWidth: 3,
      borderColor: A.lineDim,
    },
    linkBox: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderWidth: 4,
      borderColor: A.lineDim,
      backgroundColor: A.input,
    },
    waBtn: {
      backgroundColor: '#25d366',
      borderColor: '#7dffb0',
      boxShadow: '0px 8px 0px #128c4a, 0px 14px 0px ' + A.bgDeep,
    },
    waInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
    pScroll: { position: 'absolute', left: 20, top: 118, width: 680, bottom: 0 },
    leftP: { padding: 24, gap: 18 },
    rightP: { padding: 24, gap: 16 },
    chatP: { height: 520 },
    left: {
      position: 'absolute',
      left: 56,
      top: 164,
      width: 880,
      height: 880,
      padding: 32,
      gap: 14,
    },
    right: {
      position: 'absolute',
      left: 960,
      top: 164,
      width: 904,
      height: 880,
      padding: 40,
      gap: 20,
    },
    codeBlock: { gap: 12 },
    row: { flexDirection: 'row', gap: 16 },
    between: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    slot: {
      flex: 1,
      height: 224,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      borderWidth: 4,
      borderColor: A.line,
      backgroundColor: A.input,
      padding: 16,
    },
    slotEmpty: { borderStyle: 'dashed', borderColor: A.lineDim },
    tags: { flexDirection: 'row', gap: 8 },
    tag: { borderWidth: 3, paddingVertical: 4, paddingHorizontal: 8 },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    opt: {
      borderWidth: 4,
      borderColor: A.line,
      backgroundColor: A.input,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    optOn: { backgroundColor: A.yellow, borderColor: A.yellowHi },
    divider: { height: 4, backgroundColor: A.lineDim },
  }),
);
