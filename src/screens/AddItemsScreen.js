import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, SectionList, Modal, ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { C } from '../theme';

export default function AddItemsScreen({ route, navigation }) {
  const { tableId } = route.params;
  const { tables, menu, addItemToTable } = useApp();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  // Είδος με έξτρα επιλογές: ανοίγει picker πριν την προσθήκη.
  const [optionsTarget, setOptionsTarget] = useState(null); // { item, categoryName }
  const [pickedOptions, setPickedOptions] = useState({}); // optionId -> bool

  const table = tables.find(t => t.id === tableId);

  // Αν το τραπέζι κλείσει από άλλη συσκευή, βγαίνουμε — αλλιώς ο σερβιτόρος
  // θα «πρόσθετε» είδη σε ανύπαρκτο τραπέζι χωρίς κανένα μήνυμα.
  useEffect(() => {
    if (!table) navigation.goBack();
  }, [table, navigation]);

  if (!table) return null;

  // Άθροισμα σε ΟΛΕΣ τις γραμμές του προϊόντος (μπορεί να υπάρχουν
  // ξεχωριστές γραμμές με διαφορετικές σημειώσεις ή έξτρα).
  function getOrderQty(itemId) {
    return table.orders
      .filter(o => o.itemId === itemId)
      .reduce((sum, o) => sum + o.qty, 0);
  }

  function handleAdd(item, categoryName) {
    if (item.options?.length) {
      setPickedOptions({});
      setOptionsTarget({ item, categoryName });
      return;
    }
    addItemToTable(tableId, item, categoryName);
  }

  function confirmOptions() {
    if (!optionsTarget) return;
    const { item, categoryName } = optionsTarget;
    const chosen = (item.options || [])
      .filter(o => pickedOptions[o.id])
      .map(o => ({ name: o.name, delta: o.delta }));
    addItemToTable(tableId, item, categoryName, chosen);
    setOptionsTarget(null);
  }

  const pickerTotal = optionsTarget
    ? optionsTarget.item.price + (optionsTarget.item.options || [])
        .filter(o => pickedOptions[o.id])
        .reduce((sum, o) => sum + o.delta, 0)
    : 0;

  const filteredMenu = menu.map(cat => ({
    ...cat,
    items: cat.items.filter(i =>
      i.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => (activeCategory ? cat.id === activeCategory : true) && cat.items.length > 0);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>✓ Τέλος</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Προσθήκη ειδών</Text>
        <View style={{ width: 60 }} />
      </View>

      <TextInput
        style={s.searchInput}
        placeholder="Αναζήτηση..."
        placeholderTextColor={C.placeholder}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={[{ id: null, name: 'Όλα', icon: '🍽️' }, ...menu]}
        keyExtractor={c => c.id ?? 'all'}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.catChip, activeCategory === item.id && s.catChipActive]}
            onPress={() => setActiveCategory(item.id)}
          >
            <Text style={s.catIcon}>{item.icon}</Text>
            <Text style={[s.catName, activeCategory === item.id && s.catNameActive]}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <SectionList
        sections={filteredMenu.map(cat => ({ title: cat.name, icon: cat.icon, catId: cat.id, data: cat.items }))}
        keyExtractor={i => i.id}
        contentContainerStyle={s.itemList}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={s.sectionHeader}>{section.icon} {section.title}</Text>
        )}
        renderItem={({ item, section }) => {
          const qty = getOrderQty(item.id);
          const catObj = menu.find(c => c.id === section.catId);
          return (
            <View style={s.menuItem}>
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{item.name}</Text>
                <View style={s.itemMetaRow}>
                  <Text style={s.itemPrice}>{item.price.toFixed(2)}€</Text>
                  {!!item.options?.length && <Text style={s.optionsBadge}>➕ έξτρα</Text>}
                </View>
              </View>
              <View style={s.addRow}>
                {qty > 0 && (
                  <View style={s.qtyBadge}>
                    <Text style={s.qtyBadgeText}>{qty}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={s.addBtn}
                  onPress={() => handleAdd(item, catObj?.name ?? '')}
                  accessibilityRole="button"
                  accessibilityLabel={`Προσθήκη ${item.name}`}
                >
                  <Text style={s.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Έξτρα επιλογές είδους (π.χ. «Έξτρα τυρί +0.50») πριν την προσθήκη */}
      <Modal visible={!!optionsTarget} transparent animationType="slide" onRequestClose={() => setOptionsTarget(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{optionsTarget?.item.name}</Text>
            <Text style={s.sheetHint}>Διάλεξε έξτρα (προαιρετικό)</Text>
            <ScrollView style={s.optionsList} contentContainerStyle={{ gap: 4 }}>
              {(optionsTarget?.item.options || []).map(o => {
                const on = !!pickedOptions[o.id];
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={s.optionRow}
                    onPress={() => setPickedOptions(prev => ({ ...prev, [o.id]: !prev[o.id] }))}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={o.name}
                  >
                    <View style={[s.checkbox, on && s.checkboxOn]}>
                      {on && <Text style={s.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={[s.optionName, on && s.optionNameOn]}>{o.name}</Text>
                    <Text style={[s.optionDelta, on && s.optionNameOn]}>
                      {o.delta >= 0 ? '+' : '−'}{Math.abs(o.delta).toFixed(2)}€
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={s.confirmBtn} onPress={confirmOptions} accessibilityRole="button" accessibilityLabel="Προσθήκη στο τραπέζι">
              <Text style={s.confirmBtnText}>Προσθήκη · {pickerTotal.toFixed(2)}€</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setOptionsTarget(null)}>
              <Text style={s.cancelBtnText}>Άκυρο</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { padding: 4 },
  backText: { color: C.accent, fontSize: 16, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  searchInput: {
    backgroundColor: C.card, margin: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, fontSize: 16, color: C.text,
    borderWidth: 1, borderColor: C.border,
  },
  catList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border,
  },
  catChipActive: { backgroundColor: C.accentBg, borderColor: C.accent },
  catIcon: { fontSize: 16 },
  catName: { fontSize: 13, color: C.muted, fontWeight: '600' },
  catNameActive: { color: C.accent },
  itemList: { padding: 16, gap: 6 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: C.muted, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  menuItem: {
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: C.text },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  itemPrice: { fontSize: 13, color: C.muted },
  optionsBadge: { fontSize: 11, color: C.accent, fontWeight: '700' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBadge: { backgroundColor: C.greenBg, borderRadius: 10, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  qtyBadgeText: { color: C.green, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  addBtn: { backgroundColor: C.accent, borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: C.accentText, fontSize: 24, fontWeight: '700', marginTop: -2 },
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'center' },
  sheetHint: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 4, marginBottom: 12 },
  optionsList: { marginBottom: 14 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: C.accent },
  checkboxMark: { color: C.accentText, fontSize: 14, fontWeight: '900' },
  optionName: { flex: 1, fontSize: 16, color: C.sub },
  optionNameOn: { color: C.text, fontWeight: '600' },
  optionDelta: { fontSize: 15, color: C.muted, fontWeight: '600', fontVariant: ['tabular-nums'] },
  confirmBtn: { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: C.accentText, fontSize: 16, fontWeight: '800' },
  cancelBtn: { backgroundColor: C.field, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  cancelBtnText: { color: C.muted, fontSize: 16, fontWeight: '600' },
});
