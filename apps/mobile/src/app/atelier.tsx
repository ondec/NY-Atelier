import { router } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { NyMark } from '@/components/ny-mark';
import { demoCustomer, useDemoCustomer } from '@/lib/demo-customer';

const services = [
  { number: '01', title: 'Measurements & fittings', note: 'A fit that belongs to you.' },
  { number: '02', title: 'Fabric selection', note: 'Explore cloth and finish together.' },
  { number: '03', title: 'Styling', note: 'Consider every detail of the look.' },
];

export default function AtelierScreen() {
  const [method, setMethod] = useState<'in-person' | 'virtual'>('in-person');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [purpose, setPurpose] = useState('Custom clothing');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const { requests, addRequest } = useDemoCustomer();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index + 1);
    return { value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, day: date.toLocaleDateString('en-GH', { weekday: 'short' }), date: date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }) };
  });
  const purposeOptions = ['Custom clothing', 'Occasion outfit', 'Measurements & fit', 'Other'];
  const timeOptions = ['10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM'];
  const canSubmit = !!preferredDate && !!preferredTime;

  const submitRequest = () => {
    if (!canSubmit) return;
    addRequest({ method, purpose, preferredDate, preferredTime, notes: notes.trim() });
    setBookingOpen(false);
    setPreferredDate('');
    setPreferredTime('');
    setNotes('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandLockup}><NyMark color={atelier.petrol} size={25} /><Text style={styles.wordmark}>NY ATELIER</Text></View>
          <Text style={styles.headerIndex}>THE ATELIER  /  01</Text>
        </View>

        <ImageBackground source={require('../../assets/ny/atelier.jpg')} resizeMode="cover" imageStyle={styles.heroImage} style={styles.hero}>
          <View style={styles.heroOverlay}>
            <Text style={styles.heroCaption}>CUSTOM CLOTHING · BESPOKE CRAFT</Text>
          </View>
        </ImageBackground>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>THE PERSONAL JOURNEY</Text>
          <Text style={styles.title}>Made around you.</Text>
          <View style={styles.rule} />
          <Text style={styles.introCopy}>From the first conversation to the final fitting, your piece is shaped around your vision.</Text>
        </View>

        <View style={styles.booking}>
          <Text style={styles.bookingEyebrow}>BEGIN WITH A CONVERSATION</Text>
          <Text style={styles.bookingTitle}>Book a consultation</Text>
          <Text style={styles.bookingCopy}>Meet with NY Atelier to discuss your garment, fabric, measurements and timeline.</Text>
          <View style={styles.methods}>
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: method === 'in-person' }} onPress={() => setMethod('in-person')} style={[styles.method, method === 'in-person' && styles.methodSelected]}>
              <View style={[styles.radio, method === 'in-person' && styles.radioSelected]} />
              <Text style={styles.methodText}>In person</Text>
            </Pressable>
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: method === 'virtual' }} onPress={() => setMethod('virtual')} style={[styles.method, method === 'virtual' && styles.methodSelected]}>
              <View style={[styles.radio, method === 'virtual' && styles.radioSelected]} />
              <Text style={styles.methodText}>Virtual</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={() => setBookingOpen(true)} style={styles.bookingButton}>
            <Text style={styles.bookingButtonText}>REQUEST A CONSULTATION</Text>
            <Text style={styles.bookingArrow}>↗</Text>
          </Pressable>
          <Text style={styles.bookingNote}>Free consultation · A request is confirmed by the team.</Text>
        </View>

        {requests.length > 0 ? <View style={styles.requestPanel}>
          <Text style={styles.eyebrow}>YOUR CONSULTATION REQUESTS</Text>
          {requests.map((request) => <View key={request.id} style={styles.requestRow}>
            <Text style={styles.requestStatus}>AWAITING CONFIRMATION</Text>
            <Text style={styles.requestTitle}>{request.purpose}</Text>
            <Text style={styles.requestDetail}>{request.method === 'in-person' ? 'In person' : 'Virtual'} · {request.preferredDate} · {request.preferredTime}</Text>
          </View>)}
          <Text style={styles.requestNote}>These requests are saved on this device for the team demo. The NY Atelier team has not received them yet.</Text>
        </View> : null}

        <View style={styles.services}>
          <Text style={styles.eyebrow}>EXPLORE THE ATELIER</Text>
          <Text style={styles.servicesTitle}>The details make it yours.</Text>
          {services.map((service) => (
            <View key={service.number} style={styles.serviceRow}>
              <Text style={styles.serviceNumber}>{service.number}</Text>
              <View style={styles.serviceText}>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceNote}>{service.note}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/orders')} style={styles.trackingLink}>
          <Text style={styles.trackingTitle}>Already creating with us?</Text>
          <Text style={styles.trackingText}>VIEW YOUR ORDERS  ↗</Text>
        </Pressable>
        <Text style={styles.previewNote}>Team preview · consultation requests stay on this device until booking is connected. Alterations are created in-store and appear in Orders.</Text>
      </ScrollView>

      <Modal animationType="slide" visible={bookingOpen} onRequestClose={() => setBookingOpen(false)}>
        <SafeAreaView style={styles.formSafe} edges={['top']}>
          <View style={styles.formHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close consultation request" onPress={() => setBookingOpen(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>×</Text></Pressable>
            <Text style={styles.formHeaderLabel}>THE ATELIER</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.formContent, { paddingBottom: Math.max(insets.bottom, 20) + 30 }]}>
            <Text style={styles.eyebrow}>BEGIN YOUR JOURNEY</Text>
            <Text style={styles.modalTitle}>Request a consultation.</Text>
            <Text style={styles.modalCopy}>Choose a preferred time to discuss your idea. The team will confirm the appointment later.</Text>
            <View style={styles.demoIdentity}><NyMark color={atelier.petrol} size={26} /><View><Text style={styles.demoIdentityTitle}>{demoCustomer.name}</Text><Text style={styles.demoIdentityNote}>DEMO CUSTOMER ACCOUNT</Text></View></View>

            <Text style={styles.formLabel}>HOW WOULD YOU LIKE TO MEET?</Text>
            <View style={styles.formOptions}>{(['in-person', 'virtual'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: method === value }} onPress={() => setMethod(value)} style={[styles.formChip, method === value && styles.formChipSelected]}><Text style={[styles.formChipText, method === value && styles.formChipTextSelected]}>{value === 'in-person' ? 'In person' : 'Virtual'}</Text></Pressable>)}</View>
            <Text style={styles.formLabel}>WHAT CAN WE HELP WITH?</Text>
            <View style={styles.formOptions}>{purposeOptions.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: purpose === value }} onPress={() => setPurpose(value)} style={[styles.formChip, purpose === value && styles.formChipSelected]}><Text style={[styles.formChipText, purpose === value && styles.formChipTextSelected]}>{value}</Text></Pressable>)}</View>
            <Text style={styles.formLabel}>PREFERRED DATE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateOptions}>{dates.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: preferredDate === option.value }} onPress={() => setPreferredDate(option.value)} style={[styles.dateChip, preferredDate === option.value && styles.formChipSelected]}><Text style={[styles.dateDay, preferredDate === option.value && styles.formChipTextSelected]}>{option.day}</Text><Text style={[styles.dateDate, preferredDate === option.value && styles.formChipTextSelected]}>{option.date}</Text></Pressable>)}</ScrollView>
            <Text style={styles.formLabel}>PREFERRED TIME</Text>
            <View style={styles.formOptions}>{timeOptions.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: preferredTime === value }} onPress={() => setPreferredTime(value)} style={[styles.formChip, preferredTime === value && styles.formChipSelected]}><Text style={[styles.formChipText, preferredTime === value && styles.formChipTextSelected]}>{value}</Text></Pressable>)}</View>
            <Text style={styles.formLabel}>TELL US ABOUT YOUR IDEA · OPTIONAL</Text>
            <TextInput accessibilityLabel="Notes for NY Atelier" multiline value={notes} onChangeText={setNotes} placeholder="The garment, occasion or fit you have in mind…" placeholderTextColor={atelier.muted} style={styles.notesInput} textAlignVertical="top" />
            <Text style={styles.formDisclaimer}>Preferred dates and times are requests, not available slots. This demo stays on this device until booking is connected.</Text>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSubmit }} disabled={!canSubmit} onPress={submitRequest} style={[styles.modalButton, !canSubmit && styles.modalButtonDisabled]}><Text style={styles.modalButtonText}>SEND DEMO REQUEST  ↗</Text></Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { paddingBottom: 115 },
  header: { paddingHorizontal: 24, height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wordmark: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 16, fontWeight: '700', letterSpacing: 3.7 },
  headerIndex: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1 },
  hero: { height: 270, marginHorizontal: 14, borderRadius: 18, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6, 20, 24, 0.15)', padding: 24 },
  heroCaption: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1.8 },
  intro: { paddingHorizontal: 24, paddingTop: 36, paddingBottom: 37 },
  eyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 2, marginBottom: 14 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 31, lineHeight: 39 },
  rule: { width: 51, height: 2, backgroundColor: atelier.brass, marginTop: 23, marginBottom: 20 },
  introCopy: { color: atelier.slate, fontFamily: atelier.body, fontSize: 16, lineHeight: 24 },
  booking: { backgroundColor: atelier.petrol, marginHorizontal: 14, paddingHorizontal: 25, paddingTop: 31, paddingBottom: 27 },
  bookingEyebrow: { color: atelier.brass, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1.8, marginBottom: 15 },
  bookingTitle: { color: atelier.white, fontFamily: atelier.display, fontSize: 26, lineHeight: 34, marginBottom: 13 },
  bookingCopy: { color: '#DCE4DE', fontFamily: atelier.body, fontSize: 14, lineHeight: 21, marginBottom: 22 },
  methods: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  method: { flex: 1, borderWidth: 1, borderColor: '#86A0A3', paddingVertical: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: atelier.buttonRadius },
  methodSelected: { borderColor: atelier.brass, backgroundColor: '#28525A' },
  radio: { width: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: '#B9CCCA' },
  radioSelected: { borderWidth: 4, borderColor: atelier.brass, backgroundColor: atelier.petrol },
  methodText: { color: atelier.white, fontFamily: atelier.body, fontSize: 13, fontWeight: '600' },
  bookingButton: { backgroundColor: atelier.alabaster, minHeight: 54, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: atelier.buttonRadius },
  bookingButtonText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 12, letterSpacing: 1.1, fontWeight: '700' },
  bookingArrow: { color: atelier.petrol, fontSize: 21 },
  bookingNote: { color: '#C5D4D2', fontFamily: atelier.body, fontSize: 11, marginTop: 14 },
  services: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 26 },
  servicesTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 25, lineHeight: 33, marginBottom: 28 },
  serviceRow: { borderTopWidth: 1, borderTopColor: atelier.line, flexDirection: 'row', gap: 20, paddingVertical: 19 },
  serviceNumber: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 11, marginTop: 3 },
  serviceText: { flex: 1 },
  serviceTitle: { color: atelier.slate, fontFamily: atelier.body, fontWeight: '700', fontSize: 17, marginBottom: 4 },
  serviceNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13 },
  trackingLink: { marginHorizontal: 24, borderTopWidth: 1, borderTopColor: atelier.line, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  trackingTitle: { color: atelier.slate, fontFamily: atelier.body, fontSize: 14, flex: 1 },
  trackingText: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1 },
  previewNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, lineHeight: 16, paddingHorizontal: 24, paddingBottom: 34 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(8, 24, 27, 0.56)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: atelier.alabaster, paddingHorizontal: 25, paddingTop: 25, paddingBottom: 35 },
  modalClose: { alignSelf: 'flex-end', width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { color: atelier.petrol, fontSize: 30, lineHeight: 32 },
  modalTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 27, lineHeight: 35, marginBottom: 14 },
  modalCopy: { color: atelier.slate, fontFamily: atelier.body, fontSize: 15, lineHeight: 23, marginBottom: 28 },
  modalButton: { backgroundColor: atelier.petrol, paddingVertical: 17, alignItems: 'center', borderRadius: atelier.buttonRadius },
  modalButtonText: { color: atelier.white, fontFamily: atelier.body, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  requestPanel: { marginHorizontal: 24, marginTop: 30 },
  requestRow: { borderTopWidth: 1, borderTopColor: atelier.line, paddingVertical: 17 },
  requestStatus: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 },
  requestTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 20, marginBottom: 5 },
  requestDetail: { color: atelier.slate, fontFamily: atelier.body, fontSize: 13 },
  requestNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, lineHeight: 17, marginTop: 8 },
  formSafe: { flex: 1, backgroundColor: atelier.alabaster },
  formHeader: { height: 54, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formHeaderLabel: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1.8 },
  formContent: { paddingHorizontal: 24, paddingTop: 25 },
  demoIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: atelier.white, borderRadius: 16, marginBottom: 28 },
  demoIdentityTitle: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 15, fontWeight: '700' },
  demoIdentityNote: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1.3, marginTop: 3 },
  formLabel: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 11, letterSpacing: 1.2, fontWeight: '700', marginBottom: 13 },
  formOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 28 },
  formChip: { borderWidth: 1, borderColor: atelier.line, paddingHorizontal: 18, minHeight: 43, borderRadius: 24, justifyContent: 'center', backgroundColor: atelier.white },
  formChipSelected: { backgroundColor: atelier.petrol, borderColor: atelier.petrol },
  formChipText: { color: atelier.slate, fontFamily: atelier.body, fontSize: 13, fontWeight: '600' },
  formChipTextSelected: { color: atelier.white },
  dateOptions: { gap: 9, paddingBottom: 28 },
  dateChip: { minWidth: 78, minHeight: 69, borderRadius: 17, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white, alignItems: 'center', justifyContent: 'center' },
  dateDay: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, marginBottom: 4 },
  dateDate: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 13, fontWeight: '700' },
  notesInput: { minHeight: 115, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white, borderRadius: 16, padding: 15, color: atelier.petrol, fontFamily: atelier.body, fontSize: 14, marginBottom: 16 },
  formDisclaimer: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18, marginBottom: 24 },
  modalButtonDisabled: { opacity: 0.45 },
});
