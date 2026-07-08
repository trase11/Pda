import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { confirmAction } from '../utils/confirm';
import { C } from '../theme';

// Ρυθμίσεις καταστήματος (config/settings — κοινές σε όλες τις συσκευές).
// Τα στοιχεία επιχείρησης δεν εμφανίζονται πουθενά ακόμα: θα μπουν στην
// κεφαλίδα/υποσέλιδο του εκτυπωμένου λογαριασμού όταν προστεθεί η
// εκτύπωση (βλ. CLAUDE.md «Μελλοντικά»).
export default function SettingsScreen() {
  const { settings, saveSettings, setRole } = useApp();
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [vat, setVat] = useState(settings.vat);
  const [footerNote, setFooterNote] = useState(settings.footerNote);
  const [waitAlertMin, setWaitAlertMin] = useState(String(settings.waitAlertMin));
  const [adminPin, setAdminPin] = useState(settings.adminPin);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const mins = parseInt(String(waitAlertMin).replace(',', '.'), 10);
    saveSettings({
      businessName: businessName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      vat: vat.trim(),
      footerNote: footerNote.trim(),
      waitAlertMin: isNaN(mins) || mins < 0 ? 0 : mins,
      adminPin: adminPin.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.section}>Στοιχεία επιχείρησης</Text>
      <Text style={s.sectionHint}>Θα εμφανίζονται στον εκτυπωμένο λογαριασμό/απόδειξη όταν προστεθεί η εκτύπωση.</Text>
      <Text style={s.label}>Επωνυμία</Text>
      <TextInput style={s.input} placeholder="π.χ. Panteboy Bar" placeholderTextColor={C.placeholder} value={businessName} onChangeText={setBusinessName} />
      <Text style={s.label}>Τηλέφωνο</Text>
      <TextInput style={s.input} placeholder="π.χ. 2310 123456" placeholderTextColor={C.placeholder} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Text style={s.label}>Διεύθυνση</Text>
      <TextInput style={s.input} placeholder="Οδός, αριθμός, πόλη" placeholderTextColor={C.placeholder} value={address} onChangeText={setAddress} />
      <Text style={s.label}>ΑΦΜ</Text>
      <TextInput style={s.input} placeholder="π.χ. 123456789" placeholderTextColor={C.placeholder} value={vat} onChangeText={setVat} keyboardType="number-pad" />
      <Text style={s.label}>Υποσέλιδο σημείωμα</Text>
      <TextInput
        style={[s.input, s.multiline]}
        placeholder="π.χ. Ευχαριστούμε — δεν αποτελεί φορολογική απόδειξη"
        placeholderTextColor={C.placeholder}
        value={footerNote}
        onChangeText={setFooterNote}
        multiline
      />

      <Text style={s.section}>Λειτουργία</Text>
      <Text style={s.label}>Ειδοποίηση αναμονής κουζίνας (λεπτά)</Text>
      <Text style={s.fieldHint}>Τραπέζι με δελτίο σε αναμονή πάνω από τόσα λεπτά σημαίνεται κόκκινο στα Τραπέζια. 0 = απενεργοποίηση.</Text>
      <TextInput style={s.input} placeholder="20" placeholderTextColor={C.placeholder} value={waitAlertMin} onChangeText={setWaitAlertMin} keyboardType="number-pad" />

      <Text style={s.section}>PIN Διαχείρισης</Text>
      <Text style={s.fieldHint}>4 ψηφία — ζητείται για να ανοίξει η Διαχείριση. Άφησέ το κενό για να απενεργοποιηθεί. Είναι απλό κλείδωμα ευκολίας, όχι πραγματική ασφάλεια.</Text>
      <TextInput
        style={s.input}
        placeholder="π.χ. 1234 (κενό = χωρίς PIN)"
        placeholderTextColor={C.placeholder}
        value={adminPin}
        onChangeText={t => setAdminPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
      />

      <TouchableOpacity style={s.saveBtn} onPress={handleSave} accessibilityRole="button" accessibilityLabel="Αποθήκευση ρυθμίσεων">
        <Text style={s.saveBtnText}>{saved ? '✓ Αποθηκεύτηκε' : 'Αποθήκευση'}</Text>
      </TouchableOpacity>

      <View style={s.roleBox}>
        <Text style={s.fieldHint}>Αλλαγή ρόλου συσκευής (σερβιτόρος / κουζίνα / βοηθός):</Text>
        <TouchableOpacity
          style={s.roleBtn}
          onPress={() => confirmAction('Αλλαγή ρόλου', 'Να επιστρέψεις στην επιλογή ρόλου;', () => setRole(null), 'Αλλαγή')}
          accessibilityRole="button"
          accessibilityLabel="Αλλαγή ρόλου"
        >
          <Text style={s.roleBtnText}>Αλλαγή ρόλου συσκευής</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  section: { fontSize: 14, fontWeight: '700', color: C.accent, textTransform: 'uppercase', letterSpacing: 1, marginTop: 14 },
  sectionHint: { fontSize: 12, color: C.placeholder },
  label: { fontSize: 13, color: C.muted, fontWeight: '600', marginTop: 6 },
  fieldHint: { fontSize: 12, color: C.placeholder },
  input: {
    backgroundColor: C.field, borderRadius: 12, padding: 14,
    fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 18 },
  saveBtnText: { color: C.accentText, fontSize: 16, fontWeight: '800' },
  roleBox: { marginTop: 24, gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16 },
  roleBtn: { backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  roleBtnText: { color: C.muted, fontSize: 14, fontWeight: '600' },
});
