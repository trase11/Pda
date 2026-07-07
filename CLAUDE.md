@AGENTS.md

# Panteboy PDA — Παραγγελιοληψία εστίασης

Expo (SDK 56) / React Native 0.85 εφαρμογή PDA για μπαρ-εστιατόριο: σερβιτόροι
παίρνουν παραγγελίες σε τραπέζια, η κουζίνα βλέπει δελτία, ο βοηθός σέρβις
(runner) σερβίρει έτοιμα πιάτα και εκτελεί δουλειές. Συγχρονισμός σε πραγματικό
χρόνο μέσω Firebase Firestore· χωρίς Firebase, τοπική λειτουργία ανά συσκευή
(AsyncStorage). Όλο το UI είναι στα ελληνικά. JavaScript (όχι TypeScript).

## Εντολές

```
npm start            # expo start (dev server)
npm run web          # expo start --web
npx expo export --platform web   # build για web (φάκελος dist/)
```

Deploy: push στο `main` τρέχει το GitHub Actions workflow
(`.github/workflows/deploy.yml`) που κάνει `expo export` και ανεβάζει το `dist/`
σε GitHub Pages. Το `app.json` έχει `experiments.baseUrl: "/Pda"` — αν αλλάξει
το όνομα του repo, άλλαξε και αυτό.

Δεν υπάρχουν tests ή linter ακόμα. Πριν από commit, τουλάχιστον parse-check:
`node -e "require('@babel/parser').parse(fs...,{sourceType:'module',plugins:['jsx']})"`.

## Αρχιτεκτονική

### Ρόλοι ανά συσκευή

Κάθε συσκευή διαλέγει ρόλο στο πρώτο άνοιγμα (`RolePickerScreen`), αποθηκεύεται
σε AsyncStorage (`role`, `waiterName`). Το `Root()` στο `App.js` δρομολογεί:

- **waiter** → `WaiterApp` (bottom tabs: Τραπέζια / Δουλειές / Ιστορικό / Κατάλογος)
- **kitchen** → `KitchenScreen` (δελτία φαγητών, ήχος σε νέο δελτίο — χωρίς navigation)
- **runner** → `RunnerScreen` (έτοιμα πιάτα + δουλειές, με ηχητική ειδοποίηση)

Μόνο ο waiter έχει `NavigationContainer` — kitchen/runner είναι σκέτες οθόνες.

### State: τρία contexts, ένα ανά domain

| Context | Δεδομένα | Firestore |
|---|---|---|
| `AppContext` | τραπέζια, παραγγελίες, ιστορικό πωλήσεων, κατάλογος, ρόλος | `tables`, `sales`, `config/menu` |
| `KitchenContext` | δελτία κουζίνας | `kitchenOrders` |
| `TasksContext` | δουλειές προς βοηθούς | `tasks` |

Cloud mode (`useCloud`): τα πάντα έρχονται από `onSnapshot` listeners· οι
mutations γράφουν στο Firestore και το snapshot ενημερώνει όλες τις συσκευές.
Local mode: ίδιο API, αλλά state μόνο σε React state + AsyncStorage persist.
Kitchen/Tasks λειτουργούν ΜΟΝΟ σε cloud mode (οι οθόνες δείχνουν οδηγία ρύθμισης).

### Μοντέλο γραμμής παραγγελίας (το κρίσιμο σχήμα)

Κάθε στοιχείο του `table.orders`:

```js
{ lineId,   // μοναδικό ID γραμμής — ΟΧΙ το itemId
  itemId,   // αναφορά στο προϊόν του καταλόγου
  name, price,   // snapshot τη στιγμή της προσθήκης (βλ. «Αποφάσεις»)
  qty,
  category,      // 'Φαγητά' => πάει κουζίνα
  note,          // σημείωση γραμμής, π.χ. «χωρίς κρεμμύδι» — φτάνει στην κουζίνα
  sentQty }      // πόσα τεμάχια έχουν ΗΔΗ σταλεί στην κουζίνα
```

