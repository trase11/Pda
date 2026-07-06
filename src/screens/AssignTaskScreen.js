import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useTasks, TASK_PRESETS } from '../context/TasksContext';

export default function AssignTaskScreen() {
  const { tables, waiterName, cloudEnabled } = useApp();
  const { pendingTasks, createTask, completeTask } = useTasks();
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [tableName, setTableName] = useState('');
  const [sent, setSent] = useState(false);

  function send() {
    const l = label.trim();
    if (!l) return;
    createTask({ label: l, note: note.trim(), tableName: tableName.trim(), createdBy: waiterName });
    setLabel(''); setNote(''); setTableName('');
    setSent(true);
    setTimeout(() => setSent(false), 1500);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Δουλειές βοηθών</Text>
        <Text style={s.headerSub}>{pendingTasks.length} σε εξέλιξη</Text>
      </View>

      {!cloudEnabled && (
        <View style={s.warn}><Text style={s.warnText}>Χρειάζεται Firebase για να σταλούν δουλειές στους βοηθούς.</Text></View>
      )}

      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.sectionLabel}>Γρήγορη επιλογή</Text>
        <View style={s.presets}>
          {TASK_PRESETS.map(p => (
            <TouchableOpacity key={p} style={[s.preset, label === p && s.presetOn]} onPress={() => setLabel(p)}>
              <Text style={[s.presetText, label === p && s.presetTextOn]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Ή γράψε δική σου</Text>
        <TextInput
          style={s.input}
          placeholder="π.χ. Φέρε μενού στο 4"
          placeholderTextColor="#777"
          value={label}
          onChangeText={setLabel}
        />

        <Text style={s.sectionLabel}>Σημείωση (προαιρετικό)</Text>
        <TextInput
          style={s.input}
          placeholder="Λεπτομέρειες..."
          placeholderTextColor="#777"
          value={note}
          onChangeText={setNote}
        />

        <Text style={s.sectionLabel}>Τραπέζι/σημείο (προαιρετικό)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tableChips}>
          {tables.map(t => (
            <TouchableOpacity key={t.id} style={[s.chip, tableName === t.name && s.chipOn]} onPress={() => setTableName(tableName === t.name ? '' : t.name)}>
              <Text style={[s.chipText, tableName === t.name && s.chipTextOn]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={[s.sendBtn, !label.trim() && s.disabled]} onPress={send} disabled={!label.trim()}>
          <Text style={s.sendBtnText}>{sent ? '✓ Στάλθηκε!' : '📨 Στείλε στους βοηθούς'}</Text>
        </TouchableOpacity>

        {pendingTasks.length > 0 && (
          <View style={s.pendingBox}>
            <Text style={s.sectionLabel}>Σε εξέλιξη</Text>
            {pendingTasks.map(t => (
              <View key={t.id} style={s.pendingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.pendingLabel}>{t.label}{t.tableName ? ` · ${t.tableName}` : ''}</Text>
                  {!!t.note && <Text style={s.pendingNote}>{t.note}</Text>}
                </View>
                <TouchableOpacity style={s.cancelBtn} onPress={() => completeTask(t.id)}>
                  <Text style={s.cancelBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#2d2d4e' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: '#888', marginTop: 2 },
  warn: { backgroundColor: '#3a2a1a', padding: 12, margin: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e6a23c' },
  warnText: { color: '#e6a23c', fontSize: 13 },
  body: { padding: 16, gap: 10 },
  sectionLabel: { color: '#888', fontSize: 13, fontWeight: '700', marginTop: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { backgroundColor: '#16213e', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#2d2d4e' },
  presetOn: { backgroundColor: '#1a2f4e', borderColor: '#6ea8fe' },
  presetText: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  presetTextOn: { color: '#6ea8fe' },
  input: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#2d2d4e' },
  tableChips: { gap: 8, paddingVertical: 4 },
  chip: { backgroundColor: '#16213e', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: '#2d2d4e' },
  chipOn: { backgroundColor: '#1a2f4e', borderColor: '#6ea8fe' },
  chipText: { color: '#ccc', fontSize: 14 },
  chipTextOn: { color: '#6ea8fe', fontWeight: '700' },
  sendBtn: { backgroundColor: '#6ea8fe', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  sendBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  pendingBox: { marginTop: 16, gap: 8 },
  pendingRow: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#2d2d4e' },
  pendingLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  pendingNote: { color: '#888', fontSize: 13, marginTop: 2 },
  cancelBtn: { backgroundColor: '#3d1a1a', borderRadius: 8, padding: 8, paddingHorizontal: 12 },
  cancelBtnText: { color: '#e74c3c', fontSize: 14, fontWeight: '700' },
});
