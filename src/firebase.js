import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ⬇️ ΕΔΩ μπαίνουν τα στοιχεία του δικού σου Firebase project.
// Τα παίρνεις από: console.firebase.google.com → Project settings → Your apps → Web app.
// Αντικατέστησε ΟΛΕΣ τις τιμές "REPLACE_ME" με τις δικές σου.
const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
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
