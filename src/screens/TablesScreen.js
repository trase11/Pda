import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  StyleSheet, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useKitchen } from '../context/KitchenContext';
import { confirmAction } from '../utils/confirm';
import { C, HIT_SLOP } from '../theme';

const FILTERS = [
  { key: 'mine', label: 'Δικά μου' },
  { key: 'all', label: 'Όλα' },
  { key: 'free', label: 'Ελεύθερα' },
  { key: 'busy', label: 'Με παραγγελία' },
];

export default function TablesScreen({ navigation }) {
  const { tables, addTable, removeTable, getTableTotal, assignTable, waiterName, settings } = useApp();
  const { pendingOrders } = useKitchen();
  const [modalVisible, setModalVisible] = useState(false);
  const [tableName, setTableName] = useState('');
  const [tableZone, setTableZone] = useState('');
  const [filter, setFilter] = useState('mine'); // 'mine' | 'all' | 'free' | 'busy'
  const [assignTarget, setAssignTarget] = useState(null); // table being (re)assigned
  const [assignName, setAssignName] = useState('');
  const [assignZone, setAssignZone] = useState('');
  const zoneInputRef = useRef(null);

  // Τικ κάθε 30" για το badge καθυστέρησης κουζίνας.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Πόσα λεπτά περιμένει το ΠΑΛΑΙΟΤΕΡΟ pending δελτίο του τραπεζιού.
  // Πάνω από settings.waitAlertMin το τραπέζι σημαίνεται κόκκινο στον
  // σερβιτόρο (0 = απενεργοποιημένο). Δελτία δρομολογούνται με tableId.
  function oldestPendingMins(tableId) {
    let oldest = 0;
    pendingOrders.forEach(o => {
      if (o.tableId !== tableId || !o.createdAt) return;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const mins = Math.floor((now - d.getTime()) / 60000);
      if (mins > oldest) oldest = mins;
    });
    return oldest;
  }

  const counts = {
    mine: tables.filter(t => (t.assignedTo || '') === waiterName).length,
    all: tables.length,
    free: tables.filter(t => t.orders.length === 0).length,
    busy: tables.filter(t => t.orders.length > 0).length,
  };

  const visibleTables = tables.filter(t => {
    if (filter === 'mine') return (t.assignedTo || '') === waiterName;
    if (filter === 'free') return t.orders.length === 0;
    if (filter === 'busy') return t.orders.length > 0;
    return true;
  });

  function handleAdd() {
    const name = tableName.trim();
    if (!name) return;
    addTable(name, { zone: tableZone.trim(), assignedTo: waiterName });
    setTableName('');
    setTableZone('');
    setModalVisible(false);
  }

  function openAssign(table) {
    setAssignTarget(table);
    setAssignName(table.assignedTo || '');
    setAssignZone(table.zone || '');
  }

  function saveAssign() {
    if (!assignTarget) return;
    assignTable(assignTarget.id, { assignedTo: assignName.trim(), zone: assignZone.trim() });
    setAssignTarget(null);
  }

  function handleDelete(table) {
    confirmAction(
      `Κλείσιμο τραπεζιού "${table.name}"`,
      'Θέλεις σίγουρα να κλείσεις αυτό το τραπέζι; Η παραγγελία θα χαθεί.',
      () => removeTable(table.id),
      'Κλείσιμο'
    );
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.headerTitle}>Τραπέζια</Text>
          <Text style={s.headerName}>👤 {waiterName}</Text>
        </View>
        <View style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={[s.filterBtn, filter === f.key && s.filterBtnOn]} onPress={() => setFilter(f.key)}>
              <Text style={[s.filterText, filter === f.key && s.filterTextOn]}>{f.label} ({counts[f.key]})</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {visibleTables.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🪑</Text>
          <Text style={s.emptyText}>
            {filter === 'mine' ? 'Δεν έχεις τραπέζια στο πόστο σου'
              : filter === 'free' ? 'Κανένα ελεύθερο τραπέζι'
              : filter === 'busy' ? 'Καμία ανοιχτή παραγγελία'
              : 'Δεν υπάρχουν ανοιχτά τραπέζια'}
          </Text>
          <Text style={s.emptyHint}>Πάτα το + για να ανοίξεις νέο</Text>
        </View>
      ) : (
        <FlatList
          data={visibleTables}
          keyExtractor={t => t.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const total = getTableTotal(item.id);
            const itemCount = item.orders.reduce((sum, o) => sum + o.qty, 0);
            const waitMins = settings.waitAlertMin > 0 ? oldestPendingMins(item.id) : 0;
            const lateKitchen = settings.waitAlertMin > 0 && waitMins >= settings.waitAlertMin;
            return (
              <TouchableOpacity style={[s.card, lateKitchen && s.cardLate]} onPress={() => navigation.navigate('TableDetail', { tableId: item.id })} activeOpacity={0.8}>
                <View style={s.cardLeft}>
                  <View style={s.cardNameRow}>
                    <Text style={s.cardName}>{item.name}</Text>
                    {!!item.zone && <Text style={s.zoneBadge}>{item.zone}</Text>}
                    {lateKitchen && <Text style={s.lateBadge}>⏱ κουζίνα {waitMins}′</Text>}
                  </View>
                  <Text style={s.cardTime}>Από {formatTime(item.createdAt)}</Text>
                  <Text style={s.cardItems}>{itemCount > 0 ? `${itemCount} αντικείμενα` : 'Κενή παραγγελία'}</Text>
                  <TouchableOpacity style={s.assignChip} onPress={() => openAssign(item)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel={`Ανάθεση τραπεζιού ${item.name}`}>
                    <Text style={s.assignChipText}>👤 {item.assignedTo || 'Χωρίς σερβιτόρο'}  ✎</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.cardRight}>
                  <Text style={s.cardTotal}>{total.toFixed(2)}€</Text>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel={`Κλείσιμο τραπεζιού ${item.name}`}>
                    <Text style={s.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={s.fab} onPress={() => setModalVisible(true)} accessibilityRole="button" accessibilityLabel="Νέο τραπέζι">
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Νέο τραπέζι */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Νέο Τραπέζι</Text>
            <TextInput
              style={s.input}
              placeholder="Όνομα π.χ. Τραπέζι 1, Μπαρ..."
              placeholderTextColor={C.placeholder}
              value={tableName}
              onChangeText={setTableName}
              autoFocus
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => zoneInputRef.current?.focus()}
            />
            <TextInput
              ref={zoneInputRef}
              style={s.input}
              placeholder="Ζώνη/πόστο (προαιρετικό) π.χ. Βεράντα"
              placeholderTextColor={C.placeholder}
              value={tableZone}
              onChangeText={setTableZone}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setModalVisible(false); setTableName(''); setTableZone(''); }}>
                <Text style={s.cancelBtnText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, !tableName.trim() && s.disabled]} onPress={handleAdd} disabled={!tableName.trim()}>
                <Text style={s.confirmBtnText}>Άνοιγμα</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ανάθεση τραπεζιού */}
      <Modal visible={!!assignTarget} transparent animationType="slide" onRequestClose={() => setAssignTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Ανάθεση — {assignTarget?.name}</Text>
            <Text style={s.assignLabel}>Σερβιτόρος</Text>
            <View style={s.quickRow}>
              <TouchableOpacity style={s.quickBtn} onPress={() => setAssignName(waiterName)}>
                <Text style={s.quickBtnText}>Εγώ ({waiterName})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickBtn} onPress={() => setAssignName('')}>
                <Text style={s.quickBtnText}>Κανένας</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.input}
              placeholder="Όνομα σερβιτόρου"
              placeholderTextColor={C.placeholder}
              value={assignName}
              onChangeText={setAssignName}
            />
            <Text style={s.assignLabel}>Ζώνη/πόστο</Text>
            <TextInput
              style={s.input}
              placeholder="π.χ. Βεράντα, Μπαρ, Εσωτερικό"
              placeholderTextColor={C.placeholder}
              value={assignZone}
              onChangeText={setAssignZone}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setAssignTarget(null)}>
                <Text style={s.cancelBtnText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={saveAssign}>
                <Text style={s.confirmBtnText}>Αποθήκευση</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text },
  headerName: { fontSize: 14, color: C.accent, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterBtn: { backgroundColor: C.card, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  filterBtnOn: { backgroundColor: C.accentBg, borderColor: C.accent },
  filterText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  filterTextOn: { color: C.accent },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, color: C.sub, fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 14, color: C.placeholder },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  cardLate: { borderColor: C.red, borderWidth: 2 },
  cardLeft: { flex: 1, gap: 2 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 20, fontWeight: '700', color: C.text },
  zoneBadge: { fontSize: 11, color: C.blue, backgroundColor: C.blueBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden', fontWeight: '700' },
  lateBadge: { fontSize: 11, color: C.red, backgroundColor: C.redBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden', fontWeight: '700' },
  cardTime: { fontSize: 13, color: C.muted, marginTop: 4 },
  cardItems: { fontSize: 13, color: C.green, marginTop: 2 },
  assignChip: { marginTop: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 8, marginLeft: -8 },
  assignChipText: { fontSize: 12, color: C.muted },
  cardRight: { alignItems: 'flex-end', gap: 10 },
  cardTotal: { fontSize: 24, fontWeight: '800', color: C.green, fontVariant: ['tabular-nums'] },
  deleteBtn: { backgroundColor: C.redBg, borderRadius: 8, padding: 6, paddingHorizontal: 10 },
  deleteBtnText: { color: C.red, fontSize: 14, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    backgroundColor: C.accent, width: 60, height: 60,
    borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontSize: 30, color: C.accentText, fontWeight: '700', marginTop: -2 },
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  assignLabel: { color: C.muted, fontSize: 13, fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, backgroundColor: C.field, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  quickBtnText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: C.field, borderRadius: 12, padding: 16,
    fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border,
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: C.field, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  cancelBtnText: { color: C.muted, fontSize: 16, fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmBtnText: { color: C.accentText, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
