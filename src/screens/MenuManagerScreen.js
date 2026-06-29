import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  StyleSheet, SafeAreaView, StatusBar, SectionList,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';

export default function MenuManagerScreen() {
  const { menu, addMenuItem, updateMenuItemPrice, deleteMenuItem } = useApp();
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [selectedCat, setSelectedCat] = useState(menu[0]?.id ?? '');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  function handleAdd() {
    const name = newName.trim();
    const price = parseFloat(newPrice.replace(',', '.'));
    if (!name || isNaN(price) || price <= 0) return;
    addMenuItem(selectedCat, { name, price });
    setNewName('');
    setNewPrice('');
    setAddModal(false);
  }

  function handleEditPrice() {
    if (!editModal) return;
    const price = parseFloat(newPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) return;
    updateMenuItemPrice(editModal.catId, editModal.itemId, price);
    setEditModal(null);
    setNewPrice('');
  }

  function handleDelete(catId, item) {
    confirmAction(
      `Διαγραφή "${item.name}"`,
      'Σίγουρα;',
      () => deleteMenuItem(catId, item.id),
      'Διαγραφή'
    );
  }

  const sections = menu.map(cat => ({ title: cat.name, icon: cat.icon, catId: cat.id, data: cat.items }));

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Διαχείριση Menu</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={s.sectionHeader}>{section.icon} {section.title}</Text>
        )}
        renderItem={({ item, section }) => (
          <View style={s.row}>
            <View style={s.rowInfo}>
              <Text style={s.rowName}>{item.name}</Text>
              <Text style={s.rowPrice}>{item.price.toFixed(2)}€</Text>
            </View>
            <TouchableOpacity style={s.editBtn} onPress={() => { setEditModal({ catId: section.catId, itemId: item.id, name: item.name }); setNewPrice(item.price.toString()); }}>
              <Text style={s.editBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(section.catId, item)}>
              <Text style={s.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => setAddModal(true)}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Νέο Προϊόν</Text>
            <Text style={s.label}>Κατηγορία</Text>
            <FlatList
              data={menu}
              keyExtractor={c => c.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={[s.catChip, selectedCat === item.id && s.catChipActive]} onPress={() => setSelectedCat(item.id)}>
                  <Text style={[s.catChipText, selectedCat === item.id && s.catChipTextActive]}>{item.icon} {item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <Text style={s.label}>Όνομα</Text>
            <TextInput style={s.input} placeholder="Όνομα προϊόντος" placeholderTextColor="#666" value={newName} onChangeText={setNewName} />
            <Text style={s.label}>Τιμή (€)</Text>
            <TextInput style={s.input} placeholder="0.00" placeholderTextColor="#666" value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setAddModal(false); setNewName(''); setNewPrice(''); }}>
                <Text style={s.cancelBtnText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleAdd}>
                <Text style={s.confirmBtnText}>Προσθήκη</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!editModal} transparent animationType="slide" onRequestClose={() => setEditModal(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Αλλαγή τιμής</Text>
            <Text style={s.editItemName}>{editModal?.name}</Text>
            <TextInput style={s.input} placeholder="Νέα τιμή" placeholderTextColor="#666" value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" autoFocus />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditModal(null); setNewPrice(''); }}>
                <Text style={s.cancelBtnText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleEditPrice}>
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
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#2d2d4e' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  list: { padding: 16, gap: 6 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#888', marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  row: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#2d2d4e',
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  rowPrice: { fontSize: 14, color: '#4ecca3', marginTop: 2, fontWeight: '700' },
  editBtn: { padding: 6 },
  editBtnText: { fontSize: 16 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 16 },
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    backgroundColor: '#4ecca3', width: 60, height: 60,
    borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4ecca3', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontSize: 30, color: '#1a1a2e', fontWeight: '700', marginTop: -2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  label: { fontSize: 13, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#2d2d4e' },
  editItemName: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: '#2d2d4e', borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelBtnText: { color: '#aaa', fontSize: 16, fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: '#4ecca3', borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
  catChip: { backgroundColor: '#2d2d4e', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#3d3d5e' },
  catChipActive: { backgroundColor: '#1a3a2e', borderColor: '#4ecca3' },
  catChipText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  catChipTextActive: { color: '#4ecca3' },
});
