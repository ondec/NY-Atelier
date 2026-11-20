import { Tabs, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ShoppingBagProvider } from '@/components/shopping-bag';
import { TabIcon } from '@/components/tab-icon';
import { OrderUpdatesProvider } from '@/lib/order-updates';
import { DemoCustomerProvider } from '@/lib/demo-customer';
import { TabSwipeProvider, tabTransition, useTabSceneMotion } from '@/components/tab-swipe';
import { CustomerTabBar } from '@/components/customer-tab-bar';
import { PublishedSizingProvider } from '@/lib/published-sizing';
import { AccountMeasurementsProvider } from '@/lib/account-measurements';
import { CustomerAuthProvider } from '@/lib/customer-auth';
import { atelier } from '@/atelier-theme';

function CustomerTabs() {
  const motion = useTabSceneMotion();
  return <Tabs
    tabBar={(props) => <CustomerTabBar {...props} />}
    screenOptions={({ route }) => ({
      headerShown: false,
      animation: motion.reduced ? 'none' : 'shift',
      transitionSpec: motion.reduced ? { animation: 'timing', config: { duration: 0 } } : tabTransition,
      sceneStyle: { backgroundColor: atelier.alabaster },
      sceneStyleInterpolator: motion.reduced ? undefined : motion.interpolate(route.name === 'index' ? '/' : `/${route.name}`),
    })}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size, focused }) => <TabIcon name="home" color={color} size={size} focused={focused} /> }} />
    <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: ({ color, size, focused }) => <TabIcon name="shop" color={color} size={size} focused={focused} /> }} />
    <Tabs.Screen name="atelier" options={{ title: 'Atelier', tabBarIcon: ({ color, size, focused }) => <TabIcon name="atelier" color={color} size={size} focused={focused} /> }} />
    <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color, size, focused }) => <TabIcon name="orders" color={color} size={size} focused={focused} /> }} />
    <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size, focused }) => <TabIcon name="account" color={color} size={size} focused={focused} /> }} />
  </Tabs>;
}

export default function RootLayout() {
  const pathname = usePathname();
  const [fontsLoaded, fontError] = useFonts({
    AlfaSlabOne: require('../../assets/fonts/AlfaSlabOne-Regular.ttf'),
    JosefinSans: require('../../assets/fonts/JosefinSans-Variable.ttf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <TabSwipeProvider>
    <PublishedSizingProvider>
    <CustomerAuthProvider>
    <AccountMeasurementsProvider>
    <ShoppingBagProvider>
      <DemoCustomerProvider>
      <OrderUpdatesProvider>
        <StatusBar style={pathname === '/' || pathname === '/atelier' ? 'light' : 'dark'} />
        <CustomerTabs />
      </OrderUpdatesProvider>
      </DemoCustomerProvider>
    </ShoppingBagProvider>
    </AccountMeasurementsProvider>
    </CustomerAuthProvider>
    </PublishedSizingProvider>
    </TabSwipeProvider>
  );
}
