import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';

export default function TablesScreen({ navigation }) {
  const { tables, addTable, removeTable, getTableTotal, assignTable, waiterName } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [tableName, setTableName] = useState('');
  const [tableZone, setTableZone] = useState('');
  const [filter, setFilter] = useState('mine'); // 'mine' | 'all'
  const [assignTarget, setAssignTarget] = useState(null); // table being (re)assigned
  const [assignName, setAssignName] = useState('');
  const [assignZone, setAssignZone] = useState('');

  const visibleTables = filter === 'mine'
    ? tables.filter(t => (t.assignedTo || '') === waiterName)
    : tables;

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
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.headerTitle}>Τραπέζια</Text>
          <Text style={s.headerName}>👤 {waiterName}</Text>
        </View>
        <View style={s.filterRow}>
          <TouchableOpacity style={[s.filterBtn, filter === 'mine' && s.filterBtnOn]} onPress={() => setFilter('mine')}>
            <Text style={[s.filterText, filter === 'mine' && s.filterTextOn]}>Τα δικά μου ({tables.filter(t => (t.assignedTo || '') === waiterName).length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.filterBtn, filter === 'all' && s.filterBtnOn]} onPress={() => setFilter('all')}>
            <Text style={[s.filterText, filter === 'all' && s.filterTextOn]}>Όλα ({tables.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {visibleTables.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🪑</Text>
          <Text style={s.emptyText}>{filter === 'mine' ? 'Δεν έχεις τραπέζια στο πόστο σου' : 'Δεν υπάρχουν ανοιχτά τραπέζια'}</Text>
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
            return (
              <TouchableOpacity style={s.card} onPress={() => navigation.navigate('TableDetail', { tableId: item.id })} activeOpacity={0.8}>
                <View style={s.cardLeft}>
                  <View style={s.cardNameRow}>
                    <Text style={s.cardName}>{item.name}</Text>
                    {!!item.zone && <Text style={s.zoneBadge}>{item.zone}</Text>}
                  </View>
                  <Text style={s.cardTime}>Από {formatTime(item.createdAt)}</Text>
                  <Text style={s.cardItems}>{itemCount > 0 ? `${itemCount} αντικείμενα` : 'Κενή παραγγελία'}</Text>
                  <TouchableOpacity style={s.assignChip} onPress={() => openAssign(item)}>
                    <Text style={s.assignChipText}>👤 {item.assignedTo || 'Χωρίς σερβιτόρο'}  ✎</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.cardRight}>
                  <Text style={s.cardTotal}>{total.toFixed(2)}€</Text>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)}>
                    <Text style={s.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={s.fab} onPress={() => setModalVisible(true)}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Νέο τραπέζι */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Νέο Τραπέζι</Text>
            <TextInput
              style={s.input}
              placeholder="Όνομα π.χ. Τραπέζι 1, Μπαρ..."
              placeholderTextColor="#666"
              value={tableName}
              onChangeText={setTableName}
              autoFocus
              onSubmitEditing={handleAdd}
            />
            <TextInput
              style={s.input}
              placeholder="Ζώνη/πόστο (προαιρετικό) π.χ. Βεράντα"
              placeholderTextColor="#666"
              value={tableZone}
              onChangeText={setTableZone}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setModalVisible(false); setTableName(''); setTableZone(''); }}>
                <Text style={s.cancelBtnText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, !tableName.trim() && s.disabled]} onPress={handleAdd}>
                <Text style={s.confirmBtnText}>Άνοιγμα</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ανάθεση τραπεζιού */}
      <Modal visible={!!assignTarget} transparent animationType="slide" onRequestClose={() => setAssignTarget(null)}>
        <View style={s.overlay}>
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
              placeholderTextColor="#666"
              value={assignName}
              onChangeText={setAssignName}
            />
            <Text style={s.assignLabel}>Ζώνη/πόστο</Text>
            <TextInput
              style={s.input}
              placeholder="π.χ. Βεράντα, Μπαρ, Εσωτερικό"
              placeholderTextColor="#666"
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#2d2d4e', gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerName: { fontSize: 14, color: '#4ecca3', fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { flex: 1, backgroundColor: '#16213e', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2d2d4e' },
  filterBtnOn: { backgroundColor: '#1a3a2e', borderColor: '#4ecca3' },
  filterText: { color: '#888', fontSize: 13, fontWeight: '600' },
  filterTextOn: { color: '#4ecca3' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, color: '#aaa', fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 14, color: '#666' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#16213e', borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#2d2d4e',
  },
  cardLeft: { flex: 1, gap: 2 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  zoneBadge: { fontSize: 11, color: '#6ea8fe', backgroundColor: '#1a2f4e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden', fontWeight: '700' },
  cardTime: { fontSize: 13, color: '#888', marginTop: 4 },
  cardItems: { fontSize: 13, color: '#4ecca3', marginTop: 2 },
  assignChip: { marginTop: 6, alignSelf: 'flex-start' },
  assignChipText: { fontSize: 12, color: '#aaa' },
  cardRight: { alignItems: 'flex-end', gap: 10 },
  cardTotal: { fontSize: 24, fontWeight: '800', color: '#4ecca3' },
  deleteBtn: { backgroundColor: '#3d1a1a', borderRadius: 8, padding: 6, paddingHorizontal: 10 },
  deleteBtnText: { color: '#e74c3c', fontSize: 14, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    backgroundColor: '#4ecca3', width: 60, height: 60,
    borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4ecca3', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontSize: 30, color: '#1a1a2e', fontWeight: '700', marginTop: -2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  assignLabel: { color: '#888', fontSize: 13, fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2d2d4e' },
  quickBtnText: { color: '#4ecca3', fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#2d2d4e',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: '#2d2d4e', borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelBtnText: { color: '#aaa', fontSize: 16, fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: '#4ecca3', borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
