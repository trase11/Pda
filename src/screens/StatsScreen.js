import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { C } from '../theme';

const RANGES = [
  { key: 'today', label: 'Σήμερα', days: 0 },
  { key: 'week', label: '7 ημέρες', days: 7 },
  { key: 'month', label: '30 ημέρες', days: 30 },
  { key: 'all', label: 'Όλα', days: null },
];

// Στατιστικά πωλήσεων πάνω στο ήδη φορτωμένο history (τα sales streamάρουν
// ολόκληρα σε κάθε συσκευή — γνωστός περιορισμός, οπότε εδώ δεν κοστίζει κάτι
// παραπάνω). Μία σειρά δεδομένων παντού ⇒ ένα hue (accent), χωρίς legend.
export default function StatsScreen() {
  const { history } = useApp();
  const [range, setRange] = useState('today');

  const stats = useMemo(() => {
    const def = RANGES.find(r => r.key === range);
    let start = null;
    if (def.days !== null) {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      if (def.days > 0) start.setDate(start.getDate() - def.days + 1);
    }
    const sales = history.filter(sale => !start || new Date(sale.paidAt) >= start);

    const revenue = sales.reduce((sum, s) => sum + s.total, 0);
    const count = sales.length;
    const itemCount = sales.reduce((sum, s) => sum + s.items.reduce((n, i) => n + i.qty, 0), 0);
    const cash = sales.filter(s => s.method !== 'card').reduce((sum, s) => sum + s.total, 0);
    const card = sales.filter(s => s.method === 'card').reduce((sum, s) => sum + s.total, 0);

    // Έσοδα ανά ώρα (0–23).
    const byHour = Array.from({ length: 24 }, () => 0);
    sales.forEach(s => { byHour[new Date(s.paidAt).getHours()] += s.total; });
    const maxHour = Math.max(...byHour);

    // Ανά κατηγορία — μόνο πωλήσεις που έχουν category στο snapshot
    // (παλιές εγγραφές πριν το πεδίο πάνε στο «Άλλα»).
    const byCat = {};
    const byItem = {};
    sales.forEach(s => s.items.forEach(i => {
      const cat = i.category || 'Άλλα';
      byCat[cat] = (byCat[cat] || 0) + i.price * i.qty;
      if (!byItem[i.name]) byItem[i.name] = { qty: 0, revenue: 0 };
      byItem[i.name].qty += i.qty;
      byItem[i.name].revenue += i.price * i.qty;
    }));
    const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const maxCat = catRows.length ? catRows[0][1] : 0;
    const topItems = Object.entries(byItem)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 8);

    return { revenue, count, itemCount, cash, card, byHour, maxHour, catRows, maxCat, topItems };
  }, [history, range]);

  const avg = stats.count > 0 ? stats.revenue / stats.count : 0;
  const itemsPer = stats.count > 0 ? stats.itemCount / stats.count : 0;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.rangeRow}>
        {RANGES.map(r => (
          <TouchableOpacity key={r.key} style={[s.rangeBtn, range === r.key && s.rangeBtnOn]} onPress={() => setRange(r.key)}>
            <Text style={[s.rangeText, range === r.key && s.rangeTextOn]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPI tiles */}
      <View style={s.kpiGrid}>
        <View style={s.kpi}>
          <Text style={s.kpiLabel}>Έσοδα</Text>
          <Text style={s.kpiValue}>{stats.revenue.toFixed(2)}€</Text>
        </View>
        <View style={s.kpi}>
          <Text style={s.kpiLabel}>Πληρωμές</Text>
          <Text style={s.kpiValue}>{stats.count}</Text>
        </View>
        <View style={s.kpi}>
          <Text style={s.kpiLabel}>Μέση απόδειξη</Text>
          <Text style={s.kpiValue}>{avg.toFixed(2)}€</Text>
        </View>
        <View style={s.kpi}>
          <Text style={s.kpiLabel}>Είδη / πληρωμή</Text>
          <Text style={s.kpiValue}>{itemsPer.toFixed(1)}</Text>
        </View>
      </View>

      {/* Μετρητά vs κάρτα */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Τρόπος πληρωμής</Text>
        <View style={s.methodRow}>
          <Text style={s.methodLabel}>💵 Μετρητά</Text>
          <Text style={s.methodValue}>{stats.cash.toFixed(2)}€</Text>
        </View>
        <View style={s.methodRow}>
          <Text style={s.methodLabel}>💳 Κάρτα</Text>
          <Text style={s.methodValue}>{stats.card.toFixed(2)}€</Text>
        </View>
      </View>

      {/* Έσοδα ανά ώρα — μία σειρά, ένα hue, ετικέτα μόνο στην κορυφή */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Έσοδα ανά ώρα</Text>
        {stats.maxHour <= 0 ? (
          <Text style={s.emptyChart}>Καμία πώληση στο διάστημα.</Text>
        ) : (
          <>
            <View style={s.hourChart}>
              {stats.byHour.map((v, h) => {
                const hPct = stats.maxHour > 0 ? (v / stats.maxHour) : 0;
                const isMax = v === stats.maxHour && v > 0;
                return (
                  <View key={h} style={s.hourCol}>
                    {isMax && <Text style={s.hourPeak}>{Math.round(v)}€</Text>}
                    <View style={[s.hourBar, { height: Math.max(hPct * 90, v > 0 ? 3 : 1) }, v > 0 && s.hourBarOn]} />
                  </View>
                );
              })}
            </View>
            <View style={s.hourAxis}>
              {['00', '06', '12', '18', '23'].map(t => (
                <Text key={t} style={s.hourTick}>{t}</Text>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Πωλήσεις ανά κατηγορία */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Ανά κατηγορία</Text>
        {stats.catRows.length === 0 ? (
          <Text style={s.emptyChart}>Καμία πώληση στο διάστημα.</Text>
        ) : stats.catRows.map(([cat, val]) => (
          <View key={cat} style={s.catRow}>
            <Text style={s.catName} numberOfLines={1}>{cat}</Text>
            <View style={s.catBarTrack}>
              <View style={[s.catBar, { width: `${stats.maxCat > 0 ? Math.max((val / stats.maxCat) * 100, 2) : 0}%` }]} />
            </View>
            <Text style={s.catValue}>{val.toFixed(2)}€</Text>
          </View>
        ))}
      </View>

      {/* Κορυφαία είδη */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Κορυφαία είδη (κατά έσοδα)</Text>
        {stats.topItems.length === 0 ? (
          <Text style={s.emptyChart}>Καμία πώληση στο διάστημα.</Text>
        ) : stats.topItems.map(([name, d], idx) => (
          <View key={name} style={s.topRow}>
            <Text style={s.topRank}>{idx + 1}.</Text>
            <View style={s.topInfo}>
              <Text style={s.topName} numberOfLines={1}>{name}</Text>
              <Text style={s.topQty}>{d.qty} τεμ.</Text>
            </View>
            <Text style={s.topValue}>{d.revenue.toFixed(2)}€</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  rangeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rangeBtn: { backgroundColor: C.card, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  rangeBtnOn: { backgroundColor: C.accentBg, borderColor: C.accent },
  rangeText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  rangeTextOn: { color: C.accent },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    flexGrow: 1, flexBasis: '45%', backgroundColor: C.card, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: C.border, gap: 4,
  },
  kpiLabel: { fontSize: 12, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 24, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyChart: { color: C.placeholder, fontSize: 13 },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  methodLabel: { color: C.sub, fontSize: 15 },
  methodValue: { color: C.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hourChart: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 2 },
  hourCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  hourPeak: { fontSize: 10, color: C.text, fontWeight: '700', marginBottom: 2, fontVariant: ['tabular-nums'] },
  hourBar: { alignSelf: 'stretch', backgroundColor: C.border, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  hourBarOn: { backgroundColor: C.accent },
  hourAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  hourTick: { fontSize: 10, color: C.faint, fontVariant: ['tabular-nums'] },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catName: { width: 90, fontSize: 13, color: C.sub },
  catBarTrack: { flex: 1, height: 10, backgroundColor: C.field, borderRadius: 5, overflow: 'hidden' },
  catBar: { height: 10, backgroundColor: C.accent, borderRadius: 5 },
  catValue: { minWidth: 64, textAlign: 'right', fontSize: 13, color: C.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topRank: { width: 22, fontSize: 14, color: C.muted, fontWeight: '700', fontVariant: ['tabular-nums'] },
  topInfo: { flex: 1 },
  topName: { fontSize: 14, color: C.text, fontWeight: '600' },
  topQty: { fontSize: 12, color: C.muted },
  topValue: { fontSize: 14, color: C.green, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
