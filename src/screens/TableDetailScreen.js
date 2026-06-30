import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useKitchen } from '../context/KitchenContext';
import { confirmAction } from '../utils/confirm';

export default function TableDetailScreen({ route, navigation }) {
  const { tableId } = route.params;
  const { tables, removeItemFromTable, incrementOrderItem, deleteOrderItem, clearTable, getTableTotal, payItems } = useApp();
  const { firebaseEnabled, sendToKitchen } = useKitchen();
  const table = tables.find(t => t.id === tableId);
  const [showBill, setShowBill] = useState(false);
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState('cash'); // 'cash' | 'card'
  const [selected, setSelected] = useState({}); // itemId -> bool

  if (!table) {
    navigation.goBack();
    return null;
  }

  const total = getTableTotal(tableId);
  const foodItems = table.orders.filter(o => o.category === 'Φαγητά');

  const selectedItems = table.orders.filter(o => selected[o.itemId]);
  const selectedTotal = selectedItems.reduce((sum, o) => sum + o.price * o.qty, 0);
  const paidNum = parseFloat(paid) || 0;
  const given = method === 'cash' && paidNum > 0 ? paidNum : selectedTotal;
  const change = given - selectedTotal;
  const notEnough = method === 'cash' && paidNum > 0 && paidNum < selectedTotal;
  const canPay = selectedItems.length > 0 && !notEnough;

  function openBill() {
    const all = {};
    table.orders.forEach(o => { all[o.itemId] = true; });
    setSelected(all);
    setMethod('cash');
    setPaid('');
    setShowBill(true);
  }

  function toggleSelected(itemId) {
    setSelected(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  function handlePay() {
    if (!canPay) return;
    payItems(tableId, selectedItems, {
      method,
      given: method === 'cash' ? given : selectedTotal,
      change: method === 'cash' ? change : 0,
    });
    setShowBill(false);
    setPaid('');
    setMethod('cash');
  }

  function handleSendToKitchen() {
    if (foodItems.length === 0) return;
    const summary = foodItems.map(i => `${i.qty}× ${i.name}`).join('\n');
    confirmAction(
      `Αποστολή στην κουζίνα — ${table.name}`,
      summary,
      () => sendToKitchen(table.name, foodItems),
      'Αποστολή'
    );
  }

  function handleClear() {
    confirmAction(
      'Εκκαθάριση',
      'Να διαγραφεί η παραγγελία;',
      () => { clearTable(tableId); setShowBill(false); setPaid(''); },
      'Εκκαθάριση'
    );
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
        {firebaseEnabled && foodItems.length > 0 && (
          <TouchableOpacity style={s.kitchenBtn} onPress={handleSendToKitchen}>
            <Text style={s.kitchenBtnText}>🍳 Στείλε στην κουζίνα</Text>
          </TouchableOpacity>
        )}
        {total > 0 && (
          <TouchableOpacity style={s.billBtn} onPress={openBill}>
            <Text style={s.billBtnText}>💳 Λογαριασμός</Text>
          </TouchableOpacity>
        )}
      </View>

      {showBill && (
        <View style={s.billOverlay}>
          <View style={s.billSheet}>
            <Text style={s.billTitle}>Λογαριασμός — {table.name}</Text>
            <Text style={s.billHint}>Πάτα ένα είδος για να το βγάλεις από αυτή την πληρωμή (πληρωμή ανά είδος).</Text>

            <ScrollView style={s.billItems} contentContainerStyle={{ gap: 4 }}>
              {table.orders.map(o => {
                const on = !!selected[o.itemId];
                return (
                  <TouchableOpacity key={o.itemId} style={s.billItem} onPress={() => toggleSelected(o.itemId)} activeOpacity={0.7}>
                    <View style={[s.checkbox, on && s.checkboxOn]}>
                      {on && <Text style={s.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={[s.billItemName, !on && s.billItemOff]}>{o.name} x{o.qty}</Text>
                    <Text style={[s.billItemPrice, !on && s.billItemOff]}>{(o.price * o.qty).toFixed(2)}€</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={s.billDivider} />
            <View style={s.billTotalRow}>
              <Text style={s.billTotalLabel}>ΠΡΟΣ ΠΛΗΡΩΜΗ</Text>
              <Text style={s.billTotalVal}>{selectedTotal.toFixed(2)}€</Text>
            </View>

            <View style={s.methodRow}>
              <TouchableOpacity style={[s.methodBtn, method === 'cash' && s.methodBtnActive]} onPress={() => setMethod('cash')}>
                <Text style={[s.methodText, method === 'cash' && s.methodTextActive]}>💵 Μετρητά</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.methodBtn, method === 'card' && s.methodBtnActive]} onPress={() => setMethod('card')}>
                <Text style={[s.methodText, method === 'card' && s.methodTextActive]}>💳 Κάρτα</Text>
              </TouchableOpacity>
            </View>

            {method === 'cash' && (
              <>
                <Text style={s.payLabel}>Πόσα έδωσε ο πελάτης:</Text>
                <View style={s.payInputRow}>
                  <TextInput
                    style={s.payInput}
                    placeholder={selectedTotal.toFixed(2)}
                    placeholderTextColor="#555"
                    value={paid}
                    onChangeText={setPaid}
                    keyboardType="decimal-pad"
                  />
                  <Text style={s.payInputEuro}>€</Text>
                </View>
                {paidNum > 0 && (
                  <View style={[s.changeRow, notEnough && s.changeRowRed]}>
                    <Text style={s.changeLabel}>{notEnough ? 'Υπολείπονται:' : 'Ρέστα:'}</Text>
                    <Text style={[s.changeVal, notEnough && s.changeValRed]}>
                      {Math.abs(change).toFixed(2)}€
                    </Text>
                  </View>
                )}
              </>
            )}

            {method === 'card' && (
              <View style={s.cardInfo}>
                <Text style={s.cardInfoText}>Χρέωση κάρτας: {selectedTotal.toFixed(2)}€</Text>
              </View>
            )}

            <TouchableOpacity style={[s.payBtn, !canPay && s.disabled]} onPress={handlePay} disabled={!canPay}>
              <Text style={s.payBtnText}>Ολοκλήρωση πληρωμής</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.closeBtn} onPress={() => { setShowBill(false); setPaid(''); }}>
              <Text style={s.closeBtnText}>Άκυρο</Text>
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
  kitchenBtn: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e6a23c' },
  kitchenBtnText: { color: '#e6a23c', fontSize: 16, fontWeight: '700' },
  billBtn: { backgroundColor: '#4ecca3', borderRadius: 12, padding: 16, alignItems: 'center' },
  billBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '800' },
  billOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  billSheet: { backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  billTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 },
  billHint: { fontSize: 12, color: '#777', textAlign: 'center', marginBottom: 14 },
  billItems: { marginBottom: 12 },
  billItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#4ecca3', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#4ecca3' },
  checkboxMark: { color: '#1a1a2e', fontSize: 14, fontWeight: '900' },
  billItemName: { flex: 1, fontSize: 15, color: '#eee' },
  billItemPrice: { fontSize: 15, color: '#eee', fontWeight: '600' },
  billItemOff: { color: '#555', textDecorationLine: 'line-through' },
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
  methodRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  methodBtn: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2d2d4e' },
  methodBtnActive: { backgroundColor: '#1a3a2e', borderColor: '#4ecca3' },
  methodText: { color: '#aaa', fontSize: 16, fontWeight: '700' },
  methodTextActive: { color: '#4ecca3' },
  cardInfo: { backgroundColor: '#1a3a2e', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  cardInfoText: { color: '#4ecca3', fontSize: 18, fontWeight: '800' },
  payBtn: { backgroundColor: '#4ecca3', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  payBtnText: { color: '#1a1a2e', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  closeBtn: { backgroundColor: '#2d2d4e', borderRadius: 12, padding: 14, alignItems: 'center' },
  closeBtnText: { color: '#aaa', fontSize: 16, fontWeight: '600' },
});
