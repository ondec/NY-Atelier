import { Stack, router } from 'expo-router';
import { Pressable } from 'react-native';
import { NyIcon } from '@/components/ny-icon';
import { atelier } from '@/atelier-theme';

export default function OrdersLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: atelier.alabaster },
      headerTintColor: atelier.petrol,
      headerShadowVisible: false,
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[reference]" options={{ title: 'Order details', gestureEnabled: true, fullScreenGestureEnabled: false, headerLeft: () => <Pressable accessibilityRole="button" accessibilityLabel="Back to orders" onPress={() => router.dismissTo('/orders')} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><NyIcon name="chevron-left" color={atelier.petrol} size={24} /></Pressable> }} />
    </Stack>
  );
}
