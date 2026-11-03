import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { NyMark } from '@/components/ny-mark';
import { demoCustomer, useDemoCustomer } from '@/lib/demo-customer';

const sections = [
  { number: '01', title: 'Your details', note: 'Edit personal information, addresses and preferences' },
  { number: '02', title: 'Measurements', note: 'Save profiles and dated measurement history' },
];

export default function AccountScreen() {
  const { requests } = useDemoCustomer();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandLockup}><NyMark color={atelier.petrol} size={25} /><Text style={styles.wordmark}>NY ATELIER</Text></View>
          <Text style={styles.headerIndex}>YOUR SPACE  /  01</Text>
        </View>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>THE PERSONAL EDIT</Text>
          <Text style={styles.title}>Your space, Ama.</Text>
          <Text style={styles.copy}>Follow your consultation requests and explore the Atelier journey.</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>DEMO CUSTOMER ACCOUNT</Text>
          <Text style={styles.panelTitle}>{demoCustomer.name}</Text>
          <Text style={styles.panelCopy}>{demoCustomer.email}{'\n'}Customer ID · {demoCustomer.id}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/atelier')} style={styles.button}>
            <Text style={styles.buttonText}>REQUEST A CONSULTATION</Text>
            <Text style={styles.buttonArrow}>↗</Text>
          </Pressable>
        </View>
        <View style={styles.appointments}>
          <Text style={styles.eyebrow}>CONSULTATIONS</Text>
          <Text style={styles.appointmentsTitle}>{requests.length ? 'Your requests' : 'Your journey starts here.'}</Text>
          {requests.length ? requests.map((request) => <View key={request.id} style={styles.appointmentRow}>
            <Text style={styles.appointmentStatus}>AWAITING CONFIRMATION</Text>
            <Text style={styles.appointmentName}>{request.purpose}</Text>
            <Text style={styles.appointmentDetail}>{request.method === 'in-person' ? 'In person' : 'Virtual'} · {request.preferredDate} · {request.preferredTime}</Text>
            {request.notes ? <Text style={styles.appointmentNote}>{request.notes}</Text> : null}
          </View>) : <Text style={styles.emptyCopy}>Choose a preferred date and time for a free Atelier consultation.</Text>}
          <Text style={styles.demoNote}>This is a local demo account. Requests are saved on this device and have not been sent to NY Atelier.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/orders')} style={styles.ordersLink}><Text style={styles.ordersLinkText}>VIEW SAMPLE ORDERS  ↗</Text></Pressable>
        <View style={styles.future}>
          <Text style={styles.eyebrow}>MORE FOR YOUR ACCOUNT</Text>
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
  content: { paddingBottom: 125 },
  header: { paddingHorizontal: 24, height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
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
  button: { backgroundColor: atelier.alabaster, paddingHorizontal: 17, minHeight: 54, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: atelier.buttonRadius },
  buttonText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', letterSpacing: 1.2, fontSize: 11 },
  buttonArrow: { color: atelier.petrol, fontSize: 21 },
  future: { paddingHorizontal: 24, paddingTop: 48 },
  appointments: { paddingHorizontal: 24, paddingTop: 38 },
  appointmentsTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 25, marginBottom: 14 },
  appointmentRow: { borderTopWidth: 1, borderTopColor: atelier.line, paddingVertical: 18 },
  appointmentStatus: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.4, fontWeight: '700', marginBottom: 8 },
  appointmentName: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 17, fontWeight: '700', marginBottom: 5 },
  appointmentDetail: { color: atelier.slate, fontFamily: atelier.body, fontSize: 13 },
  appointmentNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 19, marginTop: 9 },
  emptyCopy: { color: atelier.slate, fontFamily: atelier.body, fontSize: 14, lineHeight: 21 },
  demoNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, lineHeight: 17, marginTop: 15 },
  ordersLink: { marginHorizontal: 24, marginTop: 25, borderTopWidth: 1, borderTopColor: atelier.line, paddingTop: 22 },
  ordersLinkText: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  row: { borderTopWidth: 1, borderTopColor: atelier.line, paddingVertical: 18, flexDirection: 'row', gap: 20 },
  number: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 11, marginTop: 3 },
  rowText: { flex: 1 },
  rowTitle: { color: atelier.slate, fontFamily: atelier.body, fontSize: 17, fontWeight: '700', marginBottom: 5 },
  rowNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 19 },
});
