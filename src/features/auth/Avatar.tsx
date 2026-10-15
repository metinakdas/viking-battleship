import Svg, { Circle, G, Path } from 'react-native-svg';

import { parseAvatar, type AvatarColor, type AvatarId } from '@/services/auth';
import { colors, RUNES } from '@/ui';

const FIELD: Record<AvatarColor, string> = {
  red: colors.shieldRed,
  gold: colors.shieldGold,
  blue: colors.shieldBlue,
  green: colors.shieldGreen,
  iron: colors.iron,
  cream: colors.shieldCream,
};

/** Açık zeminli kalkanlarda run koyu, koyu zeminlilerde krem. */
const LIGHT_FIELDS: readonly AvatarColor[] = ['gold', 'cream'];

/**
 * Oyuncu avatarı: yuvarlak Viking kalkanı. Dörtte bir dilimler (renk / ahşap),
 * demir kenar ve ortada kişisel run.
 */
export function Avatar({ avatar, size = 40 }: { avatar: AvatarId; size?: number }) {
  const { rune, color } = parseAvatar(avatar);
  const field = FIELD[color];
  const runeColor = LIGHT_FIELDS.includes(color) ? colors.shipOutline : colors.sailCream;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <Circle cx="24" cy="24" r="23" fill={colors.iron} />
      <Circle cx="24" cy="24" r="20.5" fill={field} />
      {/* İki karşılıklı ahşap dilim */}
      <Path d="M24 24 L24 3.5 A20.5 20.5 0 0 1 44.5 24 Z" fill={colors.deck} opacity={0.9} />
      <Path d="M24 24 L24 44.5 A20.5 20.5 0 0 1 3.5 24 Z" fill={colors.deck} opacity={0.9} />
      <Circle cx="24" cy="24" r="20.5" fill="none" stroke={colors.shipOutline} strokeWidth="1" />
      {/* Perçinler */}
      <G fill={colors.shieldBoss}>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <Circle
            key={a}
            cx={24 + Math.cos((a * Math.PI) / 180) * 21.8}
            cy={24 + Math.sin((a * Math.PI) / 180) * 21.8}
            r="0.9"
          />
        ))}
      </G>
      <Circle cx="24" cy="24" r="10" fill={field} stroke={colors.shipOutline} strokeWidth="1" />
      <G transform="translate(19 16)">
        <Path
          d={RUNES[rune]}
          stroke={runeColor}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}
