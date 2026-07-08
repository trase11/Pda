// Κεντρική παλέτα — ζεστοί, «ανθρώπινοι» τόνοι αντί για μπλε/φωσφοριζέ.
// Σημασιολογικά tokens: κάθε οθόνη διαλέγει με βάση τον ρόλο του χρώματος,
// όχι με hex. Τα placeholders μένουν ≥ #8a (ορατά σε ήλιο — βλ. CLAUDE.md).
export const C = {
  // Επιφάνειες
  bg: '#211c18',            // φόντο εφαρμογής — ζεστό σκούρο καφέ-γκρι
  card: '#2b2520',          // κάρτες
  field: '#1b1714',         // inputs / εσωτερικές επιφάνειες
  border: '#3e352c',        // μπορντούρες
  overlay: 'rgba(20,15,10,0.72)',
  overlayHeavy: 'rgba(20,15,10,0.85)',

  // Κείμενο
  text: '#f2ebdf',          // κύριο — ζεστό λευκό
  sub: '#cdc3b4',           // δευτερεύον περιεχόμενο (ονόματα ειδών κλπ.)
  muted: '#9c9184',         // meta/labels
  faint: '#6f665b',         // ΜΟΝΟ διακοσμητικά μεταδεδομένα
  placeholder: '#8a8072',   // placeholders/hints

  // Δράσεις & σημασίες
  accent: '#e3a960',        // καραμελέ — κύριες ενέργειες, ενεργά chips
  accentText: '#241c12',    // κείμενο πάνω σε accent φόντο
  accentBg: '#3b2f1f',      // απαλό accent φόντο (chips, highlights)
  green: '#a3c585',         // χρήμα/σύνολα/επιτυχία — απαλό πράσινο
  greenBg: '#2e3626',
  orange: '#e6a23c',        // κουζίνα/προσοχή
  orangeBg: '#3b2d18',
  red: '#e2725b',           // καταστροφικό/καθυστέρηση — απαλό terracotta
  redBg: '#3b241e',
  blue: '#8fb6d9',          // runner/δουλειές
  blueBg: '#243039',
};

export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
