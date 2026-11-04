import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { NyMark } from '@/components/ny-mark';
import { DemoOrder, formatDate, getDemoOrders } from '@/lib/orders';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [view, setView] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const result = await getDemoOrders();
      setOrders(result);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getDemoOrders()
      .then((result) => {
        if (active) setOrders(result);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const visible = orders.filter((order) => view === 'history' ? order.is_complete : !order.is_complete);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadOrders(); }} />}>
        <View style={styles.brandLockup}><NyMark color={atelier.petrol} size={25} /><Text style={styles.brand}>NY ATELIER</Text></View>
        <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Every piece, from first step to final handover.</Text>

        <View style={styles.switcher}>
          {(['active', 'history'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: view === value }}
              onPress={() => setView(value)}
              style={[styles.switchButton, view === value && styles.switchButtonActive]}>
              <Text style={[styles.switchText, view === value && styles.switchTextActive]}>
                {value === 'active' ? 'Active' : 'History'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? <ActivityIndicator color={atelier.petrol} style={styles.loading} /> : null}
        {error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Orders are unavailable</Text>
            <Text style={styles.emptyText}>Check your connection, then pull down to refresh.</Text>
          </View>
        ) : null}
        {!loading && !error && visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>Orders in this view will appear here.</Text>
          </View>
        ) : null}

        {!error && visible.map((order) => (
          <Pressable
            key={order.reference}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/orders/[reference]', params: { reference: order.reference } })}
            style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.category}>{order.category}</Text>
              <Text style={styles.reference}>{order.reference}</Text>
            </View>
            <Text style={styles.garments}>{order.items.map((item) => item.garment_name).join(' · ')}</Text>
            <Text style={styles.status}>{order.status}</Text>
            {order.category === 'Custom' ? (
              <Text style={styles.progress}>{order.completed_item_count} of {order.item_count} outfits complete</Text>
            ) : null}
            <View style={styles.cardBottom}>
              <Text style={styles.date}>{order.is_complete ? 'Completed' : 'Expected'} {formatDate(order.expected_completion_date)}</Text>
              <Text style={styles.open}>VIEW ORDER  ›</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 130 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 34 },
  brand: { color: atelier.petrol, fontFamily: atelier.body, letterSpacing: 3.7, fontSize: 16, fontWeight: '700' },
  eyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 39, marginBottom: 8 },
  subtitle: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15, lineHeight: 22, marginBottom: 28 },
  switcher: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: atelier.line, marginBottom: 18 },
  switchButton: { paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  switchButtonActive: { borderBottomColor: atelier.petrol },
  switchText: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14 },
  switchTextActive: { color: atelier.petrol, fontWeight: '700' },
  loading: { marginTop: 40 },
  empty: { backgroundColor: atelier.white, padding: 24 },
  emptyTitle: { color: atelier.slate, fontSize: 18, fontWeight: '600', marginBottom: 7 },
  emptyText: { color: atelier.muted, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: atelier.white, borderWidth: 1, borderColor: '#E8E2D8', borderRadius: 10, padding: 20, marginBottom: 13 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 13 },
  category: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', textTransform: 'uppercase' },
  reference: { color: atelier.muted, fontFamily: atelier.body, fontSize: 10 },
  garments: { color: atelier.slate, fontFamily: atelier.body, fontSize: 21, fontWeight: '700', lineHeight: 28, marginBottom: 12 },
  status: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 13, fontWeight: '700' },
  progress: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, marginTop: 5 },
  cardBottom: { borderTopWidth: 1, borderTopColor: '#EEEAE1', marginTop: 18, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  date: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11 },
  open: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
});
