import React, { useMemo, useState } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';
import { C } from '../theme';

export default function HistoryScreen() {
  const { history, clearHistory } = useApp();
  const [search, setSearch] = useState('');

  function dateKey(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('el-GR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  }

  // Αναζήτηση σε τραπέζι, σερβιτόρο ή όνομα είδους.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(sale =>
      (sale.tableName || '').toLowerCase().includes(q) ||
      (sale.waiterName || '').toLowerCase().includes(q) ||
      sale.items.some(i => i.name.toLowerCase().includes(q))
    );
  }, [history, search]);

  // Ομαδοποίηση ανά ημέρα + «Σύνοψη ημέρας» (Ζ): πληρωμές, μετρητά, κάρτα.
  const sections = useMemo(() => {
    const groups = {};
    filtered.forEach(sale => {
      const key = dateKey(sale.paidAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(sale);
    });
    return Object.keys(groups).map(key => {
      const data = groups[key];
      const dayTotal = data.reduce((sum, s) => sum + s.total, 0);
      const dayCash = data.filter(s => s.method !== 'card').reduce((sum, s) => sum + s.total, 0);
      const dayCard = data.filter(s => s.method === 'card').reduce((sum, s) => sum + s.total, 0);
      return { title: key, dayTotal, dayCash, dayCard, count: data.length, data };
    });
  }, [filtered]);

  const grandTotal = filtered.reduce((sum, s) => sum + s.total, 0);

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
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Ιστορικό</Text>
          <Text style={s.headerSub}>Σύνολο: {grandTotal.toFixed(2)}€ · {filtered.length} πληρωμές</Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
            <Text style={s.clearText}>Καθαρισμός</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length > 0 && (
        <TextInput
          style={s.searchInput}
          placeholder="Αναζήτηση: τραπέζι, είδος, σερβιτόρος..."
          placeholderTextColor={C.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      )}

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🧾</Text>
          <Text style={s.emptyText}>{history.length === 0 ? 'Δεν υπάρχουν πληρωμές' : 'Κανένα αποτέλεσμα'}</Text>
          <Text style={s.emptyHint}>
            {history.length === 0
              ? 'Κάθε ολοκληρωμένη πληρωμή θα καταγράφεται εδώ.'
              : 'Δοκίμασε άλλον όρο αναζήτησης.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <View style={s.sectionTopRow}>
                <Text style={s.sectionTitle}>{section.title}</Text>
                <Text style={s.sectionTotal}>{section.dayTotal.toFixed(2)}€</Text>
              </View>
              <Text style={s.sectionZ}>
                {section.count} πληρωμές · 💵 {section.dayCash.toFixed(2)}€ · 💳 {section.dayCard.toFixed(2)}€
              </Text>
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
                <Text style={s.saleTime}>{formatTime(item.paidAt)}{item.waiterName ? ` · ${item.waiterName}` : ''}</Text>
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
  safe: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 13, color: C.green, marginTop: 2, fontWeight: '600' },
  clearBtn: { padding: 6 },
  clearText: { color: C.red, fontSize: 14, fontWeight: '600' },
  searchInput: {
    backgroundColor: C.card, marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 12, fontSize: 15, color: C.text,
    borderWidth: 1, borderColor: C.border,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, color: C.sub, fontWeight: '600' },
  emptyHint: { fontSize: 14, color: C.placeholder, textAlign: 'center' },
  list: { padding: 16, gap: 8 },
  sectionHeader: { marginTop: 14, marginBottom: 8, gap: 2 },
  sectionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.muted, textTransform: 'capitalize' },
  sectionTotal: { fontSize: 14, fontWeight: '800', color: C.green, fontVariant: ['tabular-nums'] },
  sectionZ: { fontSize: 12, color: C.muted, fontVariant: ['tabular-nums'] },
  sale: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  saleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  saleTable: { fontSize: 16, fontWeight: '700', color: C.text },
  saleRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  methodCash: { backgroundColor: C.greenBg },
  methodCard: { backgroundColor: C.blueBg },
  methodTagText: { fontSize: 11, color: C.sub, fontWeight: '700' },
  saleTotal: { fontSize: 18, fontWeight: '800', color: C.green, fontVariant: ['tabular-nums'] },
  saleItems: { fontSize: 13, color: C.muted, marginBottom: 6 },
  saleBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  saleTime: { fontSize: 12, color: C.faint },
  saleChange: { fontSize: 12, color: C.faint },
});
