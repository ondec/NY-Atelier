import { useTabSwipeBlocker } from '@/components/tab-swipe';
import { ShopActionIcon } from '@/components/shop-action-icon';
import { Image } from 'expo-image';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { useEdgeSwipeBack } from '@/components/edge-swipe-back';
import { products } from '@/data/shop-catalogue';
import { productVariants, type PurchasableVariant } from '@/lib/sizing';
import { useCustomerAuth } from '@/lib/customer-auth';

type BagEntry = PurchasableVariant & { quantity: number };

type ShoppingBag = {
  bag: Record<string, BagEntry>;
  bagCount: number;
  addToBag: (variant: PurchasableVariant, quantity: number) => void;
  openBag: () => void;
};

const ShoppingBagContext = createContext<ShoppingBag | null>(null);

export function useShoppingBag() {
  const bag = useContext(ShoppingBagContext);
  if (!bag) throw new Error('ShoppingBagProvider is missing');
  return bag;
}

export function ShoppingBagProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [bag, setBag] = useState<Record<string, BagEntry>>({});
  const [bagOpen, setBagOpen] = useState(false);
  const [checkoutNote, setCheckoutNote] = useState('');
  const { customer, requireSignIn } = useCustomerAuth();
  const closeBag = useCallback(() => { setBagOpen(false); setCheckoutNote(''); }, []);
  useTabSwipeBlocker(bagOpen);
  const bagSwipe = useEdgeSwipeBack(closeBag, bagOpen);
  const bagEntries = Object.entries(bag);
  const bagCount = bagEntries.reduce((total, [, entry]) => total + entry.quantity, 0);
  const bagTotal = bagEntries.reduce((total, [, entry]) => total + (products.find((product) => product.id === entry.productId)?.priceValue || 0) * entry.quantity, 0);

  function addToBag(variant: PurchasableVariant, quantity: number) {
    const product = products.find(p => p.id === variant.productId);
    const actual = product && productVariants(product, variant.colorId).find(v => v.id === variant.id);
    if (!actual || !Number.isInteger(quantity) || quantity < 1) return;
    setBag(current => {
      const total = (current[actual.id]?.quantity ?? 0) + quantity;
      if (total > actual.stock) return current;
      return { ...current, [actual.id]: { ...actual, quantity: total } };
    });
  }

  async function checkout() {
    // Signing in links the order to the customer. Payment is the next connection to build.
    if (!customer) {
      setBagOpen(false);
      const signedIn = await requireSignIn('checkout');
      setBagOpen(true);
      if (!signedIn) return;
    }
    setCheckoutNote('You are signed in. Payment is not connected yet, so this order cannot be placed in the app.');
  }

  function removeFromBag(key: string) {
    setBag((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  return (
    <ShoppingBagContext.Provider value={{ bag, bagCount, addToBag, openBag: () => setBagOpen(true) }}>
      {children}
      <Modal visible={bagOpen} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={closeBag}>
        <Animated.View {...bagSwipe.panHandlers} style={[bagSwipe.animatedStyle, styles.sheetFrame, { paddingTop: insets.top }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close bag" onPress={closeBag} style={styles.sheetScrim} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetTop}>
              <Text style={styles.sheetTitle}>Your bag · {bagCount}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close bag" onPress={closeBag} style={styles.closeButton}><ShopActionIcon name="close" color={atelier.petrol} /></Pressable>
            </View>
            {bagCount === 0 ? <Text style={styles.bagEmpty}>Your bag is empty. Explore the collection and add a piece.</Text> : (
              <ScrollView style={styles.bagScroll}>
                {bagEntries.map(([key, entry]) => {
                  const product = products.find((item) => item.id === entry.productId);
                  if (!product) return null;
                  const color = product.colors.find((item) => item.id === entry.colorId) || product.colors[0];
                  return <View key={key} style={styles.bagItem}>
                    <Image source={color.photos[0]?.image ?? product.image} contentFit="cover" contentPosition="top center" style={styles.bagImage} />
                    <View style={styles.bagItemText}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>{product.price} · Qty {entry.quantity}</Text>
                      <Text style={styles.bagSize}>{color.name}{color.concept ? ' · colour preview' : ''}</Text>
                      <Text style={styles.bagSize}>{`Size ${entry.size}${entry.length ? ` · ${entry.length.code} · Inseam ${entry.length.value} ${entry.length.unit}` : ''}`}</Text>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${product.name} in ${color.name}${entry.size ? ` size ${entry.size}` : ''} from bag`} onPress={() => removeFromBag(key)}><Text style={styles.removeText}>Remove</Text></Pressable>
                    </View>
                  </View>;
                })}
                <View style={styles.totalRow}><Text style={styles.totalLabel}>SUBTOTAL</Text><Text style={styles.totalValue}>GH₵ {bagTotal.toLocaleString('en-GH')}</Text></View>
                {customer ? <Text style={styles.bagFootnote}>Signed in as {customer.email ?? customer.phone}</Text> : null}
                <Pressable accessibilityRole="button" onPress={() => { void checkout(); }} style={styles.checkoutButton}><Text style={styles.checkoutText}>{customer ? 'CONTINUE TO CHECKOUT' : 'SIGN IN TO CHECK OUT'}</Text></Pressable>
                <Text accessibilityLiveRegion="polite" style={styles.bagFootnote}>{checkoutNote || 'Bag contents are held on this device. Payment is not connected yet.'}</Text>
              </ScrollView>
            )}
          </View>
        </Animated.View>
      </Modal>
    </ShoppingBagContext.Provider>
  );
}

const styles = StyleSheet.create({
  bagScroll: { flexShrink: 1 },
  sheetFrame: { flex: 1, justifyContent: 'flex-end' },
  sheetScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,28,30,0.43)' },
  sheet: { maxHeight: '90%', backgroundColor: atelier.alabaster, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 16 },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  sheetTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 24 },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: atelier.white },
  bagEmpty: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15, lineHeight: 23, marginBottom: 24 },
  bagItem: { flexDirection: 'row', gap: 15, paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: atelier.line },
  bagImage: { width: 78, height: 100, borderRadius: 12, backgroundColor: '#E8E7E2' },
  bagItemText: { flex: 1, justifyContent: 'center', gap: 5 },
  productName: { color: atelier.slate, fontFamily: atelier.body, fontWeight: '700', fontSize: 16, marginBottom: 5 },
  productPrice: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14 },
  bagSize: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12 },
  removeText: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 12, textDecorationLine: 'underline', marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 5, marginBottom: 16 },
  totalLabel: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, letterSpacing: 1.3 },
  totalValue: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 17 },
  checkoutButton: { minHeight: 52, borderRadius: atelier.buttonRadius, backgroundColor: atelier.petrol, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  checkoutText: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 14, letterSpacing: 1.4 },
  bagFootnote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18, marginBottom: 10 },
});
