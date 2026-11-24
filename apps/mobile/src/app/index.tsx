import { useTabSwipeBlocker, GestureBoundary } from '@/components/tab-swipe';
import { IconLabel, ShopActionIcon } from '@/components/shop-action-icon';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ImageBackground, Modal, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEdgeSwipeBack } from '@/components/edge-swipe-back';
import { atelier } from '@/atelier-theme';
import { atelierServices, type AtelierService } from '@/data/atelier-services';
import { HeroScrollView } from '@/components/hero-scroll-view';
import { NyMark } from '@/components/ny-mark';
import { HomeDestinationCard } from '@/components/home-destination-card';

import { redCloverCollection } from '@/data/shop-collections';
import { type ImageSource, useShopCatalogue } from '@/lib/shop-catalogue';

const webSrc = (image: ImageSource) => (typeof image === 'number' ? undefined : image.uri);

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const carouselRef = useRef<ScrollViewInstance>(null);
  const activeStoryRef = useRef(0);
  const [service, setService] = useState<AtelierService | null>(null);
  const closeService = useCallback(() => setService(null), [setService]);
  useTabSwipeBlocker(service !== null);
  const serviceSwipe = useEdgeSwipeBack(closeService, service !== null);
  const [storyIndex, setActiveStory] = useState(0);
  // The collection staff tick "Feature on Home" for in NY Office; the built-in Red Clover set until one loads.
  const { collections } = useShopCatalogue();
  const live = collections.find((entry) => entry.featured && entry.photos.length);
  const featured = live ?? redCloverCollection;
  const stories: { id: string; image: ImageSource }[] = featured.photos;
  const activeStory = storyIndex < stories.length ? storyIndex : 0;
  const slideWidth = Platform.OS === 'web' ? ('100vw' as ViewStyle['width']) : width;
  const heroHeight = Math.max(590, height);

  function showStory(index: number) {
    if (index === activeStoryRef.current) return;
    activeStoryRef.current = index;
    setActiveStory(index);
    carouselRef.current?.scrollTo({ x: index * width, animated: true });
  }

  useEffect(() => {
    carouselRef.current?.scrollTo({ x: activeStoryRef.current * width, animated: false });
  }, [width]);

  useFocusEffect(useCallback(() => {
    const timer = setTimeout(() => {
      const next = (activeStory + 1) % stories.length;
      activeStoryRef.current = next;
      setActiveStory(next);
      carouselRef.current?.scrollTo({ x: next * width, animated: true });
    }, 5500);
    return () => clearTimeout(timer);
  }, [activeStory, stories.length, width]));

  return (
    <View style={styles.screen}>
      <HeroScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <View style={StyleSheet.absoluteFill}><GestureBoundary><ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            style={{ height: heroHeight }}
            onMomentumScrollEnd={(event) => {
              if (!width) return;
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              if (index >= 0 && index < stories.length && index !== activeStoryRef.current) {
                activeStoryRef.current = index;
                setActiveStory(index);
              }
            }}>
            {stories.map((slide, index) => (
              <View key={`${featured.id}-${slide.id}`} style={{ width: slideWidth, height: heroHeight }}>
                {Platform.OS === 'web' ? (
                  <img src={webSrc(slide.image)} alt="" loading={index === 0 ? 'eager' : 'lazy'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageBackground source={slide.image} resizeMode="cover" imageStyle={styles.coverImage} style={StyleSheet.absoluteFill} />
                )}
                <View pointerEvents="none" style={styles.imageShade} />
              </View>
            ))}
          </ScrollView></GestureBoundary></View>
          <View pointerEvents="box-none" style={styles.heroOverlay}>
            <View pointerEvents="none" style={[styles.topLine, { marginTop: insets.top + 24 }]}>
              <View style={styles.brand}>
                <NyMark color={atelier.white} size={28} />
                <Text style={styles.wordmark}>NY ATELIER</Text>
              </View>
            </View>
            <View pointerEvents="box-none" style={{ paddingBottom: insets.bottom + 86 }}>
              <View pointerEvents="none">
                <Text style={styles.heroEyebrow}>FEATURED COLLECTION</Text>
                <Text style={styles.heroTitle}>{featured.title}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/shop', params: { collection: featured.id } })} style={styles.shopButton}>
                <Text style={styles.shopButtonText}>SHOP THE COLLECTION</Text>
                <ShopActionIcon name="arrow-up-right" color={atelier.petrol} />
              </Pressable>
              <View style={styles.storyFoot}>
                <Text style={styles.storyNumber}>{String(activeStory + 1).padStart(2, '0')} / {String(stories.length).padStart(2, '0')}</Text>
                <View style={styles.storyDots}>
                  {stories.map((_, index) => (
                    <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Show story ${index + 1}`} accessibilityState={{ selected: index === activeStory }} onPress={() => showStory(index)} style={[styles.storyDot, index === activeStory && styles.storyDotActive]} />
                  ))}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Next story" onPress={() => showStory((activeStoryRef.current + 1) % stories.length)}>
                  <IconLabel label="NEXT" name="arrow-right" color={atelier.white} style={styles.nextStory} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.sectionEyebrow}>A WARDROBE WITH INTENTION</Text>
          <Text style={styles.sectionTitle}>Clothing that speaks before you do.</Text>
          <Text style={styles.sectionCopy}>Discover expressive ready-to-wear and a personal Atelier journey, shaped by NY craftsmanship.</Text>
        </View>

        <View style={styles.featureRow}>
          <HomeDestinationCard image={require('../../assets/ny/home-blue.jpg')} tag="01 / THE COLLECTION" title="Ready-to-Wear" description="Expression, made effortless." action="EXPLORE PIECES" accessibilityLabel="Explore Ready-to-Wear" onPress={() => router.push('/shop')} />
          <HomeDestinationCard image={require('../../assets/ny/atelier.jpg')} tag="02 / THE ATELIER" title="NY Atelier" description="Made around you." action="DISCOVER BESPOKE" accessibilityLabel="Discover NY Atelier" onPress={() => router.push('/atelier')} />
        </View>

        <View style={styles.promoSection}>
          <Text style={styles.sectionEyebrow}>THE ATELIER / OUR SERVICES</Text>
          <Text style={styles.promoSectionTitle}>Whatever the moment calls for.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Read about ${atelierServices[0].title}`} onPress={() => setService(atelierServices[0])} style={styles.serviceFeature}>
            <ImageBackground source={atelierServices[0].image} resizeMode="cover" style={styles.serviceFeatureImage}>
              <View style={styles.serviceShade}><Text style={styles.serviceFeatureIndex}>01 / AN ATELIER EXPERIENCE</Text><View><Text style={styles.serviceFeatureTitle}>{atelierServices[0].title}</Text><Text style={styles.serviceFeatureCopy}>{atelierServices[0].note}</Text><IconLabel label="DISCOVER COUTURE" name="arrow-up-right" color={atelier.white} style={styles.serviceFeatureLink} /></View></View>
            </ImageBackground>
          </Pressable>
          <View style={styles.serviceGrid}>
            {atelierServices.slice(1).map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Read about ${item.title}`} onPress={() => setService(item)} style={[styles.serviceCard, width >= 900 && { width: '48%' }]}>
              <ImageBackground source={item.image} resizeMode="cover" style={styles.serviceImage} />
              <View style={styles.serviceCardBody}><Text style={styles.serviceIndex}>{item.number}</Text><Text style={styles.serviceTitle}>{item.title}</Text><Text style={styles.serviceCopy}>{item.note}</Text></View>
              <ShopActionIcon name="arrow-up-right" color={atelier.cognac} size={18} />
            </Pressable>)}
          </View>
        </View>
      </HeroScrollView>
      <Modal visible={service !== null} animationType="slide" transparent presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={closeService}>
        <Animated.View {...serviceSwipe.panHandlers} style={[serviceSwipe.animatedStyle, styles.serviceDetail, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {service && <StatusBar style="dark" />}
          <View style={styles.serviceDetailBar}>
            <Pressable accessibilityRole="button" onPress={closeService} style={styles.serviceBack}>
              <IconLabel label="Back" name="back" color={atelier.petrol} style={styles.serviceBackText} />
            </Pressable>
            <Text style={styles.sectionEyebrow}>NY ATELIER SERVICES</Text>
          </View>
          {service && <ScrollView contentContainerStyle={styles.serviceDetailBody}>
            <ImageBackground source={service.image} resizeMode="cover" style={styles.serviceDetailImage} />
            <Text style={styles.sectionTitle}>{service.title}</Text>
            <Text style={styles.sectionCopy}>{service.description}</Text>
            <Pressable accessibilityRole="button" onPress={() => {
              const book = service.id;
              setService(null);
              router.push({ pathname: '/atelier', params: { book } });
            }} style={styles.serviceBook}>
              <IconLabel label="BOOK THIS EXPERIENCE" name="arrow-up-right" color={atelier.white} style={styles.serviceBookText} />
            </Pressable>
          </ScrollView>}
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: atelier.alabaster },
  content: { paddingBottom: 115 },
  hero: { width: '100%', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  imageShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6, 20, 24, 0.42)' },
  heroOverlay: { ...StyleSheet.absoluteFill, paddingHorizontal: 24, justifyContent: 'space-between' },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', letterSpacing: 3.5, fontSize: 16 },
  heroEyebrow: { color: atelier.brass, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', letterSpacing: 2.2, marginBottom: 15 },
  heroTitle: { color: atelier.white, fontFamily: atelier.display, fontSize: 34, lineHeight: 40, maxWidth: 480, marginBottom: 27 },
  shopButton: { backgroundColor: atelier.alabaster, paddingVertical: 17, paddingHorizontal: 19, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 54, borderRadius: atelier.buttonRadius },
  shopButtonText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', letterSpacing: 1.5, fontSize: 12 },
  storyFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27 },
  storyNumber: { color: atelier.white, fontFamily: atelier.body, letterSpacing: 2, fontSize: 10 },
  storyDots: { flexDirection: 'row', gap: 8 },
  storyDot: { height: 4, width: 17, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.42)' },
  storyDotActive: { width: 33, backgroundColor: atelier.white },
  nextStory: { color: atelier.white, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.6 },
  intro: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 47, paddingBottom: 38 },
  sectionEyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 2.1, marginBottom: 17 },
  sectionTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 29, lineHeight: 38, marginBottom: 15 },
  sectionCopy: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15, lineHeight: 23 },
  featureRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 24, marginBottom: 48, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  promoSection: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  promoSectionTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 29, lineHeight: 39, marginBottom: 24, maxWidth: 650 },
  serviceFeature: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  serviceFeatureImage: { width: '100%', height: 350 },
  serviceShade: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(6, 20, 24, 0.5)', padding: 24 },
  serviceFeatureIndex: { color: atelier.white, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  serviceFeatureTitle: { color: atelier.white, fontFamily: atelier.display, fontSize: 30, lineHeight: 40, maxWidth: 500 },
  serviceFeatureCopy: { color: atelier.white, fontFamily: atelier.body, fontSize: 15, lineHeight: 22, maxWidth: 420, marginTop: 8 },
  serviceFeatureLink: { color: atelier.white, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.4, fontWeight: '700', marginTop: 20 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  serviceCard: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 22, borderBottomWidth: 1, borderBottomColor: atelier.line },
  serviceImage: { width: 72, height: 102, borderRadius: 8, overflow: 'hidden', backgroundColor: atelier.white },
  serviceCardBody: { flex: 1, gap: 7 },
  serviceIndex: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1.4, fontWeight: '700' },
  serviceTitle: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 18, lineHeight: 24 },
  serviceCopy: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 19 },
  serviceDetail: { flex: 1, backgroundColor: atelier.alabaster },
  serviceDetailBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 10 },
  serviceBack: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: atelier.white, justifyContent: 'center' },
  serviceBackText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 15, fontWeight: '700' },
  serviceDetailBody: { gap: 16, padding: 24 },
  serviceDetailImage: { height: 245, borderRadius: 16, overflow: 'hidden' },
  serviceBook: { backgroundColor: atelier.petrol, borderRadius: 999, padding: 16, alignItems: 'center' },
  serviceBookText: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
});