- `normalizeLine()` στο `AppContext` κανονικοποιεί παλιά δεδομένα (πριν το
  lineId) ώστε οι οθόνες να βασίζονται πάντα στο πλήρες σχήμα. Μην αφαιρεθεί
  όσο υπάρχουν παλιά docs στο Firestore.
- Η προσθήκη από τον κατάλογο συγχωνεύει ΜΟΝΟ σε γραμμή χωρίς `note`· γραμμή
  με σημείωση μένει πάντα ξεχωριστή.

### Το invariant της κουζίνας (μην το σπάσεις)

Η αποστολή στην κουζίνα στέλνει **μόνο το δέλτα** `qty - sentQty` ανά γραμμή
και αμέσως θέτει `sentQty = qty` (`markOrdersSent`). Αυτό είναι που εμποδίζει
το διπλομαγείρεμα όταν ο σερβιτόρος προσθέσει κι άλλα είδη και ξαναπατήσει
αποστολή. Στη μείωση ποσότητας το `sentQty` ψαλιδίζεται (`min(sentQty, qty)`) —
συνέπεια: αν αφαιρεθεί και ξαναπροστεθεί τεμάχιο ήδη σταλμένης γραμμής, θα
ξανασταλεί (προτιμήθηκε το «περιττό πιάτο» από το «πιάτο που δεν ήρθε ποτέ»).

### Ροή δελτίου

```
waiter: Στείλε στην κουζίνα (δέλτα) ─▶ kitchenOrders {status:'pending'}
kitchen: ✅ Έτοιμο ─▶ {status:'ready', readyAt}
runner: Σερβιρίστηκε ─▶ deleteDoc (τα δελτία είναι εφήμερα· το τραπέζι κρατά τις γραμμές μέχρι την πληρωμή)
```

Πληρωμή (`payItems`): επιλογή γραμμών στο bill sheet (split ανά είδος), εγγραφή
πώλησης στο `sales` με snapshot ειδών/συνόλου/ρέστων, αφαίρεση των πληρωμένων
γραμμών από το τραπέζι.

## Αποφάσεις σχεδίασης (γιατί έτσι)

- **Denormalized τιμές παντού**: η γραμμή παραγγελίας και η πώληση κρατούν
  αντίγραφο `name/price`. Αλλαγή τιμής στον κατάλογο ΔΕΝ αλλάζει ανοιχτούς
  λογαριασμούς ή το ιστορικό — σωστό για POS.
- **Κόμμα δεκαδικών**: κάθε αριθμητικό input χρήστη περνά από
  `parseFloat(x.replace(',', '.'))` — τα ελληνικά decimal-pad δίνουν κόμμα και
  το σκέτο `parseFloat("10,50")` κόβει στο 10 (λάθος ρέστα). Ισχύει ήδη σε
  TableDetail (πληρωμή) και MenuManager· κράτα το σε κάθε νέο πεδίο ποσού.
- **Pure setState updaters**: ΟΧΙ Firestore writes μέσα σε `setTables(prev => ...)`
  — τα updaters διπλοεκτελούνται στο StrictMode. Το pattern είναι: υπολόγισε
  `nextOrders` εκτός, κάνε optimistic `setTables`, μετά `updateDoc` (βλ.
  `writeTableOrders`).
- **`persistMenu` ενημερώνει ΠΑΝΤΑ και το τοπικό state** πριν το `setDoc` —
  αλλιώς η επόμενη επεξεργασία χτίζει σε παλιό menu μέχρι το snapshot echo και
  σβήνει σιωπηλά την προηγούμενη αλλαγή (ήταν πραγματικό data-loss bug).
- **Χωρίς dialog επιβεβαίωσης σε συχνές, μη καταστροφικές ενέργειες** (αποστολή
  κουζίνας)· `confirmAction` (cross-platform, δουλεύει και σε web) μόνο για
  καταστροφικές (κλείσιμο τραπεζιού, εκκαθάριση, διαγραφή ιστορικού).
- **Φραγή διπλού tap στην πληρωμή** με `payingRef` — χωρίς αυτήν το γρήγορο
  διπλό tap έγραφε διπλή πώληση.
