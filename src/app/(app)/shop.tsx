import { router, useLocalSearchParams } from 'expo-router';

import { ShopScreen } from '@/features/arcade/screens/ShopScreen';

/** Market (?need=room: oda kurmaya altın yetmedi). */
export default function Shop() {
  const { need } = useLocalSearchParams<{ need?: string }>();
  return (
    <ShopScreen
      need={need === 'room' ? 'room' : undefined}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/lobby'))}
    />
  );
}
