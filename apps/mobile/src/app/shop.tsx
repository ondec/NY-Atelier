import { useRef, useState } from 'react';
import { Image, ImageBackground, ImageSourcePropType, Modal, Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { ShopActionIcon } from '@/components/shop-action-icon';
import { NyMark } from '@/components/ny-mark';

type ProductPhoto = { id: string; label: string; image: ImageSourcePropType };
type ProductColor = { id: string; name: string; swatch: string; photos: ProductPhoto[]; concept?: boolean };
type Product = { id: string; name: string; description: string; price: string; priceValue: number; image: ImageSourcePropType; category: string; colors: ProductColor[] };
type BagEntry = { productId: string; colorId: string; size: string | null; quantity: number };
const products: Product[] = [
  {
    id: 'aegis', name: 'Aegis Set', description: 'A deep navy matching set with a longline top, offset button detail and a neat chest pocket. A clean, confident look for the moments that call for it.', price: 'GH₵ 1,150', priceValue: 1150, image: require('../../assets/ny/product-aegis.png'), category: 'MEN',
    colors: [{ id: 'navy', name: 'Navy', swatch: '#202431', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-aegis.png') }] }],
  },
  {
    id: 'amani', name: 'Amani Set', description: 'A coordinated set with a button-front top and patterned pocket accents. Its simple lines let the details stand out.', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-amani.jpg'), category: 'MEN',
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
    id: 'arctic', name: 'Arctic Edge Set', description: 'A white matching set with dark contrast trim and a clean half-placket neckline. A sharp, understated finish from top to trouser.', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-arctic.png'), category: 'MEN',
    colors: [{ id: 'white', name: 'White', swatch: '#EDEDEB', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-arctic.png') }] }],
  },
];
const filters = ['All', 'New Arrivals', 'Men', 'Women', 'Collections'] as const;
const previewSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const maxPreviewQuantity = 99;
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const galleryWidth = Math.min(width, 560) - 24;
  const detailImageHeight = galleryWidth * 4 / 3;
  const detailTopPadding = (Platform.OS === 'web' ? 34 : Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24)) + 16;
  const detailBottomPadding = Math.max(insets.bottom, Platform.OS === 'web' ? 0 : 24) + 12;
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [detailAdded, setDetailAdded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [bag, setBag] = useState<Record<string, BagEntry>>({});
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('featured');
  const [filterOpen, setFilterOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const visibleProducts = (filter === 'Women' || filter === 'New Arrivals' ? [] : products)
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
    setSelectedQuantity(1);
    setSizeError(false);
    setDetailAdded(false);
    setSizeGuideOpen(false);
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

  function addToBag(id: string, size: string | null = null, colorId?: string, quantity = 1) {
    const chosenColorId = colorId || products.find((product) => product.id === id)?.colors[0].id;
    if (!chosenColorId) return;
    const key = `${id}:${chosenColorId}:${size || 'unselected'}`;
    setBag((current) => ({ ...current, [key]: { productId: id, colorId: chosenColorId, size, quantity: (current[key]?.quantity || 0) + quantity } }));
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
    addToBag(selected.id, selectedSize, selectedColorId || undefined, selectedQuantity);
    setDetailAdded(true);
    setSizeError(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandLockup}><NyMark color={atelier.petrol} size={25} /><Text style={styles.wordmark}>NY ATELIER</Text></View>
          <View style={styles.headerRight}>
            <Text style={styles.headerIndex}>READY-TO-WEAR  /  01</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open bag, ${bagCount} ${bagCount === 1 ? 'item' : 'items'}`} onPress={() => setBagOpen(true)} style={styles.headerBag}>
              <ShopActionIcon name="bag" color={atelier.petrol} size={20} />
              {bagCount > 0 ? <View style={styles.bagBadge}><Text style={styles.bagBadgeText}>{bagCount}</Text></View> : null}
            </Pressable>
          </View>
        </View>
        <View style={styles.intro}>
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

        {filter === 'New Arrivals' ? (
          <View style={styles.newArrivals}>
            <View style={styles.newArrivalsPanel}>
              <Text style={styles.newArrivalsLabel}>NEW ARRIVALS</Text>
              <Text style={styles.newArrivalsTitle}>A fresh edit is coming.</Text>
              <Text style={styles.newArrivalsCopy}>New pieces will appear here when NY Atelier confirms their release.</Text>
              <Pressable accessibilityRole="button" onPress={() => setFilter('All')} style={styles.newArrivalsButton}>
                <Text style={styles.newArrivalsButtonText}>EXPLORE THE COLLECTION</Text>
                <Text style={styles.newArrivalsArrow}>↗</Text>
              </Pressable>
            </View>
          </View>
        ) : filter === 'Women' ? (
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
                    <Text style={styles.collectionEyebrow}>COLLECTIONS  /  01</Text>
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
                const visibleColors = product.colors;
                const conceptColors = visibleColors.filter((color) => color.concept);
                return (
                  <View key={product.id} style={styles.product}>
                    <View style={styles.productVisual}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`} onPress={() => openProduct(product)} style={styles.imageButton}>
                        <Image source={product.image} resizeMode="cover" style={styles.productImage} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? 'Remove' : 'Add'} ${product.name} ${saved ? 'from' : 'to'} wishlist`} accessibilityState={{ selected: saved }} onPress={() => toggleSaved(product.id)} style={[styles.imageAction, styles.heartAction]}>
                        <ShopActionIcon name="heart" color={saved ? atelier.cognac : atelier.petrol} filled={saved} size={21} />
                      </Pressable>
                      <View accessible accessibilityLabel={`${product.name}: ${visibleColors.map((color) => `${color.name}${color.concept ? ' visual preview' : ' colour'}`).join(', ')}`} style={styles.cardColors}>
                        {visibleColors.slice(0, 3).map((color, index) => (
                          <View key={color.id} style={[styles.cardColorSwatch, index > 0 && styles.cardColorOverlap, { backgroundColor: color.swatch }]} />
                        ))}
                        {visibleColors.length > 3 ? <Text style={styles.cardColorMore}>+{visibleColors.length - 3}</Text> : null}
                      </View>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}, ${product.price}`} onPress={() => openProduct(product)} style={styles.productDetails}>
                      <Text style={styles.productCategory}>{product.category}  /  READY-TO-WEAR</Text>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>{product.price}</Text>
                      {conceptColors.length > 0 ? <Text style={styles.productPreviewLabel}>{conceptColors.map((color) => color.name).join(', ').toUpperCase()} · VISUAL PREVIEW</Text> : null}
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
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
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
          </View>
        </View>
      </Modal>

      <Modal visible={bagOpen} transparent animationType="slide" onRequestClose={() => setBagOpen(false)}>
        <View style={styles.sheetFrame}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close bag" onPress={() => setBagOpen(false)} style={styles.sheetScrim} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
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
          </View>
        </View>
      </Modal>

      <Modal visible={selected !== null} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={[styles.detailSafe, { paddingTop: detailTopPadding, paddingBottom: detailBottomPadding }]}>
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
                <View style={styles.detailBrandLine}><NyMark color={atelier.cognac} size={18} /><Text style={styles.detailEyebrow}>NY ATELIER  /  READY-TO-WEAR</Text></View>
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
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionHeading}>DESCRIPTION</Text>
                  <Text style={styles.descriptionText}>{selected?.description}</Text>
                </View>
                <View style={styles.quantitySection}>
                  <Text style={styles.quantityHeading}>QUANTITY</Text>
                  <View style={styles.quantityControl}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" accessibilityState={{ disabled: selectedQuantity === 1 }} disabled={selectedQuantity === 1} onPress={() => { setSelectedQuantity((current) => Math.max(1, current - 1)); setDetailAdded(false); }} style={[styles.quantityButton, selectedQuantity === 1 && styles.quantityButtonDisabled]}>
                      <Text style={styles.quantitySymbol}>−</Text>
                    </Pressable>
                    <Text accessibilityLabel={`Quantity ${selectedQuantity}`} style={styles.quantityValue}>{selectedQuantity}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" accessibilityState={{ disabled: selectedQuantity === maxPreviewQuantity }} disabled={selectedQuantity === maxPreviewQuantity} onPress={() => { setSelectedQuantity((current) => Math.min(maxPreviewQuantity, current + 1)); setDetailAdded(false); }} style={[styles.quantityButton, selectedQuantity === maxPreviewQuantity && styles.quantityButtonDisabled]}>
                      <Text style={styles.quantitySymbol}>+</Text>
                    </Pressable>
                  </View>
                </View>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: sizeGuideOpen }} onPress={() => setSizeGuideOpen((open) => !open)} style={styles.sizeGuideToggle}>
                  <Text style={styles.sizeGuideTitle}>SIZE CHART & FIT GUIDE</Text>
                  <Text style={styles.sizeGuideSymbol}>{sizeGuideOpen ? '−' : '+'}</Text>
                </Pressable>
                {sizeGuideOpen ? <View style={styles.sizeGuideContent}>
                  <Text style={styles.sizeGuideNote}>NY Atelier has not provided verified measurements for these sizes yet. Confirm the garment measurements before ordering.</Text>
                  <View style={styles.sizeChart}>
                    <View style={styles.sizeChartRow}><Text style={styles.sizeChartHeading}>SIZE</Text><Text style={styles.sizeChartHeading}>CHEST</Text><Text style={styles.sizeChartHeading}>WAIST</Text><Text style={styles.sizeChartHeading}>HIPS</Text></View>
                    {previewSizes.map((size) => <View key={size} style={styles.sizeChartRow}><Text style={styles.sizeChartSize}>{size}</Text><Text style={styles.sizeChartCell}>—</Text><Text style={styles.sizeChartCell}>—</Text><Text style={styles.sizeChartCell}>—</Text></View>)}
                  </View>
                  <View style={styles.sizeGuideRow}><Text style={styles.sizeGuideMeasure}>Chest</Text><Text style={styles.sizeGuideHow}>Measure around the fullest part.</Text></View>
                  <View style={styles.sizeGuideRow}><Text style={styles.sizeGuideMeasure}>Waist</Text><Text style={styles.sizeGuideHow}>Measure around your natural waist.</Text></View>
                  <View style={styles.sizeGuideRow}><Text style={styles.sizeGuideMeasure}>Hips</Text><Text style={styles.sizeGuideHow}>Measure around the fullest part.</Text></View>
                </View> : null}
              </View>
            </ScrollView>
            <View style={styles.detailFooter}>
              {detailAdded ? <View style={styles.detailConfirmation}>
                <Text style={styles.addedText}>{selectedQuantity} {selectedQuantity === 1 ? 'item' : 'items'} added to your bag</Text>
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { paddingBottom: 125 },
  header: { paddingHorizontal: 24, height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
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
  newArrivals: { paddingHorizontal: 24, paddingBottom: 32 },
  newArrivalsPanel: { minHeight: 330, borderRadius: 20, backgroundColor: atelier.petrol, padding: 26, justifyContent: 'flex-end' },
  newArrivalsLabel: { color: atelier.brass, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 15 },
  newArrivalsTitle: { color: atelier.white, fontFamily: atelier.display, fontSize: 30, lineHeight: 38, marginBottom: 13 },
  newArrivalsCopy: { color: atelier.alabaster, fontFamily: atelier.body, fontSize: 14, lineHeight: 21, marginBottom: 24 },
  newArrivalsButton: { minHeight: 50, borderRadius: atelier.buttonRadius, backgroundColor: atelier.alabaster, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newArrivalsButtonText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  newArrivalsArrow: { color: atelier.petrol, fontSize: 20 },
  grid: { width: '100%', maxWidth: 820, alignSelf: 'center', paddingHorizontal: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  product: { width: '49%', paddingHorizontal: 5, marginBottom: 30 },
  productVisual: { width: '100%', aspectRatio: 3 / 4, marginBottom: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E8E7E2' },
  imageButton: { width: '100%', height: '100%' },
  productImage: { width: '100%', height: '100%' },
  imageAction: { position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(250,248,244,0.94)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  heartAction: { top: 9, right: 9 },
  cardColors: { position: 'absolute', right: 6, bottom: 6, minWidth: 22, paddingHorizontal: 2, paddingVertical: 3, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(28,35,38,0.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  cardColorSwatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: atelier.white },
  cardColorOverlap: { marginTop: -2 },
  cardColorMore: { color: atelier.white, fontFamily: atelier.body, fontSize: 8, fontWeight: '700', marginTop: 2 },
  productDetails: { minHeight: 70 },
  productCategory: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1.3, marginBottom: 7 },
  productName: { color: atelier.slate, fontFamily: atelier.body, fontWeight: '700', fontSize: 16, marginBottom: 5 },
  productPrice: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14 },
  productPreviewLabel: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 8, fontWeight: '700', letterSpacing: 0.7, marginTop: 5 },
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
  option: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: atelier.buttonRadius, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white },
  optionSelected: { backgroundColor: atelier.petrol, borderColor: atelier.petrol },
  optionText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 12 },
  optionTextSelected: { color: atelier.white },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  clearText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
  showButton: { backgroundColor: atelier.petrol, borderRadius: atelier.buttonRadius, paddingVertical: 16, paddingHorizontal: 22 },
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
  detailSafe: { flex: 1, backgroundColor: atelier.alabaster, alignItems: 'center', paddingTop: 16 },
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
  detailBrandLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  detailEyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1.5 },
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
  sizeOption: { minWidth: 51, height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: atelier.line, borderRadius: atelier.buttonRadius, backgroundColor: atelier.white, alignItems: 'center', justifyContent: 'center' },
  sizeOptionSelected: { backgroundColor: atelier.petrol, borderColor: atelier.petrol },
  sizeText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14, fontWeight: '700' },
  sizeTextSelected: { color: atelier.white },
  sizeError: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 12, marginBottom: 9 },
  descriptionSection: { borderTopWidth: 1, borderTopColor: atelier.line, paddingTop: 18, marginTop: 9 },
  descriptionHeading: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 11 },
  descriptionText: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 21 },
  quantitySection: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityHeading: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  quantityControl: { height: 46, minWidth: 138, borderRadius: atelier.buttonRadius, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quantityButtonDisabled: { opacity: 0.36 },
  quantitySymbol: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 22, lineHeight: 27 },
  quantityValue: { minWidth: 35, color: atelier.petrol, fontFamily: atelier.body, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  sizeGuideToggle: { marginTop: 23, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: atelier.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sizeGuideTitle: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  sizeGuideSymbol: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 22, lineHeight: 22 },
  sizeGuideContent: { paddingTop: 17, paddingBottom: 8 },
  sizeGuideNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 19, marginBottom: 17 },
  sizeChart: { borderWidth: 1, borderColor: atelier.line, borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  sizeChartRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: atelier.line, paddingVertical: 10, paddingHorizontal: 7 },
  sizeChartHeading: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 9, fontWeight: '700', textAlign: 'center', flex: 1 },
  sizeChartSize: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 12, fontWeight: '700', textAlign: 'center', flex: 1 },
  sizeChartCell: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, textAlign: 'center', flex: 1 },
  sizeGuideRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, borderTopWidth: 1, borderTopColor: atelier.line, paddingVertical: 12 },
  sizeGuideMeasure: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 13, fontWeight: '700' },
  sizeGuideHow: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, flex: 1, textAlign: 'right' },
  detailFooter: { paddingHorizontal: 24, paddingTop: 13, paddingBottom: 0, borderTopWidth: 1, borderTopColor: atelier.line, backgroundColor: atelier.alabaster },
  detailFooterActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  detailHeartButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: atelier.white, borderWidth: 1, borderColor: atelier.line, alignItems: 'center', justifyContent: 'center' },
  detailAddButton: { flex: 1, height: 52, borderRadius: atelier.buttonRadius, backgroundColor: atelier.petrol, alignItems: 'center', justifyContent: 'center' },
  detailAddText: { color: atelier.white, fontFamily: atelier.body, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  detailConfirmation: { paddingBottom: 13 },
  addedText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14, fontWeight: '700', marginBottom: 9 },
  confirmationActions: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmationLink: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textDecorationLine: 'underline' },
});
