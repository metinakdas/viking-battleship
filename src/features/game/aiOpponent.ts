import type { AiLevel } from '@/game';
import { t } from '@/i18n';
import type { AvatarId, Player } from '@/services/auth';

const AVATARS: Record<AiLevel, AvatarId> = {
  easy: 'fehu:cream',
  normal: 'tiwaz:blue',
  hard: 'algiz:iron',
};

/** Bilgisayar rakip: her zorluğun kendi jarlı. */
export function aiOpponent(level: AiLevel): Player {
  return {
    id: `ai_${level}`,
    displayName: t(`aiNames.${level}`),
    avatar: AVATARS[level],
    isGuest: false,
  };
}
