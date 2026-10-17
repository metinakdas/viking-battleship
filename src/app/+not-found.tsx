import { router } from 'expo-router';

import { NotFoundScreen } from '@/features/arcade/screens/InfoScreens';

/** Bilinmeyen adres: "KAYIP SULAR". */
export default function NotFound() {
  return <NotFoundScreen onHome={() => router.replace('/')} />;
}
