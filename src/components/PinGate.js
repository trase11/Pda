import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { C } from '../theme';

// Κλειδώνει τη Διαχείριση πίσω από το 4ψήφιο PIN των ρυθμίσεων.
// Χωρίς ορισμένο PIN περνάει κατευθείαν. Το ξεκλείδωμα κρατά όσο ζει το
// session (in-memory) — refresh ξανακλειδώνει. Είναι προστασία ευκολίας
// (client-side), ΟΧΙ ασφάλεια: αυτή θα έρθει με τα Firestore rules.
export default function PinGate({ children }) {
  const { settings, adminUnlocked, unlockAdmin } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!settings.adminPin || adminUnlocked) {
    return <>{children}</>;
  }

  function tryUnlock() {
    if (unlockAdmin(pin)) {
      setPin('');
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.icon}>🔒</Text>
      <Text style={s.title}>Διαχείριση</Text>
      <Text style={s.hint}>Βάλε το PIN διαχείρισης για να συνεχίσεις</Text>
      <TextInput
        style={[s.input, error && s.inputError]}
        value={pin}
        onChangeText={t => { setPin(t.replace(/[^0-9]/g, '').slice(0, 4)); setError(false); }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        placeholder="••••"
        placeholderTextColor={C.placeholder}
        returnKeyType="done"
        onSubmitEditing={tryUnlock}
        accessibilityLabel="PIN διαχείρισης"
      />
      {error && <Text style={s.error}>Λάθος PIN — δοκίμασε ξανά</Text>}
      <TouchableOpacity
        style={[s.btn, pin.length < 4 && s.disabled]}
        onPress={tryUnlock}
        disabled={pin.length < 4}
        accessibilityRole="button"
        accessibilityLabel="Ξεκλείδωμα"
      >
        <Text style={s.btnText}>Ξεκλείδωμα</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, backgroundColor: C.bg },
  icon: { fontSize: 44 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  hint: { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 8 },
  input: {
    backgroundColor: C.field, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: 12,
    textAlign: 'center', paddingVertical: 14, paddingHorizontal: 24, minWidth: 180,
    fontVariant: ['tabular-nums'],
  },
  inputError: { borderColor: C.red },
  error: { color: C.red, fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, marginTop: 6 },
  btnText: { color: C.accentText, fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.4 },
});
