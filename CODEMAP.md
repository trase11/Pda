# CODEMAP — Panteboy PDA
> Synced: b21486c (+ ασύμμετρες τοπικές αλλαγές βάρδιας/ειδοποιήσεων, uncommitted) · 2026-07-07 · καλύπτει: App.js, index.js, src/ (όχι node_modules, dist, assets)

## Αρχιτεκτονική σε μία παράγραφο
Expo SDK 56 / React Native 0.85, σκέτο JavaScript, όλο το UI ελληνικά. PDA
εστίασης με τρία «πόστα» ανά συσκευή (waiter / kitchen / runner) που επιλέγονται
στο πρώτο άνοιγμα και συγχρονίζονται real-time μέσω Firestore `onSnapshot`.
Δεν υπάρχει backend/server: κάθε mutation γράφει απευθείας στο Firestore και το
snapshot echo ενημερώνει όλες τις συσκευές. Χωρίς Firebase config η εφαρμογή
πέφτει σε local mode (AsyncStorage) όπου κουζίνα/δουλειές ΔΕΝ λειτουργούν.
Το μη προφανές: τα δελτία κουζίνας (`kitchenOrders`) είναι **εφήμερα** docs —
διαγράφονται στο σερβίρισμα· η αλήθεια του λογαριασμού ζει στο
`tables/{id}.orders` array μέχρι την πληρωμή.

## Χάρτης αρχείων
| Path | Ευθύνη (μία γραμμή) | Κλειδιά |
|------|----------------------|---------|
| App.js | Root routing ανά ρόλο· ΜΟΝΟ ο waiter έχει NavigationContainer (tabs) | `Root()`, `WaiterApp` |
| index.js | Expo entry point | `registerRootComponent` |
| app.json | Expo config· `experiments.baseUrl: "/Pda"` δεμένο με όνομα repo (Pages) | |
| src/firebase.js | Firebase init· `firebaseEnabled` = όλα τα πεδία συμπληρωμένα | `db`, `firebaseEnabled` |
| src/context/AppContext.js | Κεντρικό state: τραπέζια, κατάλογος, ιστορικό, ρόλος, βάρδια· cloud/local dual mode | `writeTableOrders`, `markOrdersSent`, `payItems`, `persistMenu`, `startShift`/`endShift`, `normalizeLine`, `SHIFT_MAX_MS` |
| src/context/KitchenContext.js | Δελτία `kitchenOrders`· derived `pendingOrders`/`readyOrders` | `sendToKitchen`, `markReady`, `markServed` |
| src/context/TasksContext.js | Δουλειές `tasks` προς βοηθούς· presets | `createTask`, `completeTask`, `TASK_PRESETS` |
| src/components/ShiftBar.js | Μπάρα «Έναρξη/Τέλος βάρδιας» — gate όλων των ειδοποιήσεων | prop `hint` |
| src/screens/RolePickerScreen.js | Επιλογή ρόλου + όνομα σερβιτόρου → AsyncStorage | `pickWaiter` |
| src/screens/TablesScreen.js | Λίστα τραπεζιών· φίλτρο «Τα δικά μου»/«Όλα»· άνοιγμα/κλείσιμο/ανάθεση | `filter mine/all`, `openAssign` |
| src/screens/TableDetailScreen.js | Η μεγαλύτερη οθόνη: γραμμές παραγγελίας, σημειώσεις, αποστολή κουζίνας (δέλτα), bill sheet, πληρωμή | `handleSendToKitchen`, `handlePay`, `payingRef` |
| src/screens/AddItemsScreen.js | Προσθήκη ειδών από κατάλογο (αναζήτηση + chips κατηγοριών) | `getOrderQty` (άθροισμα σε όλες τις γραμμές του itemId) |
| src/screens/KitchenScreen.js | Οθόνη κουζίνας: pending δελτία, χρώμα ανά χρόνο αναμονής, ήχος σε νέο δελτίο | `WARN_MIN`/`LATE_MIN`, `prevPendingIds` |
| src/screens/RunnerScreen.js | Οθόνη βοηθού: έτοιμα πιάτα + δουλειές, ήχος/notification | `prevReadyIds`, `prevTaskIds` |
| src/screens/AssignTaskScreen.js | Tab σερβιτόρου: αποστολή δουλειάς σε βοηθούς (presets + ελεύθερο κείμενο + τραπέζι) | `send` |
| src/screens/HistoryScreen.js | Ιστορικό πωλήσεων ομαδοποιημένο ανά ημέρα + σύνολα + καθαρισμός | `sections` useMemo |
| src/screens/MenuManagerScreen.js | Επεξεργασία καταλόγου: προσθήκη/τιμή/διαγραφή ειδών | μέσω `persistMenu` |
| src/data/menuData.js | Default κατάλογος: `[{id,name,icon,items:[{id,name,price}]}]` — seed του `config/menu` | κατηγορία `'Φαγητά'` = κουζίνα |
| src/utils/notify.js | Ήχος (WebAudio) + δόνηση + browser Notification· web audio unlock | `unlockAudio`, `beep`, `notify`, `requestNotifyPermission` |
| src/utils/confirm.js | Cross-platform confirm — το `Alert.alert` είναι no-op στο web | `confirmAction` |
| .github/workflows/deploy.yml | push στο `main` → `expo export` → GitHub Pages (`dist/`) | |

