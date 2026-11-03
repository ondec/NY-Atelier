import { Tabs, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { atelier } from '@/atelier-theme';
import { TabIcon } from '@/components/tab-icon';

export default function RootLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [fontsLoaded, fontError] = useFonts({
    AlfaSlabOne: require('../../assets/fonts/AlfaSlabOne-Regular.ttf'),
    JosefinSans: require('../../assets/fonts/JosefinSans-Variable.ttf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style={pathname === '/' ? 'light' : 'dark'} />
      <Tabs
        tabBar={({ state, descriptors, emitter, navigateToTab }) => (
          <View style={[styles.tabBarPosition, { bottom: Math.max(insets.bottom, Platform.OS === 'web' ? 0 : 16) + 2 }]} pointerEvents="box-none">
            <View style={styles.tabBarShadow}>
              <BlurView
                intensity={Platform.OS === 'web' ? 75 : 65}
                tint="light"
                blurMethod={Platform.OS === 'android' ? 'none' : undefined}
                style={styles.tabBarGlass}>
                <View role="tablist" style={styles.tabBarItems}>
                  {state.routes.map((route, index) => {
                    const focused = state.index === index;
                    const options = descriptors[route.key].options;
                    const color = focused ? atelier.petrol : atelier.muted;
                    const label = options.title || route.name;
                    return (
                      <Pressable
                        key={route.key}
                        accessibilityRole="tab"
                        accessibilityLabel={label}
                        accessibilityState={{ selected: focused }}
                        onPress={() => {
                          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
                        }}
                        onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                        style={styles.tabItem}>
                        {options.tabBarIcon?.({ focused, color, size: 24 })}
                        <Text style={[styles.tabLabel, { color }, focused && styles.tabLabelActive]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </BlurView>
            </View>
          </View>
        )}
        screenOptions={{ headerShown: false }}>
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
  tabBarPosition: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  tabBarShadow: {
    width: '100%',
    maxWidth: 560,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(246,243,236,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    shadowColor: atelier.slate,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  tabBarGlass: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(246,243,236,0.38)',
  },
  tabBarItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: atelier.body,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  tabLabelActive: { fontWeight: '700' },
});
