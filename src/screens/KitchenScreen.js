import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useKitchen } from '../context/KitchenContext';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';
import { beep, notify } from '../utils/notify';
import ShiftBar from '../components/ShiftBar';
import { C } from '../theme';

// Πόσα λεπτά αναμονής θεωρούνται «προσοχή» και «άργησε».
const WARN_MIN = 10;
const LATE_MIN = 20;

export default function KitchenScreen() {
  const { firebaseEnabled, pendingOrders, markReady } = useKitchen();
  const { setRole, onDuty } = useApp();

  // Τικ κάθε 30" ώστε ο χρόνος αναμονής των δελτίων να ανανεώνεται.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Ήχος + δόνηση + ειδοποίηση όταν φτάνει ΝΕΟ δελτίο από σερβιτόρο — μόνο
  // «σε βάρδια». Σύγκριση IDs, όχι πλήθους (βλ. RunnerScreen). Τα prev IDs
  // ενημερώνονται ΚΑΙ εκτός βάρδιας, ώστε η έναρξη βάρδιας να μη σκάσει
  // σωρευμένες ειδοποιήσεις για δελτία που ήδη φαίνονται στην οθόνη.
  const prevPendingIds = useRef(null);
  useEffect(() => {
    const ids = new Set(pendingOrders.map(o => o.id));
    if (prevPendingIds.current && onDuty) {
      const fresh = pendingOrders.filter(o => !prevPendingIds.current.has(o.id));
      if (fresh.length) {
        beep();
        notify('🍳 Νέο δελτίο', fresh.map(o => o.tableName).join(', '));
      }
    }
    prevPendingIds.current = ids;
  }, [pendingOrders, onDuty]);

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
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
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
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Κουζίνα</Text>
          <Text style={s.headerSub}>{pendingOrders.length} σε αναμονή</Text>
        </View>
        <TouchableOpacity onPress={handleChangeRole} style={s.roleBtn}>
          <Text style={s.roleBtnText}>Αλλαγή ρόλου</Text>
        </TouchableOpacity>
      </View>

      <ShiftBar hint="Μία φορά όταν ξεκινάς — αλλιώς δεν θα χτυπάει ήχος στα νέα δελτία." />

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
                {!!item.orderNote && <Text style={s.ticketOrderNote}>🗒 {item.orderNote}</Text>}
                <View style={s.ticketItems}>
                  {item.items.map((it, idx) => (
                    <View key={idx}>
                      <Text style={s.ticketItem}>
                        <Text style={s.ticketQty}>{it.qty}× </Text>{it.name}
                      </Text>
                      {!!it.options?.length && (
                        <Text style={s.ticketOptions}>➕ {it.options.join(', ')}</Text>
                      )}
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
  safe: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 14, color: C.muted, marginTop: 2 },
  roleBtn: { backgroundColor: C.card, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  roleBtnText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, color: C.sub, fontWeight: '600' },
  emptyHint: { fontSize: 14, color: C.placeholder, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  ticket: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.orange },
  ticketWarn: { borderColor: C.orange, borderWidth: 2 },
  ticketLate: { borderColor: C.red, borderWidth: 2 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ticketTable: { fontSize: 20, fontWeight: '800', color: C.text },
  ticketTimes: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticketWait: { fontSize: 16, fontWeight: '800', color: C.green, fontVariant: ['tabular-nums'] },
  waitWarn: { color: C.orange },
  waitLate: { color: C.red },
  ticketTime: { fontSize: 14, color: C.muted, fontVariant: ['tabular-nums'] },
  ticketOrderNote: { fontSize: 15, color: C.orange, fontWeight: '700', marginBottom: 8, backgroundColor: C.orangeBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden' },
  ticketItems: { gap: 6, marginBottom: 14 },
  ticketItem: { fontSize: 17, color: C.sub },
  ticketQty: { fontWeight: '800', color: C.orange },
  ticketOptions: { fontSize: 14, color: C.accent, marginLeft: 24 },
  ticketNote: { fontSize: 14, color: C.orange, fontStyle: 'italic', marginLeft: 24 },
  readyBtn: { backgroundColor: C.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  readyBtnText: { color: C.accentText, fontSize: 16, fontWeight: '800' },
});
