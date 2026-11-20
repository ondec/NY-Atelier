import { useTabSwipeBlocker } from '@/components/tab-swipe';
import { IconLabel, ShopActionIcon } from '@/components/shop-action-icon';
import { StatusBar } from 'expo-status-bar';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NyIcon } from '@/components/ny-icon';

import { useEdgeSwipeBack } from '@/components/edge-swipe-back';
import { atelier } from '@/atelier-theme';
import { atelierServices } from '@/data/atelier-services';
import { HeroScrollView } from '@/components/hero-scroll-view';
import { OpenBagButton } from '@/components/open-bag-button';
import { NyMark } from '@/components/ny-mark';
import { formatConsultationTime } from '@/lib/consultations';
import { createConsultationId, demoCustomer, useDemoCustomer } from '@/lib/demo-customer';

const journeySteps = [
  { number: '01', title: 'Measurements & fittings', note: 'A fit that belongs to you.' },
  { number: '02', title: 'Fabric selection', note: 'Explore cloth and finish together.' },
  { number: '03', title: 'Styling', note: 'Consider every detail of the look.' },
];

export default function AtelierScreen() {
  const { book } = useLocalSearchParams<{ book?: string }>();
  const [method, setMethod] = useState<'in-person' | 'virtual'>('in-person');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const submissionId = useRef<string | null>(null);
  const closeBooking = useCallback(() => { if (!submitting) setBookingOpen(false); }, [submitting]);
  useTabSwipeBlocker(bookingOpen);
  const bookingSwipe = useEdgeSwipeBack(closeBooking, bookingOpen);
  const [purpose, setPurpose] = useState('Custom clothing');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const { requests, addRequest } = useDemoCustomer();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const focused = useIsFocused();
  const [heroVisible, setHeroVisible] = useState(true);
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(require('../../assets/ny/atelier-reel.mp4'), (video) => {
    video.loop = true;
    video.muted = true;
  });

  useEffect(() => {
    if (focused && heroVisible && !bookingOpen) player.play();
    else player.pause();
  }, [player, focused, heroVisible, bookingOpen]);

  function toggleSound() {
    // expo-video exposes mute as a writable property on its native player.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = !muted;
    setMuted(!muted);
  }
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index + 1);
    return { value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, day: date.toLocaleDateString('en-GH', { weekday: 'short' }), date: date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }) };
  });
  const purposeOptions: string[] = [...new Set(atelierServices.map((service) => service.purpose)), 'Measurements & fit', 'Other'];
  const serviceDescription = atelierServices.find((service) => service.purpose === purpose)?.description
    ?? (purpose === 'Measurements & fit'
      ? 'Discuss your measurements, fitting needs and how you want your garment to sit and move.'
      : 'Tell us what you have in mind so we can help you find the right service.');

  useEffect(() => {
    const service = atelierServices.find((item) => item.id === book);
    if (!service) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setPurpose(service.purpose);
      setBookingOpen(true);
      router.setParams({ book: undefined });
    });
    return () => { active = false; };
  }, [book]);

  const timeOptions = ['10:00', '12:00', '14:00', '16:00'];
  const canSubmit = !!preferredDate && !!preferredTime && !submitting;

  async function submitRequest() {
    if (!canSubmit) return;
    setSubmitting(true);
    setBookingError('');
    try {
      submissionId.current ??= createConsultationId();
      await addRequest({ method, purpose, preferredDate, preferredTime, notes: notes.trim() }, submissionId.current);
      submissionId.current = null;
      setBookingOpen(false);
      setPreferredDate('');
      setPreferredTime('');
      setNotes('');
      router.navigate({ pathname: '/orders', params: { view: 'consultations' } });
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Could not send the request. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.safe}>
      <HeroScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        scrollEventThrottle={32}
        onScroll={({ nativeEvent }) => setHeroVisible(nativeEvent.contentOffset.y < height)}>
        <View style={[styles.hero, { height }]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
              allowsVideoFrameAnalysis={false}
              playsInline
              surfaceType="textureView"
            />
          </View>
          <View style={[styles.heroOverlay, { paddingBottom: insets.bottom + 84 }]}>
            <View style={[styles.heroHeader, { marginTop: insets.top + 24 }]}>
              <View style={styles.heroBrand}>
                <NyMark color={atelier.white} size={28} />
                <Text style={styles.wordmark}>NY ATELIER</Text>
              </View>
              <View style={styles.heroActions}>
                <OpenBagButton onHero />
                <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Unmute background video' : 'Mute background video'} onPress={toggleSound} style={styles.soundButton}>
                  <NyIcon name={muted ? "volume-off" : "volume-on"} color={atelier.white} size={22} />
                </Pressable>
              </View>
            </View>
            <View style={styles.heroBooking}>
              <Text style={styles.heroCaption}>CUSTOM CLOTHING · BESPOKE CRAFT</Text>
              <Pressable accessibilityRole="button" onPress={() => setBookingOpen(true)} style={styles.bookingButton}>
                <Text style={styles.bookingButtonText}>BOOK A CONSULTATION</Text>
                <ShopActionIcon name="arrow-up-right" color={atelier.petrol} />
              </Pressable>
              <Text style={styles.bookingNote}>Free consultation · The team will confirm your request.</Text>
            </View>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>THE PERSONAL JOURNEY</Text>
          <Text style={styles.title}>Made around you.</Text>
          <View style={styles.rule} />
          <Text style={styles.introCopy}>From the first conversation to the final fitting, your piece is shaped around your vision.</Text>
          <Text style={[styles.introCopy, styles.consultationCopy]}>Meet with NY Atelier to discuss your garment, fabric, measurements and timeline.</Text>
        </View>

        {requests.length ? <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/orders', params: { view: 'consultations' } })} style={styles.requestShortcut}>
          <NyIcon name="calendar-days" color={atelier.petrol} size={20} />
          <Text style={styles.requestShortcutText}>Your consultations</Text>
          <ShopActionIcon name="forward" color={atelier.petrol} size={16} />
        </Pressable> : null}

        <View style={styles.services}>
          <Text style={styles.eyebrow}>HOW IT COMES TOGETHER</Text>
          <Text style={styles.servicesTitle}>The details make it yours.</Text>
          {journeySteps.map((service) => (
            <View key={service.number} style={styles.serviceRow}>
              <Text style={styles.serviceNumber}>{service.number}</Text>
              <View style={styles.serviceText}>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceNote}>{service.note}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.offerings}>
          <Text style={styles.eyebrow}>OUR SERVICES</Text>
          <Text style={styles.offeringsTitle}>Made for every expression of you.</Text>
          <Text style={styles.offeringsIntro}>Explore the ways NY Atelier can bring your idea or wardrobe to life.</Text>
          {atelierServices.map((service) => (
            <Pressable
              key={service.number}
              accessibilityRole="button"
              accessibilityLabel={`Ask about ${service.title}`}
              onPress={() => { setPurpose(service.purpose); setBookingOpen(true); }}
              style={styles.offeringRow}>
              <Text style={styles.offeringNumber}>{service.number}</Text>
              <View style={styles.offeringContent}>
                <Text style={styles.offeringTitle}>{service.title}</Text>
                <Text style={styles.offeringNote}>{service.description}</Text>
                <View style={styles.offeringAction}><IconLabel label="BOOK THIS EXPERIENCE" name="arrow-up-right" color={atelier.cognac} style={styles.offeringLink} /></View>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/orders')} style={styles.trackingLink}>
          <Text style={styles.trackingTitle}>Already creating with us?</Text>
          <IconLabel label="VIEW YOUR ORDERS" name="arrow-up-right" color={atelier.cognac} style={styles.trackingText} />
        </Pressable>
      </HeroScrollView>

      <Modal animationType="slide" transparent presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent visible={bookingOpen} onRequestClose={closeBooking}>
        <Animated.View {...bookingSwipe.panHandlers} style={[bookingSwipe.animatedStyle, styles.formSafe, { paddingTop: insets.top }]}>
          {bookingOpen && <StatusBar style="dark" />}
          <View style={styles.formHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close consultation request" onPress={closeBooking} style={styles.modalClose}><ShopActionIcon name="close" color={atelier.petrol} size={24} /></Pressable>
            <Text style={styles.formHeaderLabel}>THE ATELIER</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.formContent, { paddingBottom: Math.max(insets.bottom, 20) + 30 }]}>
            <Text style={styles.eyebrow}>BEGIN YOUR JOURNEY</Text>
            <Text style={styles.modalTitle}>Request a consultation.</Text>
            <Text style={styles.modalCopy}>Choose a preferred time to discuss your idea. The team can confirm your time or suggest alternatives.</Text>
            <View style={styles.demoIdentity}><NyMark color={atelier.petrol} size={26} /><View><Text style={styles.demoIdentityTitle}>{demoCustomer.name}</Text><Text style={styles.demoIdentityNote}>DEMO CUSTOMER ACCOUNT</Text></View></View>

            <Text style={styles.formLabel}>HOW WOULD YOU LIKE TO MEET?</Text>
            <View style={styles.formOptions}>{(['in-person', 'virtual'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: method === value }} onPress={() => setMethod(value)} style={[styles.formChip, method === value && styles.formChipSelected]}><Text style={[styles.formChipText, method === value && styles.formChipTextSelected]}>{value === 'in-person' ? 'In person' : 'Virtual'}</Text></Pressable>)}</View>
            <Text style={styles.formLabel}>WHAT CAN WE HELP WITH?</Text>
            <View style={styles.formOptions}>{purposeOptions.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: purpose === value }} onPress={() => setPurpose(value)} style={[styles.formChip, purpose === value && styles.formChipSelected]}><Text style={[styles.formChipText, purpose === value && styles.formChipTextSelected]}>{value}</Text></Pressable>)}</View>
            <Text accessibilityLiveRegion="polite" style={styles.serviceDescription}>{serviceDescription}</Text>
            <Text style={styles.formLabel}>PREFERRED DATE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateOptions}>{dates.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: preferredDate === option.value }} onPress={() => setPreferredDate(option.value)} style={[styles.dateChip, preferredDate === option.value && styles.formChipSelected]}><Text style={[styles.dateDay, preferredDate === option.value && styles.formChipTextSelected]}>{option.day}</Text><Text style={[styles.dateDate, preferredDate === option.value && styles.formChipTextSelected]}>{option.date}</Text></Pressable>)}</ScrollView>
            <Text style={styles.formLabel}>PREFERRED TIME · ACCRA</Text>
            <View style={styles.formOptions}>{timeOptions.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: preferredTime === value }} onPress={() => setPreferredTime(value)} style={[styles.formChip, preferredTime === value && styles.formChipSelected]}><Text style={[styles.formChipText, preferredTime === value && styles.formChipTextSelected]}>{formatConsultationTime(value)}</Text></Pressable>)}</View>
            <Text style={styles.formLabel}>TELL US ABOUT YOUR IDEA · OPTIONAL</Text>
            <TextInput accessibilityLabel="Notes for NY Atelier" multiline maxLength={1000} value={notes} onChangeText={setNotes} placeholder="The garment, occasion or fit you have in mind…" placeholderTextColor={atelier.muted} style={styles.notesInput} textAlignVertical="top" />
            <Text style={styles.formDisclaimer}>The team will review your preferred time. Check Orders → Consultations for updates.</Text>
            {bookingError ? <Text accessibilityRole="alert" style={styles.formError}>{bookingError}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSubmit }} disabled={!canSubmit} onPress={submitRequest} style={[styles.modalButton, !canSubmit && styles.modalButtonDisabled]}><IconLabel label={submitting ? 'SENDING…' : 'SEND CONSULTATION REQUEST'} name="arrow-up-right" color={atelier.white} style={styles.modalButtonText} /></Pressable>
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { paddingBottom: 115 },
  wordmark: { color: atelier.white, fontFamily: atelier.body, fontSize: 16, fontWeight: '700', letterSpacing: 3.7 },
  hero: { width: '100%', overflow: 'hidden', backgroundColor: atelier.petrol },
  heroOverlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(6, 20, 24, 0.40)', paddingHorizontal: 24 },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroActions: { gap: 8 },
  soundButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8, 24, 27, 0.35)' },
  heroBooking: { gap: 16 },
  heroBrand: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroCaption: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1.8 },
  intro: { paddingHorizontal: 24, paddingTop: 36, paddingBottom: 37 },
  eyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 2, marginBottom: 14 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 31, lineHeight: 39 },
  rule: { width: 51, height: 2, backgroundColor: atelier.brass, marginTop: 23, marginBottom: 20 },
  introCopy: { color: atelier.slate, fontFamily: atelier.body, fontSize: 16, lineHeight: 24 },
  consultationCopy: { marginTop: 12 },
  bookingButton: { backgroundColor: atelier.alabaster, minHeight: 54, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: atelier.buttonRadius },
  bookingButtonText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 12, letterSpacing: 1.1, fontWeight: '700' },
  bookingNote: { color: atelier.white, fontFamily: atelier.body, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  services: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 26 },
  servicesTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 25, lineHeight: 33, marginBottom: 28 },
  serviceRow: { borderTopWidth: 1, borderTopColor: atelier.line, flexDirection: 'row', gap: 20, paddingVertical: 19 },
  serviceNumber: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 11, marginTop: 3 },
  serviceText: { flex: 1 },
  serviceTitle: { color: atelier.slate, fontFamily: atelier.body, fontWeight: '700', fontSize: 17, marginBottom: 4 },
  serviceNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13 },
  serviceDescription: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14, lineHeight: 21, padding: 14, borderRadius: 12, backgroundColor: atelier.white, marginTop: 8 },
  offerings: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 42 },
  offeringsTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 25, lineHeight: 34, marginBottom: 12 },
  offeringsIntro: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14, lineHeight: 21, marginBottom: 24 },
  offeringRow: { borderTopWidth: 1, borderTopColor: atelier.line, flexDirection: 'row', gap: 18, paddingVertical: 20 },
  offeringNumber: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 11, marginTop: 4 },
  offeringContent: { flex: 1 },
  offeringTitle: { color: atelier.slate, fontFamily: atelier.body, fontWeight: '700', fontSize: 17, lineHeight: 23, marginBottom: 7 },
  offeringNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 19 },
  offeringAction: { marginTop: 12 },
  offeringLink: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  trackingLink: { marginHorizontal: 24, borderTopWidth: 1, borderTopColor: atelier.line, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  trackingTitle: { color: atelier.slate, fontFamily: atelier.body, fontSize: 14, flex: 1 },
  trackingText: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(8, 24, 27, 0.56)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: atelier.alabaster, paddingHorizontal: 25, paddingTop: 25, paddingBottom: 35 },
  modalClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 27, lineHeight: 35, marginBottom: 14 },
  modalCopy: { color: atelier.slate, fontFamily: atelier.body, fontSize: 15, lineHeight: 23, marginBottom: 28 },
  modalButton: { backgroundColor: atelier.petrol, paddingVertical: 17, alignItems: 'center', borderRadius: atelier.buttonRadius },
  modalButtonText: { color: atelier.white, fontFamily: atelier.body, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  requestShortcut: { marginHorizontal: 24, marginBottom: 28, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: atelier.line, flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestShortcutText: { flex: 1, color: atelier.petrol, fontFamily: atelier.body, fontSize: 15, fontWeight: '700' },
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
  formError: { color: atelier.cognac, fontFamily: atelier.body, marginBottom: 12 },
  formDisclaimer: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18, marginBottom: 24 },
  modalButtonDisabled: { opacity: 0.45 },
});
