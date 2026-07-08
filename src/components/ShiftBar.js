import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { C } from '../theme';

// Μπάρα βάρδιας για τις οθόνες που λαμβάνουν ειδοποιήσεις (κουζίνα, βοηθός).
// Ήχος/δόνηση/notification παίζουν ΜΟΝΟ όσο η συσκευή είναι «σε βάρδια» —
// έτσι όποιος έχει απλώς ανοιχτή την εφαρμογή στο κινητό του δεν ενοχλείται.
// Το tap της έναρξης ξεκλειδώνει και τον ήχο στο web (βλ. utils/notify.js).
export default function ShiftBar({ hint = 'Ήχος και ειδοποιήσεις παίζουν μόνο σε όσους είναι σε βάρδια.' }) {
  const { onDuty, startShift, endShift } = useApp();

  if (!onDuty) {
    return (
      <TouchableOpacity
        style={s.startBar}
        onPress={startShift}
        accessibilityRole="button"
        accessibilityLabel="Έναρξη βάρδιας"
      >
        <Text style={s.startIcon}>🔔</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.startTitle}>Πάτα για έναρξη βάρδιας</Text>
          <Text style={s.startSub}>{hint}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.onRow}>
      <Text style={s.onText}>🟢 Σε βάρδια — οι ειδοποιήσεις παίζουν</Text>
      <TouchableOpacity
        style={s.endBtn}
        onPress={endShift}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Τέλος βάρδιας"
      >
        <Text style={s.endBtnText}>Τέλος βάρδιας</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  startBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.greenBg, borderColor: C.green, borderWidth: 1, borderRadius: 12, padding: 14, margin: 16, marginBottom: 0 },
  startIcon: { fontSize: 26 },
  startTitle: { color: C.green, fontSize: 16, fontWeight: '800' },
  startSub: { color: C.sub, fontSize: 12, marginTop: 2 },
  onRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginHorizontal: 16, marginTop: 12, marginBottom: 0 },
  onText: { color: C.green, fontSize: 13, fontWeight: '600', flex: 1 },
  endBtn: { backgroundColor: C.field, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: C.border },
  endBtnText: { color: C.muted, fontSize: 12, fontWeight: '600' },
});
