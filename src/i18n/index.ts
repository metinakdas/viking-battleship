import ar from './ar.json';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import tr from './tr.json';

type Dict = typeof tr;

/** "a.b.c" biçiminde, yalnızca string yapraklara giden anahtarlar. */
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TranslationKey = Leaves<Dict>;

/** Her dil Türkçe ile aynı anahtarlara sahip olmak zorunda (eksik çeviri derleme hatasıdır). */
const dictionaries = { tr, en, de, fr, es, ar } satisfies Record<string, Dict>;
export type Locale = keyof typeof dictionaries;

/** Dil seçicideki sıra ve her dilin kendi dilindeki adı. */
export const LOCALES: readonly { id: Locale; name: string }[] = [
  { id: 'tr', name: 'TÜRKÇE' },
  { id: 'en', name: 'ENGLISH' },
  { id: 'de', name: 'DEUTSCH' },
  { id: 'fr', name: 'FRANÇAIS' },
  { id: 'es', name: 'ESPAÑOL' },
  { id: 'ar', name: 'العربية' },
];

let locale: Locale = 'tr';

export function setLocale(next: Locale): void {
  locale = next;
}

export function getLocale(): Locale {
  return locale;
}

export const isLocale = (v: unknown): v is Locale =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(dictionaries, v);

/** Sağdan sola yazılan dil mi (Arapça). */
export const isRtl = () => locale === 'ar';

/** Büyük harf için yerel ayar: Türkçede i→İ, diğer dillerde I. */
export const upperLocale = () => locale;

/** Cihaz dilinden başlangıç dili (desteklenmiyorsa Türkçe). */
export function deviceLocale(): Locale {
  const tag =
    typeof navigator !== 'undefined' && typeof navigator.language === 'string'
      ? navigator.language
      : Intl.DateTimeFormat().resolvedOptions().locale;
  const base = tag.slice(0, 2).toLowerCase();
  return isLocale(base) ? base : 'tr';
}

/** Çeviri; `{name}` yer tutucularını params ile doldurur. Eksik anahtar anahtarın kendisini döner. */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let node: unknown = dictionaries[locale];
  for (const part of key.split('.')) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  if (typeof node !== 'string') return key;
  if (!params) return node;
  return node.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