- **Ειδοποιήσεις runner/κουζίνας με σύγκριση IDs**, όχι πλήθους — ίδιο πλήθος
  μπορεί να κρύβει ένα νέο + ένα σερβιρισμένο στο ίδιο snapshot.
- **Ειδοποιήσεις μόνο «σε βάρδια»**: ήχος/δόνηση/notification (κουζίνα, runner)
  παίζουν μόνο αφού πατηθεί «Έναρξη βάρδιας» (`ShiftBar` component, `onDuty`
  state στο `AppContext`). Το `onDuty` ΣΚΟΠΙΜΑ δεν αποθηκεύεται σε AsyncStorage:
  refresh/νέο άνοιγμα = εκτός βάρδιας, ώστε όποιος έχει απλώς ανοιχτή την
  καρτέλα στο κινητό του (εκτός δουλειάς) να μην ενοχλείται — στο web ο ήχος
  απαιτεί ούτως ή άλλως tap για ξεκλείδωμα, οπότε το ίδιο tap κάνει και τα δύο.
  Auto τέλος βάρδιας μετά από 12h (`SHIFT_MAX_MS`). Τα prev-IDs refs
  ενημερώνονται ΚΑΙ εκτός βάρδιας, ώστε η έναρξη να μη σκάσει σωρευμένα alerts.
- **Το Firebase API key στο `firebase.js` ΔΕΝ είναι μυστικό** (public client
  identifier by design). Η ασφάλεια κρίνεται στα Firestore security rules —
  βλ. Επόμενα βήματα.

## UI συμβάσεις

- Dark palette: φόντο `#1a1a2e`, κάρτες `#16213e`, μπορντούρες `#2d2d4e`,
  accent `#4ecca3` (πράσινο/χρήμα), `#e6a23c` (κουζίνα/προσοχή), `#e74c3c`
  (καταστροφικό/άργησε), `#6ea8fe` (runner/tasks). Κάθε οθόνη έχει δικό της
  `StyleSheet` — δεν υπάρχει κεντρικό theme αρχείο ακόμα (βλ. Επόμενα βήματα).
- Μικρά κουμπιά (emoji icons, +/−, ✕) παίρνουν `hitSlop` 10 ώστε το πραγματικό
  target να πιάνει ~44dp· τα βασικά action buttons είναι ήδη μεγάλα.
- Ποσά/μετρητές: `fontVariant: ['tabular-nums']` ώστε να μην «χοροπηδούν».
- Placeholders/hints: ελάχιστο `#777`–`#8a8a9a` πάνω στο dark φόντο (χρήση σε
  ήλιο)· `#666` μόνο για καθαρά διακοσμητικά μεταδεδομένα.
- Bottom sheets/modals με TextInput τυλίγονται σε `Modal` +
  `KeyboardAvoidingView` (behavior `padding` σε iOS)· το Modal δίνει δωρεάν
  σωστό Android back. Icon-only κουμπιά παίρνουν
  `accessibilityRole`/`accessibilityLabel`.
- Δελτία κουζίνας: χρόνος αναμονής σε λεπτά, πορτοκαλί ≥10′, κόκκινο ≥20′
  (σταθερές `WARN_MIN`/`LATE_MIN` στο `KitchenScreen`).

## Γνωστοί περιορισμοί (συνειδητά αποδεκτοί προς το παρόν)

1. **Last-write-wins στο `orders` array**: κάθε mutation ξαναγράφει όλο τον
   πίνακα του τραπεζιού. Δύο συσκευές που πειράζουν ΤΟ ΙΔΙΟ τραπέζι ταυτόχρονα
   μπορεί να χάσουν η μία τις αλλαγές της άλλης. Πραγματική λύση: subcollection
   γραμμών (βλ. roadmap NEXT).
2. **Ανοιχτά Firestore rules** — οποιοσδήποτε με το config μπορεί να
   διαβάσει/γράψει. Πρώτη προτεραιότητα του roadmap.
