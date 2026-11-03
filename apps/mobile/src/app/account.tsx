import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';

const sections = [
  { number: '01', title: 'Your details', note: 'Personal information, addresses and preferences' },
  { number: '02', title: 'Measurements', note: 'Saved profiles and dated measurement history' },
  { number: '03', title: 'Appointments', note: 'Consultations and fittings in one place' },
];

export default function AccountScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>NY ATELIER</Text>
          <Text style={styles.headerIndex}>YOUR SPACE  /  01</Text>
        </View>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>THE PERSONAL EDIT</Text>
          <Text style={styles.title}>Every detail, in one place.</Text>
          <Text style={styles.copy}>Your account will carry your pieces, appointments and measurements through every NY Atelier journey.</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>TEAM PREVIEW</Text>
          <Text style={styles.panelTitle}>Your account is coming.</Text>
          <Text style={styles.panelCopy}>Sign-in is not connected in this fictional-data preview. You can explore sample orders now; placing an order or booking a consultation will require an account in the app.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/orders')} style={styles.button}>
            <Text style={styles.buttonText}>VIEW SAMPLE ORDERS</Text>
            <Text style={styles.buttonArrow}>↗</Text>
          </Pressable>
        </View>
        <View style={styles.future}>
          <Text style={styles.eyebrow}>COMING TO YOUR ACCOUNT</Text>
          {sections.map((section) => (
            <View key={section.number} style={styles.row}>
              <Text style={styles.number}>{section.number}</Text>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{section.title}</Text>
                <Text style={styles.rowNote}>{section.note}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { paddingBottom: 35 },
  header: { paddingHorizontal: 24, height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 16, fontWeight: '700', letterSpacing: 3.7 },
  headerIndex: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1 },
  intro: { paddingHorizontal: 24, paddingTop: 38, paddingBottom: 38 },
  eyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 2, marginBottom: 14 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 32, lineHeight: 41, marginBottom: 19 },
  copy: { color: atelier.slate, fontFamily: atelier.body, fontSize: 16, lineHeight: 24 },
  panel: { backgroundColor: atelier.petrol, marginHorizontal: 14, padding: 25 },
  panelEyebrow: { color: atelier.brass, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1.8, marginBottom: 17 },
  panelTitle: { color: atelier.white, fontFamily: atelier.display, fontSize: 25, lineHeight: 33, marginBottom: 14 },
  panelCopy: { color: '#DCE4DE', fontFamily: atelier.body, fontSize: 14, lineHeight: 22, marginBottom: 25 },
  button: { backgroundColor: atelier.alabaster, paddingHorizontal: 17, minHeight: 54, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buttonText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', letterSpacing: 1.2, fontSize: 11 },
  buttonArrow: { color: atelier.petrol, fontSize: 21 },
  future: { paddingHorizontal: 24, paddingTop: 48 },
  row: { borderTopWidth: 1, borderTopColor: atelier.line, paddingVertical: 18, flexDirection: 'row', gap: 20 },
  number: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 11, marginTop: 3 },
  rowText: { flex: 1 },
  rowTitle: { color: atelier.slate, fontFamily: atelier.body, fontSize: 17, fontWeight: '700', marginBottom: 5 },
  rowNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 19 },
});
