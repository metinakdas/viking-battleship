import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { A } from '@/features/arcade/theme';
import { PxButton, Txt, useBlink } from '@/features/arcade/kit';
import { BigTitle, CenterCard } from '@/features/arcade/screens/FlowScreens';
import { formatSeconds } from '@/features/game/hooks';
import { t } from '@/i18n';
import { services } from '@/services';
import { MatchmakingCancelled } from '@/services/room/types';
import { useAuthStore } from '@/store/authStore';

/** "Rakip aranıyor": yanıp sönen radar, geçen süre, İptal. */
export default function MatchmakingScreen() {
  const player = useAuthStore((s) => s.player);
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(started);
  const blink = useBlink(400);

  useEffect(() => {
    if (!player) return;
    let alive = true;
    services.matchmaking
      .findRandomOpponent(player)
      .then(({ gameId }) => alive && router.replace(`/game/${gameId}`))
      .catch((e) => {
        if (!(e instanceof MatchmakingCancelled)) throw e;
      });
    return () => {
      alive = false;
      services.matchmaking.cancel();
    };
  }, [player]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const dots = '■'.repeat(1 + (Math.floor((now - started) / 500) % 3));
  return (
    <CenterCard chip={t('arcade.modes.online')}>
      <BigTitle>{t('arcade.match.title')}</BigTitle>
      <Txt size={34} align="center" color={A.textSoft} accessibilityLiveRegion="polite">
        {t('arcade.match.hint')}
      </Txt>
      <Txt font="press" size={28} align="center" color={blink ? A.yellow : A.orangeSh} aria-hidden>
        {dots.padEnd(3, ' ')}
      </Txt>
      <Txt size={36} color={A.cyan}>
        {t('arcade.match.elapsed', { time: formatSeconds(Math.floor((now - started) / 1000)) })}
      </Txt>
      <PxButton
        label={t('arcade.match.cancel')}
        variant="secondary"
        onPress={() => router.replace('/lobby')}
        style={{ alignSelf: 'stretch' }}
      />
    </CenterCard>
  );
}
