import { router, useLocalSearchParams } from 'expo-router';

import { ScoresScreen } from '@/features/arcade/screens/InfoScreens';
import { leaderboard } from '@/features/records/score';
import { useRecordsStore } from '@/store/recordsStore';

/** Rekor tablosu (girişsiz de açılır). ?last=<kayıt> yeni girdiyi yanıp söndürür. */
export default function Scores() {
  const { last } = useLocalSearchParams<{ last?: string }>();
  const records = useRecordsStore((s) => s.records);
  return (
    <ScoresScreen
      entries={leaderboard(records)}
      highlightId={last}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
