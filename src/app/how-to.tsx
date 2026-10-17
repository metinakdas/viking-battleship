import { router } from 'expo-router';

import { HowToScreen } from '@/features/arcade/screens/InfoScreens';

/** Kurallar, işaretler ve kontroller (girişsiz de açılır). */
export default function HowTo() {
  return <HowToScreen onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
