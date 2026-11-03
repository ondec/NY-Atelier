import { Tabs } from 'expo-router';
import { useFonts } from 'expo-font';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { atelier } from '@/atelier-theme';
import { TabIcon } from '@/components/tab-icon';

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const barSideInset = Math.max(14, (width - 560) / 2);
  const [fontsLoaded, fontError] = useFonts({
    AlfaSlabOne: require('../../assets/fonts/AlfaSlabOne-Regular.ttf'),
    JosefinSans: require('../../assets/fonts/JosefinSans-Variable.ttf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: atelier.petrol,
        tabBarInactiveTintColor: atelier.muted,
        tabBarStyle: {
          position: 'absolute',
          left: barSideInset,
          right: barSideInset,
          bottom: Math.max(insets.bottom, Platform.OS === 'web' ? 0 : 24) + 14,
          height: 70,
          paddingTop: 8,
          borderRadius: 35,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.82)',
          backgroundColor: 'rgba(246,243,236,0.38)',
          shadowColor: atelier.slate,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.18,
          shadowRadius: 24,
          elevation: 12,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === 'web' ? 75 : 65}
            tint="light"
            blurMethod={Platform.OS === 'android' ? 'none' : undefined}
            style={styles.tabBarGlass}
          />
        ),
        tabBarIconStyle: { marginBottom: 2 },
        tabBarLabelStyle: { fontFamily: atelier.body, fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size, focused }) => <TabIcon name="home" color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: ({ color, size, focused }) => <TabIcon name="shop" color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="atelier" options={{ title: 'Atelier', tabBarIcon: ({ color, size, focused }) => <TabIcon name="atelier" color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color, size, focused }) => <TabIcon name="orders" color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size, focused }) => <TabIcon name="account" color={color} size={size} focused={focused} /> }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarGlass: {
    ...StyleSheet.absoluteFill,
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: 'rgba(246,243,236,0.55)',
  },
});
