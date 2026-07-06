import React, { useMemo } from 'react';
import {
  View, Text, SectionList, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';

export default function HistoryScreen() {
  const { history, clearHistory } = useApp();

  function dateKey(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('el-GR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  }

  // Ομαδοποίηση ανά ημέρα + ημερήσιο σύνολο.
  const sections = useMemo(() => {
    const groups = {};
    history.forEach(sale => {
      const key = dateKey(sale.paidAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(sale);
    });
    return Object.keys(groups).map(key => {
      const data = groups[key];
      const dayTotal = data.reduce((sum, s) => sum + s.total, 0);
      return { title: key, dayTotal, data };
    });
  }, [history]);

  const grandTotal = history.reduce((sum, s) => sum + s.total, 0);

  function handleClear() {
    confirmAction(
      'Διαγραφή ιστορικού',
      'Να διαγραφούν όλες οι καταχωρήσεις; Δεν αναιρείται.',
      clearHistory,
      'Διαγραφή'
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Ιστορικό</Text>
          <Text style={s.headerSub}>Σύνολο: {grandTotal.toFixed(2)}€ · {history.length} πληρωμές</Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
            <Text style={s.clearText}>Καθαρισμός</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🧾</Text>
          <Text style={s.emptyText}>Δεν υπάρχουν πληρωμές</Text>
          <Text style={s.emptyHint}>Κάθε ολοκληρωμένη πληρωμή θα καταγράφεται εδώ.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.sectionTotal}>{section.dayTotal.toFixed(2)}€</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={s.sale}>
              <View style={s.saleTop}>
                <Text style={s.saleTable}>{item.tableName}</Text>
                <View style={s.saleRight}>
                  <View style={[s.methodTag, item.method === 'card' ? s.methodCard : s.methodCash]}>
                    <Text style={s.methodTagText}>{item.method === 'card' ? '💳 Κάρτα' : '💵 Μετρητά'}</Text>
                  </View>
                  <Text style={s.saleTotal}>{item.total.toFixed(2)}€</Text>
                </View>
              </View>
              <Text style={s.saleItems}>
                {item.items.map(i => `${i.qty}× ${i.name}`).join(', ')}
              </Text>
              <View style={s.saleBottom}>
                <Text style={s.saleTime}>{formatTime(item.paidAt)}</Text>
                {item.method === 'cash' && item.change > 0 && (
                  <Text style={s.saleChange}>Έδωσε {item.given.toFixed(2)}€ · Ρέστα {item.change.toFixed(2)}€</Text>
                )}
              </View>
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
  headerSub: { fontSize: 13, color: '#4ecca3', marginTop: 2, fontWeight: '600' },
  clearBtn: { padding: 6 },
  clearText: { color: '#e74c3c', fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, color: '#aaa', fontWeight: '600' },
  emptyHint: { fontSize: 14, color: '#8a8a9a', textAlign: 'center' },
  list: { padding: 16, gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#888', textTransform: 'capitalize' },
  sectionTotal: { fontSize: 14, fontWeight: '800', color: '#4ecca3', fontVariant: ['tabular-nums'] },
  sale: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2d2d4e' },
  saleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  saleTable: { fontSize: 16, fontWeight: '700', color: '#fff' },
  saleRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  methodCash: { backgroundColor: '#1a3a2e' },
  methodCard: { backgroundColor: '#1a2a4e' },
  methodTagText: { fontSize: 11, color: '#ccc', fontWeight: '700' },
  saleTotal: { fontSize: 18, fontWeight: '800', color: '#4ecca3', fontVariant: ['tabular-nums'] },
  saleItems: { fontSize: 13, color: '#aaa', marginBottom: 6 },
  saleBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  saleTime: { fontSize: 12, color: '#666' },
  saleChange: { fontSize: 12, color: '#666' },
});
