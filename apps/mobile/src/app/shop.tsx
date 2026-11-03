import { useState } from 'react';
import { Image, ImageBackground, ImageSourcePropType, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';

type Product = { name: string; price: string; image: ImageSourcePropType; category: string };
const products: Product[] = [
  { name: 'Aegis Set', price: 'GH₵ 1,150', image: require('../../assets/ny/product-aegis.png'), category: 'MEN' },
  { name: 'Amani Set', price: 'GH₵ 1,200', image: require('../../assets/ny/product-amani.jpg'), category: 'MEN' },
  { name: 'Arctic Edge Set', price: 'GH₵ 1,200', image: require('../../assets/ny/product-arctic.png'), category: 'MEN' },
];
const filters = ['All', 'Men', 'Women', 'Collections'] as const;

export default function ShopScreen() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [selected, setSelected] = useState<Product | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>NY ATELIER</Text>
          <Text style={styles.headerIndex}>READY-TO-WEAR  /  01</Text>
        </View>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>THE NY EDIT</Text>
          <Text style={styles.title}>The collection</Text>
          <Text style={styles.subtitle}>Expression, made effortless.</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((item) => (
            <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {filter === 'Women' ? (
          <View style={styles.womenPreview}>
            <View style={styles.womenArt}>
              <Text style={styles.womenArtTop}>NY ATELIER  /  COMING SOON</Text>
              <Text style={styles.womenArtTitle}>Women.</Text>
              <Text style={styles.womenArtBottom}>READY-TO-WEAR</Text>
            </View>
            <Text style={styles.eyebrow}>WOMENSWEAR</Text>
            <Text style={styles.womenTitle}>A collection to come.</Text>
            <Text style={styles.womenCopy}>NY Atelier womenswear will have its own place here. Verified product photography, prices and availability are still being prepared for this app preview.</Text>
          </View>
        ) : (
          <>
            {filter === 'Collections' ? (
              <View style={styles.collectionFeature}>
                <ImageBackground source={require('../../assets/ny/home-blue.jpg')} resizeMode="cover" imageStyle={styles.coverImage} style={styles.collectionImage}>
                  <View style={styles.collectionShade}>
                    <Text style={styles.collectionEyebrow}>THE NY EDIT  /  01</Text>
                    <Text style={styles.collectionTitle}>Dress with intention.</Text>
                  </View>
                </ImageBackground>
              </View>
            ) : null}
            <View style={styles.listHeading}>
              <Text style={styles.listTitle}>{filter === 'Collections' ? 'Featured pieces' : 'Explore pieces'}</Text>
              <Text style={styles.listCount}>03 PIECES</Text>
            </View>
            <View style={styles.grid}>
              {products.map((product) => (
                <Pressable key={product.name} accessibilityRole="button" accessibilityLabel={`View ${product.name}`} onPress={() => setSelected(product)} style={styles.product}>
                  <Image source={product.image} resizeMode="cover" style={styles.productImage} />
                  <Text style={styles.productCategory}>{product.category}  /  READY-TO-WEAR</Text>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{product.price}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.previewNote}>Catalogue preview from NY Atelier’s public store. Prices and availability should be checked before purchase. Checkout is not connected here yet.</Text>
          </>
        )}
      </ScrollView>

      <Modal visible={selected !== null} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={styles.detailSafe} edges={['top']}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailTop}>
              <Text style={styles.wordmark}>NY ATELIER</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close product" onPress={() => setSelected(null)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
            </View>
            {selected ? <Image source={selected.image} resizeMode="contain" style={styles.detailImage} /> : null}
            <View style={styles.detailBody}>
              <Text style={styles.eyebrow}>READY-TO-WEAR  /  {selected?.category}</Text>
              <Text style={styles.detailTitle}>{selected?.name}</Text>
              <Text style={styles.detailPrice}>{selected?.price}</Text>
              <View style={styles.detailRule} />
              <Text style={styles.detailNote}>This is a visual product preview. Size selection, wishlist, bag and checkout will be connected in the next shopping build.</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { paddingBottom: 35 },
  header: { paddingHorizontal: 24, height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 16, fontWeight: '700', letterSpacing: 3.7 },
  headerIndex: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1 },
  intro: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 27 },
  eyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 2, marginBottom: 13 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 34, lineHeight: 42, marginBottom: 10 },
  subtitle: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15 },
  filters: { gap: 23, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: atelier.line, marginBottom: 28 },
  filter: { paddingBottom: 15, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterActive: { borderBottomColor: atelier.petrol },
  filterText: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14 },
  filterTextActive: { color: atelier.petrol, fontWeight: '700' },
  listHeading: { paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 },
  listTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 22 },
  listCount: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1.4 },
  grid: { paddingHorizontal: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  product: { width: '49%', paddingHorizontal: 5, marginBottom: 30 },
  productImage: { width: '100%', height: 230, backgroundColor: '#E8E7E2', marginBottom: 12 },
  productCategory: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1.3, marginBottom: 7 },
  productName: { color: atelier.slate, fontFamily: atelier.body, fontWeight: '700', fontSize: 16, marginBottom: 5 },
  productPrice: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14 },
  previewNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, lineHeight: 17, paddingHorizontal: 24 },
  coverImage: { width: '100%', height: '100%' },
  womenPreview: { paddingHorizontal: 24 },
  womenArt: { height: 280, marginBottom: 27, backgroundColor: atelier.petrol, padding: 22, justifyContent: 'space-between' },
  womenArtTop: { color: atelier.brass, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.5 },
  womenArtTitle: { color: atelier.alabaster, fontFamily: atelier.display, fontSize: 43 },
  womenArtBottom: { color: atelier.alabaster, fontFamily: atelier.body, fontSize: 10, letterSpacing: 2 },
  womenTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 27, marginBottom: 12 },
  womenCopy: { color: atelier.slate, fontFamily: atelier.body, fontSize: 15, lineHeight: 23 },
  collectionFeature: { marginHorizontal: 24, marginBottom: 29 },
  collectionImage: { height: 280 },
  collectionShade: { flex: 1, backgroundColor: 'rgba(6,20,24,0.32)', justifyContent: 'flex-end', padding: 20 },
  collectionEyebrow: { color: atelier.brass, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 9 },
  collectionTitle: { color: atelier.white, fontFamily: atelier.display, fontSize: 25, lineHeight: 32 },
  detailSafe: { flex: 1, backgroundColor: atelier.alabaster },
  detailTop: { height: 63, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: atelier.petrol, fontSize: 28 },
  detailImage: { width: '100%', height: 450, backgroundColor: atelier.white },
  detailBody: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  detailTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 29, marginBottom: 10 },
  detailPrice: { color: atelier.slate, fontFamily: atelier.body, fontSize: 19 },
  detailRule: { height: 1, backgroundColor: atelier.line, marginVertical: 22 },
  detailNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14, lineHeight: 22 },
});
