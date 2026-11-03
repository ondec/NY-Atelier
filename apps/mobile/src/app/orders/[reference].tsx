import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { DemoOrder, formatDate, getDemoOrders } from '@/lib/orders';

export default function OrderDetailsScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    getDemoOrders()
      .then((orders) => { if (mounted) setOrder(orders.find((item) => item.reference === reference) ?? null); })
      .catch(() => { if (mounted) setOrder(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [reference]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={atelier.petrol} /></View>;
  }
  if (!order) {
    return <View style={styles.center}><Text style={styles.empty}>This order is unavailable in the demo.</Text></View>;
  }

  const isCustom = order.category === 'Custom';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{order.category.toUpperCase()} · {order.reference}</Text>
        <Text style={styles.heading}>{order.items.length === 1 ? order.items[0].garment_name : 'Your custom order'}</Text>
        <Text style={styles.demo}>Team preview · fictional order</Text>

        {order.client_action ? (
          <View style={styles.actionBox}>
            <Text style={styles.sectionLabel}>ACTION NEEDED</Text>
            <Text style={styles.actionText}>{order.client_action}</Text>
          </View>
        ) : null}

        <View style={styles.statusBox}>
          <Text style={styles.sectionLabel}>CURRENT STATUS</Text>
          <Text style={styles.status}>{order.status}</Text>
          <Text style={styles.date}>Expected completion · {formatDate(order.expected_completion_date)}</Text>
          {order.date_change_explanation ? <Text style={styles.dateNote}>{order.date_change_explanation}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isCustom ? 'Your outfits' : 'Garment'}</Text>
          {isCustom ? <Text style={styles.count}>{order.completed_item_count} of {order.item_count} outfits complete</Text> : null}
          {order.items.map((item) => {
            const key = `${item.wearer_name ?? ''}-${item.garment_name}`;
            const expanded = expandedItems.includes(key);
            return (
              <Pressable
                key={key}
                accessibilityRole={isCustom ? 'button' : 'text'}
                accessibilityState={isCustom ? { expanded } : undefined}
                onPress={isCustom ? () => setExpandedItems((current) => expanded ? current.filter((value) => value !== key) : [...current, key]) : undefined}
                style={styles.item}>
                <View style={styles.itemTop}>
                  <View style={styles.itemHeading}>
                    {item.wearer_name ? <Text style={styles.wearer}>{item.wearer_name}</Text> : null}
                    <Text style={styles.itemName}>{item.garment_name}</Text>
                  </View>
                  {isCustom ? <Text style={styles.chevron}>{expanded ? '−' : '+'}</Text> : null}
                </View>
                {(!isCustom || expanded) ? (
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemStatus}>{item.status}</Text>
                    {item.expected_completion_date ? <Text style={styles.itemDate}>Expected {formatDate(item.expected_completion_date)}</Text> : null}
                  </View>
                ) : <Text style={styles.itemStatus}>{item.status}</Text>}
              </Pressable>
            );
          })}
          {isCustom ? <Text style={styles.handoverNote}>Collection becomes available when every outfit is ready.</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
          {order.timeline.map((event, index) => (
            <View style={styles.event} key={`${event.title}-${event.occurred_at}`}>
              <View style={styles.eventMarker}><View style={styles.dot} />{index < order.timeline.length - 1 ? <View style={styles.line} /> : null}</View>
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDate}>{formatDate(event.occurred_at.slice(0, 10))}</Text>
                {event.explanation ? <Text style={styles.eventExplanation}>{event.explanation}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Handover</Text>
          <Text style={styles.infoText}>{order.fulfilment_method ?? 'To be agreed'} · {order.fulfilment_status ?? 'Not started'}</Text>
        </View>
        {order.payment_status ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <Text style={styles.infoText}>{order.payment_status}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: atelier.alabaster },
  empty: { color: atelier.muted, fontSize: 14 },
  content: { padding: 24, paddingBottom: 55 },
  eyebrow: { color: atelier.cognac, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginTop: 9, marginBottom: 11 },
  heading: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 32, lineHeight: 41, marginBottom: 12 },
  demo: { color: atelier.muted, fontSize: 11, marginBottom: 24 },
  actionBox: { backgroundColor: '#E7EEE9', padding: 20, marginBottom: 17 },
  actionText: { color: atelier.petrol, fontSize: 15, lineHeight: 22, marginTop: 9 },
  statusBox: { backgroundColor: atelier.petrol, padding: 22, marginBottom: 29 },
  sectionLabel: { color: atelier.brass, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  status: { color: atelier.white, fontFamily: atelier.display, fontSize: 25, lineHeight: 34, marginTop: 10 },
  date: { color: '#E2ECE7', fontSize: 12, marginTop: 13 },
  dateNote: { color: '#E2ECE7', fontSize: 12, lineHeight: 18, marginTop: 8 },
  section: { marginBottom: 31 },
  sectionTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 23, marginBottom: 14 },
  count: { color: atelier.petrol, fontSize: 13, marginBottom: 12 },
  item: { backgroundColor: atelier.white, borderWidth: 1, borderColor: '#E8E2D8', padding: 17, marginBottom: 9 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemHeading: { flex: 1 },
  wearer: { color: atelier.cognac, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 },
  itemName: { color: atelier.slate, fontSize: 16, fontWeight: '600' },
  chevron: { color: atelier.petrol, fontSize: 25, marginLeft: 12 },
  itemDetails: { marginTop: 12 },
  itemStatus: { color: atelier.muted, fontSize: 12, marginTop: 8 },
  itemDate: { color: atelier.muted, fontSize: 12, marginTop: 7 },
  handoverNote: { color: atelier.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  event: { flexDirection: 'row', gap: 15, minHeight: 63 },
  eventMarker: { alignItems: 'center', width: 13 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: atelier.cognac, marginTop: 5 },
  line: { flex: 1, width: 1, backgroundColor: atelier.line, marginTop: 5 },
  eventBody: { flex: 1, paddingBottom: 17 },
  eventTitle: { color: atelier.slate, fontSize: 14, fontWeight: '600' },
  eventDate: { color: atelier.muted, fontSize: 11, marginTop: 3 },
  eventExplanation: { color: atelier.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  infoText: { color: atelier.muted, fontSize: 14, lineHeight: 21 },
});
