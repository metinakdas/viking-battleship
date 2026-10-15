/**
 * Girişten sonra dönülecek yol (?next=). Yalnızca uygulama içi yollar kabul edilir:
 * "//evil.com" ya da "https://..." gibi dış adreslere yönlendirme (open redirect) engellenir.
 */
export function safeNextPath(next: unknown, fallback = '/lobby'): string {
  if (typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  if (next === '/') return fallback;
  return next;
}
