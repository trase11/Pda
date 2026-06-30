import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useKitchen } from '../context/KitchenContext';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';

export default function KitchenScreen() {
  const { firebaseEnabled, pendingOrders, markReady } = useKitchen();
  const { setRole } = useApp();

  function handleChangeRole() {
    confirmAction('Αλλαγή ρόλου', 'Να επιστρέψεις στην επιλογή ρόλου;', () => setRole(null), 'Αλλαγή');
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  }

  if (!firebaseEnabled) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={s.header}>
          <Text style={s.headerTitle}>Κουζίνα</Text>
          <TouchableOpacity onPress={handleChangeRole} style={s.roleBtn}>
            <Text style={s.roleBtnText}>Αλλαγή ρόλου</Text>
          </TouchableOpacity>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyIcon}>⚙️</Text>
          <Text style={s.emptyText}>Δεν έχει ρυθμιστεί ακόμα</Text>
          <Text style={s.emptyHint}>Συμπλήρωσε τα στοιχεία Firebase για να ενεργοποιηθεί η σύνδεση με την κουζίνα.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Κουζίνα</Text>
          <Text style={s.headerSub}>{pendingOrders.length} σε αναμονή</Text>
        </View>
        <TouchableOpacity onPress={handleChangeRole} style={s.roleBtn}>
          <Text style={s.roleBtnText}>Αλλαγή ρόλου</Text>
        </TouchableOpacity>
      </View>

      {pendingOrders.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🍳</Text>
          <Text style={s.emptyText}>Καμία παραγγελία</Text>
          <Text style={s.emptyHint}>Οι νέες παραγγελίες φαγητού θα εμφανίζονται εδώ.</Text>
        </View>
      ) : (
        <FlatList
          data={pendingOrders}
          keyExtractor={o => o.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.ticket}>
              <View style={s.ticketHeader}>
                <Text style={s.ticketTable}>{item.tableName}</Text>
                <Text style={s.ticketTime}>{formatTime(item.createdAt)}</Text>
              </View>
              <View style={s.ticketItems}>
                {item.items.map((it, idx) => (
                  <Text key={idx} style={s.ticketItem}>
                    <Text style={s.ticketQty}>{it.qty}× </Text>{it.name}
                  </Text>
                ))}
              </View>
              <TouchableOpacity style={s.readyBtn} onPress={() => markReady(item.id)}>
                <Text style={s.readyBtnText}>✅ Έτοιμο</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#2d2d4e', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: '#888', marginTop: 2 },
  roleBtn: { backgroundColor: '#2d2d4e', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  roleBtnText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, color: '#aaa', fontWeight: '600' },
  emptyHint: { fontSize: 14, color: '#666', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  ticket: { backgroundColor: '#16213e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e6a23c' },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ticketTable: { fontSize: 20, fontWeight: '800', color: '#fff' },
  ticketTime: { fontSize: 14, color: '#888' },
  ticketItems: { gap: 6, marginBottom: 14 },
  ticketItem: { fontSize: 17, color: '#eee' },
  ticketQty: { fontWeight: '800', color: '#e6a23c' },
  readyBtn: { backgroundColor: '#4ecca3', borderRadius: 12, padding: 14, alignItems: 'center' },
  readyBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '800' },
});
