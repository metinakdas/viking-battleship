import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { isDay } from './theme';

/**
 * iOS/Android yedeği: canvas yok; gece denizinin statik özü (gökyüzü bantları, ay, deniz bantları).
 * Web sürümü (NightSeaBackground.web.tsx) tasarımdaki canlı canvas'ın birebir aktarımıdır.
 */
const SKY = [
  '#06061a',
  '#0a0a26',
  '#0f1034',
  '#161542',
  '#1f1a50',
  '#2b1f5c',
  '#3b2568',
  '#4f2c72',
];
const SEA = [
  '#2c2a7a',
  '#24246c',
  '#1d1e5e',
  '#171952',
  '#121446',
  '#0e103b',
  '#0a0c30',
  '#08092a',
];
const W = 480;
const H = 270;
const HZ = 150;
const SKY_DAY = [
  '#2f8fe8',
  '#3d9bef',
  '#4ea7f3',
  '#62b3f6',
  '#78bff8',
  '#90cbfa',
  '#a9d8fb',
  '#c4e6fd',
];
const SEA_DAY = [
  '#2aa4d8',
  '#2399d0',
  '#1d8dc6',
  '#1882bb',
  '#1477b0',
  '#106ca4',
  '#0d6298',
  '#0a588c',
];

/** Native: atış oyunu yok (statik yedek); onShipHit yok sayılır. */
export function NightSeaBackground({ dim }: { dim: number; onShipHit?: (points: number) => void }) {
  const day = isDay();
  const sky = day ? SKY_DAY : SKY;
  const sea = day ? SEA_DAY : SEA;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {sky.map((c, i) => (
          <Rect
            key={c}
            x={0}
            y={(i * HZ) / sky.length}
            width={W}
            height={HZ / sky.length + 1}
            fill={c}
          />
        ))}
        <Circle cx={372} cy={40} r={day ? 16 : 15} fill={day ? '#ffd23f' : '#f6f0c8'} />
        {sea.map((c, i) => {
          const y0 = HZ + (H - HZ) * Math.pow(i / sea.length, 1.4);
          const y1 = HZ + (H - HZ) * Math.pow((i + 1) / sea.length, 1.4);
          return <Rect key={c} x={0} y={y0} width={W} height={y1 - y0 + 1} fill={c} />;
        })}
        {dim ? (
          <Rect
            width={W}
            height={H}
            fill={day ? `rgba(235,246,255,${dim * 0.55})` : `rgba(4,4,16,${dim})`}
          />
        ) : null}
      </Svg>
    </View>
  );
}
