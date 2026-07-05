import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db, firebaseEnabled } from '../firebase';

const TasksContext = createContext();

const TASKS = 'tasks';

// Προκαθορισμένες γρήγορες δουλειές προς τους βοηθούς σέρβις.
export const TASK_PRESETS = ['Ποτήρια', 'Πάγος', 'Καθαρισμός', 'Μαχαιροπίρουνα', 'Χαρτοπετσέτες', 'Άδειασμα'];

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!firebaseEnabled || !db) return;
    const q = query(collection(db, TASKS), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.warn('Tasks sync error:', err)
    );
    return unsub;
  }, []);

  // Ο σερβιτόρος στέλνει μια δουλειά στους βοηθούς.
  async function createTask({ label, note = '', tableName = '', createdBy = '' }) {
    if (!firebaseEnabled || !db) return;
    await addDoc(collection(db, TASKS), {
      label, note, tableName, createdBy,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  }

  // Ο βοηθός δηλώνει ότι η δουλειά έγινε (και διαγράφεται).
  async function completeTask(id) {
    if (!firebaseEnabled || !db) return;
    await deleteDoc(doc(db, TASKS, id));
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  return (
    <TasksContext.Provider value={{ tasks, pendingTasks, createTask, completeTask }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  return useContext(TasksContext);
}