## Ροές (file:function hops)
1. **Παραγγελία → κουζίνα → σερβίρισμα**: AddItemsScreen:`addItemToTable` →
   `tables.orders` (sentQty=0) → TableDetailScreen:`handleSendToKitchen`
   (στέλνει ΜΟΝΟ το δέλτα `qty−sentQty`) → KitchenContext:`sendToKitchen`
   (addDoc `kitchenOrders` status:'pending') **+ ταυτόχρονα**
   AppContext:`markOrdersSent` (sentQty=qty) → KitchenScreen (beep αν onDuty) →
   `markReady` (status:'ready', readyAt) → RunnerScreen (beep αν onDuty) →
   `markServed` (deleteDoc — το δελτίο πεθαίνει, το τραπέζι κρατά τις γραμμές).
2. **Πληρωμή**: TableDetailScreen:`openBill` (split ανά είδος με checkboxes) →
   `handlePay` (φραγή `payingRef`) → AppContext:`payItems` (addDoc `sales`
   snapshot + αφαίρεση πληρωμένων γραμμών) → HistoryScreen.
3. **Δουλειά βοηθού**: AssignTaskScreen:`send` → TasksContext:`createTask`
   (addDoc `tasks` status:'pending') → RunnerScreen (beep αν onDuty) →
   `completeTask` (deleteDoc).
4. **Βάρδια/ειδοποιήσεις**: ShiftBar tap → AppContext:`startShift`
   (`unlockAudio` + `requestNotifyPermission` + onDuty=true + δοκιμαστικό beep)
   → gate στα alert effects Kitchen/Runner· auto τέλος μετά `SHIFT_MAX_MS` (12h)·
   refresh/νέο άνοιγμα ⇒ εκτός βάρδιας.

## Πού ζει το state
- **AppContext**: `tables`, `menu`, `history` (cloud: Firestore `tables`/`sales`/`config/menu` · local: AsyncStorage)· `role`/`waiterName` ΠΑΝΤΑ ανά συσκευή σε AsyncStorage· `onDuty` ΜΟΝΟ in-memory (σκόπιμα).
- **KitchenContext**: όλα τα `kitchenOrders` docs· `pendingOrders`/`readyOrders` derived από `status`.
- **TasksContext**: όλα τα `tasks` docs· `pendingTasks` derived.
- Firestore συλλογές: `tables`, `sales`, `kitchenOrders`, `tasks`, `config/menu` (ένα doc).

## Συμβόλαια & αναλλοίωτα (ΜΗΝ τα σπάσεις)
- **Δέλτα κουζίνας**: η αποστολή στέλνει `qty − sentQty` και αμέσως θέτει `sentQty = qty`. Αυτό εμποδίζει το διπλομαγείρεμα. Στη μείωση: `sentQty = min(sentQty, qty)` — συνειδητή επιλογή «καλύτερα περιττό πιάτο παρά πιάτο που δεν ήρθε».
- **`lineId` είναι το κλειδί γραμμής, ΟΧΙ `itemId`** — δύο γραμμές ίδιου προϊόντος με διαφορετική σημείωση συνυπάρχουν. Merge από κατάλογο ΜΟΝΟ σε γραμμή χωρίς `note`.
- **`normalizeLine()` μένει** όσο υπάρχουν παλιά docs χωρίς lineId στο Firestore.
- **Pure setState updaters**: ποτέ Firestore write μέσα σε `setTables(prev=>…)` (StrictMode διπλοεκτελεί). Pattern: υπολόγισε εκτός → optimistic setState → `updateDoc` (βλ. `writeTableOrders`).
- **`persistMenu` ενημερώνει ΠΡΩΤΑ το τοπικό state** πριν το `setDoc` — αλλιώς stale-base data loss.
- **Κόμμα δεκαδικών**: κάθε αριθμητικό input περνά από `parseFloat(x.replace(',', '.'))`.
- **Denormalized τιμές**: γραμμή και πώληση κρατούν snapshot `name/price` — αλλαγή καταλόγου δεν αγγίζει ανοιχτούς λογαριασμούς/ιστορικό.
- **`onDuty` δεν αποθηκεύεται πουθενά** — refresh = εκτός βάρδιας, ώστε ανοιχτές καρτέλες εκτός δουλειάς να μη χτυπάνε. Τα prev-IDs refs (Kitchen/Runner) ενημερώνονται ΚΑΙ εκτός βάρδιας ώστε η έναρξη να μη σκάσει σωρευμένα alerts.
- **Ειδοποιήσεις με σύγκριση IDs, όχι πλήθους** — ίδιο πλήθος μπορεί να κρύβει 1 νέο + 1 σερβιρισμένο στο ίδιο snapshot.
- Το Firebase apiKey στο firebase.js ΔΕΝ είναι μυστικό (public client id)· η ασφάλεια κρίνεται στα Firestore rules (τώρα ΑΝΟΙΧΤΑ — πρώτο roadmap item).

