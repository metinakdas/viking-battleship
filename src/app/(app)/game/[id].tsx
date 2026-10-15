import { Redirect, useLocalSearchParams } from 'expo-router';

import { HotseatGame, SingleSeatGame } from '@/features/game/GameScreens';
import { getSession } from '@/services/transport/sessions';

/** Oyun: yerleştirme → savaş → oyun sonu. Mod (yerel / aynı cihaz / çevrimiçi) taşıyıcıda gizli. */
export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = id ? getSession(id) : null;

  // Oturumlar bellekte: sayfa yenilenince ya da elle girilen kimlikte lobiye dön.
  if (!session) return <Redirect href="/lobby" />;
  if (session.mode === 'hotseat') return <HotseatGame session={session} />;
  return <SingleSeatGame session={session} />;
}
