import { ref } from 'vue';

export function useSoundEffects() {
  const audioContext = ref<AudioContext | null>(null);

  function initAudioContext() {
    if (!audioContext.value) {
      audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContext.value.state === 'suspended') {
      audioContext.value.resume().catch(err => {
        console.warn('AudioContext resume failed:', err);
      });
    }
    return audioContext.value;
  }

  /**
   * Создает мягкий синтезированный звук
   */
  function createChime(freqs: number[], startTime: number, duration: number, isLeaving = false) {
    const ctx = initAudioContext();
    const mainGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Настройка мягкого фильтра (Low-pass)
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLeaving ? 1000 : 2000, startTime);
    filter.frequency.exponentialRampToValueAtTime(200, startTime + duration);

    mainGain.gain.setValueAtTime(0, startTime);
    mainGain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      // Смешиваем triangle (мягкий) и sine (чистый)
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Небольшая расстройка для "живого" звука
      if (i > 0) osc.frequency.setValueAtTime(freq + (i * 2), startTime);

      oscGain.gain.setValueAtTime(0.1, startTime);
      
      osc.connect(oscGain);
      oscGain.connect(filter);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
      
      osc.onended = () => {
        osc.disconnect();
        oscGain.disconnect();
      };
    });

    filter.connect(mainGain);
    mainGain.connect(ctx.destination);

    // Добавляем микро-эхо (Feedback Delay)
    const delay = ctx.createDelay();
    const delayGain = ctx.createGain();
    delay.delayTime.value = 0.15;
    delayGain.gain.value = 0.2;

    mainGain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);
  }

  function playJoinSound() {
    const ctx = initAudioContext();
    const now = ctx.currentTime;
    // Мажорный интервал: G5 (783.99), C6 (1046.50)
    createChime([783.99, 1046.50], now, 0.6);
  }

  function playLeaveSound() {
    const ctx = initAudioContext();
    const now = ctx.currentTime;
    // Нисходящий "пустой" интервал: C5 (523.25), G4 (392.00)
    createChime([523.25, 392.00], now, 0.5, true);
  }

  return {
    playJoinSound,
    playLeaveSound,
    initAudioContext
  };
}
