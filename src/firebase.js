import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ⬇️ ΕΔΩ μπαίνουν τα στοιχεία του δικού σου Firebase project.
// Τα παίρνεις από: console.firebase.google.com → Project settings → Your apps → Web app.
// Αντικατέστησε ΟΛΕΣ τις τιμές "REPLACE_ME" με τις δικές σου.
const firebaseConfig = {
  apiKey: 'AIzaSyAYIe7UEOkcVPv6ztXbl5Q_ll0P6loN5jc',
  authDomain: 'pda-r-a0378.firebaseapp.com',
  projectId: 'pda-r-a0378',
  storageBucket: 'pda-r-a0378.firebasestorage.app',
  messagingSenderId: '810485381161',
  appId: '1:810485381161:web:5f2f649d4141e8cff9c438',
  measurementId: 'G-18YNH2R3MJ',
};

// Ενεργοποιείται μόνο όταν έχεις βάλει πραγματικά στοιχεία (όχι "REPLACE_ME").
export const firebaseEnabled = !Object.values(firebaseConfig).some(
  v => !v || v === 'REPLACE_ME'
);

let db = null;
if (firebaseEnabled) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { db };
