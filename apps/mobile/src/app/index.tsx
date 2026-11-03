import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, ImageBackground, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { NyMark } from '@/components/ny-mark';

const stories = [
  { image: require('../../assets/ny/home-green.jpg'), number: '01 / 02', title: 'The art of\nbeing seen.', caption: 'READY-TO-WEAR · NY ATELIER' },
  { image: require('../../assets/ny/home-blue.jpg'), number: '02 / 02', title: 'Made for\nyour moment.', caption: 'A NEW EXPRESSION OF STYLE' },
] as const;

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const carouselRef = useRef<ScrollViewInstance>(null);
  const activeStoryRef = useRef(0);
  const [copyEntrance] = useState(() => new Animated.Value(1));
  const [activeStory, setActiveStory] = useState(0);
  const story = stories[activeStory];
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

  useEffect(() => {
    copyEntrance.stopAnimation();
    copyEntrance.setValue(0);
    Animated.timing(copyEntrance, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    return () => copyEntrance.stopAnimation();
  }, [activeStory, copyEntrance]);

  useFocusEffect(useCallback(() => {
    const timer = setTimeout(() => {
      const next = (activeStory + 1) % stories.length;
      activeStoryRef.current = next;
      setActiveStory(next);
      carouselRef.current?.scrollTo({ x: next * width, animated: true });
    }, 5500);
    return () => clearTimeout(timer);
  }, [activeStory, width]));

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            style={StyleSheet.absoluteFill}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              if (index >= 0 && index < stories.length && index !== activeStoryRef.current) {
                activeStoryRef.current = index;
                setActiveStory(index);
              }
            }}>
            {stories.map((slide) => (
              <ImageBackground key={slide.number} source={slide.image} resizeMode="cover" imageStyle={styles.coverImage} style={{ width, height: heroHeight }}>
                <View pointerEvents="none" style={styles.imageShade} />
              </ImageBackground>
            ))}
          </ScrollView>
          <View pointerEvents="box-none" style={styles.heroOverlay}>
            <View pointerEvents="none" style={[styles.topLine, { marginTop: insets.top + 24 }]}>
              <View style={styles.brand}>
                <NyMark color={atelier.white} size={28} />
                <Text style={styles.wordmark}>NY ATELIER</Text>
              </View>
            </View>
            <View pointerEvents="box-none" style={{ paddingBottom: insets.bottom + 86 }}>
              <Animated.View
                pointerEvents="none"
                style={[styles.storyCopy, { opacity: copyEntrance, transform: [{ translateX: copyEntrance.interpolate({ inputRange: [0, 1], outputRange: [activeStory === 0 ? -24 : 24, 0] }) }] }]}>
                <Text style={styles.heroEyebrow}>{story.caption}</Text>
                <Text style={styles.heroTitle}>{story.title}</Text>
              </Animated.View>
              <Pressable accessibilityRole="button" onPress={() => router.push('/shop')} style={styles.shopButton}>
                <Text style={styles.shopButtonText}>SHOP THE COLLECTION</Text>
                <Text style={styles.shopArrow}>↗</Text>
              </Pressable>
              <View style={styles.storyFoot}>
                <Text style={styles.storyNumber}>{story.number}</Text>
                <View style={styles.storyDots}>
                  {stories.map((_, index) => (
                    <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Show story ${index + 1}`} accessibilityState={{ selected: index === activeStory }} onPress={() => showStory(index)} style={[styles.storyDot, index === activeStory && styles.storyDotActive]} />
                  ))}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Next story" onPress={() => showStory((activeStoryRef.current + 1) % stories.length)}>
                  <Text style={styles.nextStory}>NEXT  →</Text>
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

        <Pressable accessibilityRole="button" onPress={() => router.push('/shop')} style={styles.feature}>
          <ImageBackground source={require('../../assets/ny/home-blue.jpg')} resizeMode="cover" imageStyle={styles.coverImage} style={styles.featureImage}>
            <View style={styles.featureTag}><Text style={styles.featureTagText}>01  /  READY-TO-WEAR</Text></View>
          </ImageBackground>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>The collection</Text>
            <Text style={styles.featureLink}>EXPLORE PIECES  ↗</Text>
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => router.push('/atelier')} style={styles.feature}>
          <ImageBackground source={require('../../assets/ny/atelier.jpg')} resizeMode="cover" imageStyle={styles.coverImage} style={styles.featureImage}>
            <View style={styles.featureTag}><Text style={styles.featureTagText}>02  /  THE ATELIER</Text></View>
          </ImageBackground>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Made around you</Text>
            <Text style={styles.featureLink}>DISCOVER BESPOKE  ↗</Text>
          </View>
        </Pressable>
        <Text style={styles.previewNote}>Visual preview · shopping and booking are not connected yet.</Text>
      </ScrollView>
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
  storyCopy: { minHeight: 151 },
  heroEyebrow: { color: atelier.brass, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', letterSpacing: 2.2, marginBottom: 15 },
  heroTitle: { color: atelier.white, fontFamily: atelier.display, fontSize: 42, lineHeight: 49, marginBottom: 27 },
  shopButton: { backgroundColor: atelier.alabaster, paddingVertical: 17, paddingHorizontal: 19, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 54, borderRadius: atelier.buttonRadius },
  shopButtonText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', letterSpacing: 1.5, fontSize: 12 },
  shopArrow: { color: atelier.petrol, fontSize: 22, lineHeight: 22 },
  storyFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27 },
  storyNumber: { color: atelier.white, fontFamily: atelier.body, letterSpacing: 2, fontSize: 10 },
  storyDots: { flexDirection: 'row', gap: 8 },
  storyDot: { height: 4, width: 17, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.42)' },
  storyDotActive: { width: 33, backgroundColor: atelier.white },
  nextStory: { color: atelier.white, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.6 },
  intro: { paddingHorizontal: 25, paddingTop: 47, paddingBottom: 38 },
  sectionEyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 2.1, marginBottom: 17 },
  sectionTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 29, lineHeight: 38, marginBottom: 15 },
  sectionCopy: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15, lineHeight: 23 },
  feature: { marginHorizontal: 24, marginBottom: 30 },
  featureImage: { height: 238, alignItems: 'flex-start', justifyContent: 'flex-start', borderRadius: 18, overflow: 'hidden' },
  featureTag: { backgroundColor: atelier.alabaster, paddingHorizontal: 13, paddingVertical: 10, margin: 12 },
  featureTagText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.4 },
  featureText: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15 },
  featureTitle: { color: atelier.slate, fontFamily: atelier.display, fontSize: 19, flex: 1 },
  featureLink: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 9, letterSpacing: 1 },
  previewNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 40 },
});
