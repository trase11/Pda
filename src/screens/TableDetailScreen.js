import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';

export default function TableDetailScreen({ route, navigation }) {
  const { tableId } = route.params;
  const { tables, removeItemFromTable, incrementOrderItem, deleteOrderItem, clearTable, getTableTotal } = useApp();
  const table = tables.find(t => t.id === tableId);
  const [showBill, setShowBill] = useState(false);
  const [paid, setPaid] = useState('');

  if (!table) {
    navigation.goBack();
    return null;
  }

  const total = getTableTotal(tableId);
  const paidNum = parseFloat(paid) || 0;
  const change = paidNum - total;

  function handleClear() {
    Alert.alert('Εκκαθάριση', 'Να διαγραφεί η παραγγελία;', [
      { text: 'Άκυρο', style: 'cancel' },
      { text: 'Εκκαθάριση', style: 'destructive', onPress: () => { clearTable(tableId); setShowBill(false); setPaid(''); } },
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Πίσω</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{table.name}</Text>
        <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
          <Text style={s.clearText}>Εκκαθάριση</Text>
        </TouchableOpacity>
      </View>

      {table.orders.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyText}>Δεν υπάρχουν παραγγελίες</Text>
          <Text style={s.emptyHint}>Πάτα "Προσθήκη" για να βάλεις είδη</Text>
        </View>
      ) : (
        <FlatList
          data={table.orders}
          keyExtractor={o => o.itemId}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.orderRow}>
              <View style={s.orderInfo}>
                <Text style={s.orderName}>{item.name}</Text>
                <Text style={s.orderCat}>{item.category}</Text>
              </View>
              <View style={s.qtyRow}>
                <TouchableOpacity style={s.qtyBtn} onPress={() => removeItemFromTable(tableId, item.itemId)}>
                  <Text style={s.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={s.qtyNum}>{item.qty}</Text>
                <TouchableOpacity style={[s.qtyBtn, s.qtyBtnPlus]} onPress={() => incrementOrderItem(tableId, item.itemId)}>
                  <Text style={[s.qtyBtnText, { color: '#4ecca3' }]}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.orderPrice}>{(item.price * item.qty).toFixed(2)}€</Text>
              <TouchableOpacity onPress={() => deleteOrderItem(tableId, item.itemId)} style={s.trashBtn}>
                <Text style={s.trashText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={() => (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Σύνολο</Text>
              <Text style={s.totalValue}>{total.toFixed(2)}€</Text>
            </View>
          )}
        />
      )}

      <View style={s.bottom}>
        <TouchableOpacity style={s.menuBtn} onPress={() => navigation.navigate('AddItems', { tableId })}>
          <Text style={s.menuBtnText}>+ Προσθήκη ειδών</Text>
        </TouchableOpacity>
        {total > 0 && (
          <TouchableOpacity style={s.billBtn} onPress={() => setShowBill(true)}>
            <Text style={s.billBtnText}>💳 Λογαριασμός</Text>
          </TouchableOpacity>
        )}
      </View>

      {showBill && (
        <View style={s.billOverlay}>
          <View style={s.billSheet}>
            <Text style={s.billTitle}>Λογαριασμός — {table.name}</Text>

            <View style={s.billItems}>
              {table.orders.map(o => (
                <View key={o.itemId} style={s.billItem}>
                  <Text style={s.billItemName}>{o.name} x{o.qty}</Text>
                  <Text style={s.billItemPrice}>{(o.price * o.qty).toFixed(2)}€</Text>
                </View>
              ))}
            </View>

            <View style={s.billDivider} />
            <View style={s.billTotalRow}>
              <Text style={s.billTotalLabel}>ΣΥΝΟΛΟ</Text>
              <Text style={s.billTotalVal}>{total.toFixed(2)}€</Text>
            </View>

            <Text style={s.payLabel}>Πόσα έδωσε ο πελάτης:</Text>
            <View style={s.payInputRow}>
              <TextInput
                style={s.payInput}
                placeholder="0.00"
                placeholderTextColor="#555"
                value={paid}
                onChangeText={setPaid}
                keyboardType="decimal-pad"
              />
              <Text style={s.payInputEuro}>€</Text>
            </View>

            {paidNum > 0 && (
              <View style={[s.changeRow, change < 0 && s.changeRowRed]}>
                <Text style={s.changeLabel}>{change >= 0 ? 'Ρέστα:' : 'Υπολείπονται:'}</Text>
                <Text style={[s.changeVal, change < 0 && s.changeValRed]}>
                  {Math.abs(change).toFixed(2)}€
                </Text>
              </View>
            )}

            <TouchableOpacity style={s.closeBtn} onPress={() => { setShowBill(false); setPaid(''); }}>
              <Text style={s.closeBtnText}>Κλείσιμο</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2d2d4e' },
  backBtn: { padding: 4 },
  backText: { color: '#4ecca3', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  clearBtn: { padding: 4 },
  clearText: { color: '#e74c3c', fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 50 },
  emptyText: { fontSize: 18, color: '#aaa', fontWeight: '600' },
  emptyHint: { fontSize: 14, color: '#666' },
  list: { padding: 16, gap: 10 },
  orderRow: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#2d2d4e',
  },
  orderInfo: { flex: 1 },
  orderName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  orderCat: { fontSize: 12, color: '#888', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { backgroundColor: '#2d2d4e', borderRadius: 6, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  qtyBtnPlus: { backgroundColor: '#1a3a2e' },
  qtyBtnText: { color: '#e74c3c', fontSize: 18, fontWeight: '700' },
  qtyNum: { fontSize: 16, fontWeight: '700', color: '#fff', minWidth: 24, textAlign: 'center' },
  orderPrice: { fontSize: 15, fontWeight: '700', color: '#4ecca3', minWidth: 55, textAlign: 'right' },
  trashBtn: { padding: 4 },
  trashText: { fontSize: 16 },
  totalRow: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginTop: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#4ecca3',
  },
  totalLabel: { fontSize: 18, fontWeight: '700', color: '#fff' },
  totalValue: { fontSize: 24, fontWeight: '800', color: '#4ecca3' },
  bottom: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#2d2d4e' },
  menuBtn: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#4ecca3' },
  menuBtnText: { color: '#4ecca3', fontSize: 16, fontWeight: '700' },
  billBtn: { backgroundColor: '#4ecca3', borderRadius: 12, padding: 16, alignItems: 'center' },
  billBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '800' },
  billOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  billSheet: { backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  billTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 16 },
  billItems: { gap: 6, marginBottom: 12 },
  billItem: { flexDirection: 'row', justifyContent: 'space-between' },
  billItemName: { fontSize: 14, color: '#ccc' },
  billItemPrice: { fontSize: 14, color: '#ccc', fontWeight: '600' },
  billDivider: { height: 1, backgroundColor: '#2d2d4e', marginVertical: 10 },
  billTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  billTotalLabel: { fontSize: 18, fontWeight: '700', color: '#fff' },
  billTotalVal: { fontSize: 22, fontWeight: '800', color: '#4ecca3' },
  payLabel: { fontSize: 14, color: '#888', marginBottom: 10 },
  payInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 12, borderWidth: 1, borderColor: '#4ecca3', paddingHorizontal: 16, marginBottom: 16 },
  payInput: { flex: 1, fontSize: 28, fontWeight: '800', color: '#fff', paddingVertical: 14 },
  payInputEuro: { fontSize: 28, fontWeight: '800', color: '#4ecca3' },
  changeRow: { backgroundColor: '#1a3a2e', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  changeRowRed: { backgroundColor: '#3a1a1a' },
  changeLabel: { fontSize: 16, fontWeight: '600', color: '#4ecca3' },
  changeVal: { fontSize: 22, fontWeight: '800', color: '#4ecca3' },
  changeValRed: { color: '#e74c3c' },
  closeBtn: { backgroundColor: '#2d2d4e', borderRadius: 12, padding: 14, alignItems: 'center' },
  closeBtnText: { color: '#aaa', fontSize: 16, fontWeight: '600' },
});
