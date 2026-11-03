import { router } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';

const services = [
  { number: '01', title: 'Measurements & fittings', note: 'A fit that belongs to you.' },
  { number: '02', title: 'Fabric selection', note: 'Explore cloth and finish together.' },
  { number: '03', title: 'Styling', note: 'Consider every detail of the look.' },
];

export default function AtelierScreen() {
  const [method, setMethod] = useState<'in-person' | 'virtual'>('in-person');
  const [showGate, setShowGate] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>NY ATELIER</Text>
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
          <Pressable accessibilityRole="button" onPress={() => setShowGate(true)} style={styles.bookingButton}>
            <Text style={styles.bookingButtonText}>BOOK A CONSULTATION</Text>
            <Text style={styles.bookingArrow}>↗</Text>
          </Pressable>
          <Text style={styles.bookingNote}>Free consultation · A request is confirmed by the team.</Text>
        </View>

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
        <Text style={styles.previewNote}>Team preview · booking is not connected yet. Alterations are created in-store and appear in Orders.</Text>
      </ScrollView>

      <Modal animationType="slide" transparent visible={showGate} onRequestClose={() => setShowGate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setShowGate(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>×</Text></Pressable>
            <Text style={styles.eyebrow}>BEFORE YOU BEGIN</Text>
            <Text style={styles.modalTitle}>Your journey starts with an account.</Text>
            <Text style={styles.modalCopy}>The mobile app requires an account before you can request an {method === 'in-person' ? 'in-person' : 'online'} consultation. Account creation and booking are coming in the next build.</Text>
            <Pressable accessibilityRole="button" onPress={() => { setShowGate(false); router.push('/account'); }} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>VIEW ACCOUNT PREVIEW</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { paddingBottom: 115 },
  header: { paddingHorizontal: 24, height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 16, fontWeight: '700', letterSpacing: 3.7 },
  headerIndex: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1 },
  hero: { height: 270 },
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
});
