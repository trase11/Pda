import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useKitchen } from '../context/KitchenContext';
import { useTasks } from '../context/TasksContext';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';
import { beep, notify } from '../utils/notify';
import ShiftBar from '../components/ShiftBar';
import { C } from '../theme';

export default function RunnerScreen() {
  const { firebaseEnabled, readyOrders, markServed } = useKitchen();
  const { pendingTasks, completeTask } = useTasks();
  const { setRole, onDuty } = useApp();

  // Ήχος + οπτική ειδοποίηση όταν εμφανίζεται ΝΕΟ έτοιμο φαγητό ή ΝΕΑ δουλειά
  // — μόνο «σε βάρδια» (βλ. ShiftBar/AppContext). Συγκρίνουμε IDs, όχι πλήθος:
  // αν στο ίδιο snapshot ένα σερβιριστεί κι ένα νέο γίνει έτοιμο, το πλήθος
  // μένει ίδιο αλλά υπάρχει νέα ειδοποίηση. Τα prev IDs ενημερώνονται ΚΑΙ
  // εκτός βάρδιας, ώστε η έναρξη βάρδιας να μη σκάσει σωρευμένες ειδοποιήσεις.
  const prevReadyIds = useRef(null);
  const prevTaskIds = useRef(null);
  useEffect(() => {
    const ids = new Set(readyOrders.map(o => o.id));
    if (prevReadyIds.current && onDuty) {
      const fresh = readyOrders.filter(o => !prevReadyIds.current.has(o.id));
      if (fresh.length) {
        beep();
        notify('🔔 Έτοιμο πιάτο', fresh.map(o => o.tableName).join(', '));
      }
    }
    prevReadyIds.current = ids;
  }, [readyOrders, onDuty]);
  useEffect(() => {
    const ids = new Set(pendingTasks.map(t => t.id));
    if (prevTaskIds.current && onDuty) {
      const fresh = pendingTasks.filter(t => !prevTaskIds.current.has(t.id));
      if (fresh.length) {
        beep();
        notify('🧹 Νέα δουλειά', fresh.map(t => t.label).join(', '));
      }
    }
    prevTaskIds.current = ids;
  }, [pendingTasks, onDuty]);

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
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
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
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Βοηθός σέρβις</Text>
          <Text style={s.headerSub}>{readyOrders.length} έτοιμα · {pendingTasks.length} δουλειές</Text>
        </View>
        <TouchableOpacity onPress={handleChangeRole} style={s.roleBtn}>
          <Text style={s.roleBtnText}>Αλλαγή ρόλου</Text>
        </TouchableOpacity>
      </View>

      <ShiftBar hint="Μία φορά όταν ξεκινάς — αλλιώς δεν θα ακούς έτοιμα πιάτα και δουλειές." />

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
                    {!!o.orderNote && <Text style={s.cardOrderNote}>🗒 {o.orderNote}</Text>}
                    <View style={s.cardItems}>
                      {o.items.map((it, idx) => (
                        <View key={idx}>
                          <Text style={s.cardItemText}>
                            <Text style={s.cardQty}>{it.qty}× </Text>{it.name}
                          </Text>
                          {!!it.options?.length && <Text style={s.cardItemOptions}>➕ {it.options.join(', ')}</Text>}
                          {!!it.note && <Text style={s.cardItemNote}>📝 {it.note}</Text>}
                        </View>
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
  safe: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 14, color: C.muted, marginTop: 2 },
  roleBtn: { backgroundColor: C.card, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  roleBtnText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, color: C.sub, fontWeight: '600' },
  emptyHint: { fontSize: 14, color: C.placeholder, textAlign: 'center' },
  list: { padding: 16, gap: 18 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardReady: { backgroundColor: C.card, borderColor: C.green },
  cardTask: { backgroundColor: C.card, borderColor: C.blue },
  cardMain: { flex: 1, gap: 4 },
  cardTable: { fontSize: 20, fontWeight: '800', color: C.text },
  cardOrderNote: { fontSize: 13, color: C.orange, fontWeight: '700' },
  cardItems: { gap: 2, marginTop: 2 },
  cardItemText: { fontSize: 16, color: C.sub },
  cardItemOptions: { fontSize: 13, color: C.accent, marginLeft: 22 },
  cardItemNote: { fontSize: 13, color: C.orange, fontStyle: 'italic', marginLeft: 22 },
  cardQty: { fontWeight: '800', color: C.green },
  cardTime: { fontSize: 12, color: C.muted, marginTop: 4 },
  taskLabel: { fontSize: 19, fontWeight: '800', color: C.text },
  taskMeta: { fontSize: 13, color: C.muted },
  taskNote: { fontSize: 15, color: C.sub },
  doneBtnGreen: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  doneBtnBlue: { backgroundColor: C.blue, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  doneBtnText: { color: C.accentText, fontSize: 15, fontWeight: '800' },
});
