import { Fragment, type ReactNode } from 'react';

import { useSettingsStore } from '@/store/settingsStore';

/**
 * Dil ya da tema değişince ekranı yeniden bağlar: metinler (t) ve palet (A) modül düzeyinde
 * değiştiği için bileşenlerin önbelleği (React Compiler) temizlenmeli. Gezinme durumu korunur;
 * yalnızca ekranın kendisi yeniden kurulur.
 */
export function Rekey({ children }: { children: ReactNode }) {
  const key = useSettingsStore((s) => `${s.theme}:${s.locale}`);
  return <Fragment key={key}>{children}</Fragment>;
}
