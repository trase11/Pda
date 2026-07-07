import { Platform, Vibration } from 'react-native';

// ──────────────────────────────────────────────────────────────────────────
// Ειδοποιήσεις βοηθού σέρβις (ήχος + δόνηση + browser notification).
//
// ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ ΞΕΚΛΕΙΔΩΜΑ ΣΤΟ WEB:
// Οι browsers (και ειδικά το mobile Safari/Chrome) ΔΕΝ επιτρέπουν ήχο μέχρι
// να υπάρξει άμεσο tap του χρήστη. Ο ήχος εδώ όμως παίζει όταν έρθει νέο
// «έτοιμο» από το Firestore — δηλαδή ΧΩΡΙΣ tap. Γι' αυτό:
//   1) Κρατάμε ΕΝΑ κοινό AudioContext (όχι νέο κάθε φορά).
//   2) Το «ξεκλειδώνουμε» (resume + σιωπηλός τόνος) μέσα σε ένα tap του χρήστη
//      — το κουμπί «Ενεργοποίηση ειδοποιήσεων» στην οθόνη του βοηθού.
//   3) Μετά το ξεκλείδωμα, το ίδιο context παίζει ελεύθερα σε κάθε beep().
// ──────────────────────────────────────────────────────────────────────────

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

let audioCtx = null;

function getCtx() {
  if (!isWeb) return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

// Κληθείτε ΜΕΣΑ από user gesture (tap). Επιστρέφει true αν ο ήχος είναι έτοιμος.
export async function unlockAudio() {
  if (!isWeb) return true; // native: δεν χρειάζεται ξεκλείδωμα
  const ctx = getCtx();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    // Σιωπηλός τόνος 10ms — απαραίτητος για πλήρες ξεκλείδωμα σε iOS Safari.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

export function isAudioUnlocked() {
  if (!isWeb) return true;
  return !!audioCtx && audioCtx.state === 'running';
}

function playTone(ctx, freq, startOffset, dur) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const t = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// Σύντομο διπλό «μπιπ» + δόνηση. Ασφαλές να κληθεί οπουδήποτε.
export function beep() {
  try {
    if (isWeb) {
      const ctx = getCtx();
      if (ctx) {
        // Αν έχει ξανά-«κοιμηθεί» (π.χ. tab στο παρασκήνιο), δοκίμασε resume.
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        playTone(ctx, 880, 0, 0.4);
        playTone(ctx, 1175, 0.15, 0.4);
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      return;
    }
    Vibration.vibrate([0, 250, 120, 250]);
  } catch {}
}

// Ζητά άδεια για browser notifications (κληθείτε από user gesture).
export async function requestNotifyPermission() {
  try {
    if (!isWeb || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  } catch {
    return false;
  }
}

// Οπτική ειδοποίηση συστήματος — εμφανίζεται ΑΚΟΜΑ κι όταν η καρτέλα/οθόνη
// δεν είναι μπροστά (εφόσον έχει δοθεί άδεια).
export function notify(title, body) {
  try {
    if (!isWeb || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, tag: 'panteboy-pda' });
    }
  } catch {}
}
