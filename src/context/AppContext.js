import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDocs, writeBatch,
} from 'firebase/firestore';
import { db, firebaseEnabled } from '../firebase';
import { MENU } from '../data/menuData';
import { unlockAudio, requestNotifyPermission, beep } from '../utils/notify';

const AppContext = createContext();

// Ασφάλεια βάρδιας: συσκευή που ξεχάστηκε «σε βάρδια» βγαίνει μόνη της.
const SHIFT_MAX_MS = 12 * 60 * 60 * 1000;

// Όταν υπάρχει Firebase, όλα (τραπέζια, ιστορικό, κατάλογος) είναι κοινά
// σε πραγματικό χρόνο μεταξύ συσκευών. Αλλιώς, πέφτουμε σε τοπική
// αποθήκευση ανά συσκευή (AsyncStorage), όπως πριν.
const useCloud = firebaseEnabled && !!db;

const TABLES = 'tables';
const SALES = 'sales';
const MENU_DOC_ID = 'menu'; // config/menu -> { categories: [...] }
const SETTINGS_DOC_ID = 'settings'; // config/settings -> { businessName, adminPin, ... }

// Ρυθμίσεις καταστήματος (κοινές σε όλες τις συσκευές μέσω config/settings).
// Τα στοιχεία επιχείρησης δεν εμφανίζονται πουθενά ακόμα — θα μπουν στην
// κεφαλίδα λογαριασμού/απόδειξης όταν προστεθεί η εκτύπωση (βλ. CLAUDE.md).
// adminPin: 4ψήφιο PIN για τη Διαχείριση· κενό = απενεργοποιημένο. Είναι
// προστασία ευκολίας (client-side), ΟΧΙ ασφάλεια — αυτή έρχεται με τα rules.
const DEFAULT_SETTINGS = {
  businessName: '',
  phone: '',
  address: '',
  vat: '',
  footerNote: '',
  waitAlertMin: 20, // τραπέζι με δελτίο σε αναμονή > τόσα λεπτά σημαίνεται στον σερβιτόρο (0 = off)
  adminPin: '',
};

function makeId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Κάθε γραμμή παραγγελίας: { lineId, itemId, name, price, qty, category, note, sentQty, options }
// - lineId:  μοναδικό αναγνωριστικό γραμμής (δύο γραμμές ίδιου προϊόντος με
//            διαφορετική σημείωση συνυπάρχουν).
// - note:    σημείωση προς την κουζίνα, π.χ. «χωρίς κρεμμύδι».
// - sentQty: πόσα τεμάχια έχουν ήδη σταλεί στην κουζίνα — η αποστολή στέλνει
//            μόνο τη διαφορά (qty - sentQty), ώστε να μη μαγειρεύεται δύο
//            φορές ό,τι στάλθηκε ήδη.
// - options: επιλεγμένα έξτρα [{ name, delta }] (snapshot από τον κατάλογο).
//            Το price είναι Η ΤΕΛΙΚΗ τιμή μονάδας (βάση + άθροισμα deltas),
//            ώστε όλοι οι υπολογισμοί συνόλων να δουλεύουν όπως πριν —
//            τα options υπάρχουν μόνο για εμφάνιση (σερβιτόρος/κουζίνα).
// Παλιά δεδομένα (πριν το lineId) κανονικοποιούνται εδώ ώστε οι οθόνες να
// βασίζονται πάντα στο πλήρες σχήμα.
function normalizeLine(line) {
  return {
    lineId: line.lineId || line.itemId,
    itemId: line.itemId,
    name: line.name,
    price: line.price,
    qty: line.qty,
    category: line.category || '',
    note: line.note || '',
    sentQty: line.sentQty || 0,
    options: Array.isArray(line.options) ? line.options : [],
  };
}

// Κλειδί σύγκρισης έξτρα: γραμμές ίδιου προϊόντος συγχωνεύονται ΜΟΝΟ αν
// έχουν ακριβώς τα ίδια έξτρα (και καμία σημείωση).
function optionsKey(options = []) {
  return options.map(o => `${o.name}:${o.delta}`).sort().join('|');
}

function normalizeTable(t) {
  return { ...t, orders: Array.isArray(t.orders) ? t.orders.map(normalizeLine) : [] };
}

