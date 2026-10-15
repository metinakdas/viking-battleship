import { newId, randomAvatar, randomNickname, type Player } from '@/services/auth';

/** Sahte çevrimiçi rakip (mock). Gerçek sunucuda yerini gerçek oyuncular alacak. */
export function createBotPlayer(random: () => number = Math.random): Player {
  return {
    id: newId('bot'),
    displayName: randomNickname(random),
    avatar: randomAvatar(random),
    isGuest: random() < 0.5,
  };
}
