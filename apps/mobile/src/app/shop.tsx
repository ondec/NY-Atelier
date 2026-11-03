import { useState } from 'react';
import { Image, ImageBackground, ImageSourcePropType, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { ShopActionIcon } from '@/components/shop-action-icon';

type Product = { id: string; name: string; price: string; priceValue: number; image: ImageSourcePropType; category: string };
const products: Product[] = [
  { id: 'aegis', name: 'Aegis Set', price: 'GH₵ 1,150', priceValue: 1150, image: require('../../assets/ny/product-aegis.png'), category: 'MEN' },
  { id: 'amani', name: 'Amani Set', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-amani.jpg'), category: 'MEN' },
  { id: 'arctic', name: 'Arctic Edge Set', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-arctic.png'), category: 'MEN' },
];
const filters = ['All', 'Men', 'Women', 'Collections'] as const;
type PriceRange = 'all' | 'under1200' | '1200plus';
type SortBy = 'featured' | 'low' | 'high';
const priceOptions: { value: PriceRange; label: string }[] = [
  { value: 'all', label: 'All prices' },
  { value: 'under1200', label: 'Under GH₵ 1,200' },
  { value: '1200plus', label: 'GH₵ 1,200 & above' },
];
const sortOptions: { value: SortBy; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'low', label: 'Price: low to high' },
  { value: 'high', label: 'Price: high to low' },
];

export default function ShopScreen() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [selected, setSelected] = useState<Product | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [bag, setBag] = useState<Record<string, number>>({});
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('featured');
  const [filterOpen, setFilterOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const visibleProducts = (filter === 'Women' ? [] : products)
    .filter((product) => priceRange === 'all' || (priceRange === 'under1200' ? product.priceValue < 1200 : product.priceValue >= 1200))
    .sort((a, b) => sortBy === 'low' ? a.priceValue - b.priceValue : sortBy === 'high' ? b.priceValue - a.priceValue : 0);
  const bagCount = Object.values(bag).reduce((total, quantity) => total + quantity, 0);
  const bagTotal = products.reduce((total, product) => total + product.priceValue * (bag[product.id] || 0), 0);

  function toggleSaved(id: string) {
    setSavedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function addToBag(id: string) {
    setBag((current) => ({ ...current, [id]: (current[id] || 0) + 1 }));
  }

  function removeFromBag(id: string) {
    setBag((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>NY ATELIER</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerIndex}>READY-TO-WEAR  /  01</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open bag, ${bagCount} ${bagCount === 1 ? 'item' : 'items'}`} onPress={() => setBagOpen(true)} style={styles.headerBag}>
              <ShopActionIcon name="bag" color={atelier.petrol} size={20} />
              {bagCount > 0 ? <View style={styles.bagBadge}><Text style={styles.bagBadgeText}>{bagCount}</Text></View> : null}
            </Pressable>
          </View>
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
            <View style={[styles.listHeading, styles.womenListHeading]}>
              <Text style={styles.listTitle}>Womenswear</Text>
              <View style={styles.listActions}>
                <Text style={styles.listCount}>00 PIECES</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Filter and sort pieces" onPress={() => setFilterOpen(true)} style={styles.filterButton}>
                  <ShopActionIcon name="filter" color={atelier.petrol} size={19} />
                  {priceRange !== 'all' || sortBy !== 'featured' ? <View style={styles.filterDot} /> : null}
                </Pressable>
              </View>
            </View>
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
              <View style={styles.listActions}>
                <Text style={styles.listCount}>{String(visibleProducts.length).padStart(2, '0')} {visibleProducts.length === 1 ? 'PIECE' : 'PIECES'}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Filter and sort pieces" onPress={() => setFilterOpen(true)} style={styles.filterButton}>
                  <ShopActionIcon name="filter" color={atelier.petrol} size={19} />
                  {priceRange !== 'all' || sortBy !== 'featured' ? <View style={styles.filterDot} /> : null}
                </Pressable>
              </View>
            </View>
            <View style={styles.grid}>
              {visibleProducts.map((product) => {
                const saved = savedIds.includes(product.id);
                const quantity = bag[product.id] || 0;
                return (
                  <View key={product.id} style={styles.product}>
                    <View style={styles.productVisual}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`} onPress={() => setSelected(product)} style={styles.imageButton}>
                        <Image source={product.image} resizeMode="cover" style={styles.productImage} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? 'Remove' : 'Add'} ${product.name} ${saved ? 'from' : 'to'} wishlist`} accessibilityState={{ selected: saved }} onPress={() => toggleSaved(product.id)} style={[styles.imageAction, styles.heartAction]}>
                        <ShopActionIcon name="heart" color={saved ? atelier.cognac : atelier.petrol} filled={saved} size={21} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${product.name} to bag${quantity ? `, ${quantity} already in bag` : ''}`} onPress={() => addToBag(product.id)} style={[styles.imageAction, styles.bagAction, quantity > 0 && styles.bagActionAdded]}>
                        <ShopActionIcon name="bag" color={quantity > 0 ? atelier.white : atelier.petrol} size={21} />
                      </Pressable>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}, ${product.price}`} onPress={() => setSelected(product)} style={styles.productDetails}>
                      <Text style={styles.productCategory}>{product.category}  /  READY-TO-WEAR</Text>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>{product.price}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {visibleProducts.length === 0 ? <Text style={styles.emptyNote}>No pieces match this price range. Try another filter.</Text> : null}
            <Text style={styles.previewNote}>Catalogue preview from NY Atelier’s public store. Prices and availability should be checked before purchase. Checkout is not connected here yet.</Text>
          </>
        )}
      </ScrollView>

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.sheetFrame}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFilterOpen(false)} style={styles.sheetScrim} />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.sheetTop}>
              <Text style={styles.sheetTitle}>Filter & sort</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFilterOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
            </View>
            <Text style={styles.sheetLabel}>PRICE</Text>
            <View style={styles.optionRow}>
              {priceOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: priceRange === option.value }} onPress={() => setPriceRange(option.value)} style={[styles.option, priceRange === option.value && styles.optionSelected]}><Text style={[styles.optionText, priceRange === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}
            </View>
            <Text style={styles.sheetLabel}>SORT BY</Text>
            <View style={styles.optionRow}>
              {sortOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: sortBy === option.value }} onPress={() => setSortBy(option.value)} style={[styles.option, sortBy === option.value && styles.optionSelected]}><Text style={[styles.optionText, sortBy === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}
            </View>
            <View style={styles.sheetFooter}>
              <Pressable accessibilityRole="button" accessibilityLabel="Clear filters" onPress={() => { setPriceRange('all'); setSortBy('featured'); }}><Text style={styles.clearText}>Clear</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Show ${visibleProducts.length} ${visibleProducts.length === 1 ? 'piece' : 'pieces'}`} onPress={() => setFilterOpen(false)} style={styles.showButton}><Text style={styles.showText}>SHOW {String(visibleProducts.length).padStart(2, '0')} {visibleProducts.length === 1 ? 'PIECE' : 'PIECES'}</Text></Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={bagOpen} transparent animationType="slide" onRequestClose={() => setBagOpen(false)}>
        <View style={styles.sheetFrame}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close bag" onPress={() => setBagOpen(false)} style={styles.sheetScrim} />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.sheetTop}>
              <Text style={styles.sheetTitle}>Your bag · {bagCount}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close bag" onPress={() => setBagOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
            </View>
            {bagCount === 0 ? <Text style={styles.bagEmpty}>Your bag is empty. Explore the collection and add a piece.</Text> : (
              <>
                {products.filter((product) => bag[product.id]).map((product) => <View key={product.id} style={styles.bagItem}>
                  <Image source={product.image} resizeMode="cover" style={styles.bagImage} />
                  <View style={styles.bagItemText}><Text style={styles.productName}>{product.name}</Text><Text style={styles.productPrice}>{product.price} · Qty {bag[product.id]}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${product.name} from bag`} onPress={() => removeFromBag(product.id)}><Text style={styles.removeText}>Remove</Text></Pressable></View>
                </View>)}
                <View style={styles.totalRow}><Text style={styles.totalLabel}>SUBTOTAL</Text><Text style={styles.totalValue}>GH₵ {bagTotal.toLocaleString('en-GH')}</Text></View>
                <Text style={styles.bagFootnote}>Bag contents are held in this preview only. Checkout is not connected yet.</Text>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>

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
              <Text style={styles.detailNote}>This is a visual product preview. Use the heart or bag icon on each Shop card to save a piece or add it to your preview bag. Size selection and checkout will be connected in a later shopping build.</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { paddingBottom: 125 },
  header: { paddingHorizontal: 24, height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wordmark: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 16, fontWeight: '700', letterSpacing: 3.7 },
  headerIndex: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1 },
  headerBag: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  bagBadge: { position: 'absolute', top: 1, right: 0, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: atelier.cognac, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  bagBadgeText: { color: atelier.white, fontFamily: atelier.body, fontSize: 9, fontWeight: '700' },
  intro: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 27 },
  eyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 2, marginBottom: 13 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 34, lineHeight: 42, marginBottom: 10 },
  subtitle: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15 },
  filters: { gap: 23, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: atelier.line, marginBottom: 28 },
  filter: { paddingBottom: 15, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterActive: { borderBottomColor: atelier.petrol },
  filterText: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14 },
  filterTextActive: { color: atelier.petrol, fontWeight: '700' },
  listHeading: { width: '100%', maxWidth: 820, alignSelf: 'center', paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  womenListHeading: { paddingHorizontal: 0 },
  listTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 22 },
  listActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listCount: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1.4 },
  filterButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: atelier.cognac },
  grid: { width: '100%', maxWidth: 820, alignSelf: 'center', paddingHorizontal: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  product: { width: '49%', paddingHorizontal: 5, marginBottom: 30 },
  productVisual: { width: '100%', aspectRatio: 3 / 4, marginBottom: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E8E7E2' },
  imageButton: { width: '100%', height: '100%' },
  productImage: { width: '100%', height: '100%' },
  imageAction: { position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(250,248,244,0.94)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  heartAction: { top: 9, right: 9 },
  bagAction: { bottom: 9, right: 9 },
  bagActionAdded: { backgroundColor: atelier.petrol, borderColor: atelier.petrol },
  productDetails: { minHeight: 70 },
  productCategory: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1.3, marginBottom: 7 },
  productName: { color: atelier.slate, fontFamily: atelier.body, fontWeight: '700', fontSize: 16, marginBottom: 5 },
  productPrice: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14 },
  emptyNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14, paddingHorizontal: 24, paddingVertical: 30 },
  previewNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, lineHeight: 17, paddingHorizontal: 24 },
  coverImage: { width: '100%', height: '100%' },
  womenPreview: { paddingHorizontal: 24 },
  womenArt: { height: 280, marginBottom: 27, backgroundColor: atelier.petrol, padding: 22, justifyContent: 'space-between', borderRadius: 18 },
  womenArtTop: { color: atelier.brass, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.5 },
  womenArtTitle: { color: atelier.alabaster, fontFamily: atelier.display, fontSize: 43 },
  womenArtBottom: { color: atelier.alabaster, fontFamily: atelier.body, fontSize: 10, letterSpacing: 2 },
  womenTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 27, marginBottom: 12 },
  womenCopy: { color: atelier.slate, fontFamily: atelier.body, fontSize: 15, lineHeight: 23 },
  collectionFeature: { marginHorizontal: 24, marginBottom: 29 },
  collectionImage: { height: 280, borderRadius: 18, overflow: 'hidden' },
  collectionShade: { flex: 1, backgroundColor: 'rgba(6,20,24,0.32)', justifyContent: 'flex-end', padding: 20 },
  collectionEyebrow: { color: atelier.brass, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 9 },
  collectionTitle: { color: atelier.white, fontFamily: atelier.display, fontSize: 25, lineHeight: 32 },
  sheetFrame: { flex: 1, justifyContent: 'flex-end' },
  sheetScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,28,30,0.43)' },
  sheet: { maxHeight: '90%', backgroundColor: atelier.alabaster, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 16 },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  sheetTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 24 },
  sheetLabel: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1.6, marginBottom: 13 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 27 },
  option: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white },
  optionSelected: { backgroundColor: atelier.petrol, borderColor: atelier.petrol },
  optionText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 12 },
  optionTextSelected: { color: atelier.white },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  clearText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
  showButton: { backgroundColor: atelier.petrol, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 22 },
  showText: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 11, letterSpacing: 1.3 },
  bagEmpty: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15, lineHeight: 23, marginBottom: 24 },
  bagItem: { flexDirection: 'row', gap: 15, paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: atelier.line },
  bagImage: { width: 78, height: 100, borderRadius: 12, backgroundColor: '#E8E7E2' },
  bagItemText: { flex: 1, justifyContent: 'center', gap: 5 },
  removeText: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 12, textDecorationLine: 'underline', marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 5, marginBottom: 16 },
  totalLabel: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, letterSpacing: 1.3 },
  totalValue: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 17 },
  bagFootnote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  detailSafe: { flex: 1, backgroundColor: atelier.alabaster },
  detailTop: { height: 63, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: atelier.white },
  closeText: { color: atelier.petrol, fontSize: 28 },
  detailImage: { width: '100%', height: 450, backgroundColor: atelier.white, borderRadius: 18 },
  detailBody: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  detailTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 29, marginBottom: 10 },
  detailPrice: { color: atelier.slate, fontFamily: atelier.body, fontSize: 19 },
  detailRule: { height: 1, backgroundColor: atelier.line, marginVertical: 22 },
  detailNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14, lineHeight: 22 },
});