export function AppProvider({ children }) {
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState(MENU);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [role, setRoleState] = useState(null); // null | 'waiter' | 'kitchen' | 'runner'
  const [waiterName, setWaiterNameState] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Ξεκλείδωμα Διαχείρισης με PIN — ΜΟΝΟ in-memory: refresh = κλειδωμένο ξανά.
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // «Σε βάρδια»: ήχος/δόνηση/notification παίζουν ΜΟΝΟ σε συσκευές σε βάρδια.
  // ΣΚΟΠΙΜΑ δεν αποθηκεύεται (ούτε AsyncStorage): refresh ή νέο άνοιγμα
  // ξεκινά εκτός βάρδιας, ώστε όποιος έχει απλώς ανοιχτή την εφαρμογή στο
  // κινητό του (εκτός δουλειάς) να μην ενοχλείται. Στο web ο ήχος απαιτεί
  // έτσι κι αλλιώς ένα tap για ξεκλείδωμα — το tap «Έναρξη βάρδιας» τα κάνει
  // όλα μαζί (ξεκλείδωμα ήχου + άδεια notifications + δήλωση βάρδιας).
  const [onDuty, setOnDuty] = useState(false);

  // ---- Φόρτωση ρόλου/ονόματος (πάντα ανά συσκευή) ----
  useEffect(() => {
    (async () => {
      try {
        const r = await AsyncStorage.getItem('role');
        const n = await AsyncStorage.getItem('waiterName');
        if (r) setRoleState(r);
        if (n) setWaiterNameState(n);
      } catch {}
      if (!useCloud) {
        // Τοπική φόρτωση δεδομένων (χωρίς Firebase)
        try {
          const t = await AsyncStorage.getItem('tables');
          const m = await AsyncStorage.getItem('menu');
          const h = await AsyncStorage.getItem('history');
          const st = await AsyncStorage.getItem('settings');
          if (t) setTables(JSON.parse(t).map(normalizeTable));
          if (m) setMenu(JSON.parse(m));
          if (h) setHistory(JSON.parse(h));
          if (st) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(st) });
        } catch {}
      }
      setLoaded(true);
    })();
  }, []);

  // ---- Real-time συνδρομές (μόνο με Firebase) ----
  useEffect(() => {
    if (!useCloud) return;

    const unsubTables = onSnapshot(
      query(collection(db, TABLES), orderBy('createdAt', 'asc')),
      snap => setTables(snap.docs.map(d => normalizeTable({ id: d.id, ...d.data() }))),
      err => console.warn('Tables sync error:', err)
    );

    const unsubSales = onSnapshot(
      query(collection(db, SALES), orderBy('paidAt', 'desc')),
      snap => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.warn('Sales sync error:', err)
    );

    const menuRef = doc(db, 'config', MENU_DOC_ID);
    const unsubMenu = onSnapshot(
      menuRef,
      snap => {
        if (snap.exists() && Array.isArray(snap.data().categories)) {
          setMenu(snap.data().categories);
        } else {
          // Πρώτη εκκίνηση: σπέρνουμε τον προεπιλεγμένο κατάλογο.
          setDoc(menuRef, { categories: MENU }).catch(err => console.warn('Menu seed error:', err));
          setMenu(MENU);
        }
      },
      err => console.warn('Menu sync error:', err)
    );

    const settingsRef = doc(db, 'config', SETTINGS_DOC_ID);
    const unsubSettings = onSnapshot(
      settingsRef,
      snap => {
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
        }
        // Δεν σπέρνουμε defaults εδώ — το doc δημιουργείται στο πρώτο save.
      },
      err => console.warn('Settings sync error:', err)
    );

    return () => { unsubTables(); unsubSales(); unsubMenu(); unsubSettings(); };
  }, []);

  // ---- Τοπική αποθήκευση (μόνο χωρίς Firebase) ----
  useEffect(() => {
    if (useCloud || !loaded) return;
    AsyncStorage.setItem('tables', JSON.stringify(tables)).catch(() => {});
    AsyncStorage.setItem('menu', JSON.stringify(menu)).catch(() => {});
    AsyncStorage.setItem('history', JSON.stringify(history)).catch(() => {});
    AsyncStorage.setItem('settings', JSON.stringify(settings)).catch(() => {});
  }, [tables, menu, history, settings, loaded]);

  // Αυτόματο τέλος βάρδιας μετά από SHIFT_MAX_MS — καρτέλα που έμεινε
  // ανοιχτή από την προηγούμενη μέρα δεν θα χτυπάει στο σπίτι.
  useEffect(() => {
    if (!onDuty) return;
    const t = setTimeout(() => setOnDuty(false), SHIFT_MAX_MS);
    return () => clearTimeout(t);
  }, [onDuty]);

  // Έναρξη βάρδιας — να καλείται ΜΕΣΑ από tap του χρήστη (το web απαιτεί
  // user gesture για το ξεκλείδωμα ήχου). Το μπιπ στο τέλος είναι η
  // επιβεβαίωση προς τον υπάλληλο ότι ο ήχος όντως ακούγεται.
  async function startShift() {
    await unlockAudio();
    await requestNotifyPermission();
    setOnDuty(true);
    beep();
  }

  function endShift() {
    setOnDuty(false);
  }

  // Ρυθμίσεις: ίδιο pattern με persistMenu — ΠΡΩΤΑ το τοπικό state, μετά το
  // cloud, αλλιώς διαδοχικές αλλαγές πριν το snapshot echo πατάνε η μία την άλλη.
  function saveSettings(patch) {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (useCloud) {
      setDoc(doc(db, 'config', SETTINGS_DOC_ID), next)
        .catch(err => console.warn('Αποτυχία αποθήκευσης ρυθμίσεων:', err));
    }
  }

  // PIN Διαχείρισης. Χωρίς ορισμένο PIN η Διαχείριση είναι ελεύθερη.
  function unlockAdmin(pin) {
    if (!settings.adminPin || pin === settings.adminPin) {
      setAdminUnlocked(true);
      return true;
    }
    return false;
  }

  function setRole(r) {
    setRoleState(r);
    AsyncStorage.setItem('role', r ?? '').catch(() => {});
  }

  function setWaiterName(n) {
    setWaiterNameState(n);
    AsyncStorage.setItem('waiterName', n ?? '').catch(() => {});
  }

  // Βοηθός: υπολογίζει τα νέα orders ΕΚΤΟΣ του setState updater (τα updaters
  // πρέπει να είναι pure — το παλιό updateDoc μέσα στο updater διπλοεκτελείται
  // στο StrictMode). Κάνει optimistic τοπική ενημέρωση και μετά γράφει στο cloud.
  function writeTableOrders(tableId, updater) {
    const tbl = tables.find(t => t.id === tableId);
    if (!tbl) return;
    const nextOrders = updater(tbl.orders);
    setTables(prev => prev.map(t => (t.id === tableId ? { ...t, orders: nextOrders } : t)));
    if (useCloud) {
      updateDoc(doc(db, TABLES, tableId), { orders: nextOrders })
        .catch(err => console.warn('Αποτυχία αποθήκευσης παραγγελίας:', err));
    }
  }

  function addTable(name, extra = {}) {
    const base = { name, orders: [], createdAt: new Date().toISOString(), zone: '', assignedTo: '', ...extra };
    if (useCloud) {
      addDoc(collection(db, TABLES), base).catch(err => console.warn('Αποτυχία ανοίγματος τραπεζιού:', err));
      return null;
    }
    const id = makeId('t');
    setTables(prev => [...prev, { id, ...base }]);
    return id;
  }

  function removeTable(id) {
    if (useCloud) {
      deleteDoc(doc(db, TABLES, id)).catch(err => console.warn('Αποτυχία κλεισίματος τραπεζιού:', err));
      return;
    }
    setTables(prev => prev.filter(t => t.id !== id));
  }

  function clearTable(id) {
    if (useCloud) {
      updateDoc(doc(db, TABLES, id), { orders: [], createdAt: new Date().toISOString() })
        .catch(err => console.warn('Αποτυχία εκκαθάρισης:', err));
      return;
    }
    setTables(prev => prev.map(t => t.id === id ? { ...t, orders: [], createdAt: new Date().toISOString() } : t));
  }

  // Ανάθεση τραπεζιού σε σερβιτόρο / ζώνη (Φάση 2).
  function assignTable(id, { assignedTo, zone }) {
    const patch = {};
    if (assignedTo !== undefined) patch.assignedTo = assignedTo;
    if (zone !== undefined) patch.zone = zone;
    if (useCloud) {
      updateDoc(doc(db, TABLES, id), patch).catch(err => console.warn('Αποτυχία ανάθεσης:', err));
      return;
    }
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }

  function addItemToTable(tableId, item, categoryName, options = []) {
    const key = optionsKey(options);
    const unitPrice = item.price + options.reduce((sum, o) => sum + o.delta, 0);
    writeTableOrders(tableId, orders => {
      // Συγχωνεύουμε μόνο σε γραμμή χωρίς σημείωση ΚΑΙ με τα ίδια έξτρα —
      // γραμμή με note ή διαφορετικά έξτρα μένει ξεχωριστή.
      const existing = orders.find(o =>
        o.itemId === item.id && !o.note && optionsKey(o.options) === key
      );
      if (existing) {
        return orders.map(o => o.lineId === existing.lineId ? { ...o, qty: o.qty + 1 } : o);
      }
      return [...orders, {
        lineId: makeId('l'), itemId: item.id, name: item.name, price: unitPrice,
        qty: 1, category: categoryName, note: '', sentQty: 0, options,
      }];
    });
  }

  function removeItemFromTable(tableId, lineId) {
    writeTableOrders(tableId, orders =>
      orders
        .map(o => o.lineId === lineId
          ? { ...o, qty: o.qty - 1, sentQty: Math.min(o.sentQty, o.qty - 1) }
          : o)
        .filter(o => o.qty > 0)
    );
  }

  function incrementOrderItem(tableId, lineId) {
    writeTableOrders(tableId, orders =>
      orders.map(o => o.lineId === lineId ? { ...o, qty: o.qty + 1 } : o)
    );
  }

  function deleteOrderItem(tableId, lineId) {
    writeTableOrders(tableId, orders => orders.filter(o => o.lineId !== lineId));
  }

  function setOrderNote(tableId, lineId, note) {
    writeTableOrders(tableId, orders =>
      orders.map(o => o.lineId === lineId ? { ...o, note } : o)
    );
  }

  // Σημείωση σε επίπεδο παραγγελίας (όλο το τραπέζι) — πάει στο επόμενο
  // δελτίο κουζίνας και καθαρίζεται μετά την αποστολή (TableDetailScreen).
  function setTableOrderNote(tableId, orderNote) {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, orderNote } : t));
    if (useCloud) {
      updateDoc(doc(db, TABLES, tableId), { orderNote })
        .catch(err => console.warn('Αποτυχία αποθήκευσης σημείωσης:', err));
    }
  }

  // Μεταφορά ΟΛΩΝ των γραμμών σε άλλο τραπέζι (αλλαγή τραπεζιού / ένωση
  // παρέας). Οι γραμμές κρατούν το sentQty τους — δεν ξαναμαγειρεύεται
  // τίποτα. Προσοχή: δελτία που ήδη στάλθηκαν δείχνουν το ΠΑΛΙΟ όνομα
  // τραπεζιού στην κουζίνα (γνωστός περιορισμός, βλ. CLAUDE.md).
  function transferOrders(fromId, toId) {
    const from = tables.find(t => t.id === fromId);
    const to = tables.find(t => t.id === toId);
    if (!from || !to || fromId === toId) return;
    const merged = [...to.orders, ...from.orders];
    setTables(prev => prev.map(t => {
      if (t.id === toId) return { ...t, orders: merged };
      if (t.id === fromId) return { ...t, orders: [], orderNote: '' };
      return t;
    }));
    if (useCloud) {
      updateDoc(doc(db, TABLES, toId), { orders: merged })
        .catch(err => console.warn('Αποτυχία μεταφοράς:', err));
      updateDoc(doc(db, TABLES, fromId), { orders: [], orderNote: '' })
        .catch(err => console.warn('Αποτυχία εκκαθάρισης πηγής:', err));
    }
  }

  // Μετά την αποστολή στην κουζίνα: ό,τι στάλθηκε θεωρείται «απεσταλμένο»
  // (sentQty = qty), ώστε η επόμενη αποστολή να στείλει μόνο τα νέα.
  function markOrdersSent(tableId, lineIds) {
    const idSet = new Set(lineIds);
    writeTableOrders(tableId, orders =>
      orders.map(o => idSet.has(o.lineId) ? { ...o, sentQty: o.qty } : o)
    );
  }

  function getTableTotal(tableId) {
    const t = tables.find(t => t.id === tableId);
    if (!t) return 0;
    return t.orders.reduce((sum, o) => sum + o.price * o.qty, 0);
  }

  // Πληρωμή επιλεγμένων ειδών: καταγράφει την πώληση στο ιστορικό
  // και αφαιρεί τα πληρωμένα είδη από το τραπέζι.
  function payItems(tableId, paidItems, { method, given = 0, change = 0 }) {
    const table = tables.find(t => t.id === tableId);
    const tableName = table ? table.name : '';
    const total = paidItems.reduce((sum, o) => sum + o.price * o.qty, 0);
    const paidIds = paidItems.map(o => o.lineId);

    const sale = {
      tableName,
      // category/options στο snapshot: τα Στατιστικά ομαδοποιούν ανά κατηγορία
      // χωρίς lookup στον κατάλογο (που μπορεί να έχει αλλάξει στο μεταξύ).
      items: paidItems.map(o => ({
        name: o.name, price: o.price, qty: o.qty,
        category: o.category || '',
        options: (o.options || []).map(x => x.name),
      })),
      total,
      method, // 'cash' | 'card'
      given,
      change,
      waiterName: table?.assignedTo || waiterName || '',
      paidAt: new Date().toISOString(),
    };

    if (useCloud) {
      addDoc(collection(db, SALES), sale).catch(err => console.warn('Αποτυχία καταγραφής πώλησης:', err));
    } else {
      setHistory(prev => [{ id: makeId('s'), ...sale }, ...prev]);
    }

    writeTableOrders(tableId, orders => orders.filter(o => !paidIds.includes(o.lineId)));
    return sale;
  }

  async function clearHistory() {
    if (useCloud) {
      try {
        const snap = await getDocs(collection(db, SALES));
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (err) {
        console.warn('Αποτυχία διαγραφής ιστορικού:', err);
      }
      return;
    }
    setHistory([]);
  }

  // ---- Κατάλογος (κοινός μέσω config/menu doc, ή τοπικά) ----
  // ΠΑΝΤΑ ενημερώνουμε και το τοπικό state: αλλιώς η επόμενη επεξεργασία
  // χτίζει πάνω σε παλιό menu μέχρι να γυρίσει το snapshot echo και
  // σβήνει σιωπηλά την προηγούμενη αλλαγή.
  function persistMenu(nextCategories) {
    setMenu(nextCategories);
    if (useCloud) {
      setDoc(doc(db, 'config', MENU_DOC_ID), { categories: nextCategories })
        .catch(err => console.warn('Αποτυχία αποθήκευσης καταλόγου:', err));
    }
  }

  function addMenuItem(categoryId, item) {
    const next = menu.map(cat => cat.id === categoryId
      ? { ...cat, items: [...cat.items, { ...item, id: makeId('custom_') }] }
      : cat);
    persistMenu(next);
  }

  // Επεξεργασία είδους: όνομα, τιμή, έξτρα επιλογές [{id, name, delta}].
  // Δεν αγγίζει ανοιχτούς λογαριασμούς/ιστορικό (denormalized snapshots).
  function updateMenuItem(categoryId, itemId, patch) {
    const next = menu.map(cat => cat.id === categoryId
      ? { ...cat, items: cat.items.map(i => i.id === itemId ? { ...i, ...patch } : i) }
      : cat);
    persistMenu(next);
  }

  function deleteMenuItem(categoryId, itemId) {
    const next = menu.map(cat => cat.id === categoryId
      ? { ...cat, items: cat.items.filter(i => i.id !== itemId) }
      : cat);
    persistMenu(next);
  }

  function addCategory(name, icon = '🍽️') {
    persistMenu([...menu, { id: makeId('cat_'), name, icon, items: [] }]);
  }

  function deleteCategory(categoryId) {
    persistMenu(menu.filter(c => c.id !== categoryId));
  }

  // Αναδιάταξη: η σειρά του πίνακα ΕΙΝΑΙ η σειρά εμφάνισης παντού
  // (κατάλογος, προσθήκη ειδών). dir: -1 πάνω, +1 κάτω.
  function moveCategory(categoryId, dir) {
    const idx = menu.findIndex(c => c.id === categoryId);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= menu.length) return;
    const next = [...menu];
    [next[idx], next[to]] = [next[to], next[idx]];
    persistMenu(next);
  }

  function moveMenuItem(categoryId, itemId, dir) {
    const next = menu.map(cat => {
      if (cat.id !== categoryId) return cat;
      const idx = cat.items.findIndex(i => i.id === itemId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= cat.items.length) return cat;
      const items = [...cat.items];
      [items[idx], items[to]] = [items[to], items[idx]];
      return { ...cat, items };
    });
    persistMenu(next);
  }

  return (
    <AppContext.Provider value={{
      tables, menu, history, role, setRole, loaded,
      waiterName, setWaiterName, cloudEnabled: useCloud,
      onDuty, startShift, endShift,
      settings, saveSettings, adminUnlocked, unlockAdmin,
      addTable, removeTable, clearTable, assignTable, transferOrders,
      addItemToTable, removeItemFromTable, incrementOrderItem, deleteOrderItem,
      setOrderNote, setTableOrderNote, markOrdersSent,
      getTableTotal, payItems, clearHistory,
      addMenuItem, updateMenuItem, deleteMenuItem,
      addCategory, deleteCategory, moveCategory, moveMenuItem,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
