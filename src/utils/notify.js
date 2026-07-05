import { Platform, Vibration } from 'react-native';

// Σύντομο «μπιπ» ειδοποίησης. Στο web χρησιμοποιεί Web Audio (δεν χρειάζεται
// αρχείο ήχου). Σε native κάνει δόνηση. Ασφαλές να κληθεί οπουδήποτε.
export function beep() {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.42);
      // Δεύτερο μπιπ για έμφαση
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 1175;
      gain2.gain.setValueAtTime(0.001, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.17);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.57);
      return;
    }
    Vibration.vibrate([0, 250, 120, 250]);
  } catch {}
}
