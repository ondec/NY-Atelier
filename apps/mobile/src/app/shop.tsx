import { useRef, useState } from 'react';
import { Image, ImageBackground, ImageSourcePropType, Modal, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { ShopActionIcon } from '@/components/shop-action-icon';

type ProductPhoto = { id: string; label: string; image: ImageSourcePropType };
type ProductColor = { id: string; name: string; swatch: string; photos: ProductPhoto[]; concept?: boolean };
type Product = { id: string; name: string; price: string; priceValue: number; image: ImageSourcePropType; category: string; colors: ProductColor[] };
type BagEntry = { productId: string; colorId: string; size: string | null; quantity: number };
const products: Product[] = [
  {
    id: 'aegis', name: 'Aegis Set', price: 'GH₵ 1,150', priceValue: 1150, image: require('../../assets/ny/product-aegis.png'), category: 'MEN',
    colors: [{ id: 'navy', name: 'Navy', swatch: '#202431', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-aegis.png') }] }],
  },
  {
    id: 'amani', name: 'Amani Set', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-amani.jpg'), category: 'MEN',
    colors: [
      { id: 'cream', name: 'Cream', swatch: '#DCCB9B', photos: [
        { id: 'front', label: 'Front', image: require('../../assets/ny/product-amani.jpg') },
        { id: 'detail', label: 'Fabric detail', image: require('../../assets/ny/product-amani-cream-detail.jpg') },
        { id: 'side', label: 'Side', image: require('../../assets/ny/product-amani-cream-side.jpg') },
      ] },
      { id: 'black-preview', name: 'Black', swatch: '#242424', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-amani-black-preview.jpg') }], concept: true },
    ],
  },
  {
    id: 'arctic', name: 'Arctic Edge Set', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-arctic.png'), category: 'MEN',
    colors: [{ id: 'white', name: 'White', swatch: '#EDEDEB', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-arctic.png') }] }],
  },
];
const filters = ['All', 'Men', 'Women', 'Collections'] as const;
const previewSizes = ['S', 'M', 'L', 'XL', 'XXL'];
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
  const galleryRef = useRef<ScrollViewInstance>(null);
  const { width } = useWindowDimensions();
  const galleryWidth = Math.min(width, 560) - 24;
  const detailImageHeight = galleryWidth * 4 / 3;
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [detailAdded, setDetailAdded] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [bag, setBag] = useState<Record<string, BagEntry>>({});
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('featured');
  const [filterOpen, setFilterOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const visibleProducts = (filter === 'Women' ? [] : products)
    .filter((product) => priceRange === 'all' || (priceRange === 'under1200' ? product.priceValue < 1200 : product.priceValue >= 1200))
    .sort((a, b) => sortBy === 'low' ? a.priceValue - b.priceValue : sortBy === 'high' ? b.priceValue - a.priceValue : 0);
  const bagEntries = Object.entries(bag);
  const selectedColor = selected?.colors.find((color) => color.id === selectedColorId) || selected?.colors[0];
  const selectedPhotos = selectedColor?.photos || [];
  const bagCount = bagEntries.reduce((total, [, entry]) => total + entry.quantity, 0);
  const bagTotal = bagEntries.reduce((total, [, entry]) => total + (products.find((product) => product.id === entry.productId)?.priceValue || 0) * entry.quantity, 0);

  function openProduct(product: Product) {
    setSelectedColorId(product.colors[0].id);
    setSelectedPhotoIndex(0);
    setSelectedSize(null);
    setSizeError(false);
    setDetailAdded(false);
    setSelected(product);
  }

  function goToPhoto(index: number) {
    if (index < 0 || index >= selectedPhotos.length) return;
    setSelectedPhotoIndex(index);
    galleryRef.current?.scrollTo({ x: index * galleryWidth, animated: true });
  }

  function toggleSaved(id: string) {
    setSavedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function addToBag(id: string, size: string | null = null, colorId?: string) {
    const chosenColorId = colorId || products.find((product) => product.id === id)?.colors[0].id;
    if (!chosenColorId) return;
    const key = `${id}:${chosenColorId}:${size || 'unselected'}`;
    setBag((current) => ({ ...current, [key]: { productId: id, colorId: chosenColorId, size, quantity: (current[key]?.quantity || 0) + 1 } }));
  }

  function removeFromBag(key: string) {
    setBag((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function addSelectedToBag() {
    if (!selected) return;
    if (!selectedSize) {
      setSizeError(true);
      return;
    }
    addToBag(selected.id, selectedSize, selectedColorId || undefined);
    setDetailAdded(true);
    setSizeError(false);
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
                const quantity = bagEntries.reduce((total, [, entry]) => total + (entry.productId === product.id ? entry.quantity : 0), 0);
                return (
                  <View key={product.id} style={styles.product}>
                    <View style={styles.productVisual}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`} onPress={() => openProduct(product)} style={styles.imageButton}>
                        <Image source={product.image} resizeMode="cover" style={styles.productImage} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? 'Remove' : 'Add'} ${product.name} ${saved ? 'from' : 'to'} wishlist`} accessibilityState={{ selected: saved }} onPress={() => toggleSaved(product.id)} style={[styles.imageAction, styles.heartAction]}>
                        <ShopActionIcon name="heart" color={saved ? atelier.cognac : atelier.petrol} filled={saved} size={21} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${product.name} to bag${quantity ? `, ${quantity} already in bag` : ''}`} onPress={() => addToBag(product.id)} style={[styles.imageAction, styles.bagAction, quantity > 0 && styles.bagActionAdded]}>
                        <ShopActionIcon name="bag" color={quantity > 0 ? atelier.white : atelier.petrol} size={21} />
                      </Pressable>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}, ${product.price}`} onPress={() => openProduct(product)} style={styles.productDetails}>
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
                {bagEntries.map(([key, entry]) => {
                  const product = products.find((item) => item.id === entry.productId);
                  if (!product) return null;
                  const color = product.colors.find((item) => item.id === entry.colorId) || product.colors[0];
                  return <View key={key} style={styles.bagItem}>
                    <Image source={color.photos[0].image} resizeMode="cover" style={styles.bagImage} />
                    <View style={styles.bagItemText}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>{product.price} · Qty {entry.quantity}</Text>
                      <Text style={styles.bagSize}>{color.name}{color.concept ? ' · colour preview' : ''}</Text>
                      <Text style={styles.bagSize}>{entry.size ? `Size ${entry.size}` : 'Size to be selected'}</Text>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${product.name} in ${color.name}${entry.size ? ` size ${entry.size}` : ''} from bag`} onPress={() => removeFromBag(key)}><Text style={styles.removeText}>Remove</Text></Pressable>
                    </View>
                  </View>;
                })}
                <View style={styles.totalRow}><Text style={styles.totalLabel}>SUBTOTAL</Text><Text style={styles.totalValue}>GH₵ {bagTotal.toLocaleString('en-GH')}</Text></View>
                <Text style={styles.bagFootnote}>Bag contents are held in this preview only. Checkout is not connected yet.</Text>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={selected !== null} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={styles.detailSafe} edges={['top', 'bottom']}>
          <View style={styles.detailShell}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
              <View style={styles.detailHero}>
                {selectedColor ? <ScrollView
                  key={`${selected?.id}-${selectedColor.id}`}
                  ref={galleryRef}
                  horizontal
                  pagingEnabled
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / galleryWidth);
                    if (index !== selectedPhotoIndex && index >= 0 && index < selectedPhotos.length) setSelectedPhotoIndex(index);
                  }}
                  style={{ width: galleryWidth, height: detailImageHeight }}
                >
                  {selectedPhotos.map((photo) => <Image key={photo.id} source={photo.image} resizeMode="contain" style={[styles.detailImage, { width: galleryWidth, height: detailImageHeight }]} />)}
                </ScrollView> : null}
                <View style={styles.detailTop}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Back to Shop" onPress={() => setSelected(null)} style={styles.detailTopButton}>
                    <ShopActionIcon name="back" color={atelier.petrol} size={20} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Open bag, ${bagCount} ${bagCount === 1 ? 'item' : 'items'}`} onPress={() => { setSelected(null); setBagOpen(true); }} style={styles.detailTopButton}>
                    <ShopActionIcon name="bag" color={atelier.petrol} size={20} />
                    {bagCount > 0 ? <View style={styles.bagBadge}><Text style={styles.bagBadgeText}>{bagCount}</Text></View> : null}
                  </Pressable>
                </View>
                {selectedPhotos.length > 1 ? <>
                  <Pressable accessibilityRole="button" accessibilityLabel="Previous photo" accessibilityState={{ disabled: selectedPhotoIndex === 0 }} disabled={selectedPhotoIndex === 0} onPress={() => goToPhoto(selectedPhotoIndex - 1)} style={[styles.galleryArrow, styles.galleryArrowLeft, selectedPhotoIndex === 0 && styles.galleryArrowDisabled]}>
                    <ShopActionIcon name="back" color={atelier.petrol} size={18} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Next photo" accessibilityState={{ disabled: selectedPhotoIndex === selectedPhotos.length - 1 }} disabled={selectedPhotoIndex === selectedPhotos.length - 1} onPress={() => goToPhoto(selectedPhotoIndex + 1)} style={[styles.galleryArrow, styles.galleryArrowRight, selectedPhotoIndex === selectedPhotos.length - 1 && styles.galleryArrowDisabled]}>
                    <ShopActionIcon name="forward" color={atelier.petrol} size={18} />
                  </Pressable>
                  <View style={styles.galleryMeta} pointerEvents="none">
                    <Text style={styles.galleryMetaText}>{selectedPhotos[selectedPhotoIndex]?.label.toUpperCase()}</Text>
                    <Text style={styles.galleryMetaText}>{String(selectedPhotoIndex + 1).padStart(2, '0')} / {String(selectedPhotos.length).padStart(2, '0')}</Text>
                  </View>
                </> : null}
              </View>
              <View style={styles.detailBody}>
                <Text style={styles.detailEyebrow}>NY ATELIER  /  READY-TO-WEAR</Text>
                <Text style={styles.detailTitle}>{selected?.name}</Text>
                <Text style={styles.detailPrice}>{selected?.price}</Text>
                <View style={styles.detailRule} />
                <Text style={styles.detailLabel}>COLOUR <Text style={styles.detailLabelLight}>· {selectedColor?.name.toUpperCase()}{selectedColor?.concept ? ' PREVIEW' : ''}</Text></Text>
                <View style={styles.colorRow}>
                  {selected?.colors.map((color) => <Pressable key={color.id} accessibilityRole="button" accessibilityLabel={`${color.name}${color.concept ? ' visual preview' : ''}`} accessibilityState={{ selected: selectedColorId === color.id }} onPress={() => { setSelectedColorId(color.id); setSelectedPhotoIndex(0); setDetailAdded(false); }} style={styles.colorOption}>
                    <View style={[styles.colorImageFrame, selectedColorId === color.id && styles.colorImageFrameSelected]}>
                      <Image source={color.photos[0].image} resizeMode="cover" style={styles.colorImage} />
                    </View>
                    <View style={styles.colorCaption}><View style={[styles.colorSwatch, { backgroundColor: color.swatch }]} /><Text style={[styles.colorName, selectedColorId === color.id && styles.colorNameSelected]}>{color.name}</Text></View>
                  </Pressable>)}
                </View>
                {selectedColor?.concept ? <Text style={styles.colorPreviewNote}>This is a visual colour concept. NY Atelier has not confirmed it as a stocked variant.</Text> : null}
                <Text style={styles.detailLabel}>SELECT SIZE <Text style={styles.detailLabelLight}>· PREVIEW</Text></Text>
                <View style={styles.sizeRow}>
                  {previewSizes.map((size) => <Pressable key={size} accessibilityRole="button" accessibilityLabel={`Size ${size}`} accessibilityState={{ selected: selectedSize === size }} onPress={() => { setSelectedSize(size); setSizeError(false); setDetailAdded(false); }} style={[styles.sizeOption, selectedSize === size && styles.sizeOptionSelected]}><Text style={[styles.sizeText, selectedSize === size && styles.sizeTextSelected]}>{size}</Text></Pressable>)}
                </View>
                {sizeError ? <Text style={styles.sizeError}>Select a size to add this piece.</Text> : null}
                <Text style={styles.detailNote}>Size choices are for this preview. Confirm availability with NY Atelier before purchase.</Text>
              </View>
            </ScrollView>
            <View style={styles.detailFooter}>
              {detailAdded ? <View style={styles.detailConfirmation}>
                <Text style={styles.addedText}>Added to your bag</Text>
                <View style={styles.confirmationActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel="View bag" onPress={() => { setSelected(null); setBagOpen(true); }}><Text style={styles.confirmationLink}>VIEW BAG</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Continue shopping" onPress={() => setSelected(null)}><Text style={styles.confirmationLink}>CONTINUE SHOPPING</Text></Pressable>
                </View>
              </View> : null}
              <View style={styles.detailFooterActions}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${selected && savedIds.includes(selected.id) ? 'Remove' : 'Add'} ${selected?.name || 'piece'} ${selected && savedIds.includes(selected.id) ? 'from' : 'to'} wishlist`} accessibilityState={{ selected: selected ? savedIds.includes(selected.id) : false }} onPress={() => selected && toggleSaved(selected.id)} style={styles.detailHeartButton}>
                  <ShopActionIcon name="heart" color={selected && savedIds.includes(selected.id) ? atelier.cognac : atelier.petrol} filled={selected ? savedIds.includes(selected.id) : false} size={23} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Add ${selected?.name || 'piece'} to bag`} onPress={addSelectedToBag} style={styles.detailAddButton}><Text style={styles.detailAddText}>ADD TO BAG</Text></Pressable>
              </View>
            </View>
          </View>
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
  bagSize: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12 },
  removeText: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 12, textDecorationLine: 'underline', marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 5, marginBottom: 16 },
  totalLabel: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, letterSpacing: 1.3 },
  totalValue: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 17 },
  bagFootnote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  detailSafe: { flex: 1, backgroundColor: atelier.alabaster, alignItems: 'center' },
  detailShell: { flex: 1, width: '100%', maxWidth: 560 },
  detailScrollContent: { paddingBottom: 18 },
  detailHero: { marginHorizontal: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: atelier.white },
  galleryArrow: { position: 'absolute', top: '46%', width: 39, height: 39, borderRadius: 20, backgroundColor: 'rgba(250,248,244,0.94)', alignItems: 'center', justifyContent: 'center' },
  galleryArrowLeft: { left: 13 },
  galleryArrowRight: { right: 13 },
  galleryArrowDisabled: { opacity: 0.38 },
  galleryMeta: { position: 'absolute', bottom: 13, left: 14, right: 14, height: 29, borderRadius: 15, backgroundColor: 'rgba(250,248,244,0.9)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  galleryMetaText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1 },
  detailTop: { position: 'absolute', left: 14, right: 14, top: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailTopButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(250,248,244,0.94)', alignItems: 'center', justifyContent: 'center' },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: atelier.white },
  closeText: { color: atelier.petrol, fontSize: 28 },
  detailImage: { width: '100%' },
  detailBody: { paddingHorizontal: 24, paddingTop: 25 },
  detailEyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1.5, marginBottom: 10 },
  detailTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 27, lineHeight: 35, marginBottom: 6 },
  detailPrice: { color: atelier.slate, fontFamily: atelier.body, fontSize: 18 },
  detailRule: { height: 1, backgroundColor: atelier.line, marginVertical: 18 },
  detailLabel: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 11, letterSpacing: 1.3, marginBottom: 12 },
  detailLabelLight: { color: atelier.muted, fontWeight: '400' },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  colorOption: { alignItems: 'center', gap: 6 },
  colorImageFrame: { width: 67, height: 78, borderWidth: 2, borderColor: 'transparent', borderRadius: 11, padding: 2, backgroundColor: atelier.white, overflow: 'hidden' },
  colorImageFrameSelected: { borderColor: atelier.petrol },
  colorImage: { width: '100%', height: '100%', borderRadius: 7 },
  colorCaption: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colorSwatch: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: atelier.line },
  colorName: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11 },
  colorNameSelected: { color: atelier.petrol, fontWeight: '700' },
  colorPreviewNote: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 11, lineHeight: 16, marginTop: -7, marginBottom: 16 },
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 11 },
  sizeOption: { minWidth: 51, height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: atelier.line, borderRadius: 12, backgroundColor: atelier.white, alignItems: 'center', justifyContent: 'center' },
  sizeOptionSelected: { backgroundColor: atelier.petrol, borderColor: atelier.petrol },
  sizeText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14, fontWeight: '700' },
  sizeTextSelected: { color: atelier.white },
  sizeError: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 12, marginBottom: 9 },
  detailNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18 },
  detailFooter: { paddingHorizontal: 24, paddingTop: 13, paddingBottom: 8, borderTopWidth: 1, borderTopColor: atelier.line, backgroundColor: atelier.alabaster },
  detailFooterActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  detailHeartButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: atelier.white, borderWidth: 1, borderColor: atelier.line, alignItems: 'center', justifyContent: 'center' },
  detailAddButton: { flex: 1, height: 52, borderRadius: 18, backgroundColor: atelier.petrol, alignItems: 'center', justifyContent: 'center' },
  detailAddText: { color: atelier.white, fontFamily: atelier.body, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  detailConfirmation: { paddingBottom: 13 },
  addedText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14, fontWeight: '700', marginBottom: 9 },
  confirmationActions: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmationLink: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textDecorationLine: 'underline' },
});
