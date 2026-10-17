import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  COIN_PACKS,
  ECONOMY,
  itemsOf,
  type CoinPack,
  type CosmeticItem,
  type CosmeticKind,
} from '@/features/shop/catalog';
import { t, type TranslationKey } from '@/i18n';
import { isOwned, useWallet, useWalletStore } from '@/store/walletStore';

import type { GridCell, GridConfig, GridShip } from '../canvas/pixelGrid';
import { CoinChip, GameHeader } from '../chrome';
import { GridInFlow } from '../GridBoard';
import { CoinIcon, hoverable, Panel, PxButton, Stage, Txt, useLayout } from '../kit';
import { A, DIM, themed, titleShadow } from '../theme';

type Tab = 'gold' | CosmeticKind;
const TABS: readonly Tab[] = ['gold', 'ship', 'ball', 'flame', 'map'];

const itemName = (id: string) => t(('arcade.items.' + id) as TranslationKey);

/**
 * Market: altın paketleri (demo) ve altınla alınan kozmetikler. Her ürün canlı önizlemeli:
 * gemi boyası, uçan gülle, patlama ateşi, deniz (harita).
 */
export function ShopScreen({
  initialTab = 'ship',
  need,
  onBack,
}: {
  initialTab?: Tab;
  /** "room": oda kurmaya altın yetmedi, buraya yönlendirildi. */
  need?: 'room';
  onBack: () => void;
}) {
  const { portrait } = useLayout();
  const [tab, setTab] = useState<Tab>(need ? 'gold' : initialTab);
  const [toast, setToast] = useState<{ text: string; good: boolean } | null>(
    need === 'room'
      ? { text: t('arcade.shop.needRoom', { cost: ECONOMY.roomCost }), good: false }
      : null,
  );
  const wallet = useWallet();
  const buyItem = useWalletStore((s) => s.buyItem);
  const equip = useWalletStore((s) => s.equip);
  const buyPack = useWalletStore((s) => s.buyPack);

  const onItem = (item: CosmeticItem) => {
    if (!wallet.playerId) return;
    if (isOwned(wallet, item.id)) {
      equip(wallet.playerId, item.id);
      return;
    }
    const r = buyItem(wallet.playerId, item.id);
    if (r === 'poor') setToast({ text: t('arcade.shop.poor'), good: false });
    else if (r === 'ok') {
      equip(wallet.playerId, item.id);
      setToast({ text: '✓ ' + itemName(item.id), good: true });
    }
  };
  const onPack = (p: CoinPack) => {
    if (!wallet.playerId) return;
    buyPack(wallet.playerId, p.id);
    setToast({ text: t('arcade.shop.bought', { n: p.gold }), good: true });
  };

  const tabs = (
    <View style={portrait ? styles.tabsP : styles.tabs} role="tablist">
      {TABS.map((k) => (
        <Pressable
          key={k}
          role="tab"
          aria-selected={tab === k}
          onPress={() => {
            setTab(k);
            setToast(null);
          }}
          style={hoverable([styles.tab, portrait && styles.tabP, tab === k && styles.tabOn])}
        >
          {k === 'gold' ? <CoinIcon size={portrait ? 22 : 26} /> : null}
          <Txt font="press" size={24} color={tab === k ? A.ink : A.text} numberOfLines={1}>
            {t(('arcade.shop.tabs.' + k) as TranslationKey)}
          </Txt>
        </Pressable>
      ))}
    </View>
  );

  const cols = portrait ? 2 : 3;
  const preview = portrait ? 230 : 250;
  const cards =
    tab === 'gold'
      ? COIN_PACKS.map((p) => (
          <PackCard key={p.id} pack={p} onBuy={() => onPack(p)} portrait={portrait} />
        ))
      : itemsOf(tab).map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            size={preview}
            owned={isOwned(wallet, item.id)}
            equipped={wallet.equipped[item.kind] === item.id}
            affordable={wallet.gold >= item.price}
            onPress={() => onItem(item)}
          />
        ));

  const toastView = toast ? (
    <View style={[styles.toast, { borderColor: toast.good ? '#1f9d55' : A.red }]} role="status">
      <Txt font="press" size={24} color={toast.good ? '#1f9d55' : A.red} numberOfLines={2}>
        {toast.text}
      </Txt>
    </View>
  ) : null;

  const width = (100 / cols - (portrait ? 2 : 1.6)).toFixed(1) + '%';
  const grid = (
    <View style={[styles.cards, { gap: portrait ? 14 : 24 }]}>
      {cards.map((c, i) => (
        <View key={i} style={{ width: width as `${number}%` }}>
          {c}
        </View>
      ))}
    </View>
  );

  return (
    <Stage dim={DIM.game}>
      <GameHeader onBack={onBack} right={<CoinChip />} />
      {portrait ? (
        <ScrollView style={styles.pScroll} contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
          {tabs}
          {toastView}
          {tab === 'gold' ? <DemoNote /> : null}
          {grid}
          <Txt size={26} color={A.muted}>
            {t('arcade.shop.earn')}
          </Txt>
        </ScrollView>
      ) : (
        <>
          <Panel style={styles.side}>
            <Txt
              font="press"
              size={32}
              color={A.yellow}
              shadow={titleShadow(3).textShadow}
              accessibilityRole="header"
            >
              {t('arcade.shop.title')}
            </Txt>
            {tabs}
            <View style={{ flex: 1 }} />
            <Txt size={28} color={A.muted}>
              {t('arcade.shop.earn')}
            </Txt>
          </Panel>
          <Panel style={styles.main}>
            {toastView}
            {tab === 'gold' ? <DemoNote /> : null}
            <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>{grid}</ScrollView>
          </Panel>
        </>
      )}
    </Stage>
  );
}

