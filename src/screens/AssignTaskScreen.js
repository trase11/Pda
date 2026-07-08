import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useTasks, TASK_PRESETS } from '../context/TasksContext';
import { C } from '../theme';

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
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
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
          placeholderTextColor={C.placeholder}
          value={label}
          onChangeText={setLabel}
        />

        <Text style={s.sectionLabel}>Σημείωση (προαιρετικό)</Text>
        <TextInput
          style={s.input}
          placeholder="Λεπτομέρειες..."
          placeholderTextColor={C.placeholder}
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
  safe: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 14, color: C.muted, marginTop: 2 },
  warn: { backgroundColor: C.orangeBg, padding: 12, margin: 16, borderRadius: 10, borderWidth: 1, borderColor: C.orange },
  warnText: { color: C.orange, fontSize: 13 },
  body: { padding: 16, gap: 10 },
  sectionLabel: { color: C.muted, fontSize: 13, fontWeight: '700', marginTop: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { backgroundColor: C.card, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border },
  presetOn: { backgroundColor: C.blueBg, borderColor: C.blue },
  presetText: { color: C.sub, fontSize: 14, fontWeight: '600' },
  presetTextOn: { color: C.blue },
  input: { backgroundColor: C.card, borderRadius: 12, padding: 14, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border },
  tableChips: { gap: 8, paddingVertical: 4 },
  chip: { backgroundColor: C.card, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.blueBg, borderColor: C.blue },
  chipText: { color: C.sub, fontSize: 14 },
  chipTextOn: { color: C.blue, fontWeight: '700' },
  sendBtn: { backgroundColor: C.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  sendBtnText: { color: C.accentText, fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  pendingBox: { marginTop: 16, gap: 8 },
  pendingRow: { backgroundColor: C.card, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border },
  pendingLabel: { color: C.text, fontSize: 15, fontWeight: '600' },
  pendingNote: { color: C.muted, fontSize: 13, marginTop: 2 },
  cancelBtn: { backgroundColor: C.redBg, borderRadius: 8, padding: 8, paddingHorizontal: 12 },
  cancelBtnText: { color: C.red, fontSize: 14, fontWeight: '700' },
});