## Συζεύξεις — «αν αλλάξεις Χ, άλλαξε και Ψ»
- `handleSendToKitchen` (TableDetail) ↔ `sendToKitchen` (KitchenContext) ↔ `markOrdersSent` (AppContext): το δέλτα και το sentQty πρέπει να συμβούν μαζί — αλλαγή στο ένα σπάει το invariant διπλομαγειρέματος.
- Το string `'Φαγητά'` (κατηγορία menuData) hardcoded στο φίλτρο του TableDetailScreen (`foodItems`) — μετονομασία κατηγορίας κόβει τη δρομολόγηση στην κουζίνα.
- `onDuty` (AppContext) ↔ alert effects σε KitchenScreen/RunnerScreen: το `onDuty` ΠΡΕΠΕΙ να είναι στα deps των effects, αλλιώς κλειδώνει stale closure.
- `app.json experiments.baseUrl "/Pda"` ↔ όνομα GitHub repo.
- Δελτία δρομολογούνται με `tableName` string (το `tableId` αποθηκεύεται αλλά το UI δείχνει όνομα) — μετονομασία/διπλό όνομα τραπεζιού μπερδεύει κουζίνα/runner.

## «Πού κάνω…» index
| Εργασία | Πού |
|---------|-----|
| Αλλαγή default καταλόγου/τιμών | src/data/menuData.js (seed) ή runtime μέσω MenuManagerScreen |
| Αλλαγή ήχου/δόνησης ειδοποίησης | src/utils/notify.js:`beep`/`playTone` |
| Νέα προκαθορισμένη δουλειά βοηθού | src/context/TasksContext.js:`TASK_PRESETS` |
| Όρια χρωμάτων αναμονής κουζίνας | src/screens/KitchenScreen.js:`WARN_MIN`/`LATE_MIN` |
| Διάρκεια auto-τέλους βάρδιας | src/context/AppContext.js:`SHIFT_MAX_MS` |
| Νέος ρόλος/πόστο | RolePickerScreen + App.js:`Root()` |
| Firebase credentials | src/firebase.js |
| Deploy/hosting | .github/workflows/deploy.yml + app.json:baseUrl |

## Παγίδες
- `Alert.alert` είναι no-op στο react-native-web → πάντα `confirmAction` (utils/confirm.js).
- Web audio κλειδωμένο μέχρι user gesture → κάθε νέο page load θέλει tap «Έναρξη βάρδιας» για να ακουστεί οτιδήποτε (notify.js σχόλια εξηγούν το γιατί).
- Native (Expo Go): το `beep()` κάνει ΜΟΝΟ δόνηση — δεν υπάρχει audio library.
- `parseFloat("10,50")` κόβει στο 10 — ελληνικό decimal-pad δίνει κόμμα (λάθος ρέστα ήταν πραγματικό bug).
- Last-write-wins στο `orders` array: δύο συσκευές στο ΙΔΙΟ τραπέζι ταυτόχρονα χάνουν αλλαγές (αποδεκτό προς το παρόν, roadmap: subcollection).
- `clearHistory` με ένα batch σπάει σε >500 docs· και κατεβαίνει ΟΛΟ το `sales` σε κάθε εκκίνηση (unbounded stream).
- Fire-and-forget writes: αποτυχία = μόνο `console.warn`, καμία ορατή ένδειξη στο προσωπικό.
- Kitchen/Tasks ΔΕΝ λειτουργούν σε local mode — οι οθόνες δείχνουν οδηγία ρύθμισης Firebase.
