import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { DemoOrder, formatDate, getDemoOrders } from '@/lib/orders';

export default function OrderDetailsScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [loading, setLoading] = useState(true);

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
    return <View style={styles.center}><Text style={styles.empty}>This order is unavailable.</Text></View>;
  }

  const isCustom = order.category === 'Custom';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{order.category.toUpperCase()} · {order.reference}</Text>
        <Text style={styles.heading}>{order.items.length === 1 ? order.items[0].garment_name : 'Your custom order'}</Text>

        {order.client_action ? (
          <View style={styles.actionBox}>
            <Text style={styles.sectionLabel}>ACTION NEEDED</Text>
            <Text style={styles.actionText}>{order.client_action}</Text>
          </View>
        ) : null}

        <View style={styles.statusBox}>
          <Text style={styles.sectionLabel}>CURRENT STATUS</Text>
          <Text style={styles.status}>{order.status}</Text>
          <Text style={styles.date}>{order.is_complete ? 'Completed' : 'Expected completion'} · {formatDate(order.expected_completion_date)}</Text>
          {order.date_change_explanation ? <Text style={styles.dateNote}>{order.date_change_explanation}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isCustom ? 'Your outfits' : 'Garment'}</Text>
          {isCustom ? <Text style={styles.count}>{order.completed_item_count} of {order.item_count} outfits complete</Text> : null}
          {order.items.map((item) => (
            <View key={`${item.wearer_name ?? ''}-${item.garment_name}`} style={styles.item}>
              {item.wearer_name ? <Text style={styles.wearer}>{item.wearer_name}</Text> : null}
              <Text style={styles.itemName}>{item.garment_name}</Text>
              <Text style={styles.itemStatus}>{item.status}</Text>
              {item.expected_completion_date ? <Text style={styles.itemDate}>Expected {formatDate(item.expected_completion_date)}</Text> : null}
            </View>
          ))}
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
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Handover</Text><Text style={styles.infoText}>{order.fulfilment_method ?? 'To be agreed'} · {order.fulfilment_status ?? 'Not started'}</Text></View>
          {order.payment_status ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Payment</Text><Text style={styles.infoText}>{order.payment_status}</Text></View> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: atelier.alabaster },
  empty: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14 },
  content: { padding: 24, paddingBottom: 130 },
  eyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.6, fontWeight: '700', marginTop: 9, marginBottom: 11 },
  heading: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 29, lineHeight: 38, marginBottom: 26 },
  actionBox: { backgroundColor: atelier.white, borderLeftWidth: 3, borderLeftColor: atelier.cognac, borderRadius: 10, padding: 18, marginBottom: 13 },
  actionText: { color: atelier.slate, fontFamily: atelier.body, fontSize: 14, lineHeight: 21, marginTop: 8 },
  statusBox: { backgroundColor: atelier.white, borderWidth: 1, borderColor: atelier.line, borderRadius: 10, padding: 20, marginBottom: 30 },
  sectionLabel: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  status: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 18, lineHeight: 25, fontWeight: '700', marginTop: 9 },
  date: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, marginTop: 9 },
  dateNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18, marginTop: 8 },
  section: { borderTopWidth: 1, borderTopColor: atelier.line, paddingTop: 21, marginBottom: 30 },
  sectionTitle: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 17, fontWeight: '700', marginBottom: 14 },
  count: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, marginBottom: 12 },
  item: { backgroundColor: atelier.white, borderWidth: 1, borderColor: atelier.line, borderRadius: 10, padding: 17, marginBottom: 9 },
  wearer: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 },
  itemName: { color: atelier.slate, fontFamily: atelier.body, fontSize: 15, fontWeight: '600' },
  itemStatus: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, marginTop: 8 },
  itemDate: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, marginTop: 7 },
  handoverNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18, marginTop: 10 },
  event: { flexDirection: 'row', gap: 15, minHeight: 63 },
  eventMarker: { alignItems: 'center', width: 13 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: atelier.cognac, marginTop: 5 },
  line: { flex: 1, width: 1, backgroundColor: atelier.line, marginTop: 5 },
  eventBody: { flex: 1, paddingBottom: 17 },
  eventTitle: { color: atelier.slate, fontFamily: atelier.body, fontSize: 14, fontWeight: '600' },
  eventDate: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, marginTop: 3 },
  eventExplanation: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18, marginTop: 7 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 11 },
  infoLabel: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13 },
  infoText: { color: atelier.slate, fontFamily: atelier.body, fontSize: 13, lineHeight: 19, textAlign: 'right', flex: 1 },
});
