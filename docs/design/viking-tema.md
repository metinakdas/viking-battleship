# Viking teması: karar kaydı

`amiral-batti-baslangic-promptu.md` §4'teki yelken çağı / koyu temanın yerini alır (4. adımda,
kullanıcı isteğiyle). Ekran düzenleri, renk körlüğü kuralları ve hiyerarşi aynen geçerli; değişen
görsel dil ve adlar. Token'lar: `src/ui/theme.ts`.

## Görsel dil
- **Zemin:** açık "kuzey ışığı" duvar kâğıdı. Buz mavisi taban (#eaf0f5), üstünde dört büyük yumuşak
  radyal leke (buz, fiyort yeşili, leylak, kehribar). macOS duvar kâğıtları gibi.
- **Paneller:** macOS tarzı buzlu cam. `expo-blur` (web'de CSS `backdrop-filter`) + %55 beyaz örtü,
  parlak 1 px kenar, katmanlı yumuşak gölge. Öne çıkan kartlar daha opak, üstte altın çizgi.
- **Metin:** koyu mürekkep (#16202b) ve griler.
- **Vurgular:** kırmızı yelken #b2382a (birincil buton, aktif adım), altın #c08a2c (nişangah,
  yerleştirme çerçevesi, odak halkası), demir #4f5d6b, ateş #e0561f / köz #ffc76b.
- **Tahta:** fiyort denizi. Kendi tahtan yeşilimsi (#2f8a99 → #155563), düşman suları daha soğuk
  mavi (#3a6f8c → #1b3d55). Beyaz %22 ızgara, soluk dalga deseni.
- **Fontlar:** değişmedi (Space Grotesk + Inter). Viking havası font ile değil, SVG ile veriliyor:
  - **Vegvísir** amblemi (logo).
  - **RuneText:** Latin/Türkçe harfleri Elder Futhark runlarına çeviren SVG süs yazısı. Yalnızca
    süs; ekran okuyuculardan gizli, anlamı taşıyan metin her zaman ayrıca yazılır.

## Filo
| Kimlik | Ad | Boyut | Çizim |
|---|---|---|---|
| drakkar | Drakkar | 5 | Ejder başı, kıvrık kuyruk, iki sıra kalkan, kürekler, çizgili kare yelken |
| snekkja | Snekkja | 4 | Daha ince savaş gemisi, ejder başı, kalkanlar |
| karvi | Karvi | 3 | Kalkanlı, ejder başı yok |
| knarr | Knarr | 3 | Geniş yük gemisi: kalkan yok, güvertede sandık ve fıçı |
| faering | Færing | 2 | Yelkensiz kürek teknesi |

Tüm gemiler üstten görünüş, iki ucu sivri (uzun gemi), baş sağda. Dikey yerleşim aynı çizimin
90° döndürülmüşüdür. Batık gemi: gri-kahve, yanık izleri, turuncu çerçeveli hücreler; isabet
işaretleri o hücrelerde köşede küçük köz olarak çizilir ki gemi görünsün.

## İşaretler (renk körlüğü: şekille de ayrılır)
- İsabet: 8 kollu alev yıldızı + köz çekirdek.
- Iska: beyaz halka + nokta.
- Nişangah: altın halka, dört çentik, köşe ayraçları.
- Yerleştirme önizleme: geçerliyse kesik altın, değilse kesik kırmızı-turuncu.