function DemoNote() {
  return (
    <View style={styles.demo}>
      <Txt font="press" size={24} color={A.cyan} align="center">
        {t('arcade.shop.demo')}
      </Txt>
    </View>
  );
}

/* ───────────── Ürün kartı + canlı önizleme ───────────── */

function ItemCard({
  item,
  size,
  owned,
  equipped,
  affordable,
  onPress,
}: {
  item: CosmeticItem;
  size: number;
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
  onPress: () => void;
}) {
  const { portrait } = useLayout();
  return (
    <View style={[styles.card, equipped && styles.cardOn]}>
      <View style={styles.preview}>
        <ItemPreview item={item} size={size} />
      </View>
      <Txt font="press" size={24} numberOfLines={1}>
        {itemName(item.id)}
      </Txt>
      {equipped ? (
        <PxButton
          label={t('arcade.shop.equipped')}
          variant="secondary"
          size={24}
          disabled
          style={styles.cardBtn}
        />
      ) : owned ? (
        <PxButton
          label={t('arcade.shop.equip')}
          variant="secondary"
          size={24}
          onPress={onPress}
          style={styles.cardBtn}
        />
      ) : (
        <PxButton
          accessibilityLabel={t('arcade.shop.buy') + ' · ' + item.price}
          onPress={onPress}
          style={[styles.cardBtn, !affordable && { opacity: 0.6 }]}
        >
          <View style={styles.priceRow}>
            {portrait ? null : (
              <Txt font="press" size={24} color={A.ink}>
                {t('arcade.shop.buy')}
              </Txt>
            )}
            <CoinIcon size={portrait ? 28 : 24} />
            <Txt font="press" size={portrait ? 28 : 24} color={A.ink}>
              {String(item.price)}
            </Txt>
          </View>
        </PxButton>
      )}
    </View>
  );
}

const SHIPS: GridShip[] = [
  [1, 2, 5, 0, '', 'galleon'],
  [1, 5, 4, 0, '', 'frigate'],
  [7, 1, 3, 1, '', 'brig'],
  [6, 8, 3, 0, '', 'corvette'],
  [8, 5, 2, 1, '', 'sloop'],
];
const SHOTS: GridCell[] = [
  [4, 4],
  [6, 2],
  [2, 7],
  [7, 6],
];

