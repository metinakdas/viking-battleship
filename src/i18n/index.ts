import tr from './tr.json';

type Dict = typeof tr;

/** "a.b.c" biçiminde, yalnızca string yapraklara giden anahtarlar. */
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TranslationKey = Leaves<Dict>;

const dictionaries = { tr } satisfies Record<string, Dict>;
export type Locale = keyof typeof dictionaries;

let locale: Locale = 'tr';

export function setLocale(next: Locale): void {
  locale = next;
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
