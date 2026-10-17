import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';

import { LoginScreen } from '@/features/arcade/screens/LoginScreen';
import { useHudScores } from '@/features/records/useHudScores';
import { safeNextPath } from '@/services/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Giriş. Başarılı giriş ya da misafir → filo yerleştirme (CPU'ya karşı, tasarım §5.1);
 * paylaşılan oda linkiyle gelindiyse (?next=/room/…) önce misafir adı, sonra odaya.
 */
export default function Login() {
  const status = useAuthStore((s) => s.status);
  const { next } = useLocalSearchParams<{ next?: string }>();
  const hud = useHudScores(null);
  const target = safeNextPath(next, '/lobby') as Href;
  if (status === 'signedIn') return <Redirect href={target} />;
  return (
    <LoginScreen
      initialMode={String(target).startsWith('/room/') ? 'guest' : 'login'}
      hiScore={hud.hi}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onSuccess={() => router.replace(target)}
    />
  );
}
