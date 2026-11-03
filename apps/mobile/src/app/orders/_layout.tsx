import { Stack } from 'expo-router';
import { atelier } from '@/atelier-theme';

export default function OrdersLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: atelier.alabaster },
      headerTintColor: atelier.petrol,
      headerShadowVisible: false,
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[reference]" options={{ title: 'Order details' }} />
    </Stack>
  );
}
