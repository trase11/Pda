import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import PinGate from '../components/PinGate';
import StatsScreen from './StatsScreen';
import MenuManagerScreen from './MenuManagerScreen';
import SettingsScreen from './SettingsScreen';
import { C } from '../theme';

const TABS = [
  { key: 'stats', label: '📊 Στατιστικά' },
  { key: 'menu', label: '📋 Κατάλογος' },
  { key: 'settings', label: '⚙️ Ρυθμίσεις' },
];

// «Διαχείριση» του σερβιτόρου: Στατιστικά + Κατάλογος + Ρυθμίσεις πίσω από
// (προαιρετικό) PIN. Οι εσωτερικές οθόνες είναι content-only — το header
// και τα segments ζουν εδώ.
export default function ManageScreen() {
  const [tab, setTab] = useState('stats');

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Διαχείριση</Text>
      </View>

      <PinGate>
        <View style={s.tabRow}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[s.tabBtn, tab === t.key && s.tabBtnOn]} onPress={() => setTab(t.key)}>
              <Text style={[s.tabText, tab === t.key && s.tabTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === 'stats' && <StatsScreen />}
        {tab === 'menu' && <MenuManagerScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </PinGate>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text },
  tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 12 },
  tabBtn: { flex: 1, backgroundColor: C.card, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  tabBtnOn: { backgroundColor: C.accentBg, borderColor: C.accent },
  tabText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  tabTextOn: { color: C.accent },
});
