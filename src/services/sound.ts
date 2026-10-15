import { useSettingsStore } from '@/store/settingsStore';

export type SoundName = 'cannon' | 'splash' | 'hit' | 'sink' | 'victory' | 'defeat';

/**
 * Ses efektleri için yer tutucu. Ayarlardan açılır; ses dosyaları (expo-audio) eklendiğinde
 * yalnızca bu fonksiyonun içi doldurulacak. Şimdilik sessiz.
 */
export function playSound(name: SoundName): void {
  if (!useSettingsStore.getState().sound) return;
  void name;
}
