import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Board } from '@/features/board';
import { randomFleet } from '@/game';

const FLEET = randomFleet('giris-arka-plan').map((placement) => ({ placement }));

/** Giriş ekranı arka planı: hafif eğik, çok soluk deniz ızgarası ve gemiler. */
export function SeaBackdrop() {
  const { width, height } = useWindowDimensions();
  const cell = Math.ceil((Math.max(width, height) * 1.1) / 10);
  return (
    <View style={styles.root} pointerEvents="none" aria-hidden>
      <View style={[styles.tilt, { width: cell * 10, height: cell * 10 }]}>
        <Board variant="own" cellSize={cell} ships={FLEET} showLabels={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    opacity: 0.13,
  },
  tilt: { transform: [{ rotate: '-8deg' }] },
});
