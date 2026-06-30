import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useApp } from '../context/AppContext';

export default function RolePickerScreen() {
  const { setRole } = useApp();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={s.content}>
        <Text style={s.logo}>🍹</Text>
        <Text style={s.title}>Panteboy PDA</Text>
        <Text style={s.subtitle}>Τι είναι αυτή η συσκευή;</Text>

        <TouchableOpacity style={[s.card, s.cardWaiter]} onPress={() => setRole('waiter')} activeOpacity={0.85}>
          <Text style={s.cardIcon}>📱</Text>
          <Text style={s.cardTitle}>Σερβιτόρος / Ταμείο</Text>
          <Text style={s.cardDesc}>Τραπέζια, παραγγελίες, λογαριασμοί, ιστορικό, κατάλογος</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, s.cardKitchen]} onPress={() => setRole('kitchen')} activeOpacity={0.85}>
          <Text style={s.cardIcon}>🍳</Text>
          <Text style={s.cardTitle}>Κουζίνα</Text>
          <Text style={s.cardDesc}>Μόνο οι παραγγελίες φαγητού — μεγάλη, καθαρή οθόνη</Text>
        </TouchableOpacity>

        <Text style={s.hint}>Μπορείς να το αλλάξεις αργότερα από το κουμπί «Αλλαγή ρόλου».</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  logo: { fontSize: 54, textAlign: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 12 },
  card: { borderRadius: 18, padding: 24, borderWidth: 2, gap: 6 },
  cardWaiter: { backgroundColor: '#16213e', borderColor: '#4ecca3' },
  cardKitchen: { backgroundColor: '#16213e', borderColor: '#e6a23c' },
  cardIcon: { fontSize: 40 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  cardDesc: { fontSize: 14, color: '#aaa' },
  hint: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 12 },
});
