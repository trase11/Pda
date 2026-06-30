import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MENU } from '../data/menuData';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState(MENU);
  const [history, setHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (loaded) save();
  }, [tables, menu, history]);

  async function load() {
    try {
      const t = await AsyncStorage.getItem('tables');
      const m = await AsyncStorage.getItem('menu');
      const h = await AsyncStorage.getItem('history');
      if (t) setTables(JSON.parse(t));
      if (m) setMenu(JSON.parse(m));
      if (h) setHistory(JSON.parse(h));
    } catch {}
    setLoaded(true);
  }

  async function save() {
    try {
      await AsyncStorage.setItem('tables', JSON.stringify(tables));
      await AsyncStorage.setItem('menu', JSON.stringify(menu));
      await AsyncStorage.setItem('history', JSON.stringify(history));
    } catch {}
  }

  function addTable(name) {
    const t = { id: Date.now().toString(), name, orders: [], createdAt: new Date().toISOString() };
    setTables(prev => [...prev, t]);
    return t.id;
  }

  function removeTable(id) {
    setTables(prev => prev.filter(t => t.id !== id));
  }

  function clearTable(id) {
    setTables(prev => prev.map(t => t.id === id ? { ...t, orders: [], createdAt: new Date().toISOString() } : t));
  }

  function addItemToTable(tableId, item, categoryName) {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const existing = t.orders.find(o => o.itemId === item.id);
      if (existing) {
        return { ...t, orders: t.orders.map(o => o.itemId === item.id ? { ...o, qty: o.qty + 1 } : o) };
      }
      return { ...t, orders: [...t.orders, { itemId: item.id, name: item.name, price: item.price, qty: 1, category: categoryName }] };
    }));
  }

  function removeItemFromTable(tableId, itemId) {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const updated = t.orders.map(o => o.itemId === itemId ? { ...o, qty: o.qty - 1 } : o).filter(o => o.qty > 0);
      return { ...t, orders: updated };
    }));
  }

  function incrementOrderItem(tableId, itemId) {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return { ...t, orders: t.orders.map(o => o.itemId === itemId ? { ...o, qty: o.qty + 1 } : o) };
    }));
  }

  function deleteOrderItem(tableId, itemId) {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return { ...t, orders: t.orders.filter(o => o.itemId !== itemId) };
    }));
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

    const sale = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tableName,
      items: paidItems.map(o => ({ name: o.name, price: o.price, qty: o.qty })),
      total,
      method, // 'cash' | 'card'
      given,
      change,
      paidAt: new Date().toISOString(),
    };
    setHistory(prev => [sale, ...prev]);

    const paidIds = paidItems.map(o => o.itemId);
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return { ...t, orders: t.orders.filter(o => !paidIds.includes(o.itemId)) };
    }));
    return sale;
  }

  function clearHistory() {
    setHistory([]);
  }

  function addMenuItem(categoryId, item) {
    setMenu(prev => prev.map(cat => cat.id === categoryId ? { ...cat, items: [...cat.items, { ...item, id: `custom_${Date.now()}` }] } : cat));
  }

  function updateMenuItemPrice(categoryId, itemId, newPrice) {
    setMenu(prev => prev.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.map(i => i.id === itemId ? { ...i, price: newPrice } : i) } : cat));
  }

  function deleteMenuItem(categoryId, itemId) {
    setMenu(prev => prev.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.filter(i => i.id !== itemId) } : cat));
  }

  return (
    <AppContext.Provider value={{
      tables, menu, history, addTable, removeTable, clearTable,
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
