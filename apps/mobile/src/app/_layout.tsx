import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { atelier } from '@/atelier-theme';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: atelier.petrol,
        tabBarInactiveTintColor: atelier.muted,
        tabBarStyle: { backgroundColor: atelier.white, borderTopColor: atelier.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'house', android: 'home', web: 'home' }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="atelier" options={{ title: 'Atelier', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'scissors', android: 'content_cut', web: 'content_cut' }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'list.bullet.rectangle', android: 'receipt_long', web: 'receipt_long' }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'person.crop.circle', android: 'person', web: 'person' }} tintColor={color} size={size} /> }} />
    </Tabs>
  );
}
