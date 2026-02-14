import { Howl } from 'howler';

type SoundName = 'click' | 'reveal' | 'question' | 'correct' | 'incorrect' | 'victory' | 'turn' | 'timeout';

class SoundManager {
  private sounds: Map<SoundName, Howl> = new Map();
  private enabled = true;
  private volume = 0.7;
  private initialized = false;

  init() {
    if (this.initialized) return;
    this.initialized = true;

    const soundFiles: Record<SoundName, string> = {
      click: '/sounds/click.mp3',
      reveal: '/sounds/reveal.mp3',
      question: '/sounds/question.mp3',
      correct: '/sounds/correct.mp3',
      incorrect: '/sounds/incorrect.mp3',
      victory: '/sounds/victory.mp3',
      turn: '/sounds/turn.mp3',
      timeout: '/sounds/timeout.mp3',
    };

    for (const [name, src] of Object.entries(soundFiles)) {
      try {
        const howl = new Howl({
          src: [src],
          volume: this.volume,
          preload: true,
          onloaderror: () => {
            // Graceful degradation - game works without sounds
          },
        });
        this.sounds.set(name as SoundName, howl);
      } catch {
        // Ignore missing sound files
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

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((sound) => sound.volume(this.volume));
  }

  stopAll() {
    this.sounds.forEach((sound) => sound.stop());
  }
}

export const soundManager = new SoundManager();
