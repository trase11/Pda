import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDocs, writeBatch,
} from 'firebase/firestore';
import { db, firebaseEnabled } from '../firebase';
import { MENU } from '../data/menuData';

const AppContext = createContext();

// Όταν υπάρχει Firebase, όλα (τραπέζια, ιστορικό, κατάλογος) είναι κοινά
// σε πραγματικό χρόνο μεταξύ συσκευών. Αλλιώς, πέφτουμε σε τοπική
// αποθήκευση ανά συσκευή (AsyncStorage), όπως πριν.
const useCloud = firebaseEnabled && !!db;

const TABLES = 'tables';
const SALES = 'sales';
const MENU_DOC_ID = 'menu'; // config/menu -> { categories: [...] }

export function AppProvider({ children }) {
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState(MENU);
  const [history, setHistory] = useState([]);
  const [role, setRoleState] = useState(null); // null | 'waiter' | 'kitchen' | 'runner'
  const [waiterName, setWaiterNameState] = useState('');
  const [loaded, setLoaded] = useState(false);

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
          if (t) setTables(JSON.parse(t));
          if (m) setMenu(JSON.parse(m));
          if (h) setHistory(JSON.parse(h));
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
      snap => setTables(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
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
          setDoc(menuRef, { categories: MENU }).catch(() => {});
          setMenu(MENU);
        }
      },
      err => console.warn('Menu sync error:', err)
    );

    return () => { unsubTables(); unsubSales(); unsubMenu(); };
  }, []);

  // ---- Τοπική αποθήκευση (μόνο χωρίς Firebase) ----
  useEffect(() => {
    if (useCloud || !loaded) return;
    AsyncStorage.setItem('tables', JSON.stringify(tables)).catch(() => {});
    AsyncStorage.setItem('menu', JSON.stringify(menu)).catch(() => {});
    AsyncStorage.setItem('history', JSON.stringify(history)).catch(() => {});
  }, [tables, menu, history, loaded]);

  function setRole(r) {
    setRoleState(r);
    AsyncStorage.setItem('role', r ?? '').catch(() => {});
  }

  function setWaiterName(n) {
    setWaiterNameState(n);
    AsyncStorage.setItem('waiterName', n ?? '').catch(() => {});
  }

  // Βοηθός: γράφει τα νέα orders ενός τραπεζιού (cloud) ή ενημερώνει τοπικά.
  function writeTableOrders(tableId, updater) {
    setTables(prev => {
      const next = prev.map(t => (t.id === tableId ? { ...t, orders: updater(t.orders) } : t));
      if (useCloud) {
        const tbl = next.find(t => t.id === tableId);
        if (tbl) updateDoc(doc(db, TABLES, tableId), { orders: tbl.orders }).catch(() => {});
      }
      return next;
    });
  }

  function addTable(name, extra = {}) {
    const base = { name, orders: [], createdAt: new Date().toISOString(), zone: '', assignedTo: '', ...extra };
    if (useCloud) {
      addDoc(collection(db, TABLES), base).catch(() => {});
      return null;
    }
    const id = Date.now().toString();
    setTables(prev => [...prev, { id, ...base }]);
    return id;
  }

  function removeTable(id) {
    if (useCloud) { deleteDoc(doc(db, TABLES, id)).catch(() => {}); return; }
    setTables(prev => prev.filter(t => t.id !== id));
  }

  function clearTable(id) {
    if (useCloud) {
      updateDoc(doc(db, TABLES, id), { orders: [], createdAt: new Date().toISOString() }).catch(() => {});
      return;
    }
    setTables(prev => prev.map(t => t.id === id ? { ...t, orders: [], createdAt: new Date().toISOString() } : t));
  }

  // Ανάθεση τραπεζιού σε σερβιτόρο / ζώνη (Φάση 2).
  function assignTable(id, { assignedTo, zone }) {
    const patch = {};
    if (assignedTo !== undefined) patch.assignedTo = assignedTo;
    if (zone !== undefined) patch.zone = zone;
    if (useCloud) { updateDoc(doc(db, TABLES, id), patch).catch(() => {}); return; }
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }

  function addItemToTable(tableId, item, categoryName) {
    writeTableOrders(tableId, orders => {
      const existing = orders.find(o => o.itemId === item.id);
      if (existing) {
        return orders.map(o => o.itemId === item.id ? { ...o, qty: o.qty + 1 } : o);
      }
      return [...orders, { itemId: item.id, name: item.name, price: item.price, qty: 1, category: categoryName }];
    });
  }

  function removeItemFromTable(tableId, itemId) {
    writeTableOrders(tableId, orders =>
      orders.map(o => o.itemId === itemId ? { ...o, qty: o.qty - 1 } : o).filter(o => o.qty > 0)
    );
  }

  function incrementOrderItem(tableId, itemId) {
    writeTableOrders(tableId, orders =>
      orders.map(o => o.itemId === itemId ? { ...o, qty: o.qty + 1 } : o)
    );
  }

  function deleteOrderItem(tableId, itemId) {
    writeTableOrders(tableId, orders => orders.filter(o => o.itemId !== itemId));
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
    const paidIds = paidItems.map(o => o.itemId);

    const sale = {
      tableName,
      items: paidItems.map(o => ({ name: o.name, price: o.price, qty: o.qty })),
      total,
      method, // 'cash' | 'card'
      given,
      change,
      waiterName: table?.assignedTo || waiterName || '',
      paidAt: new Date().toISOString(),
    };

    if (useCloud) {
      addDoc(collection(db, SALES), sale).catch(() => {});
    } else {
      setHistory(prev => [{ id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, ...sale }, ...prev]);
    }

    writeTableOrders(tableId, orders => orders.filter(o => !paidIds.includes(o.itemId)));
    return sale;
  }

  async function clearHistory() {
    if (useCloud) {
      try {
        const snap = await getDocs(collection(db, SALES));
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch {}
      return;
    }
    setHistory([]);
  }

  // ---- Κατάλογος (κοινός μέσω config/menu doc, ή τοπικά) ----
  function persistMenu(nextCategories) {
    if (useCloud) {
      setDoc(doc(db, 'config', MENU_DOC_ID), { categories: nextCategories }).catch(() => {});
    } else {
      setMenu(nextCategories);
    }
  }

  function addMenuItem(categoryId, item) {
    const next = menu.map(cat => cat.id === categoryId
      ? { ...cat, items: [...cat.items, { ...item, id: `custom_${Date.now()}` }] }
      : cat);
    persistMenu(next);
  }

  function updateMenuItemPrice(categoryId, itemId, newPrice) {
    const next = menu.map(cat => cat.id === categoryId
      ? { ...cat, items: cat.items.map(i => i.id === itemId ? { ...i, price: newPrice } : i) }
      : cat);
    persistMenu(next);
  }

  function deleteMenuItem(categoryId, itemId) {
    const next = menu.map(cat => cat.id === categoryId
      ? { ...cat, items: cat.items.filter(i => i.id !== itemId) }
      : cat);
    persistMenu(next);
  }

  return (
    <AppContext.Provider value={{
      tables, menu, history, role, setRole, loaded,
      waiterName, setWaiterName, cloudEnabled: useCloud,
      addTable, removeTable, clearTable, assignTable,
      addItemToTable, removeItemFromTable, incrementOrderItem, deleteOrderItem,
      getTableTotal, payItems, clearHistory,
      addMenuItem, updateMenuItemPrice, deleteMenuItem,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
