import { Redirect, Stack, usePathname } from 'expo-router';
import { useState } from 'react';

import { useAuthStore } from '@/store/authStore';
import { colors } from '@/ui';

/**
 * Giriş gerektiren tüm ekranlar. Girişsiz gelen (ör. paylaşılan oda linki) giriş ekranına,
 * dönüş yolu ?next= ile gider; girişten sonra kaldığı yere döner.
 */
export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  const pathname = usePathname();
  // Yönlendirme başlayınca bu düzen bir kez daha render olur ve usePathname artık "/" döner;
  // Redirect yeni değerle tekrar çalışıp next'i ezmesin diye ilk görülen yolu sabitle.
  const [requestedPath] = useState(pathname);

  if (status === 'signedOut') {
    return <Redirect href={{ pathname: '/', params: { next: requestedPath } }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.wallpaper },
        animation: 'fade',
      }}
    />
  );
}
