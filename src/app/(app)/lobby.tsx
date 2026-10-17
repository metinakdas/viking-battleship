import { router } from 'expo-router';

import { MenuScreen, type MenuChoice } from '@/features/arcade/screens/MenuScreen';
import { aiOpponent } from '@/features/game/aiOpponent';
import { newId, randomAvatar } from '@/services/auth';
import { createAiSession, createHotseatSession } from '@/services/transport/sessions';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { ECONOMY } from '@/features/shop/catalog';

/** Mod menüsü: CPU, aynı cihaz, çevrimiçi (rastgele / oda / kodla katıl). */
export default function LobbyScreen() {
  const player = useAuthStore((s) => s.player);
  const logout = useAuthStore((s) => s.logout);
  const aiLevel = useSessionStore((s) => s.aiLevel);
  const setAiLevel = useSessionStore((s) => s.setAiLevel);
  const spend = useWalletStore((s) => s.spend);
  if (!player) return null; // (app) düzeni girişsizi zaten yönlendirir.

  const start = (c: MenuChoice) => {
    switch (c.mode) {
      case 'ai':
        return router.push(`/game/${createAiSession(player, aiOpponent(c.level), c.level).id}`);
      case 'hotseat': {
        const second = {
          id: newId('local'),
          displayName: c.secondName,
          avatar: randomAvatar(),
          isGuest: true,
        };
        return router.push(`/game/${createHotseatSession(player, second).id}`);
      }
      case 'random':
        return router.push('/matchmaking');
      case 'room':
        // Oda kurmak altınla: yetmezse market (eksik altın mesajıyla).
        if (!spend(player.id, ECONOMY.roomCost)) return router.push('/shop?need=room');
        return router.push('/room/new');
      case 'join':
        return router.push(`/room/${c.code}`);
    }
  };

  return (
    <MenuScreen
      player={player}
      level={aiLevel}
      onLevel={setAiLevel}
      onStart={start}
      onLink={(to) =>
        router.push(
          to === 'how'
            ? '/how-to'
            : to === 'scores'
              ? '/scores'
              : to === 'shop'
                ? '/shop'
                : '/profile',
        )
      }
      onBack={() => router.replace('/')}
      onLogout={() => {
        void logout().then(() => router.replace('/'));
      }}
    />
  );
}
