import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useKitchen } from '../context/KitchenContext';
import { useTasks } from '../context/TasksContext';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';
import { beep } from '../utils/notify';

export default function RunnerScreen() {
  const { firebaseEnabled, readyOrders, markServed } = useKitchen();
  const { pendingTasks, completeTask } = useTasks();
  const { setRole } = useApp();

  // Ήχος όταν εμφανίζεται ΝΕΟ έτοιμο φαγητό ή ΝΕΑ δουλειά.
  const prevReady = useRef(0);
  const prevTasks = useRef(0);
  useEffect(() => {
    if (readyOrders.length > prevReady.current) beep();
    prevReady.current = readyOrders.length;
  }, [readyOrders.length]);
  useEffect(() => {
    if (pendingTasks.length > prevTasks.current) beep();
    prevTasks.current = pendingTasks.length;
  }, [pendingTasks.length]);

  function handleChangeRole() {
    confirmAction('Αλλαγή ρόλου', 'Να επιστρέψεις στην επιλογή ρόλου;', () => setRole(null), 'Αλλαγή');
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  }

  if (!firebaseEnabled) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={s.header}>
          <Text style={s.headerTitle}>Βοηθός σέρβις</Text>
          <TouchableOpacity onPress={handleChangeRole} style={s.roleBtn}>
            <Text style={s.roleBtnText}>Αλλαγή ρόλου</Text>
          </TouchableOpacity>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyIcon}>⚙️</Text>
          <Text style={s.emptyText}>Δεν έχει ρυθμιστεί ακόμα</Text>
          <Text style={s.emptyHint}>Συμπλήρωσε τα στοιχεία Firebase για να ενεργοποιηθεί ο συγχρονισμός.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sections = [
    { key: 'ready', title: '🔔 Έτοιμα για σερβίρισμα', data: readyOrders, kind: 'ready' },
    { key: 'tasks', title: '🧹 Δουλειές', data: pendingTasks, kind: 'task' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Βοηθός σέρβις</Text>
          <Text style={s.headerSub}>{readyOrders.length} έτοιμα · {pendingTasks.length} δουλειές</Text>
        </View>
        <TouchableOpacity onPress={handleChangeRole} style={s.roleBtn}>
          <Text style={s.roleBtnText}>Αλλαγή ρόλου</Text>
        </TouchableOpacity>
      </View>

      {readyOrders.length === 0 && pendingTasks.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🏃</Text>
          <Text style={s.emptyText}>Όλα ήσυχα</Text>
          <Text style={s.emptyHint}>Θα ειδοποιηθείς με ήχο όταν υπάρχει έτοιμο φαγητό ή νέα δουλειά.</Text>
        </View>
      ) : (
        <FlatList
          data={sections.filter(sec => sec.data.length > 0)}
          keyExtractor={sec => sec.key}
          contentContainerStyle={s.list}
          renderItem={({ item: sec }) => (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{sec.title}</Text>
              {sec.kind === 'ready' && sec.data.map(o => (
                <View key={o.id} style={[s.card, s.cardReady]}>
                  <View style={s.cardMain}>
                    <Text style={s.cardTable}>{o.tableName}</Text>
                    <View style={s.cardItems}>
                      {o.items.map((it, idx) => (
                        <Text key={idx} style={s.cardItemText}>
                          <Text style={s.cardQty}>{it.qty}× </Text>{it.name}
                        </Text>
                      ))}
                    </View>
                    <Text style={s.cardTime}>Έτοιμο {formatTime(o.readyAt)}</Text>
                  </View>
                  <TouchableOpacity style={s.doneBtnGreen} onPress={() => markServed(o.id)}>
                    <Text style={s.doneBtnText}>Σερβιρίστηκε</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {sec.kind === 'task' && sec.data.map(t => (
                <View key={t.id} style={[s.card, s.cardTask]}>
                  <View style={s.cardMain}>
                    <Text style={s.taskLabel}>{t.label}</Text>
                    {!!t.tableName && <Text style={s.taskMeta}>📍 {t.tableName}</Text>}
                    {!!t.note && <Text style={s.taskNote}>{t.note}</Text>}
                    {!!t.createdBy && <Text style={s.taskMeta}>από {t.createdBy}</Text>}
                  </View>
                  <TouchableOpacity style={s.doneBtnBlue} onPress={() => completeTask(t.id)}>
                    <Text style={s.doneBtnText}>Έγινε</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#2d2d4e', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: '#888', marginTop: 2 },
  roleBtn: { backgroundColor: '#2d2d4e', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  roleBtnText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, color: '#aaa', fontWeight: '600' },
  emptyHint: { fontSize: 14, color: '#666', textAlign: 'center' },
  list: { padding: 16, gap: 18 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardReady: { backgroundColor: '#16213e', borderColor: '#4ecca3' },
  cardTask: { backgroundColor: '#16213e', borderColor: '#6ea8fe' },
  cardMain: { flex: 1, gap: 4 },
  cardTable: { fontSize: 20, fontWeight: '800', color: '#fff' },
  cardItems: { gap: 2, marginTop: 2 },
  cardItemText: { fontSize: 16, color: '#eee' },
  cardQty: { fontWeight: '800', color: '#4ecca3' },
  cardTime: { fontSize: 12, color: '#888', marginTop: 4 },
  taskLabel: { fontSize: 19, fontWeight: '800', color: '#fff' },
  taskMeta: { fontSize: 13, color: '#888' },
  taskNote: { fontSize: 15, color: '#cbd7ee' },
  doneBtnGreen: { backgroundColor: '#4ecca3', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  doneBtnBlue: { backgroundColor: '#6ea8fe', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  doneBtnText: { color: '#1a1a2e', fontSize: 15, fontWeight: '800' },
});
