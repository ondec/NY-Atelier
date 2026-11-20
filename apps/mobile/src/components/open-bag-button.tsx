import { Pressable, StyleSheet } from 'react-native';

import { atelier } from '@/atelier-theme';
import { useShoppingBag } from '@/components/shopping-bag';
import { ShopActionIcon } from '@/components/shop-action-icon';

export function OpenBagButton({ onHero = false }: { onHero?: boolean }) {
  const { openBag } = useShoppingBag();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open shopping bag"
      onPress={openBag}
      style={[styles.button, onHero && styles.heroButton]}>
      <ShopActionIcon name="bag" color={onHero ? atelier.white : atelier.petrol} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroButton: { borderRadius: 22, backgroundColor: 'rgba(8, 24, 27, 0.35)' },
});