/** Kozmetiği gösteren küçük canlı ızgara. Gülle/alevde atışlar döngüyle tekrar eder. */
function ItemPreview({ item, size }: { item: CosmeticItem; size: number }) {
  const animated = item.kind === 'ball' || item.kind === 'flame';
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => setStep((s) => (s + 1) % (SHOTS.length + 1)), 1100);
    return () => clearInterval(id);
  }, [animated]);

  let config: GridConfig;
  if (item.kind === 'ship') {
    config = { C: 12, ships: SHIPS, look: { ship: item.look ?? undefined } };
  } else if (item.kind === 'map') {
    config = {
      C: 12,
      ships: SHIPS.slice(0, 2),
      hit: [[3, 2]],
      miss: [
        [6, 6],
        [2, 8],
        [8, 3],
      ],
      look: { sea: item.look ?? undefined },
    };
  } else {
    config = {
      C: 12,
      hit: SHOTS.slice(0, step),
      miss: [[1, 1]],
      look:
        item.kind === 'ball' ? { ball: item.look ?? undefined } : { flame: item.look ?? undefined },
    };
  }
  return (
    <GridInFlow
      size={size}
      labels={false}
      frameColor={A.line}
      config={config}
      accessibilityLabel={itemName(item.id)}
    />
  );
}

/* ───────────── Altın paketi ───────────── */

function PackCard({
  pack,
  onBuy,
  portrait,
}: {
  pack: CoinPack;
  onBuy: () => void;
  portrait: boolean;
}) {
  const coins = pack.id === 'pouch' ? 3 : pack.id === 'chest' ? 6 : 10;
  return (
    <View style={styles.card}>
      <View style={[styles.preview, styles.packArt, { height: portrait ? 200 : 250 }]}>
        <View style={styles.pile}>
          {Array.from({ length: coins }, (_, i) => (
            <CoinIcon key={i} size={portrait ? 40 : 48} />
          ))}
        </View>
        {pack.bonus ? (
          <View style={styles.bonus}>
            <Txt font="press" size={24} color={A.ink}>
              {t('arcade.shop.bonus', { n: pack.bonus })}
            </Txt>
          </View>
        ) : null}
      </View>
      <View style={styles.priceRow}>
        <CoinIcon size={30} />
        <Txt font="press" size={32} color={A.yellow} shadow={'3px 3px 0px ' + A.bgDeep}>
          {String(pack.gold)}
        </Txt>
      </View>
      <Txt size={30} color={A.muted}>
        {t(('arcade.shop.packs.' + pack.id) as TranslationKey)}
      </Txt>
      <PxButton
        label={t('arcade.shop.buy') + ' · ' + pack.price}
        size={24}
        onPress={onBuy}
        style={styles.cardBtn}
      />
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    side: {
      position: 'absolute',
      left: 56,
      top: 164,
      width: 340,
      height: 880,
      padding: 28,
      gap: 20,
    },
    main: {
      position: 'absolute',
      left: 420,
      top: 164,
      width: 1444,
      height: 880,
      padding: 32,
      gap: 16,
    },
    pScroll: { position: 'absolute', left: 20, top: 118, width: 680, bottom: 0 },
    tabs: { gap: 10 },
    tabsP: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderWidth: 4,
      borderColor: A.line,
      backgroundColor: A.input,
    },
    tabP: { paddingVertical: 10, paddingHorizontal: 12 },
    tabOn: { backgroundColor: A.yellow, borderColor: A.yellowHi },
    cards: { flexDirection: 'row', flexWrap: 'wrap' },
    card: {
      gap: 12,
      padding: 14,
      borderWidth: 4,
      borderColor: A.lineDim,
      backgroundColor: A.input,
      alignItems: 'center',
    },
    cardOn: { borderColor: A.yellow },
    preview: { alignItems: 'center', justifyContent: 'center', paddingBottom: 14 },
    cardBtn: { alignSelf: 'stretch' },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    packArt: { alignSelf: 'stretch', backgroundColor: A.slot },
    pile: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, width: 240 },
    bonus: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: A.yellow,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderWidth: 3,
      borderColor: A.orangeSh,
    },
    toast: { borderWidth: 4, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: A.input },
    demo: { borderWidth: 3, borderStyle: 'dashed', borderColor: A.cyan, paddingVertical: 10 },
  }),
);
