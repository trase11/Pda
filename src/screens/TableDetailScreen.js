import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useKitchen } from '../context/KitchenContext';
import { confirmAction } from '../utils/confirm';
import { C, HIT_SLOP } from '../theme';

export default function TableDetailScreen({ route, navigation }) {
  const { tableId } = route.params;
  const {
    tables, removeItemFromTable, incrementOrderItem, deleteOrderItem,
    setOrderNote, setTableOrderNote, markOrdersSent, clearTable,
    getTableTotal, payItems, transferOrders,
  } = useApp();
  const { firebaseEnabled, sendToKitchen } = useKitchen();
  const table = tables.find(t => t.id === tableId);
  const [showBill, setShowBill] = useState(false);
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState('cash'); // 'cash' | 'card'
  const [selected, setSelected] = useState({}); // lineId -> bool
  const [noteTarget, setNoteTarget] = useState(null); // γραμμή που επεξεργαζόμαστε
  const [noteText, setNoteText] = useState('');
  const [orderNoteModal, setOrderNoteModal] = useState(false); // σημείωση όλης της παραγγελίας
  const [orderNoteText, setOrderNoteText] = useState('');
  const [transferModal, setTransferModal] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const payingRef = useRef(false); // φραγή διπλού tap στην πληρωμή

  // Αν το τραπέζι κλείσει από άλλη συσκευή όσο η οθόνη είναι ανοιχτή,
  // γυρνάμε πίσω μέσα σε effect (όχι στο render — side effect στο render
  // μπορεί να κάνει διπλό goBack σε επόμενα renders).
  useEffect(() => {
    if (!table) navigation.goBack();
  }, [table, navigation]);

  if (!table) return null;

  const total = getTableTotal(tableId);
  const orderNote = table.orderNote || '';
  const foodItems = table.orders.filter(o => o.category === 'Φαγητά');
  // Μόνο ό,τι ΔΕΝ έχει σταλεί ακόμα στην κουζίνα (delta).
  const unsentFood = foodItems.filter(o => o.qty - o.sentQty > 0);
  const unsentCount = unsentFood.reduce((sum, o) => sum + (o.qty - o.sentQty), 0);
  const otherTables = tables.filter(t => t.id !== tableId);

  const selectedItems = table.orders.filter(o => selected[o.lineId]);
  const selectedTotal = selectedItems.reduce((sum, o) => sum + o.price * o.qty, 0);
  // Ελληνικό πληκτρολόγιο: το decimal-pad δίνει κόμμα — το parseFloat("10,50")
  // θα έκοβε στο 10 και θα έβγαζε λάθος ρέστα.
  const paidNum = parseFloat(paid.replace(',', '.')) || 0;
  const given = method === 'cash' && paidNum > 0 ? paidNum : selectedTotal;
  const change = given - selectedTotal;
  const notEnough = method === 'cash' && paidNum > 0 && paidNum < selectedTotal;
  const canPay = selectedItems.length > 0 && !notEnough;
  const allSelected = table.orders.length > 0 && table.orders.every(o => selected[o.lineId]);

  function setAllSelected(on) {
    const next = {};
    table.orders.forEach(o => { next[o.lineId] = on; });
    setSelected(next);
  }

  function openBill() {
    setAllSelected(true);
    setMethod('cash');
    setPaid('');
    payingRef.current = false;
    setShowBill(true);
  }

  function toggleSelected(lineId) {
    setSelected(prev => ({ ...prev, [lineId]: !prev[lineId] }));
  }

  function handlePay() {
    if (!canPay || payingRef.current) return;
    payingRef.current = true;
    payItems(tableId, selectedItems, {
      method,
      given: method === 'cash' ? given : selectedTotal,
      change: method === 'cash' ? change : 0,
    });
    setShowBill(false);
    setPaid('');
    setMethod('cash');
  }

  // Συχνή, μη καταστροφική ενέργεια: χωρίς dialog επιβεβαίωσης — στέλνει
  // αμέσως ΜΟΝΟ τα νέα τεμάχια και δείχνει σύντομη ένδειξη επιτυχίας.
  // Η σημείωση παραγγελίας πάει με το δελτίο και μετά καθαρίζεται —
  // αφορούσε τη συγκεκριμένη αποστολή.
  function handleSendToKitchen() {
    if (unsentFood.length === 0) return;
    const items = unsentFood.map(o => ({
      name: o.name,
      qty: o.qty - o.sentQty,
      note: o.note,
      options: (o.options || []).map(x => x.name),
    }));
    sendToKitchen(table.name, items, tableId, orderNote)
      .catch(err => console.warn('Αποτυχία αποστολής στην κουζίνα:', err));
    markOrdersSent(tableId, unsentFood.map(o => o.lineId));
    if (orderNote) setTableOrderNote(tableId, '');
    setJustSent(true);
    setTimeout(() => setJustSent(false), 2000);
  }

  function handleClear() {
    confirmAction(
      'Εκκαθάριση',
      'Να διαγραφεί η παραγγελία;',
      () => { clearTable(tableId); setShowBill(false); setPaid(''); },
      'Εκκαθάριση'
    );
  }

  function handleTransfer(target) {
    setTransferModal(false);
    confirmAction(
      'Μεταφορά παραγγελίας',
      `Να μεταφερθούν όλα τα είδη στο «${target.name}»;`,
      () => transferOrders(tableId, target.id),
      'Μεταφορά'
    );
  }

  function openNote(line) {
    setNoteTarget(line);
    setNoteText(line.note || '');
  }

  function saveNote() {
    if (!noteTarget) return;
    setOrderNote(tableId, noteTarget.lineId, noteText.trim());
    setNoteTarget(null);
    setNoteText('');
  }

  function openOrderNote() {
    setOrderNoteText(orderNote);
    setOrderNoteModal(true);
  }

  function saveOrderNote() {
    setTableOrderNote(tableId, orderNoteText.trim());
    setOrderNoteModal(false);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Πίσω">
          <Text style={s.backText}>← Πίσω</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{table.name}</Text>
        <View style={s.headerActions}>
          {table.orders.length > 0 && otherTables.length > 0 && (
            <TouchableOpacity onPress={() => setTransferModal(true)} style={s.transferBtn} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Μεταφορά σε άλλο τραπέζι">
              <Text style={s.transferText}>⇄</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleClear} style={s.clearBtn} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Εκκαθάριση παραγγελίας">
            <Text style={s.clearText}>Εκκαθάριση</Text>
          </TouchableOpacity>
        </View>
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
          keyExtractor={o => o.lineId}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const isFood = item.category === 'Φαγητά';
            const newQty = item.qty - item.sentQty;
            return (
              <View style={s.orderRow}>
                <View style={s.orderInfo}>
                  <Text style={s.orderName}>{item.name}</Text>
                  {item.options?.length > 0 && (
                    <Text style={s.orderOptions}>➕ {item.options.map(o => o.name).join(', ')}</Text>
                  )}
                  <View style={s.orderMetaRow}>
                    <Text style={s.orderCat}>{item.category}</Text>
                    {isFood && item.sentQty > 0 && newQty <= 0 && (
                      <Text style={s.sentBadge}>🍳 εστάλη</Text>
                    )}
                    {isFood && item.sentQty > 0 && newQty > 0 && (
                      <Text style={s.newBadge}>+{newQty} νέο</Text>
                    )}
                  </View>
                  {!!item.note && <Text style={s.orderNote}>📝 {item.note}</Text>}
                </View>
                <TouchableOpacity
                  onPress={() => openNote(item)}
                  style={s.noteBtn}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={`Σημείωση για ${item.name}`}
                >
                  <Text style={s.noteBtnText}>📝</Text>
                </TouchableOpacity>
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    hitSlop={HIT_SLOP}
                    onPress={() => removeItemFromTable(tableId, item.lineId)}
                    accessibilityRole="button"
                    accessibilityLabel={`Αφαίρεση ενός ${item.name}`}
                  >
                    <Text style={s.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.qtyNum}>{item.qty}</Text>
                  <TouchableOpacity
                    style={[s.qtyBtn, s.qtyBtnPlus]}
                    hitSlop={HIT_SLOP}
                    onPress={() => incrementOrderItem(tableId, item.lineId)}
                    accessibilityRole="button"
                    accessibilityLabel={`Προσθήκη ενός ${item.name}`}
                  >
                    <Text style={[s.qtyBtnText, { color: C.green }]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.orderPrice}>{(item.price * item.qty).toFixed(2)}€</Text>
                <TouchableOpacity
                  onPress={() => deleteOrderItem(tableId, item.lineId)}
                  style={s.trashBtn}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={`Διαγραφή ${item.name}`}
                >
                  <Text style={s.trashText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListFooterComponent={() => (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Σύνολο</Text>
              <Text style={s.totalValue}>{total.toFixed(2)}€</Text>
            </View>
          )}
        />
      )}

      <View style={s.bottom}>
        {table.orders.length > 0 && (
          <TouchableOpacity style={s.orderNoteRow} onPress={openOrderNote} accessibilityRole="button" accessibilityLabel="Σημείωση παραγγελίας">
            <Text style={s.orderNoteIcon}>🗒</Text>
            <Text style={orderNote ? s.orderNoteText : s.orderNotePlaceholder} numberOfLines={1}>
              {orderNote || 'Σημείωση παραγγελίας (πάει στην κουζίνα)...'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.menuBtn} onPress={() => navigation.navigate('AddItems', { tableId })} accessibilityRole="button" accessibilityLabel="Προσθήκη ειδών">
          <Text style={s.menuBtnText}>+ Προσθήκη ειδών</Text>
        </TouchableOpacity>
        {firebaseEnabled && unsentCount > 0 && (
          <TouchableOpacity style={s.kitchenBtn} onPress={handleSendToKitchen} accessibilityRole="button" accessibilityLabel="Αποστολή στην κουζίνα">
            <Text style={s.kitchenBtnText}>🍳 Στείλε στην κουζίνα ({unsentCount} νέα)</Text>
          </TouchableOpacity>
        )}
        {firebaseEnabled && unsentCount === 0 && (justSent || foodItems.length > 0) && (
          <Text style={s.sentHint}>{justSent ? '✓ Στάλθηκε στην κουζίνα' : '🍳 Όλα τα φαγητά έχουν σταλεί'}</Text>
        )}
        {total > 0 && (
          <TouchableOpacity style={s.billBtn} onPress={openBill} accessibilityRole="button" accessibilityLabel="Λογαριασμός">
            <Text style={s.billBtnText}>💳 Λογαριασμός</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Σημείωση γραμμής (π.χ. «χωρίς κρεμμύδι») — πάει και στην κουζίνα */}
      <Modal visible={!!noteTarget} transparent animationType="fade" onRequestClose={() => setNoteTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Σημείωση — {noteTarget?.name}</Text>
            <TextInput
              style={s.input}
              placeholder="π.χ. χωρίς πάγο, καλοψημένο..."
              placeholderTextColor={C.placeholder}
              value={noteText}
              onChangeText={setNoteText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveNote}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setNoteTarget(null)}>
                <Text style={s.cancelBtnText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={saveNote}>
                <Text style={s.confirmBtnText}>Αποθήκευση</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Σημείωση ΟΛΗΣ της παραγγελίας — φεύγει με το επόμενο δελτίο κουζίνας */}
      <Modal visible={orderNoteModal} transparent animationType="fade" onRequestClose={() => setOrderNoteModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Σημείωση παραγγελίας</Text>
            <TextInput
              style={s.input}
              placeholder="π.χ. όλα μαζί, βιάζονται, γενέθλια..."
              placeholderTextColor={C.placeholder}
              value={orderNoteText}
              onChangeText={setOrderNoteText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveOrderNote}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setOrderNoteModal(false)}>
                <Text style={s.cancelBtnText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={saveOrderNote}>
                <Text style={s.confirmBtnText}>Αποθήκευση</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Μεταφορά όλης της παραγγελίας σε άλλο τραπέζι */}
      <Modal visible={transferModal} transparent animationType="slide" onRequestClose={() => setTransferModal(false)}>
        <View style={s.billOverlay}>
          <View style={s.billSheet}>
            <Text style={s.billTitle}>Μεταφορά σε τραπέζι</Text>
            <Text style={s.billHint}>Όλα τα είδη θα μεταφερθούν — ό,τι έχει σταλεί στην κουζίνα δεν ξαναστέλνεται.</Text>
            <ScrollView style={s.transferList} contentContainerStyle={{ gap: 8 }}>
              {otherTables.map(t => (
                <TouchableOpacity key={t.id} style={s.transferRow} onPress={() => handleTransfer(t)} accessibilityRole="button" accessibilityLabel={`Μεταφορά στο ${t.name}`}>
                  <Text style={s.transferRowName}>{t.name}</Text>
                  <Text style={s.transferRowMeta}>
                    {t.orders.length > 0 ? `${t.orders.reduce((sum, o) => sum + o.qty, 0)} είδη` : 'κενό'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.closeBtn} onPress={() => setTransferModal(false)}>
              <Text style={s.closeBtnText}>Άκυρο</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Λογαριασμός — Modal ώστε το κουμπί «πίσω» του Android να τον κλείνει */}
      <Modal visible={showBill} transparent animationType="slide" onRequestClose={() => { setShowBill(false); setPaid(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.billOverlay}>
          <View style={s.billSheet}>
            <Text style={s.billTitle}>Λογαριασμός — {table.name}</Text>
            <View style={s.billSelectRow}>
              <Text style={s.billHint}>Πάτα είδη για να τα βάλεις/βγάλεις από την πληρωμή</Text>
              <TouchableOpacity onPress={() => setAllSelected(!allSelected)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel={allSelected ? 'Αποεπιλογή όλων' : 'Επιλογή όλων'}>
                <Text style={s.billSelectAll}>{allSelected ? 'Κανένα' : 'Όλα'}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.billItems} contentContainerStyle={{ gap: 4 }}>
              {table.orders.map(o => {
                const on = !!selected[o.lineId];
                return (
                  <TouchableOpacity
                    key={o.lineId}
                    style={s.billItem}
                    onPress={() => toggleSelected(o.lineId)}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${o.name} x${o.qty}`}
                  >
                    <View style={[s.checkbox, on && s.checkboxOn]}>
                      {on && <Text style={s.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={[s.billItemName, !on && s.billItemOff]}>
                      {o.name}{o.options?.length ? ` (${o.options.map(x => x.name).join(', ')})` : ''} x{o.qty}
                    </Text>
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
              <TouchableOpacity style={[s.methodBtn, method === 'cash' && s.methodBtnActive]} onPress={() => setMethod('cash')} accessibilityRole="button" accessibilityState={{ selected: method === 'cash' }}>
                <Text style={[s.methodText, method === 'cash' && s.methodTextActive]}>💵 Μετρητά</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.methodBtn, method === 'card' && s.methodBtnActive]} onPress={() => setMethod('card')} accessibilityRole="button" accessibilityState={{ selected: method === 'card' }}>
                <Text style={[s.methodText, method === 'card' && s.methodTextActive]}>💳 Κάρτα</Text>
              </TouchableOpacity>
            </View>

            {method === 'cash' && (
              <>
                <Text style={s.payLabel}>Πόσα έδωσε ο πελάτης:</Text>
                <View style={s.quickAmounts}>
                  <TouchableOpacity style={s.quickAmount} onPress={() => setPaid(selectedTotal.toFixed(2))}>
                    <Text style={s.quickAmountText}>Ακριβώς</Text>
                  </TouchableOpacity>
                  {[10, 20, 50].map(v => (
                    <TouchableOpacity key={v} style={s.quickAmount} onPress={() => setPaid(String(v))}>
                      <Text style={s.quickAmountText}>{v}€</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.payInputRow}>
                  <TextInput
                    style={s.payInput}
                    placeholder={selectedTotal.toFixed(2)}
                    placeholderTextColor={C.placeholder}
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

            <TouchableOpacity style={[s.payBtn, !canPay && s.disabled]} onPress={handlePay} disabled={!canPay} accessibilityRole="button" accessibilityLabel="Ολοκλήρωση πληρωμής">
              <Text style={s.payBtnText}>Ολοκλήρωση πληρωμής</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.closeBtn} onPress={() => { setShowBill(false); setPaid(''); }}>
              <Text style={s.closeBtnText}>Άκυρο</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { padding: 4 },
  backText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  transferBtn: { padding: 4 },
  transferText: { color: C.blue, fontSize: 18, fontWeight: '700' },
  clearBtn: { padding: 4 },
  clearText: { color: C.red, fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 50 },
  emptyText: { fontSize: 18, color: C.sub, fontWeight: '600' },
  emptyHint: { fontSize: 14, color: C.placeholder },
  list: { padding: 16, gap: 10 },
  orderRow: {
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: C.border,
  },
  orderInfo: { flex: 1 },
  orderName: { fontSize: 15, fontWeight: '600', color: C.text },
  orderOptions: { fontSize: 12, color: C.accent, marginTop: 2 },
  orderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  orderCat: { fontSize: 12, color: C.muted },
  sentBadge: { fontSize: 11, color: C.orange, fontWeight: '700' },
  newBadge: { fontSize: 11, color: C.green, fontWeight: '700' },
  orderNote: { fontSize: 12, color: C.orange, marginTop: 2, fontStyle: 'italic' },
  noteBtn: { padding: 4 },
  noteBtnText: { fontSize: 15, opacity: 0.75 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { backgroundColor: C.field, borderRadius: 6, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  qtyBtnPlus: { backgroundColor: C.greenBg, borderColor: C.greenBg },
  qtyBtnText: { color: C.red, fontSize: 18, fontWeight: '700' },
  qtyNum: { fontSize: 16, fontWeight: '700', color: C.text, minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] },
  orderPrice: { fontSize: 15, fontWeight: '700', color: C.green, minWidth: 55, textAlign: 'right', fontVariant: ['tabular-nums'] },
  trashBtn: { padding: 4 },
  trashText: { fontSize: 16 },
  totalRow: {
    backgroundColor: C.card, borderRadius: 12, padding: 16, marginTop: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: C.green,
  },
  totalLabel: { fontSize: 18, fontWeight: '700', color: C.text },
  totalValue: { fontSize: 24, fontWeight: '800', color: C.green, fontVariant: ['tabular-nums'] },
  bottom: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: C.border },
  orderNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  orderNoteIcon: { fontSize: 15 },
  orderNoteText: { flex: 1, fontSize: 13, color: C.orange, fontStyle: 'italic' },
  orderNotePlaceholder: { flex: 1, fontSize: 13, color: C.placeholder },
  menuBtn: { backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.accent },
  menuBtnText: { color: C.accent, fontSize: 16, fontWeight: '700' },
  kitchenBtn: { backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.orange },
  kitchenBtnText: { color: C.orange, fontSize: 16, fontWeight: '700' },
  sentHint: { color: C.placeholder, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  billBtn: { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  billBtnText: { color: C.accentText, fontSize: 16, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: C.card, borderRadius: 20, padding: 24, gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center' },
  input: {
    backgroundColor: C.field, borderRadius: 12, padding: 16,
    fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border,
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: C.field, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  cancelBtnText: { color: C.muted, fontSize: 16, fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmBtnText: { color: C.accentText, fontSize: 16, fontWeight: '700' },
  billOverlay: { flex: 1, backgroundColor: C.overlayHeavy, justifyContent: 'flex-end' },
  billSheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  billTitle: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 6 },
  billSelectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  billHint: { flex: 1, fontSize: 13, color: C.muted },
  billSelectAll: { color: C.accent, fontSize: 14, fontWeight: '800' },
  billItems: { marginBottom: 12 },
  billItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: C.accent },
  checkboxMark: { color: C.accentText, fontSize: 14, fontWeight: '900' },
  billItemName: { flex: 1, fontSize: 15, color: C.sub },
  billItemPrice: { fontSize: 15, color: C.sub, fontWeight: '600', fontVariant: ['tabular-nums'] },
  billItemOff: { color: C.faint, textDecorationLine: 'line-through' },
  billDivider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  billTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  billTotalLabel: { fontSize: 18, fontWeight: '700', color: C.text },
  billTotalVal: { fontSize: 22, fontWeight: '800', color: C.green, fontVariant: ['tabular-nums'] },
  payLabel: { fontSize: 14, color: C.muted, marginBottom: 10 },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quickAmount: { flex: 1, backgroundColor: C.field, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  quickAmountText: { color: C.accent, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  payInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.field, borderRadius: 12, borderWidth: 1, borderColor: C.accent, paddingHorizontal: 16, marginBottom: 16 },
  payInput: { flex: 1, fontSize: 28, fontWeight: '800', color: C.text, paddingVertical: 14, fontVariant: ['tabular-nums'] },
  payInputEuro: { fontSize: 28, fontWeight: '800', color: C.accent },
  changeRow: { backgroundColor: C.greenBg, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  changeRowRed: { backgroundColor: C.redBg },
  changeLabel: { fontSize: 16, fontWeight: '600', color: C.green },
  changeVal: { fontSize: 22, fontWeight: '800', color: C.green, fontVariant: ['tabular-nums'] },
  changeValRed: { color: C.red },
  methodRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  methodBtn: { flex: 1, backgroundColor: C.field, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  methodBtnActive: { backgroundColor: C.greenBg, borderColor: C.green },
  methodText: { color: C.muted, fontSize: 16, fontWeight: '700' },
  methodTextActive: { color: C.green },
  cardInfo: { backgroundColor: C.greenBg, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  cardInfoText: { color: C.green, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  payBtn: { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  payBtnText: { color: C.accentText, fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  closeBtn: { backgroundColor: C.field, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  closeBtnText: { color: C.muted, fontSize: 16, fontWeight: '600' },
});
