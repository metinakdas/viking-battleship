import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/i18n';

import { GridBoard } from '../GridBoard';
import { SettingsButton } from '../chrome';
import { Hud, Panel, Stage, Txt, useBlink, useLayout } from '../kit';
import { A, DIM, hudShadow, titleShadow, themed } from '../theme';

/** Kapaktaki demo ızgara: tasarım dosyasındaki veri birebir. */
const DEMO = {
  C: 16,
  ships: [
    [1, 1, 5, 0, ''],
    [7, 2, 4, 1, ''],
    [1, 6, 3, 0, ''],
    [4, 4, 2, 1, ''],
  ],
  hit: [
    [2, 1],
    [3, 1],
    [7, 3],
  ],
  miss: [
    [0, 0],
    [6, 0],
    [4, 2],
    [1, 4],
    [7, 7],
    [3, 8],
  ],
  aim: [5, 6],
} as const;

/** Kapak: "PRESS START". Tıklama ya da herhangi bir tuş → devam. */
export function CoverScreen({
  score,
  hiScore,
  onStart,
}: {
  score: string;
  hiScore: string;
  onStart: () => void;
}) {
  const blink = useBlink(500);
  const { portrait } = useLayout();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      onStart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <Stage dim={DIM.cover}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel={t('arcade.cover.start')}
      >
        <Panel style={portrait ? styles.panelP : styles.panel}>
          <Txt
            font="press"
            size={portrait ? 64 : 96}
            lh={1.25}
            ls={4}
            color={A.yellow}
            shadow={titleShadow(6).textShadow}
            accessibilityRole="header"
          >
            {'AMİRAL\nBATTI'}
          </Txt>
          <Txt size={portrait ? 34 : 40} lh={1.15} color={A.textSoft}>
            {t('arcade.cover.description')}
          </Txt>
          <View style={styles.chips}>
            {[t('arcade.cover.chip1'), t('arcade.cover.chip2'), t('arcade.cover.chip3')].map(
              (c) => (
                <View key={c} style={styles.chip}>
                  <Txt size={32} lh={1}>
                    {c}
                  </Txt>
                </View>
              ),
            )}
          </View>
        </Panel>

        {portrait ? (
          <GridBoard left={110} top={660} size={500} config={DEMO} frameColor={A.text} />
        ) : (
          <GridBoard left={1176} top={216} size={640} config={DEMO} frameColor={A.text} />
        )}

        <Txt
          font="press"
          size={24}
          align="center"
          color={A.yellow}
          shadow={hudShadow.textShadow}
          style={[portrait ? styles.startP : styles.start, { opacity: blink ? 1 : 0 }]}
        >
          {t('arcade.cover.start')}
        </Txt>
        <Hud label="1UP" value={score} style={portrait ? styles.hudLeftP : styles.hudLeft} />
        {portrait ? null : (
          <Hud label="HI-SCORE" value={hiScore} align="right" style={styles.hudRight} />
        )}
      </Pressable>
      <SettingsButton style={portrait ? { right: 20, top: 24 } : undefined} />
    </Stage>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    panel: {
      position: 'absolute',
      left: 96,
      top: 176,
      width: 928,
      padding: 56,
      gap: 32,
    },
    panelP: { position: 'absolute', left: 20, top: 110, width: 680, padding: 36, gap: 24 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    chip: {
      backgroundColor: A.input,
      borderWidth: 4,
      borderColor: A.line,
      paddingVertical: 12,
      paddingHorizontal: 18,
    },
    start: { position: 'absolute', left: 1176, top: 888, width: 640 },
    hudLeft: { position: 'absolute', left: 96, top: 48, width: 480 },
    hudLeftP: { position: 'absolute', left: 24, top: 40, width: 500 },
    startP: { position: 'absolute', left: 20, top: 1200, width: 680 },
    hudRight: { position: 'absolute', left: 1080, top: 48, width: 480 },
  }),
);
