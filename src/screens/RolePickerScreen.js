import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';

export default function RolePickerScreen() {
  const { setRole, waiterName, setWaiterName } = useApp();
  const [name, setName] = useState(waiterName || '');

  function pickWaiter() {
    const n = name.trim();
    if (!n) return;
    setWaiterName(n);
    setRole('waiter');
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.logo}>🍹</Text>
        <Text style={s.title}>Panteboy PDA</Text>
        <Text style={s.subtitle}>Τι είναι αυτή η συσκευή;</Text>

        <View style={s.nameBox}>
          <Text style={s.nameLabel}>Το όνομά σου (για σερβιτόρο)</Text>
          <TextInput
            style={s.nameInput}
            placeholder="π.χ. Νίκος"
            placeholderTextColor="#777"
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={pickWaiter}
          />
        </View>

        <TouchableOpacity
          style={[s.card, s.cardWaiter, !name.trim() && s.cardDisabled]}
          onPress={pickWaiter}
          activeOpacity={0.85}
        >
          <Text style={s.cardIcon}>📱</Text>
          <Text style={s.cardTitle}>Σερβιτόρος / Ταμείο</Text>
          <Text style={s.cardDesc}>Τραπέζια του πόστου σου, παραγγελίες, λογαριασμοί, δουλειές σε βοηθούς</Text>
          {!name.trim() && <Text style={s.cardWarn}>Γράψε πρώτα το όνομά σου ↑</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, s.cardRunner]} onPress={() => setRole('runner')} activeOpacity={0.85}>
          <Text style={s.cardIcon}>🏃</Text>
          <Text style={s.cardTitle}>Βοηθός σέρβις</Text>
          <Text style={s.cardDesc}>Ειδοποίηση όταν έτοιμο φαγητό + δουλειές (ποτήρια, πάγος...)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, s.cardKitchen]} onPress={() => setRole('kitchen')} activeOpacity={0.85}>
          <Text style={s.cardIcon}>🍳</Text>
          <Text style={s.cardTitle}>Κουζίνα</Text>
          <Text style={s.cardDesc}>Μόνο οι παραγγελίες φαγητού — μεγάλη, καθαρή οθόνη</Text>
        </TouchableOpacity>

        <Text style={s.hint}>Μπορείς να το αλλάξεις αργότερα από το κουμπί «Αλλαγή ρόλου».</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 24, gap: 14, paddingTop: 40, paddingBottom: 40 },
  logo: { fontSize: 54, textAlign: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 8 },
  nameBox: { backgroundColor: '#16213e', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2d2d4e', gap: 8 },
  nameLabel: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  nameInput: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#2d2d4e' },
  card: { borderRadius: 18, padding: 22, borderWidth: 2, gap: 6 },
  cardDisabled: { opacity: 0.55 },
  cardWaiter: { backgroundColor: '#16213e', borderColor: '#4ecca3' },
  cardRunner: { backgroundColor: '#16213e', borderColor: '#6ea8fe' },
  cardKitchen: { backgroundColor: '#16213e', borderColor: '#e6a23c' },
  cardIcon: { fontSize: 38 },
  cardTitle: { fontSize: 21, fontWeight: '800', color: '#fff' },
  cardDesc: { fontSize: 14, color: '#aaa' },
  cardWarn: { fontSize: 12, color: '#e6a23c', marginTop: 4, fontWeight: '600' },
  hint: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 10 },
});
