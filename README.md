# Amiral Battı

Viking temalı, macOS tarzı buzlu cam arayüzlü amiral battı. Expo (React Native + Web): aynı kod
tarayıcıda ve iOS/Android'de çalışır.

## Çalıştırma

```bash
npm install
npx expo start --web     # tarayıcı
npx expo start           # telefonda Expo Go ile QR kodu okut
```

| Komut                   | Ne yapar                                |
| ----------------------- | --------------------------------------- |
| `npm test`              | Birim testleri (Vitest)                 |
| `npm run test:coverage` | Oyun motoru kapsam raporu (eşik %90)    |
| `npm run typecheck`     | TypeScript (strict)                     |
| `npm run lint`          | ESLint (React Compiler kuralları dahil) |
| `npm run format`        | Prettier                                |

Geliştirici vitrini (tema, bileşenler, tahta ve gemiler): `/dev/ui`.

## Modlar

- **Bilgisayara karşı:** Kolay (rastgele), Normal (avla/hedefle), Zor (olasılık haritası).
- **Aynı cihazda 2 kişi:** her sıra değişiminde "cihazı devret" perdesi; rakibin gemileri gizli kalır.
- **Çevrimiçi (şimdilik sahte):** rastgele rakip, oda kur (6 haneli kod + link), kodla/linkle katıl,
  oda ve oyun içi sohbet. Karşı tarafı bir bot oynar; arayüz gerçek sunucuya hazır.

## Mimari

```
src/game/        Saf TypeScript oyun motoru: kurallar, applyAction, getPlayerView, yapay zekâ.
                 React/Expo import'u yasak (ESLint). Sunucu aynı motoru çalıştıracak.
src/services/    Arayüzler + sahte (mock) uygulamalar. Gerçek sağlayıcılar takılınca değişen
                 tek yer src/services/index.ts.
  transport/     GameTransport arayüzü. GameHost: motor + tur saati + yapay zekâ + bağlantı kopması.
                 MockOnlineTransport: ağ gecikmeli sahte çevrimiçi.
  auth/ chat/ room/
src/features/    Ekran bileşenleri (board, placement, battle, chat, room, lobby, auth, game).
src/app/         expo-router ekranları; (app)/ grubu giriş ister.
src/ui/          Tema token'ları ve ortak bileşenler.
src/i18n/        Tüm metinler (tr.json).
docs/            Başlangıç promptu ve tasarım kararları (docs/design/viking-tema.md).
```

Hile önleme: istemciye yalnızca `getPlayerView` gider; rakibin gemileri batana ya da oyun bitene
kadar görünümde yoktur. İstemci koltuk seçemez; taşıyıcı ekler.

## Sahte olanlar (gerçeğiyle değiştirilecek)

| Parça                | Şimdi                                              | Sonra                         |
| -------------------- | -------------------------------------------------- | ----------------------------- |
| Kimlik               | `MockAuthService`, cihazda (AsyncStorage)          | Supabase/Firebase             |
| Oda, eşleşme, sohbet | Bellekte, karşı taraf bot                          | WebSocket / Colyseus sunucusu |
| Çevrimiçi oyun       | `MockOnlineTransport` (yerel GameHost + bot)       | Sunucuda GameHost             |
| Ses                  | `playSound` yer tutucu (ayarlardan açılır, sessiz) | expo-audio + ses dosyaları    |

Canlı oyun oturumları bellekte tutulur; oyun sayfası yenilenirse lobiye dönülür.
