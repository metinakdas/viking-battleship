import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import type { AiLevel } from '@/game';
import { t, upperLocale } from '@/i18n';
import { checkNickname, normalizeNickname, randomNickname, type Player } from '@/services/auth';
import { isValidRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from '@/services/room/code';

import { CoinChip, GameHeader, ThemeButton } from '../chrome';
import { ECONOMY } from '@/features/shop/catalog';
import { PIXEL_ART } from '../pixelArt';
import {
  Chip,
  Panel,
  PixelArtView,
  PxButton,
  PxInput,
  Stage,
  Txt,
  useBlink,
  useLayout,
  hoverable,
  CoinIcon,
} from '../kit';
import { A, DIM, titleShadow, themed } from '../theme';

export type MenuChoice =
  | { mode: 'ai'; level: AiLevel }
  | { mode: 'hotseat'; secondName: string }
  | { mode: 'random' }
  | { mode: 'room' }
  | { mode: 'join'; code: string };

type Key = MenuChoice['mode'];
/** Menüdeki modlar (aynı cihazda 2 oyuncu kaldırıldı; akış kodu duruyor). */
const KEYS: readonly Key[] = ['ai', 'random', 'room', 'join'];
const LEVELS: readonly AiLevel[] = ['easy', 'normal', 'hard'];
const ART = {
  ai: 'galleon',
  hotseat: 'frigate',
  random: 'corvette',
  room: 'brig',
  join: 'sloop',
} as const;

/**
 * Mod menüsü (tasarımda yok; aynı piksel dille türetildi): solda arcade "MOD SEÇ" listesi,
 * sağda seçili modun ayrıntısı ve BAŞLA. Ok tuşları + Enter ile de kullanılır.
 */
export function MenuScreen({
  player,
  level,
  onLevel,
  onStart,
  onLogout,
  onBack,
  onLink,
}: {
  player: Player;
  level: AiLevel;
  onLevel: (l: AiLevel) => void;
  onStart: (c: MenuChoice) => void;
  onLogout: () => void;
  /** Üst çubuktaki "◀": kapak ekranına. */
  onBack?: () => void;
  onLink: (to: 'profile' | 'shop' | 'scores' | 'how') => void;
}) {
  const [sel, setSel] = useState<Key>('ai');
  const [second, setSecond] = useState(() => randomNickname().toLocaleUpperCase(upperLocale()));
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const blink = useBlink(500);
  const { portrait } = useLayout();
  const rs = portrait ? 24 : 28;

  const pick = (k: Key) => {
    setSel(k);
    setError(undefined);
  };

  const start = () => {
    if (sel === 'ai') return onStart({ mode: 'ai', level });
    if (sel === 'hotseat') {
      if (checkNickname(second) || normalizeNickname(second) === player.displayName) {
        return setError(t('auth.errors.invalid_nickname').toLocaleUpperCase(upperLocale()));
      }
      return onStart({ mode: 'hotseat', secondName: normalizeNickname(second) });
    }
    if (sel === 'join') {
      const c = normalizeRoomCode(code);
      if (!isValidRoomCode(c))
        return setError(t('lobby.join.invalid').toLocaleUpperCase(upperLocale()));
      return onStart({ mode: 'join', code: c });
    }
    onStart({ mode: sel });
  };

  useMenuKeys(sel, pick, start);

  return (
    <Stage dim={DIM.cover}>
      <GameHeader
        onBack={onBack}
        right={
          <>
            <CoinChip />
            <Chip
              label={player.displayName.toLocaleUpperCase(upperLocale())}
              color={A.cyan}
              accessibilityLabel={t('arcade.menu.links.profile')}
              onPress={() => onLink('profile')}
            />
            {/* Mobilde yer dar: çıkış profil ekranında. */}
            {portrait ? null : (
              <Chip label={t('arcade.menu.logout')} color={A.muted} onPress={onLogout} />
            )}
            <ThemeButton />
          </>
        }
      />

      <Panel style={portrait ? styles.listP : styles.list}>
        <Txt
          font="press"
          size={portrait ? 32 : 40}
          ls={3}
          color={A.yellow}
          shadow={titleShadow(4).textShadow}
          accessibilityRole="header"
        >
          {t('arcade.menu.title')}
        </Txt>
        <View
          style={[styles.rows, portrait && { flex: 0 }]}
          role="radiogroup"
          aria-label={t('arcade.menu.title')}
        >
          {KEYS.map((k, i) => {
            const on = sel === k;
            return (
              <Pressable
                key={k}
                role="radio"
                aria-checked={on}
                accessibilityLabel={t(`arcade.menu.${k}.title`)}
                // İlk tıklama seçer, seçili moda tekrar tıklamak başlatır. Üzerinden geçmek seçimi
                // değiştirmez (yoksa sağdaki BAŞLA tuşuna giderken seçim kayıyordu).
                onPress={() => (on ? start() : pick(k))}
                style={hoverable([styles.row, portrait && styles.rowP, on && styles.rowOn])}
              >
                <Txt font="press" size={rs} color={A.yellow} style={styles.cursor} aria-hidden>
                  {on && blink ? '▶' : ' '}
                </Txt>
                <Txt font="press" size={24} color={on ? A.yellow : A.faded} style={styles.num}>
                  {String(i + 1)}
                </Txt>
                <Txt
                  font="press"
                  size={rs}
                  color={on ? A.text : A.textSoft}
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {t(`arcade.menu.${k}.title`)}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.links}>
          {(['profile', 'shop', 'scores', 'how'] as const).map((k) => (
            <PxButton
              key={k}
              label={t(`arcade.menu.links.${k}`)}
              variant="secondary"
              size={24}
              onPress={() => onLink(k)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      </Panel>

      <Panel style={portrait ? styles.detailP : styles.detail}>
        <View style={[styles.artBox, portrait && styles.artBoxP]}>
          <PixelArtView
            art={ART[sel]}
            width={PIXEL_ART[ART[sel]].w * (portrait ? 8 : 12)}
            height={PIXEL_ART[ART[sel]].h * (portrait ? 8 : 12)}
          />
        </View>
        <Txt size={portrait ? 30 : 34} color={A.textSoft}>
          {t(`arcade.menu.${sel}.description`)}
        </Txt>

        {sel === 'ai' ? (
          <View style={{ gap: 12 }}>
            <Txt font="press" size={24} color={A.muted}>
              {t('arcade.menu.level')}
            </Txt>
            <View style={styles.levels} role="radiogroup" aria-label={t('arcade.menu.level')}>
              {LEVELS.map((l) => (
                <Pressable
                  key={l}
                  role="radio"
                  aria-checked={level === l}
                  onPress={() => onLevel(l)}
                  style={hoverable([styles.level, level === l && styles.levelOn])}
                >
                  <Txt font="press" size={24} align="center" color={level === l ? A.ink : A.text}>
                    {t(`arcade.menu.levels.${l}`)}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {sel === 'hotseat' ? (
          <PxInput
            label={t('arcade.menu.secondName')}
            placeholder={t('arcade.menu.secondName')}
            value={second}
            onChangeText={(v) => {
              setSecond(v);
              setError(undefined);
            }}
            maxLength={16}
            autoCapitalize="characters"
            error={error}
            returnKeyType="go"
            onSubmitEditing={start}
          />
        ) : null}

        {sel === 'join' ? (
          <PxInput
            label={t('lobby.join.placeholder')}
            placeholder={t('arcade.menu.codePlaceholder')}
            value={code}
            onChangeText={(v) => {
              setCode(v.toUpperCase());
              setError(undefined);
            }}
            maxLength={64}
            autoCapitalize="characters"
            autoCorrect={false}
            error={error}
            returnKeyType="go"
            onSubmitEditing={start}
          />
        ) : null}

        <View style={{ flex: 1 }} />
        <PxButton
          accessibilityLabel={t(`arcade.menu.${sel}.start`)}
          onPress={start}
          disabled={sel === 'join' && normalizeRoomCode(code).length < ROOM_CODE_LENGTH}
        >
          <View style={styles.startRow}>
            <Txt font="press" size={28} color={A.ink}>
              {t(`arcade.menu.${sel}.start`)}
            </Txt>
            {/* Oda kurmanın bedeli: düğmede sikke + tutar. */}
            {sel === 'room' ? (
              <View style={styles.cost}>
                <CoinIcon size={26} />
                <Txt font="press" size={24} color={A.ink}>
                  {String(ECONOMY.roomCost)}
                </Txt>
              </View>
            ) : null}
          </View>
        </PxButton>
      </Panel>
    </Stage>
  );
}

/** Web: ▲▼ mod seç, Enter başlat (bir alanda yazarken devre dışı). */
function useMenuKeys(sel: Key, pick: (k: Key) => void, start: () => void) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const i = KEYS.indexOf(sel);
      if (e.key === 'ArrowDown') pick(KEYS[(i + 1) % KEYS.length] ?? 'ai');
      else if (e.key === 'ArrowUp') pick(KEYS[(i + KEYS.length - 1) % KEYS.length] ?? 'ai');
      else if (e.key === 'Enter') start();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, pick, start]);
}

const styles = themed(() =>
  StyleSheet.create({
    list: {
      position: 'absolute',
      left: 56,
      top: 164,
      width: 1000,
      height: 880,
      padding: 44,
      gap: 20,
    },
    listP: { position: 'absolute', left: 20, top: 118, width: 680, padding: 24, gap: 14 },
    rowP: { paddingVertical: 12, paddingHorizontal: 12, gap: 12 },
    detailP: {
      position: 'absolute',
      left: 20,
      top: 700,
      width: 680,
      bottom: 16,
      padding: 24,
      gap: 14,
    },
    artBoxP: { height: 110 },
    startRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
    cost: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: 'rgba(26,10,42,0.12)',
    },
    rows: { gap: 6, flex: 1 },
    links: { flexDirection: 'row', gap: 12 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderWidth: 4,
      borderColor: 'transparent',
    },
    rowOn: {
      borderColor: A.yellow,
      backgroundColor: 'rgba(255,210,63,0.08)',
      boxShadow: `6px 6px 0px ${A.bgDeep}`,
    },
    cursor: { width: 32 },
    num: { width: 36 },
    detail: {
      position: 'absolute',
      left: 1080,
      top: 164,
      width: 784,
      height: 880,
      padding: 48,
      gap: 24,
    },
    artBox: {
      height: 220,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: A.input,
      borderWidth: 4,
      borderColor: A.lineDim,
      overflow: 'hidden',
    },
    levels: { flexDirection: 'row', gap: 12 },
    level: {
      flex: 1,
      borderWidth: 4,
      borderColor: A.line,
      backgroundColor: A.input,
      paddingVertical: 16,
    },
    levelOn: {
      backgroundColor: A.yellow,
      borderColor: A.yellowHi,
      boxShadow: `0px 6px 0px ${A.orangeSh}`,
    },
  }),
);
