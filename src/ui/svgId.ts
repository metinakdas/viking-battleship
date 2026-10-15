import { useId } from 'react';

/**
 * SVG'de url(#id) ile başvurulan gradyan/clipPath için sayfada benzersiz kimlik.
 * Sabit id kullanma: web'de önceki ekranlar gizli olarak DOM'da kalır ve url(#id)
 * belgedeki İLK eşleşmeyi (gizli olanı) bulur; gradyan çizilmez.
 */
export function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}
