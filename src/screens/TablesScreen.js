import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';

export default function TablesScreen({ navigation }) {
  const { tables, addTable, removeTable, getTableTotal } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [tableName, setTableName] = useState('');

  function handleAdd() {
    const name = tableName.trim();
    if (!name) return;
    addTable(name);
    setTableName('');
    setModalVisible(false);
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
        <Text style={s.headerTitle}>Τραπέζια</Text>
        <Text style={s.headerSub}>{tables.length} ανοιχτά</Text>
      </View>

      {tables.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🪑</Text>
          <Text style={s.emptyText}>Δεν υπάρχουν ανοιχτά τραπέζια</Text>
          <Text style={s.emptyHint}>Πάτα το + για να ανοίξεις νέο</Text>
        </View>
      ) : (
        <FlatList
          data={tables}
          keyExtractor={t => t.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const total = getTableTotal(item.id);
            const itemCount = item.orders.reduce((sum, o) => sum + o.qty, 0);
            return (
              <TouchableOpacity style={s.card} onPress={() => navigation.navigate('TableDetail', { tableId: item.id })} activeOpacity={0.8}>
                <View style={s.cardLeft}>
                  <Text style={s.cardName}>{item.name}</Text>
                  <Text style={s.cardTime}>Από {formatTime(item.createdAt)}</Text>
                  <Text style={s.cardItems}>{itemCount > 0 ? `${itemCount} αντικείμενα` : 'Κενή παραγγελία'}</Text>
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

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Νέο Τραπέζι</Text>
            <TextInput
              style={s.input}
              placeholder="π.χ. Τραπέζι 1, Βεράντα, Μπαρ..."
              placeholderTextColor="#666"
              value={tableName}
              onChangeText={setTableName}
              autoFocus
              onSubmitEditing={handleAdd}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setModalVisible(false); setTableName(''); }}>
                <Text style={s.cancelBtnText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, !tableName.trim() && s.disabled]} onPress={handleAdd}>
                <Text style={s.confirmBtnText}>Άνοιγμα</Text>
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
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#2d2d4e' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: '#888', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, color: '#aaa', fontWeight: '600' },
  emptyHint: { fontSize: 14, color: '#666' },
  card: {
    backgroundColor: '#16213e', borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#2d2d4e',
  },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  cardTime: { fontSize: 13, color: '#888', marginTop: 4 },
  cardItems: { fontSize: 13, color: '#4ecca3', marginTop: 2 },
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
  modal: { backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  input: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#2d2d4e',
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#2d2d4e', borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelBtnText: { color: '#aaa', fontSize: 16, fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: '#4ecca3', borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
