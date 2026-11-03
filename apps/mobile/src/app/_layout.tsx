import { Tabs } from 'expo-router';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import { atelier } from '@/atelier-theme';
import { TabIcon } from '@/components/tab-icon';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    AlfaSlabOne: require('../../assets/fonts/AlfaSlabOne-Regular.ttf'),
    JosefinSans: require('../../assets/fonts/JosefinSans-Variable.ttf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: atelier.petrol,
        tabBarInactiveTintColor: atelier.muted,
        tabBarStyle: { backgroundColor: atelier.white, borderTopColor: atelier.line, borderTopWidth: 1, height: Platform.OS === 'web' ? 66 : undefined, paddingTop: 7 },
        tabBarIconStyle: { marginBottom: 2 },
        tabBarLabelStyle: { fontFamily: atelier.body, fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size, focused }) => <TabIcon name="home" color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: ({ color, size, focused }) => <TabIcon name="shop" color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="atelier" options={{ title: 'Atelier', tabBarIcon: ({ color, size, focused }) => <TabIcon name="atelier" color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color, size, focused }) => <TabIcon name="orders" color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size, focused }) => <TabIcon name="account" color={color} size={size} focused={focused} /> }} />
    </Tabs>
  );
}