3. **Unbounded `sales` stream**: κάθε συσκευή κατεβάζει ΟΛΟ το ιστορικό στην
   εκκίνηση· το `clearHistory` σβήνει τα πάντα με ένα batch (σπάει >500 docs)
   και είναι μη αναστρέψιμη διαγραφή οικονομικών εγγραφών.
4. **Fire-and-forget writes**: αποτυχίες καταγράφονται μόνο σε `console.warn` —
   δεν υπάρχει ορατό «δεν αποθηκεύτηκε / retry» για το προσωπικό, ούτε durable
   offline queue (το web Firestore SDK δεν κάνει persist τα pending writes αν
   σκοτωθεί η εφαρμογή).
5. **Δελτία κουζίνας δρομολογούνται με `tableName` string** (το `tableId`
   αποθηκεύεται πλέον στο δελτίο, αλλά το UI δείχνει το όνομα) — μετονομασία/
   διπλό όνομα τραπεζιού μπερδεύει την κουζίνα.
6. Μόνο η κατηγορία «Φαγητά» πάει στην κουζίνα — δεν υπάρχει έννοια «πόστο
   παρασκευής» (π.χ. bar station για κοκτέιλ).

## Επόμενα βήματα (roadmap)

**ΤΩΡΑ (πριν από πραγματική βάρδια):**
- Firebase Anonymous Auth + rules `allow read, write: if request.auth != null;`
  (κλείνει την ανοιχτή βάση χωρίς αλλαγή στο data model).
- Ορατή ένδειξη αποτυχίας εγγραφής (toast/banner «Δεν αποθηκεύτηκε — retry»).
- `runTransaction` στα mutations του τραπεζιού για τις ταυτόχρονες εγγραφές
  (κόστος: χάνεται το instant local echo — να μετρηθεί στο wifi του μαγαζιού).

**ΜΕΤΑ (δομικά):**
- Γραμμές παραγγελίας ως subcollection `tables/{id}/lines/{lineId}` με
  `qty/sentQty/paidQty/status` — τέλος το last-write-wins και ανοίγει ο δρόμος
  για μερική πληρωμή τεμαχίων της ίδιας γραμμής.
- Δελτία κουζίνας με αναφορά σε `tableId` + `lineIds` αντί για ονόματα.
- Κατάλογος σε `menuItems/{id}` docs αντί για ένα doc — ταυτόχρονες
  επεξεργασίες δεν θα πατάνε η μία την άλλη.
- `sales` append-only (rules: όχι update/delete), query με όριο ημέρας +
  pagination· «Z αναφορά» ημέρας αντί για `clearHistory`.
- Κεντρικό `src/theme.js` (χρώματα/αποστάσεις) και σταδιακή μετάβαση των
  StyleSheets.

**ΑΡΓΟΤΕΡΑ:**
- Custom claims ανά ρόλο (η κουζίνα να μπορεί να αλλάζει μόνο `status`), venue
  code onboarding, App Check.
- Cloud Functions για κλείσιμο ημέρας / εκτύπωση αποδείξεων.
- Πόστα παρασκευής ανά κατηγορία (κουζίνα/μπαρ) με ξεχωριστές οθόνες.
- Αν το wifi αποδειχθεί αναξιόπιστο: `@react-native-firebase` για native
  persistent offline queue.

## Ιστορικό αξιολόγησης (2026-07-07)

Έγινε πλήρες review (bugs / αρχιτεκτονική / UX) και διορθώθηκαν: stale-base
overwrite στον κατάλογο, διπλή αποστολή φαγητών στην κουζίνα (τώρα δέλτα με
`sentQty`), `parseFloat` με κόμμα στα ρέστα, `goBack()` μέσα στο render,
Firestore writes μέσα σε setState updater, διπλό tap πληρωμής, AddItems σε
διαγραμμένο τραπέζι, beep runner βάσει πλήθους, σύγκρουση local IDs. Προστέθηκαν:
σημειώσεις ανά γραμμή (φτάνουν σε κουζίνα/runner), χρόνος αναμονής δελτίων με
χρωματική σήμανση, Όλα/Κανένα και γρήγορα ποσά στο λογαριασμό, keyboard
handling, hitSlop/a11y labels, tabular-nums.
