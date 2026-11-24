import { Image, ImageBackground } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEdgeSwipeBack } from '@/components/edge-swipe-back';
import { useShopCatalogue, type ShopProduct as Product, type ClothingType, type ColorGroup } from '@/lib/shop-catalogue';
import { useShoppingBag } from '@/components/shopping-bag';
import { atelier } from '@/atelier-theme';
import { IconLabel, ShopActionIcon } from '@/components/shop-action-icon';
import { NyMark } from '@/components/ny-mark';
import { shopColumns } from '@/lib/customer-layout';
import { GestureBoundary, useTabSwipeBlocker } from '@/components/tab-swipe';
import { SizeGuide } from '@/components/size-guide';
import { usePublishedSizing } from '@/lib/published-sizing';
import { approvedSizingCharts } from '@/data/sizing-data';
import { productVariants, publishedProductProfile } from '@/lib/sizing';

const filters = ['All', 'New Arrivals', 'Men', 'Women', 'Accessories', 'Collections'] as const;
type PriceRange = 'all' | 'under1200' | '1200plus';
type SortBy = 'featured' | 'low' | 'high';
type TypeFilter = 'all' | Exclude<ClothingType, 'other'>;
type ColorFilter = 'all' | ColorGroup;
type AvailabilityFilter = 'all' | 'available' | 'unavailable';
const typeOptions: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' }, { value: 'tops', label: 'Tops & shirts' },
  { value: 'trousers', label: 'Trousers' }, { value: 'sets', label: 'Two-piece sets' },
  { value: 'accessories', label: 'Accessories' },
];
const colorOptions: { value: ColorFilter; label: string }[] = [
  { value: 'all', label: 'All colours' }, { value: 'black', label: 'Black' },
  { value: 'blue', label: 'Blue' }, { value: 'light', label: 'White & cream' }, { value: 'brown', label: 'Brown' },
];
const availabilityOptions: { value: AvailabilityFilter; label: string }[] = [
  { value: 'all', label: 'All pieces' }, { value: 'available', label: 'Available' }, { value: 'unavailable', label: 'Out of stock' },
];
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

type ProductCard = { product: Product; variant?: Product['colors'][number]; name: string; soldOut: boolean };

function editionName(product: Product, color: Product['colors'][number]) {
  const edition = color.name === 'Navy blue' ? 'Navy Blue' : color.name;
  return `${product.name} – ${edition} Edition`;
}

