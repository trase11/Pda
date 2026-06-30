import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db, firebaseEnabled } from '../firebase';

const KitchenContext = createContext();

const ORDERS = 'kitchenOrders';

export function KitchenProvider({ children }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!firebaseEnabled || !db) return;
    const q = query(collection(db, ORDERS), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrders(list);
      },
      err => console.warn('Kitchen sync error:', err)
    );
    return unsub;
  }, []);

  // Ο σερβιτόρος στέλνει τα φαγητά ενός τραπεζιού στην κουζίνα.
  async function sendToKitchen(tableName, items) {
    if (!firebaseEnabled || !db) return;
    await addDoc(collection(db, ORDERS), {
      tableName,
      items: items.map(i => ({ name: i.name, qty: i.qty })),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  }

  // Η κουζίνα δηλώνει ότι το φαγητό είναι έτοιμο.
  async function markReady(id) {
    if (!firebaseEnabled || !db) return;
    await updateDoc(doc(db, ORDERS, id), { status: 'ready', readyAt: serverTimestamp() });
  }

  // Ο σερβιτόρος το σερβίρει και το διαγράφει.
  async function markServed(id) {
    if (!firebaseEnabled || !db) return;
    await deleteDoc(doc(db, ORDERS, id));
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <KitchenContext.Provider value={{
      firebaseEnabled,
      orders, pendingOrders, readyOrders,
      sendToKitchen, markReady, markServed,
    }}>
      {children}
    </KitchenContext.Provider>
  );
}

export function useKitchen() {
  return useContext(KitchenContext);
}
