import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { PxButton, Txt } from '@/features/arcade/kit';
import { BigTitle, CenterCard } from '@/features/arcade/screens/FlowScreens';
import { RoomScreen } from '@/features/arcade/screens/RoomScreen';
import { A } from '@/features/arcade/theme';
import { t, upperLocale } from '@/i18n';
import { services } from '@/services';
import { isValidRoomCode, normalizeRoomCode } from '@/services/room/code';
import { RoomError, type Room } from '@/services/room/types';
import { useAuthStore } from '@/store/authStore';

/**
 * /room/new → yeni oda kurar ve /room/KOD'a geçer.
 * /room/KOD → odaya katılır (link ya da kodla). Oyun başlayınca /game/[id].
 */
export default function RoomRoute() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const player = useAuthStore((s) => s.player);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const entered = useRef<string | null>(null);

  useEffect(() => {
    if (!player || !raw || entered.current === raw) return;
    entered.current = raw;
    // Servis çağrısı yan etkidir; sonucu render dışında (mikrogörevde) duruma yaz.
    void Promise.resolve().then(() => {
      try {
        if (raw === 'new') {
          const created = services.rooms.createRoom(player);
          router.replace(`/room/${created.code}`);
          return;
        }
        const code = normalizeRoomCode(raw);
        if (!isValidRoomCode(code)) throw new RoomError('not_found');
        setRoom(services.rooms.joinByCode(code, player));
      } catch (e) {
        setError(e instanceof RoomError ? t(`room.errors.${e.code}`) : t('auth.errors.unknown'));
      }
    });
  }, [raw, player]);

  const code = room?.code;
  useEffect(() => {
    if (!code) return;
    return services.rooms.onRoomUpdate(code, (r) => {
      setRoom(r);
      if (r.status === 'inGame' && r.gameId) router.replace(`/game/${r.gameId}`);
    });
  }, [code]);

  const leave = () => {
    if (room && player) services.rooms.leaveRoom(room.code, player.id);
    router.replace('/lobby');
  };

  if (!player) return null;
  if (error || room?.status === 'closed') {
    return (
      <CenterCard chip={t('arcade.modes.online')}>
        <BigTitle color={A.red}>{t('arcade.room.notFound')}</BigTitle>
        <Txt size={34} align="center" color={A.textSoft} role="alert">
          {(error ?? t('room.errors.not_found')).toLocaleUpperCase(upperLocale())}
        </Txt>
        <PxButton
          label={t('arcade.flow.menu')}
          variant="secondary"
          onPress={() => router.replace('/lobby')}
          style={{ alignSelf: 'stretch' }}
        />
      </CenterCard>
    );
  }
  if (!room) {
    return (
      <CenterCard>
        <Txt font="press" size={28} align="center" color={A.yellow}>
          {t('arcade.room.joining')}
        </Txt>
      </CenterCard>
    );
  }
  return <RoomScreen room={room} me={player} onLeave={leave} />;
}
