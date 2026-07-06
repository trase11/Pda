import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useKitchen } from '../context/KitchenContext';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';

// Πόσα λεπτά αναμονής θεωρούνται «προσοχή» και «άργησε».
const WARN_MIN = 10;
const LATE_MIN = 20;

export default function KitchenScreen() {
  const { firebaseEnabled, pendingOrders, markReady } = useKitchen();
  const { setRole } = useApp();

  // Τικ κάθε 30" ώστε ο χρόνος αναμονής των δελτίων να ανανεώνεται.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  function handleChangeRole() {
    confirmAction('Αλλαγή ρόλου', 'Να επιστρέψεις στην επιλογή ρόλου;', () => setRole(null), 'Αλλαγή');
  }

  function toDate(ts) {
    if (!ts) return null;
    return ts.toDate ? ts.toDate() : new Date(ts);
  }

  function formatTime(ts) {
    const d = toDate(ts);
    return d ? d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }) : '';
  }

  function minutesWaiting(ts) {
    const d = toDate(ts);
    if (!d) return 0;
    return Math.max(0, Math.floor((now - d.getTime()) / 60000));
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
          renderItem={({ item }) => {
            const mins = minutesWaiting(item.createdAt);
            const late = mins >= LATE_MIN;
            const warn = !late && mins >= WARN_MIN;
            return (
              <View style={[s.ticket, warn && s.ticketWarn, late && s.ticketLate]}>
                <View style={s.ticketHeader}>
                  <Text style={s.ticketTable}>{item.tableName}</Text>
                  <View style={s.ticketTimes}>
                    <Text style={[s.ticketWait, warn && s.waitWarn, late && s.waitLate]}>{mins}′</Text>
                    <Text style={s.ticketTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                </View>
                <View style={s.ticketItems}>
                  {item.items.map((it, idx) => (
                    <View key={idx}>
                      <Text style={s.ticketItem}>
                        <Text style={s.ticketQty}>{it.qty}× </Text>{it.name}
                      </Text>
                      {!!it.note && <Text style={s.ticketNote}>📝 {it.note}</Text>}
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={s.readyBtn} onPress={() => markReady(item.id)} accessibilityRole="button" accessibilityLabel={`Έτοιμο ${item.tableName}`}>
                  <Text style={s.readyBtnText}>✅ Έτοιμο</Text>
                </TouchableOpacity>
              </View>
            );
          }}
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
  emptyHint: { fontSize: 14, color: '#8a8a9a', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  ticket: { backgroundColor: '#16213e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e6a23c' },
  ticketWarn: { borderColor: '#e6a23c', borderWidth: 2 },
  ticketLate: { borderColor: '#e74c3c', borderWidth: 2 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ticketTable: { fontSize: 20, fontWeight: '800', color: '#fff' },
  ticketTimes: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticketWait: { fontSize: 16, fontWeight: '800', color: '#4ecca3', fontVariant: ['tabular-nums'] },
  waitWarn: { color: '#e6a23c' },
  waitLate: { color: '#e74c3c' },
  ticketTime: { fontSize: 14, color: '#888', fontVariant: ['tabular-nums'] },
  ticketItems: { gap: 6, marginBottom: 14 },
  ticketItem: { fontSize: 17, color: '#eee' },
  ticketQty: { fontWeight: '800', color: '#e6a23c' },
  ticketNote: { fontSize: 14, color: '#e6a23c', fontStyle: 'italic', marginLeft: 24 },
  readyBtn: { backgroundColor: '#4ecca3', borderRadius: 12, padding: 14, alignItems: 'center' },
  readyBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '800' },
});
