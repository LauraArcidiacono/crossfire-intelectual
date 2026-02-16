import { Howl } from 'howler';

type SoundName = 'click' | 'reveal' | 'question' | 'correct' | 'incorrect' | 'victory' | 'turn' | 'timeout' | 'countdown-tick' | 'countdown-go';
type MusicName = 'music-game' | 'music-victory';

class SoundManager {
  private sounds: Map<SoundName, Howl> = new Map();
  private music: Map<MusicName, Howl> = new Map();
  private currentMusic: MusicName | null = null;
  private currentMusicId: number | null = null;
  private enabled = true;
  private volume = 0.7;
  private musicVolume = 0.3;
  private initialized = false;
  private pausedByVisibility = false;

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Auto-pause/resume when tab visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.currentMusic && this.enabled) {
          this.pausedByVisibility = true;
          const track = this.music.get(this.currentMusic);
          if (track && this.currentMusicId != null) track.pause(this.currentMusicId);
        }
      } else {
        if (this.pausedByVisibility && this.currentMusic && this.enabled) {
          this.pausedByVisibility = false;
          const track = this.music.get(this.currentMusic);
          if (track && this.currentMusicId != null) track.play(this.currentMusicId);
        }
      }
    });

    const soundFiles: Record<SoundName, string> = {
      click: '/sounds/click.wav',
      reveal: '/sounds/reveal.wav',
      question: '/sounds/question.wav',
      correct: '/sounds/correct.wav',
      incorrect: '/sounds/incorrect.wav',
      victory: '/sounds/victory.wav',
      turn: '/sounds/turn.wav',
      timeout: '/sounds/timeout.wav',
      'countdown-tick': '/sounds/countdown-tick.wav',
      'countdown-go': '/sounds/countdown-go.wav',
    };

    for (const [name, src] of Object.entries(soundFiles)) {
      try {
        const howl = new Howl({
          src: [src],
          volume: this.volume,
          preload: true,
          onloaderror: () => {},
        });
        this.sounds.set(name as SoundName, howl);
      } catch {
        // Graceful degradation
      }
    }

    const musicFiles: Record<MusicName, string> = {
      'music-game': '/sounds/music-game.wav',
      'music-victory': '/sounds/music-victory.wav',
    };

    for (const [name, src] of Object.entries(musicFiles)) {
      try {
        const howl = new Howl({
          src: [src],
          volume: this.musicVolume,
          loop: true,
          preload: true,
          onloaderror: () => {},
        });
        this.music.set(name as MusicName, howl);
      } catch {
        // Graceful degradation
      }
    }
  }

  play(name: SoundName) {
    if (!this.enabled) return;
    try {
      const sound = this.sounds.get(name);
      if (sound) {
        sound.volume(this.volume);
        sound.play();
      }
    } catch {
      // Graceful fallback
    }
  }

  playMusic(name: MusicName) {
    if (!this.enabled) return;
    if (this.currentMusic === name) return;
    this.stopMusic();
    try {
      const track = this.music.get(name);
      if (track) {
        track.volume(this.musicVolume);
        this.currentMusicId = track.play();
        this.currentMusic = name;
      }
    } catch {
      // Graceful fallback
    }
  }

  stopMusic() {
    if (this.currentMusic) {
      const track = this.music.get(this.currentMusic);
      if (track) track.stop();
      this.currentMusic = null;
      this.currentMusicId = null;
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
      this.stopMusic();
    } else if (this.currentMusic) {
      // Re-enable: restart current music
      const name = this.currentMusic;
      this.currentMusic = null;
      this.playMusic(name);
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((sound) => sound.volume(this.volume));
  }

  isEnabled() {
    return this.enabled;
  }

  stopAll() {
    this.sounds.forEach((sound) => sound.stop());
  }
}

export const soundManager = new SoundManager();
