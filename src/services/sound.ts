import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';

/**
 * Oyun sesleri. Kaynaklar ve lisanslar: assets/sounds/CREDITS.md (hepsi CC0).
 * - Efektler: top atışı, isabet, ıska (sıçrama), batış, tıklama, üstüne gelme, gemi yerleştirme,
 *   zafer, yenilgi. Seviye: ayarlardaki "EFEKTLER".
 * - Müzik: menüde "A Sailors Chant", oyunda chiptune "Drunken Sailor"; döngüde çalar.
 *   Seviye: ayarlardaki "MÜZİK".
 */
export type SoundName =
  'cannon' | 'splash' | 'hit' | 'sink' | 'victory' | 'defeat' | 'click' | 'hover' | 'place';

export type MusicTrack = 'menu' | 'battle';

const SFX: Record<SoundName, number> = {
  cannon: require('../../assets/sounds/cannon.mp3'),
  splash: require('../../assets/sounds/splash.mp3'),
  hit: require('../../assets/sounds/hit.mp3'),
  sink: require('../../assets/sounds/sink.mp3'),
  victory: require('../../assets/sounds/victory.mp3'),
  defeat: require('../../assets/sounds/defeat.mp3'),
  click: require('../../assets/sounds/click.mp3'),
  hover: require('../../assets/sounds/hover.mp3'),
  place: require('../../assets/sounds/place.mp3'),
};

const MUSIC: Record<MusicTrack, number> = {
  menu: require('../../assets/sounds/music-menu.mp3'),
  battle: require('../../assets/sounds/music-battle.mp3'),
};

/** Sık ve üst üste çalabilen efektler için birden çok oynatıcı (ör. ardışık top atışları). */
const POOL: Partial<Record<SoundName, number>> = {
  cannon: 3,
  hit: 2,
  splash: 2,
  click: 2,
  hover: 2,
};
/** Efektlerin birbirine göre dengesi (dosyalar eşitlendi; burada ince ayar). */
const GAIN: Partial<Record<SoundName, number>> = { hover: 0.6, click: 0.8, sink: 0.9 };

/** Web: tarayıcı, kullanıcı sayfaya dokunmadan sesi başlatmaya izin vermez. */
let unlocked = Platform.OS !== 'web';

const pools = new Map<SoundName, { players: AudioPlayer[]; next: number }>();
let audioModeSet = false;

function ensureMode() {
  if (audioModeSet) return;
  audioModeSet = true;
  // Sessiz modda da çalsın, başka uygulamanın sesiyle karışsın (oyun müziği arka plan değil).
  void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(
    () => {},
  );
}

function playerFor(name: SoundName): AudioPlayer {
  let p = pools.get(name);
  if (!p) {
    const n = POOL[name] ?? 1;
    p = { players: Array.from({ length: n }, () => createAudioPlayer(SFX[name])), next: 0 };
    pools.set(name, p);
  }
  const player = p.players[p.next] as AudioPlayer;
  p.next = (p.next + 1) % p.players.length;
  return player;
}

/** Efekt çal (ayarlarda efekt seviyesi 0 ise sessiz). delayMs: ör. gülle uçuşu bittiğinde. */
export function playSound(name: SoundName, delayMs = 0): void {
  const { sfxVolume: vol, muted } = useSettingsStore.getState();
  // Web: kullanıcı sayfaya dokunmadan tarayıcı ses çalmaya izin vermez (hata fırlatır).
  if (vol <= 0 || muted || !unlocked) return;
  const go = () => {
    try {
      ensureMode();
      const player = playerFor(name);
      player.volume = Math.min(1, vol * (GAIN[name] ?? 1));
      void player.seekTo(0);
      player.play();
    } catch {
      // Ses çalınamazsa oyun devam eder.
    }
  };
  if (delayMs > 0) setTimeout(go, delayMs);
  else go();
}

/* ───────────── Müzik ───────────── */

let music: AudioPlayer | null = null;
let musicTrack: MusicTrack | null = null;
let wanted: MusicTrack | null = null;

function applyMusic() {
  const { musicVolume: vol, muted } = useSettingsStore.getState();
  if (!wanted || vol <= 0 || muted || !unlocked) {
    music?.pause();
    return;
  }
  try {
    ensureMode();
    if (musicTrack !== wanted || !music) {
      music?.pause();
      if (music) music.replace(MUSIC[wanted]);
      else music = createAudioPlayer(MUSIC[wanted]);
      music.loop = true;
      musicTrack = wanted;
    }
    music.volume = vol * 0.6;
    music.play();
  } catch {
    // Müzik çalınamazsa sessiz devam.
  }
}

/** Ekrana göre müzik: menü/oyun (null = sus). Aynı parça zaten çalıyorsa kesilmez. */
export function setMusic(track: MusicTrack | null): void {
  wanted = track;
  applyMusic();
}

// Seviye değişince müziği hemen güncelle.
useSettingsStore.subscribe((s, prev) => {
  if (s.musicVolume !== prev.musicVolume || s.muted !== prev.muted) applyMusic();
});

/**
 * Web: ilk dokunuşta müziği başlat; düğmelere tıklama ve üzerine gelme sesleri (tüm düğmeler
 * için tek yerden, role="button"/"radio"/"tab").
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const interactive = (el: EventTarget | null) =>
    el instanceof Element ? el.closest('[role="button"],[role="radio"],[role="tab"]') : null;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    applyMusic();
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  window.addEventListener(
    'pointerdown',
    (e) => {
      const el = interactive(e.target);
      if (el && el.getAttribute('aria-disabled') !== 'true' && !el.closest('[data-grid]'))
        playSound('click');
    },
    { capture: true },
  );
  let lastHover: Element | null = null;
  window.addEventListener(
    'pointerover',
    (e) => {
      if ((e as PointerEvent).pointerType !== 'mouse') return;
      const el = interactive(e.target);
      if (el && el !== lastHover && el.getAttribute('aria-disabled') !== 'true') {
        // Izgara hücreleri de düğme: onlarda tık sesi yeterli, üzerine gelme sesi gürültü olur.
        if (!el.closest('[data-grid]')) playSound('hover');
      }
      lastHover = el;
    },
    { capture: true },
  );
}