export default function ShopScreen() {
  const { publication, unavailable: sizingUnavailable } = usePublishedSizing();
  const { status: catalogueStatus, products, collections: shopCollections, reload: reloadCatalogue } = useShopCatalogue();
  const liveProducts = products.map((product): Product => {
    const sizing = publishedProductProfile(product.id, product.sizing, publication);
    return { ...product, sizing, category: product.category || (sizing ? sizing.gender === 'women' ? 'WOMEN' : 'MEN' : '') };
  });
  const { bag, bagCount, addToBag, openBag } = useShoppingBag();
  const galleryRef = useRef<ScrollViewInstance>(null);
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const [catalogueWidth, setCatalogueWidth] = useState<number | null>(null);
  // Match the initial server and client markup, then use the measured container.
  const columns = catalogueWidth === null ? 2 : shopColumns(catalogueWidth, fontScale);
  const galleryWidth = Math.min(width, 560) - 24;
  const detailImageHeight = galleryWidth * 4 / 3;
  const detailTopPadding = (Platform.OS === 'web' ? 34 : Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24)) + 16;
  const detailBottomPadding = Math.max(insets.bottom, Platform.OS === 'web' ? 0 : 24) + 12;
  const { collection } = useLocalSearchParams<{ collection?: string }>();
  const [shopFilter, setFilter] = useState<(typeof filters)[number]>('All');
  const activeCollection = shopCollections.find((entry) => entry.id === collection);
  const filter = activeCollection ? 'Collections' : shopFilter;
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [detailAdded, setDetailAdded] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('featured');
  const [filterOpen, setFilterOpen] = useState(false);
  const closeFilters = useCallback(() => setFilterOpen(false), []);
  const closeProduct = useCallback(() => setSelected(null), [setSelected]);
  useTabSwipeBlocker(filterOpen || selected !== null);
  const filterSwipe = useEdgeSwipeBack(closeFilters, filterOpen);
  const productSwipe = useEdgeSwipeBack(closeProduct, selected !== null);
  const visibleProducts = liveProducts
    .filter((product) => {
      if (filter === 'Women') return product.category === 'WOMEN';
      if (filter === 'Men') return product.category === 'MEN';
      if (filter === 'Accessories') return product.clothingType === 'accessories';
      if (filter === 'New Arrivals') return product.isNew;
      if (filter === 'Collections') return activeCollection?.productIds.includes(product.id);
      return true;
    })
    .filter((product) => typeFilter === 'all' || product.clothingType === typeFilter)
    .filter((product) => activeCollection || colorFilter === 'all' || product.colorGroups.includes(colorFilter))
    .filter((product) => activeCollection || availabilityFilter === 'all' || (availabilityFilter === 'available' ? !product.soldOut : product.soldOut))
    .filter((product) => priceRange === 'all' || (priceRange === 'under1200' ? product.priceValue < 1200 : product.priceValue >= 1200))
    .sort((a, b) => sortBy === 'low' ? a.priceValue - b.priceValue : sortBy === 'high' ? b.priceValue - a.priceValue : 0);
  const visibleCards = visibleProducts.flatMap<ProductCard>((product) => {
    if (!activeCollection) return [{ product, variant: undefined, name: product.name, soldOut: product.soldOut }];
    return product.colors.flatMap((variant) => {
      const soldOut = variant.inventory.every((item) => item.stock === 0);
      if (availabilityFilter !== 'all' && soldOut !== (availabilityFilter === 'unavailable')) return [];
      return [{ product, variant, name: editionName(product, variant), soldOut }];
    });
  });
  const hasActiveFilters = typeFilter !== 'all' || (!activeCollection && colorFilter !== 'all') || availabilityFilter !== 'all' || priceRange !== 'all' || sortBy !== 'featured';
  const productCollection = selected && shopCollections.find((entry) => entry.productIds.includes(selected.id));
  const selectedColor = selected?.colors.find((color) => color.id === selectedColorId) || selected?.colors[0];
  const detailName = selected && selectedColor && productCollection ? editionName(selected, selectedColor) : selected?.name;
  const showEditionSwatch = Boolean(productCollection && selectedColor && !selectedColor.photos.length);
  const selectedPhotos = selectedColor?.photos.length
    ? selectedColor.photos
    : selected?.photos.length ? selected.photos : [];
  const inventory = selected && selectedColor ? productVariants(selected, selectedColor.id) : [];
  const variantTotal = inventory.reduce((sum, variant) => sum + variant.stock, 0);
  const selectedVariant = inventory.find(v => v.id === selectedVariantId);
  const remainingToAdd = Math.max(0, (selectedVariant?.stock ?? 0) - (bag[selectedVariant?.id ?? '']?.quantity ?? 0));
  const cannotAdd = variantTotal === 0 || (selectedVariant !== undefined && selectedQuantity > remainingToAdd);

  function openProduct(product: Product, variantId = product.colors[0].id) {
    setSelectedColorId(variantId);
    setSelectedPhotoIndex(0);
    setSelectedVariantId(null);
    setSelectedQuantity(1);
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

  function addSelectedToBag() {
    if (!selected) return;
    if (!selectedColor || cannotAdd) return;
    if (!selectedVariant) {
      setSizeError(true);
      return;
    }
    addToBag(selectedVariant, selectedQuantity);
    setDetailAdded(true);
    setSizeError(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandLockup}><NyMark color={atelier.petrol} size={25} /><Text style={styles.wordmark}>NY ATELIER</Text></View>
          <View style={styles.headerRight}>
            <Text style={styles.headerIndex}>READY-TO-WEAR</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open bag, ${bagCount} ${bagCount === 1 ? 'item' : 'items'}`} onPress={openBag} style={styles.headerBag}>
              <ShopActionIcon name="bag" color={atelier.petrol} size={20} />
              {bagCount > 0 ? <View style={styles.bagBadge}><Text style={styles.bagBadgeText}>{bagCount}</Text></View> : null}
            </Pressable>
          </View>
        </View>
        <View style={styles.intro}>
          <Text style={styles.title}>Ready-to-wear shop</Text>
          <Text style={styles.subtitle}>Expression, made effortless.</Text>
        </View>

        <GestureBoundary><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((item) => (
            <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => {
              setFilter(item);
              if (collection) router.setParams({ collection: undefined });
            }} style={[styles.filter, filter === item && styles.filterActive]}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView></GestureBoundary>

        {filter === 'Collections' && !activeCollection ? (
          shopCollections.map((entry) => (
            <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`View ${entry.title} collection`} onPress={() => {
              setColorFilter('all');
              router.setParams({ collection: entry.id });
            }} style={styles.collectionFeature}>
              <ImageBackground source={entry.photos[0].image} contentFit="cover" contentPosition="top center" style={styles.collectionImage}>
                <View style={styles.collectionShade}>
                  <IconLabel label="VIEW COLLECTION" name="arrow-up-right" color={atelier.brass} style={styles.collectionEyebrow} />
                  <Text style={styles.collectionTitle}>{entry.title}</Text>
                </View>
              </ImageBackground>
            </Pressable>
          ))
        ) : filter === 'Women' && !liveProducts.some((product) => product.category === 'WOMEN') ? (
          <View style={styles.womenPreview}>
            <View style={[styles.listHeading, styles.womenListHeading]}>
              <Text style={styles.listTitle}>Womenswear</Text>
              <View style={styles.listActions}>
                <Text style={styles.listCount}>00 PIECES</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Filter and sort pieces" onPress={() => setFilterOpen(true)} style={styles.filterButton}>
                  <ShopActionIcon name="filter" color={atelier.petrol} size={19} />
                  {hasActiveFilters ? <View style={styles.filterDot} /> : null}
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
            <Text style={styles.womenCopy}>NY Atelier womenswear will have its own place here. Pieces will appear here as soon as the atelier lists them.</Text>
          </View>
        ) : (
          <>
            {filter === 'New Arrivals' ? <View style={styles.arrivalsIntro}>
              <Text style={styles.arrivalsIntroLabel}>NEW ARRIVALS</Text>
              <Text style={styles.arrivalsIntroCopy}>Recently listed pieces from NY Atelier.</Text>
            </View> : null}
            {activeCollection ? (
              <View style={styles.collectionFeature}>
                <Pressable accessibilityRole="button" onPress={() => {
                  setFilter('Collections');
                  router.setParams({ collection: undefined });
                }} style={styles.collectionBackButton}><IconLabel label="All collections" name="back" color={atelier.petrol} style={styles.collectionBack} /></Pressable>
                <ImageBackground source={activeCollection.photos[0].image} contentFit="cover" contentPosition="top center" imageStyle={styles.coverImage} style={styles.collectionImage}>
                  <View style={styles.collectionShade}>
                    <Text style={styles.collectionEyebrow}>FEATURED COLLECTION</Text>
                    <Text style={styles.collectionTitle}>{activeCollection.title}</Text>
                  </View>
                </ImageBackground>
                <Text style={styles.collectionDescription}>{activeCollection.description}</Text>
              </View>
            ) : null}
            <View style={styles.listHeading}>
              <Text style={styles.listTitle}>{filter === 'Collections' ? 'Editions' : filter === 'New Arrivals' ? 'Recently listed' : 'Explore pieces'}</Text>
              <View style={styles.listActions}>
                <Text style={styles.listCount}>{String(visibleCards.length).padStart(2, '0')} {visibleCards.length === 1 ? 'PIECE' : 'PIECES'}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Filter and sort pieces" onPress={() => setFilterOpen(true)} style={styles.filterButton}>
                  <ShopActionIcon name="filter" color={atelier.petrol} size={19} />
                  {hasActiveFilters ? <View style={styles.filterDot} /> : null}
                </Pressable>
              </View>
            </View>
            <View style={styles.grid} onLayout={event => setCatalogueWidth(event.nativeEvent.layout.width)}>
              {visibleCards.map(({ product, variant, name, soldOut }) => {
                const saved = savedIds.includes(product.id);
                // Show colour dots only once NY Studio has given colours a swatch.
                const visibleColors = (variant ? [variant] : product.colors).filter((color) => color.hasSwatch);
                return (
                  <View key={variant ? `${product.id}:${variant.id}` : product.id} style={[styles.product, { width: `${100 / columns}%` }]}>
                    <View style={styles.productVisual}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`View ${name}${soldOut ? ', out of stock' : ''}`} onPress={() => openProduct(product, variant?.id)} style={styles.imageButton}>
                        {variant && !variant.photos.length
                          ? <View style={[styles.productImage, styles.variantPlaceholder, { backgroundColor: variant.swatch }, soldOut && styles.productImageMuted]}>
                              <Text style={styles.variantPlaceholderText}>COLOUR SWATCH</Text>
                            </View>
                          : <Image source={variant?.photos[0]?.image ?? product.image ?? undefined} contentFit="cover" contentPosition="top center" style={[styles.productImage, soldOut && styles.productImageMuted]} />}
                      </Pressable>
                      {product.isNew || product.compareAtPrice || soldOut ? <View style={[styles.productTag, !soldOut && product.compareAtPrice && styles.productTagOffer, soldOut && styles.productTagStock]}>
                        <Text numberOfLines={1} style={styles.productTagText}>{soldOut ? 'OUT OF STOCK' : product.compareAtPrice ? `SALE −${product.percentOff}%` : 'NEW'}</Text>
                      </View> : null}
                      <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? 'Remove' : 'Add'} ${name} ${saved ? 'from' : 'to'} wishlist`} accessibilityState={{ selected: saved }} onPress={() => toggleSaved(product.id)} style={[styles.imageAction, styles.heartAction]}>
                        <ShopActionIcon name="heart" color={saved ? atelier.cognac : atelier.petrol} filled={saved} size={21} />
                      </Pressable>
                      {visibleColors.length ? <View accessible accessibilityLabel={`${name}: ${visibleColors.map((color) => `${color.name} colour`).join(', ')}`} style={styles.cardColors}>
                        {visibleColors.slice(0, 3).map((color, index) => (
                          <View key={color.id} style={[styles.cardColorSwatch, index > 0 && styles.cardColorOverlap, { backgroundColor: color.swatch }]} />
                        ))}
                        {visibleColors.length > 3 ? <Text style={styles.cardColorMore}>+{visibleColors.length - 3}</Text> : null}
                      </View> : null}
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`View ${name}, ${product.price}${product.compareAtPrice ? `, was ${product.compareAtPrice}` : ''}${soldOut ? ', out of stock' : ''}`} onPress={() => openProduct(product, variant?.id)} style={[styles.productDetails, soldOut && styles.productDetailsMuted]}>
                      <Text style={styles.productCategory}>{product.category ? `${product.category}  /  ` : ''}READY-TO-WEAR</Text>
                      <Text style={styles.productName}>{name}</Text>
                      <View style={styles.productPriceRow}>
                        <Text style={styles.productPrice}>{product.price}</Text>
                        {product.compareAtPrice ? <Text style={styles.productPriceWas}>{product.compareAtPrice}</Text> : null}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {catalogueStatus === 'loading' && !products.length ? <Text style={styles.emptyNote}>Loading the collection…</Text>
              : catalogueStatus === 'error' && !products.length ? <View style={styles.catalogueError}>
                <Text style={styles.catalogueErrorTitle}>The collection could not load.</Text>
                <Text style={styles.catalogueErrorCopy}>Check your connection and try again. The atelier can also help you by phone or WhatsApp.</Text>
                <Pressable accessibilityRole="button" onPress={reloadCatalogue} style={styles.retryButton}><Text style={styles.retryText}>TRY AGAIN</Text></Pressable>
              </View>
              : visibleCards.length === 0 ? <Text style={styles.emptyNote}>{filter === 'Accessories' && !products.some(product => product.clothingType === 'accessories') ? 'No accessories are available yet.' : filter === 'New Arrivals' && !products.some(product => product.isNew) ? 'New arrivals will appear here once the atelier marks them.' : 'No pieces match these filters. Try another selection.'}</Text> : null}
            {products.length ? <Text style={styles.previewNote}>Prices and availability come from the NY Atelier catalogue. Payment is not connected yet.</Text> : null}
          </>
        )}
      </ScrollView>

      <Modal visible={filterOpen} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={closeFilters}>
        <Animated.View {...filterSwipe.panHandlers} style={[filterSwipe.animatedStyle, styles.sheetFrame, { paddingTop: insets.top }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={closeFilters} style={styles.sheetScrim} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetTop}>
              <Text style={styles.sheetTitle}>Filter & sort</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={closeFilters} style={styles.closeButton}><ShopActionIcon name="close" color={atelier.petrol} size={20} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.filterSheetScroll}>
              <Text style={styles.sheetLabel}>CLOTHING TYPE</Text>
              <View style={styles.optionRow}>
                {typeOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: typeFilter === option.value }} onPress={() => setTypeFilter(option.value)} style={[styles.option, typeFilter === option.value && styles.optionSelected]}><Text style={[styles.optionText, typeFilter === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}
              </View>
              {!activeCollection && <>
                <Text style={styles.sheetLabel}>COLOUR</Text>
                <View style={styles.optionRow}>
                  {colorOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: colorFilter === option.value }} onPress={() => setColorFilter(option.value)} style={[styles.option, colorFilter === option.value && styles.optionSelected]}><Text style={[styles.optionText, colorFilter === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}
                </View>
              </>}
              <Text style={styles.sheetLabel}>PRICE</Text>
              <View style={styles.optionRow}>
                {priceOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: priceRange === option.value }} onPress={() => setPriceRange(option.value)} style={[styles.option, priceRange === option.value && styles.optionSelected]}><Text style={[styles.optionText, priceRange === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}
              </View>
              <Text style={styles.sheetLabel}>AVAILABILITY</Text>
              <View style={styles.optionRow}>
                {availabilityOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: availabilityFilter === option.value }} onPress={() => setAvailabilityFilter(option.value)} style={[styles.option, availabilityFilter === option.value && styles.optionSelected]}><Text style={[styles.optionText, availabilityFilter === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}
              </View>
              <Text style={styles.sheetLabel}>SORT BY</Text>
              <View style={styles.optionRow}>
                {sortOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: sortBy === option.value }} onPress={() => setSortBy(option.value)} style={[styles.option, sortBy === option.value && styles.optionSelected]}><Text style={[styles.optionText, sortBy === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}
              </View>
            </ScrollView>
            <View style={styles.sheetFooter}>
              <Pressable accessibilityRole="button" accessibilityLabel="Clear filters" onPress={() => { setTypeFilter('all'); setColorFilter('all'); setAvailabilityFilter('all'); setPriceRange('all'); setSortBy('featured'); }}><Text style={styles.clearText}>Clear</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Show ${visibleCards.length} ${visibleCards.length === 1 ? 'piece' : 'pieces'}`} onPress={closeFilters} style={styles.showButton}><Text style={styles.showText}>SHOW {String(visibleCards.length).padStart(2, '0')} {visibleCards.length === 1 ? 'PIECE' : 'PIECES'}</Text></Pressable>
            </View>
          </View>
        </Animated.View>
      </Modal>

      <Modal visible={selected !== null} animationType="slide" transparent presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={closeProduct}>
        <Animated.View {...productSwipe.panHandlers} style={[productSwipe.animatedStyle, styles.detailSafe, { paddingTop: detailTopPadding, paddingBottom: detailBottomPadding }]}>
          <View style={styles.detailShell}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
              <View style={styles.detailHero}>
                {showEditionSwatch && selectedColor ? (
                  <View style={[styles.variantPlaceholder, { width: galleryWidth, height: detailImageHeight, backgroundColor: selectedColor.swatch }]}>
                    <Text style={styles.variantPlaceholderText}>COLOUR SWATCH</Text>
                  </View>
                ) : selectedColor ? <ScrollView
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
                  {selectedPhotos.map((photo) => <Image key={photo.id} source={photo.image} contentFit="cover" contentPosition="top center" style={[styles.detailImage, { width: galleryWidth, height: detailImageHeight }]} />)}
                </ScrollView> : null}
                <View style={styles.detailTop}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Back to Shop" onPress={closeProduct} style={styles.detailTopButton}>
                    <ShopActionIcon name="back" color={atelier.petrol} size={20} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Open bag, ${bagCount} ${bagCount === 1 ? 'item' : 'items'}`} onPress={() => { setSelected(null); openBag(); }} style={styles.detailTopButton}>
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
                <Text style={styles.detailTitle}>{detailName}</Text>
                {productCollection ? <Text style={styles.detailCollection}>Collection · {productCollection.title}</Text> : null}
                <View style={styles.detailPriceRow}>
                  <Text style={styles.detailPrice}>{selected?.price}</Text>
                  {selected?.compareAtPrice ? <Text style={styles.detailPriceWas}>{selected.compareAtPrice}</Text> : null}
                </View>
                {selected?.compareAtPrice ? <Text style={styles.promotionPreviewNote}>Sale price · {selected.percentOff}% off</Text> : null}
                {selected?.soldOut ? <Text style={styles.stockDetailNote}>This piece is out of stock right now. Ask the atelier about making one for you.</Text> : null}
                <View style={styles.detailRule} />
                <Text style={styles.detailLabel}>COLOUR / FABRIC <Text style={styles.detailLabelLight}>· {selectedColor?.name.toUpperCase()}</Text></Text>
                <View style={styles.colorRow}>
                  {selected?.colors.map((color) => <Pressable key={color.id} accessibilityRole="button" accessibilityLabel={color.name} accessibilityState={{ selected: selectedColorId === color.id }} onPress={() => { setSelectedColorId(color.id); setSelectedPhotoIndex(0); setSelectedVariantId(null); setSelectedQuantity(1); setSizeError(false); setDetailAdded(false); }} style={styles.colorOption}>
                    <View style={[styles.colorImageFrame, selectedColorId === color.id && styles.colorImageFrameSelected]}>
                      {color.photos[0] ? <Image source={color.photos[0].image} contentFit="cover" contentPosition="top center" style={styles.colorImage} /> : <View style={[styles.colorImage, { backgroundColor: color.swatch }]} />}
                    </View>
                    <View style={styles.colorCaption}><View style={[styles.colorSwatch, { backgroundColor: color.swatch }]} /><Text style={[styles.colorName, selectedColorId === color.id && styles.colorNameSelected]}>{color.name}</Text></View>
                  </Pressable>)}
                </View>
                {selectedColor && !selectedColor.photos.length && <Text style={styles.colorPreviewNote}>{showEditionSwatch ? 'Product photography is pending for this edition.' : 'Photos show the piece as listed; colour photos are coming.'}</Text>}
                {selected && selectedColor && <SizeGuide key={`${selected.id}:${selectedColor.id}`} profile={publishedProductProfile(selected.id, products.find(product => product.id === selected.id)?.sizing, publication)} overrideCharts={[...approvedSizingCharts, ...publication.charts]} cachedChart={sizingUnavailable && publication.revision > 0} variants={inventory} selectedVariantId={selectedVariantId} onSelectVariant={variant => { setSelectedVariantId(variant?.id ?? null); setSelectedQuantity(1); setSizeError(false); setDetailAdded(false); }} />}
                {sizeError ? <Text style={styles.sizeError}>Select an available size and, where offered, an inseam length.</Text> : null}
                {selected?.description ? <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionHeading}>DESCRIPTION</Text>
                  <Text style={styles.descriptionText}>{selected.description}</Text>
                </View> : null}
                <View style={styles.quantitySection}>
                  <Text style={styles.quantityHeading}>QUANTITY</Text>
                  <View style={styles.quantityControl}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" accessibilityState={{ disabled: selectedQuantity === 1 }} disabled={selectedQuantity === 1} onPress={() => { setSelectedQuantity((current) => Math.max(1, current - 1)); setDetailAdded(false); }} style={[styles.quantityButton, selectedQuantity === 1 && styles.quantityButtonDisabled]}>
                      <ShopActionIcon name="minus" color={atelier.petrol} size={20} />
                    </Pressable>
                    <Text accessibilityLabel={`Quantity ${selectedQuantity}`} style={styles.quantityValue}>{selectedQuantity}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" accessibilityState={{ disabled: selectedQuantity >= remainingToAdd }} disabled={selectedQuantity >= remainingToAdd} onPress={() => { setSelectedQuantity((current) => Math.min(remainingToAdd, current + 1)); setDetailAdded(false); }} style={[styles.quantityButton, selectedQuantity >= remainingToAdd && styles.quantityButtonDisabled]}>
                      <ShopActionIcon name="plus" color={atelier.petrol} size={20} />
                    </Pressable>
                  </View>
                </View>

              </View>
            </ScrollView>
            <View style={styles.detailFooter}>
              {detailAdded ? <View style={styles.detailConfirmation}>
                <Text style={styles.addedText}>{selectedQuantity} {selectedQuantity === 1 ? 'item' : 'items'} added to your bag</Text>
                <View style={styles.confirmationActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel="View bag" onPress={() => { setSelected(null); openBag(); }}><Text style={styles.confirmationLink}>VIEW BAG</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Continue shopping" onPress={() => setSelected(null)}><Text style={styles.confirmationLink}>CONTINUE SHOPPING</Text></Pressable>
                </View>
              </View> : null}
              <View style={styles.detailFooterActions}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${selected && savedIds.includes(selected.id) ? 'Remove' : 'Add'} ${selected?.name || 'piece'} ${selected && savedIds.includes(selected.id) ? 'from' : 'to'} wishlist`} accessibilityState={{ selected: selected ? savedIds.includes(selected.id) : false }} onPress={() => selected && toggleSaved(selected.id)} style={styles.detailHeartButton}>
                  <ShopActionIcon name="heart" color={selected && savedIds.includes(selected.id) ? atelier.cognac : atelier.petrol} filled={selected ? savedIds.includes(selected.id) : false} size={23} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={variantTotal === 0 ? 'Out of stock' : `Add ${selected?.name || 'piece'} to bag`} accessibilityState={{ disabled: cannotAdd }} disabled={cannotAdd} onPress={addSelectedToBag} style={[styles.detailAddButton, cannotAdd && styles.detailAddButtonDisabled]}><Text style={styles.detailAddText}>{variantTotal === 0 ? 'OUT OF STOCK' : cannotAdd ? 'STOCK LIMIT REACHED' : 'ADD TO BAG'}</Text></Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
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
  listHeading: { width: '100%', maxWidth: 1600, alignSelf: 'center', paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  womenListHeading: { paddingHorizontal: 0 },
  listTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 22 },
  listActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listCount: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1.4 },
  filterButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: atelier.cognac },
  arrivalsIntro: { marginHorizontal: 24, marginBottom: 26, borderRadius: 18, backgroundColor: atelier.petrol, paddingHorizontal: 20, paddingVertical: 19 },
  arrivalsIntroLabel: { color: atelier.brass, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  arrivalsIntroCopy: { color: atelier.alabaster, fontFamily: atelier.body, fontSize: 13, lineHeight: 19 },
  grid: { width: '100%', maxWidth: 1600, alignSelf: 'center', paddingHorizontal: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  product: { paddingHorizontal: 5, marginBottom: 30 },
  productVisual: { width: '100%', aspectRatio: 3 / 4, marginBottom: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E8E7E2' },
  imageButton: { width: '100%', height: '100%' },
  productImage: { width: '100%', height: '100%' },
  productImageMuted: { opacity: 0.38 },
  productTag: { position: 'absolute', top: 10, left: 10, maxWidth: '65%', borderRadius: atelier.buttonRadius, backgroundColor: atelier.petrol, paddingHorizontal: 9, paddingVertical: 6 },
  productTagOffer: { backgroundColor: atelier.cognac },
  productTagStock: { backgroundColor: atelier.muted },
  productTagText: { color: atelier.white, fontFamily: atelier.body, fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  imageAction: { position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(250,248,244,0.94)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  heartAction: { top: 9, right: 9 },
  cardColors: { position: 'absolute', right: 6, bottom: 6, minWidth: 22, paddingHorizontal: 2, paddingVertical: 3, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(28,35,38,0.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  cardColorSwatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: atelier.white },
  cardColorOverlap: { marginTop: -2 },
  cardColorMore: { color: atelier.white, fontFamily: atelier.body, fontSize: 8, fontWeight: '700', marginTop: 2 },
  productDetails: { minHeight: 70 },
  productDetailsMuted: { opacity: 0.58 },
  productCategory: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1.3, marginBottom: 7 },
  productName: { color: atelier.slate, fontFamily: atelier.body, fontWeight: '700', fontSize: 16, marginBottom: 5 },
  productPriceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  productPrice: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14 },
  productPriceWas: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, textDecorationLine: 'line-through' },
  emptyNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14, paddingHorizontal: 24, paddingVertical: 30 },
  catalogueError: { marginHorizontal: 24, marginBottom: 26, borderRadius: 18, backgroundColor: atelier.white, borderWidth: 1, borderColor: atelier.line, padding: 22 },
  catalogueErrorTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 21, marginBottom: 8 },
  catalogueErrorCopy: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  retryButton: { alignSelf: 'flex-start', borderRadius: atelier.buttonRadius, backgroundColor: atelier.petrol, paddingHorizontal: 20, paddingVertical: 13 },
  retryText: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 11, letterSpacing: 1.3 },
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
  collectionBackButton: { marginBottom: 14 },
  collectionBack: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 15 },
  variantPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  variantPlaceholderText: { color: atelier.white, backgroundColor: atelier.petrol, padding: 6, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1 },
  collectionDescription: { color: atelier.slate, fontFamily: atelier.body, fontSize: 15, lineHeight: 22, marginTop: 12 },
  collectionEyebrow: { color: atelier.brass, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 9 },
  collectionTitle: { color: atelier.white, fontFamily: atelier.display, fontSize: 25, lineHeight: 32 },
  sheetFrame: { flex: 1, justifyContent: 'flex-end' },
  sheetScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,28,30,0.43)' },
  sheet: { maxHeight: '90%', backgroundColor: atelier.alabaster, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 16 },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  filterSheetScroll: { flexShrink: 1 },
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
  detailImage: { width: '100%' },
  detailBody: { paddingHorizontal: 24, paddingTop: 25 },
  detailBrandLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  detailEyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 1.5 },
  detailCollection: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 14, marginBottom: 8 },
  detailTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 27, lineHeight: 35, marginBottom: 6 },
  detailPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailPrice: { color: atelier.slate, fontFamily: atelier.body, fontSize: 18 },
  detailPriceWas: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14, textDecorationLine: 'line-through' },
  promotionPreviewNote: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 11, lineHeight: 16, marginTop: 8 },
  stockDetailNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, lineHeight: 16, marginTop: 8 },
  detailRule: { height: 1, backgroundColor: atelier.line, marginVertical: 18 },
  detailLabel: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 11, letterSpacing: 1.3, marginBottom: 12 },
  detailLabelLight: { color: atelier.muted, fontWeight: '400' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  colorOption: { alignItems: 'center', gap: 6 },
  colorImageFrame: { width: 67, height: 78, borderWidth: 2, borderColor: 'transparent', borderRadius: 11, padding: 2, backgroundColor: atelier.white, overflow: 'hidden' },
  colorImageFrameSelected: { borderColor: atelier.petrol },
  colorImage: { width: '100%', height: '100%', borderRadius: 7 },
  colorCaption: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colorSwatch: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: atelier.line },
  colorName: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11 },
  colorNameSelected: { color: atelier.petrol, fontWeight: '700' },
  colorPreviewNote: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 11, lineHeight: 16, marginTop: -7, marginBottom: 16 },
  sizeError: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 12, marginBottom: 9 },
  descriptionSection: { borderTopWidth: 1, borderTopColor: atelier.line, paddingTop: 18, marginTop: 9 },
  descriptionHeading: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 11 },
  descriptionText: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 21 },
  quantitySection: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityHeading: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  quantityControl: { height: 46, minWidth: 138, borderRadius: atelier.buttonRadius, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quantityButtonDisabled: { opacity: 0.36 },
  quantityValue: { minWidth: 35, color: atelier.petrol, fontFamily: atelier.body, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  detailFooter: { paddingHorizontal: 24, paddingTop: 13, paddingBottom: 0, borderTopWidth: 1, borderTopColor: atelier.line, backgroundColor: atelier.alabaster },
  detailFooterActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  detailHeartButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: atelier.white, borderWidth: 1, borderColor: atelier.line, alignItems: 'center', justifyContent: 'center' },
  detailAddButton: { flex: 1, height: 52, borderRadius: atelier.buttonRadius, backgroundColor: atelier.petrol, alignItems: 'center', justifyContent: 'center' },
  detailAddButtonDisabled: { backgroundColor: atelier.muted },
  detailAddText: { color: atelier.white, fontFamily: atelier.body, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  detailConfirmation: { paddingBottom: 13 },
  addedText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14, fontWeight: '700', marginBottom: 9 },
  confirmationActions: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmationLink: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textDecorationLine: 'underline' },
});
