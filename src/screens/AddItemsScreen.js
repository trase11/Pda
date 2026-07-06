import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, SectionList,
} from 'react-native';
import { useApp } from '../context/AppContext';

export default function AddItemsScreen({ route, navigation }) {
  const { tableId } = route.params;
  const { tables, menu, addItemToTable } = useApp();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  const table = tables.find(t => t.id === tableId);

  // Αν το τραπέζι κλείσει από άλλη συσκευή, βγαίνουμε — αλλιώς ο σερβιτόρος
  // θα «πρόσθετε» είδη σε ανύπαρκτο τραπέζι χωρίς κανένα μήνυμα.
  useEffect(() => {
    if (!table) navigation.goBack();
  }, [table, navigation]);

  if (!table) return null;

  // Άθροισμα σε ΟΛΕΣ τις γραμμές του προϊόντος (μπορεί να υπάρχουν
  // ξεχωριστές γραμμές με διαφορετικές σημειώσεις).
  function getOrderQty(itemId) {
    return table.orders
      .filter(o => o.itemId === itemId)
      .reduce((sum, o) => sum + o.qty, 0);
  }

  const filteredMenu = menu.map(cat => ({
    ...cat,
    items: cat.items.filter(i =>
      i.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => (activeCategory ? cat.id === activeCategory : true) && cat.items.length > 0);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

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
        placeholderTextColor="#777"
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
                <Text style={s.itemPrice}>{item.price.toFixed(2)}€</Text>
              </View>
              <View style={s.addRow}>
                {qty > 0 && (
                  <View style={s.qtyBadge}>
                    <Text style={s.qtyBadgeText}>{qty}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={s.addBtn}
                  onPress={() => addItemToTable(tableId, item, catObj?.name ?? '')}
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2d2d4e' },
  backBtn: { padding: 4 },
  backText: { color: '#4ecca3', fontSize: 16, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  searchInput: {
    backgroundColor: '#16213e', margin: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, fontSize: 16, color: '#fff',
    borderWidth: 1, borderColor: '#2d2d4e',
  },
  catList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#16213e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#2d2d4e',
  },
  catChipActive: { backgroundColor: '#1a3a2e', borderColor: '#4ecca3' },
  catIcon: { fontSize: 16 },
  catName: { fontSize: 13, color: '#aaa', fontWeight: '600' },
  catNameActive: { color: '#4ecca3' },
  itemList: { padding: 16, gap: 6 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#888', marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  menuItem: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#2d2d4e',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  itemPrice: { fontSize: 13, color: '#888', marginTop: 2 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBadge: { backgroundColor: '#1a3a2e', borderRadius: 10, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  qtyBadgeText: { color: '#4ecca3', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  addBtn: { backgroundColor: '#4ecca3', borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#1a1a2e', fontSize: 24, fontWeight: '700', marginTop: -2 },
});
