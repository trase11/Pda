import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  StyleSheet, SectionList, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';
import { C, HIT_SLOP } from '../theme';

// Περιεχόμενο-μόνο οθόνη: το header («Διαχείριση», αλλαγή ρόλου) το δίνει
// το ManageScreen που τη φιλοξενεί.
export default function MenuManagerScreen() {
  const {
    menu, addMenuItem, updateMenuItem, deleteMenuItem,
    addCategory, deleteCategory, moveCategory, moveMenuItem,
  } = useApp();

  const [addModal, setAddModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // { catId, item }
  const [selectedCat, setSelectedCat] = useState(menu[0]?.id ?? '');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  // Επεξεργασία είδους (όνομα/τιμή/έξτρα επιλογές)
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editOptions, setEditOptions] = useState([]); // [{id, name, delta}]
  const [optName, setOptName] = useState('');
  const [optDelta, setOptDelta] = useState('');

  function parsePrice(str) {
    // Ελληνικό decimal-pad: κόμμα αντί για τελεία.
    return parseFloat(String(str).replace(',', '.'));
  }

  function handleAdd() {
    const name = newName.trim();
    const price = parsePrice(newPrice);
    if (!name || isNaN(price) || price <= 0) return;
    addMenuItem(selectedCat, { name, price });
    setNewName('');
    setNewPrice('');
    setAddModal(false);
  }

  function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) return;
    addCategory(name, newCatIcon.trim() || '🍽️');
    setNewCatName('');
    setNewCatIcon('');
    setCatModal(false);
  }

  function handleDeleteCategory(cat) {
    confirmAction(
      `Διαγραφή κατηγορίας "${cat.name}"`,
      cat.items.length > 0
        ? `Θα διαγραφούν και τα ${cat.items.length} είδη της. Σίγουρα;`
        : 'Σίγουρα;',
      () => deleteCategory(cat.id),
      'Διαγραφή'
    );
  }

  function openEdit(catId, item) {
    setEditTarget({ catId, item });
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setEditOptions(item.options ? [...item.options] : []);
    setOptName('');
    setOptDelta('');
  }

  function addOption() {
    const name = optName.trim();
    const delta = parsePrice(optDelta);
    if (!name || isNaN(delta)) return;
    setEditOptions(prev => [...prev, { id: `opt_${Date.now()}_${prev.length}`, name, delta }]);
    setOptName('');
    setOptDelta('');
  }

  function handleSaveEdit() {
    if (!editTarget) return;
    const name = editName.trim();
    const price = parsePrice(editPrice);
    if (!name || isNaN(price) || price <= 0) return;
    updateMenuItem(editTarget.catId, editTarget.item.id, { name, price, options: editOptions });
    setEditTarget(null);
  }

  function handleDelete(catId, item) {
    confirmAction(
      `Διαγραφή "${item.name}"`,
      'Σίγουρα;',
      () => deleteMenuItem(catId, item.id),
      'Διαγραφή'
    );
  }

  const sections = menu.map(cat => ({
    title: cat.name, icon: cat.icon, catId: cat.id,
    itemCount: cat.items.length, data: cat.items, cat,
  }));

  return (
    <View style={s.container}>
      <View style={s.toolbar}>
        <TouchableOpacity style={s.toolbarBtn} onPress={() => setCatModal(true)} accessibilityRole="button" accessibilityLabel="Νέα κατηγορία">
          <Text style={s.toolbarBtnText}>+ Κατηγορία</Text>
        </TouchableOpacity>
        <Text style={s.toolbarHint}>Με ↑↓ αλλάζεις τη σειρά εμφάνισης</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionRow}>
            <Text style={s.sectionHeader}>{section.icon} {section.title}</Text>
            <View style={s.rowActions}>
              <TouchableOpacity hitSlop={HIT_SLOP} onPress={() => moveCategory(section.catId, -1)} accessibilityRole="button" accessibilityLabel={`Μετακίνηση ${section.title} πάνω`}>
                <Text style={s.moveBtn}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity hitSlop={HIT_SLOP} onPress={() => moveCategory(section.catId, 1)} accessibilityRole="button" accessibilityLabel={`Μετακίνηση ${section.title} κάτω`}>
                <Text style={s.moveBtn}>↓</Text>
              </TouchableOpacity>
              <TouchableOpacity hitSlop={HIT_SLOP} onPress={() => handleDeleteCategory(section.cat)} accessibilityRole="button" accessibilityLabel={`Διαγραφή κατηγορίας ${section.title}`}>
                <Text style={s.catDeleteBtn}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        renderItem={({ item, section }) => (
          <View style={s.row}>
            <View style={s.rowActionsLeft}>
              <TouchableOpacity hitSlop={HIT_SLOP} onPress={() => moveMenuItem(section.catId, item.id, -1)} accessibilityRole="button" accessibilityLabel={`Μετακίνηση ${item.name} πάνω`}>
                <Text style={s.moveBtnSmall}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity hitSlop={HIT_SLOP} onPress={() => moveMenuItem(section.catId, item.id, 1)} accessibilityRole="button" accessibilityLabel={`Μετακίνηση ${item.name} κάτω`}>
                <Text style={s.moveBtnSmall}>↓</Text>
              </TouchableOpacity>
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowName}>{item.name}</Text>
              <View style={s.rowMeta}>
                <Text style={s.rowPrice}>{item.price.toFixed(2)}€</Text>
                {!!item.options?.length && (
                  <Text style={s.rowOptions}>➕ {item.options.length} έξτρα</Text>
                )}
              </View>
            </View>
            <TouchableOpacity style={s.editBtn} hitSlop={HIT_SLOP} onPress={() => openEdit(section.catId, item)} accessibilityRole="button" accessibilityLabel={`Επεξεργασία ${item.name}`}>
              <Text style={s.editBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} hitSlop={HIT_SLOP} onPress={() => handleDelete(section.catId, item)} accessibilityRole="button" accessibilityLabel={`Διαγραφή ${item.name}`}>
              <Text style={s.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => setAddModal(true)} accessibilityRole="button" accessibilityLabel="Νέο προϊόν">
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Νέο προϊόν */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
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
            <TextInput style={s.input} placeholder="Όνομα προϊόντος" placeholderTextColor={C.placeholder} value={newName} onChangeText={setNewName} />
            <Text style={s.label}>Τιμή (€)</Text>
            <TextInput style={s.input} placeholder="0.00" placeholderTextColor={C.placeholder} value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={handleAdd} />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setAddModal(false); setNewName(''); setNewPrice(''); }}>
                <Text style={s.cancelBtnText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleAdd}>
                <Text style={s.confirmBtnText}>Προσθήκη</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Νέα κατηγορία */}
      <Modal visible={catModal} transparent animationType="slide" onRequestClose={() => setCatModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Νέα Κατηγορία</Text>
            <Text style={s.label}>Όνομα</Text>
            <TextInput style={s.input} placeholder="π.χ. Καφέδες" placeholderTextColor={C.placeholder} value={newCatName} onChangeText={setNewCatName} autoFocus />
            <Text style={s.label}>Emoji εικονίδιο (προαιρετικό)</Text>
            <TextInput style={s.input} placeholder="π.χ. ☕" placeholderTextColor={C.placeholder} value={newCatIcon} onChangeText={setNewCatIcon} returnKeyType="done" onSubmitEditing={handleAddCategory} />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setCatModal(false); setNewCatName(''); setNewCatIcon(''); }}>
                <Text style={s.cancelBtnText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, !newCatName.trim() && s.disabled]} onPress={handleAddCategory} disabled={!newCatName.trim()}>
                <Text style={s.confirmBtnText}>Προσθήκη</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Επεξεργασία είδους: όνομα, τιμή, έξτρα επιλογές (π.χ. Καραμέλα +0.50) */}
      <Modal visible={!!editTarget} transparent animationType="slide" onRequestClose={() => setEditTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
          <View style={[s.modal, { maxHeight: '90%' }]}>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Text style={s.modalTitle}>Επεξεργασία είδους</Text>
              <Text style={s.label}>Όνομα</Text>
              <TextInput style={s.input} placeholderTextColor={C.placeholder} value={editName} onChangeText={setEditName} />
              <Text style={s.label}>Τιμή (€)</Text>
              <TextInput style={s.input} placeholderTextColor={C.placeholder} value={editPrice} onChangeText={setEditPrice} keyboardType="decimal-pad" />

              <Text style={s.label}>Έξτρα επιλογές (+τιμή)</Text>
              <Text style={s.optionsHint}>π.χ. «Έξτρα τυρί +0,50» — ο σερβιτόρος τις διαλέγει στην προσθήκη.</Text>
              {editOptions.map(o => (
                <View key={o.id} style={s.optionRow}>
                  <Text style={s.optionName}>{o.name}</Text>
                  <Text style={s.optionDelta}>{o.delta >= 0 ? '+' : '−'}{Math.abs(o.delta).toFixed(2)}€</Text>
                  <TouchableOpacity hitSlop={HIT_SLOP} onPress={() => setEditOptions(prev => prev.filter(x => x.id !== o.id))} accessibilityRole="button" accessibilityLabel={`Αφαίρεση ${o.name}`}>
                    <Text style={s.optionRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={s.optionInputRow}>
                <TextInput style={[s.input, { flex: 2 }]} placeholder="Όνομα έξτρα" placeholderTextColor={C.placeholder} value={optName} onChangeText={setOptName} />
                <TextInput style={[s.input, { flex: 1 }]} placeholder="+0.50" placeholderTextColor={C.placeholder} value={optDelta} onChangeText={setOptDelta} keyboardType="decimal-pad" />
                <TouchableOpacity style={s.optionAddBtn} onPress={addOption} accessibilityRole="button" accessibilityLabel="Προσθήκη έξτρα">
                  <Text style={s.optionAddBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditTarget(null)}>
                  <Text style={s.cancelBtnText}>Άκυρο</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmBtn} onPress={handleSaveEdit}>
                  <Text style={s.confirmBtnText}>Αποθήκευση</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  toolbarBtn: { backgroundColor: C.card, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: C.accent },
  toolbarBtnText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  toolbarHint: { color: C.placeholder, fontSize: 12 },
  list: { padding: 16, gap: 6, paddingBottom: 100 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  moveBtn: { color: C.accent, fontSize: 18, fontWeight: '800' },
  catDeleteBtn: { fontSize: 14, opacity: 0.8 },
  row: {
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: C.border,
  },
  rowActionsLeft: { gap: 10, marginRight: 4 },
  moveBtnSmall: { color: C.muted, fontSize: 15, fontWeight: '800' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: C.text },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  rowPrice: { fontSize: 14, color: C.green, fontWeight: '700' },
  rowOptions: { fontSize: 12, color: C.accent, fontWeight: '600' },
  editBtn: { padding: 6 },
  editBtnText: { fontSize: 16 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 16 },
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    backgroundColor: C.accent, width: 60, height: 60,
    borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontSize: 30, color: C.accentText, fontWeight: '700', marginTop: -2 },
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  label: { fontSize: 13, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: C.field, borderRadius: 12, padding: 16, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: C.field, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  cancelBtnText: { color: C.muted, fontSize: 16, fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmBtnText: { color: C.accentText, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  catChip: { backgroundColor: C.field, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  catChipActive: { backgroundColor: C.accentBg, borderColor: C.accent },
  catChipText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  catChipTextActive: { color: C.accent },
  optionsHint: { color: C.placeholder, fontSize: 12, marginTop: -6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.field, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  optionName: { flex: 1, color: C.text, fontSize: 15 },
  optionDelta: { color: C.green, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  optionRemove: { color: C.red, fontSize: 15, fontWeight: '700' },
  optionInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  optionAddBtn: { backgroundColor: C.accent, borderRadius: 12, width: 48, height: 52, alignItems: 'center', justifyContent: 'center' },
  optionAddBtnText: { color: C.accentText, fontSize: 24, fontWeight: '700' },
});
