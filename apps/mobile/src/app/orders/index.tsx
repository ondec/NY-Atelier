import { IconLabel } from '@/components/shop-action-icon';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { ConsultationCard } from '@/components/consultation-card';
import { useDemoCustomer } from '@/lib/demo-customer';
import { OpenBagButton } from '@/components/open-bag-button';
import { NyMark } from '@/components/ny-mark';
import { formatDate } from '@/lib/orders';
import { useOrderUpdates } from '@/lib/order-updates';
import { useCustomerAttention } from '@/lib/customer-attention';
import { NyIcon } from '@/components/ny-icon';
import { StatusLabel } from '@/components/status-label';
import { statusColours } from '@/lib/customer-status';
import { useCustomerAuth } from '@/lib/customer-auth';
import { SignInPrompt } from '@/components/sign-in-prompt';

const views = [
  { id: 'active', label: 'Active' },
  { id: 'history', label: 'History' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'updates', label: 'Updates' },
] as const;

export default function OrdersScreen() {
  const { orders, updates, unread, isRead, markRead, refresh: refreshOrders, loading, unavailable: error } = useOrderUpdates();
  const { view: requestedView } = useLocalSearchParams<{ view?: string }>();
  const view = requestedView === 'history' || requestedView === 'consultations' || requestedView === 'updates' ? requestedView : 'active';
  const { requests, refreshRequests, unavailable } = useDemoCustomer();
  const { actionOrders, consultations, actionCount } = useCustomerAttention();
  const [refreshing, setRefreshing] = useState(false);
  const needsResponse = requests.filter((request) => request.status === 'awaiting-customer').length;
  const { customer } = useCustomerAuth();
  const visible = orders.filter((order) => view === 'history' ? order.is_complete : !order.is_complete);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void Promise.all([refreshOrders(), refreshRequests()]).finally(() => setRefreshing(false)); }} />}>
        <View style={styles.header}>
          <View style={styles.brandLockup}><NyMark color={atelier.petrol} size={25} /><Text style={styles.brand}>NY ATELIER</Text></View>
          <OpenBagButton />
        </View>
        <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Every piece, from first step to final handover.</Text>

        {!customer ? <SignInPrompt reason="orders" /> : <>

        {actionCount > 0 ? <View style={styles.attention} accessibilityLiveRegion="polite">
          <View style={styles.attentionHeader}><View style={styles.attentionIcon}><NyIcon name="bell" size={24} color={statusColours.danger.ink} /></View>
            <View style={styles.attentionHeading}><Text style={styles.attentionTitle}>{actionCount} {actionCount === 1 ? 'thing needs' : 'things need'} your reply</Text><Text style={styles.attentionCopy}>A next step is waiting for you.</Text></View>
            <Text style={styles.attentionCount}>{actionCount}</Text>
          </View>
          {consultations.map(request => <Pressable key={request.id} accessibilityRole="button" accessibilityLabel={`Respond to consultation: ${request.purpose}`} onPress={() => router.setParams({ view: 'consultations' })} style={styles.attentionRow}>
            <NyIcon name="calendar-days" size={18} color={statusColours.danger.ink} /><View style={{ flex: 1 }}><Text style={styles.attentionRowTitle}>{request.purpose}</Text><Text style={styles.attentionCopy}>Choose a consultation time</Text></View><NyIcon name="chevron-right" color={statusColours.danger.ink} size={18} />
          </Pressable>)}
          {actionOrders.map(order => <Pressable key={order.reference} accessibilityRole="button" onPress={() => router.push({ pathname: '/orders/[reference]', params: { reference: order.reference } })} style={styles.attentionRow}>
            <NyIcon name="order" size={18} color={statusColours.danger.ink} /><View style={{ flex: 1 }}><Text style={styles.attentionRowTitle}>{order.reference}</Text><Text style={styles.attentionCopy}>{order.client_action}</Text></View><NyIcon name="chevron-right" color={statusColours.danger.ink} size={18} />
          </Pressable>)}
        </View> : null}
        {unread > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={`Read ${unread} new order updates`} onPress={() => router.setParams({ view: 'updates' })} style={styles.updatesBanner}>
          <NyIcon name="bell" color={statusColours.info.ink} size={21} /><View style={{ flex: 1 }}><Text style={styles.updatesBannerTitle}>{unread} new order {unread === 1 ? 'update' : 'updates'}</Text><Text style={styles.updatesBannerCopy}>The latest from NY Atelier</Text></View><NyIcon name="chevron-right" color={statusColours.info.ink} size={18} />
        </Pressable> : null}

        <View style={styles.switcher}>
          {views.map(({ id: value, label }) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: view === value }}
              onPress={() => router.setParams({ view: value === 'active' ? undefined : value })}
              style={[styles.switchButton, view === value && styles.switchButtonActive]}>
              <Text style={[styles.switchText, view === value && styles.switchTextActive]}>
                {label}{value === 'updates' && unread ? ` (${unread})` : ''}{value === 'consultations' && needsResponse ? ` (${needsResponse})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {view === 'updates' ? <View style={styles.consultations}>
          {error ? <Text accessibilityRole="alert" style={styles.consultationNote}>Updates are unavailable. Pull down to retry.</Text> : null}
          {unread > 0 ? <Pressable accessibilityRole="button" onPress={() => markRead(updates.map((update) => update.id))}><Text style={styles.markRead}>Mark all as read</Text></Pressable> : null}
          {!updates.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No order updates yet</Text><Text style={styles.emptyText}>Collection, delivery and other updates from the team will appear here.</Text></View> : updates.map((update) => <Pressable key={update.id} accessibilityRole="button" accessibilityLabel={`${isRead(update.id) ? '' : 'Unread update: '}${update.title}`} style={[styles.updateCard, !isRead(update.id) && styles.updateUnread]} onPress={() => { markRead([update.id]); router.push({ pathname: '/orders/[reference]', params: { reference: update.reference } }); }}>
            <Text style={styles.reference}>{update.reference}</Text><Text style={styles.updateTitle}>{update.title}</Text>{update.detail ? <Text style={styles.emptyText}>{update.detail}</Text> : null}<Text style={styles.updateDate}>{new Date(update.at).toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</Text><Text style={styles.updateLink}>View order</Text>
          </Pressable>)}
        </View> : view === 'consultations' ? (
          <View style={styles.consultations}>
            {unavailable ? <Text accessibilityRole="alert" style={styles.consultationNote}>Consultation updates are unavailable. Pull down to retry.</Text> : null}
            {needsResponse ? <Text style={styles.consultationNote}>The Atelier has suggested new times. Choose one or ask for other options.</Text> : null}
            {requests.length ? <>
              {[...requests].sort((a, b) => Number(b.status === 'awaiting-customer') - Number(a.status === 'awaiting-customer')).map((request) => <ConsultationCard key={request.id} request={request} />)}
            </> : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No consultation requests yet</Text>
                <Text style={styles.emptyText}>Book a consultation from Atelier to see your request here.</Text>
              </View>
            )}
          </View>
        ) : (
          <>
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
                {order.service_offering ? <Text style={styles.progress}>{order.service_offering}</Text> : null}
                <StatusLabel status={order.status} />
                {order.client_action ? <View style={styles.orderAction}><NyIcon name="warning" color={statusColours.danger.ink} size={16} /><Text style={styles.orderActionText}>{order.client_action}</Text></View> : null}
                {order.category === 'Custom' ? (
                  <Text style={styles.progress}>{order.completed_item_count} of {order.item_count} outfits complete</Text>
                ) : null}
                <View style={styles.cardBottom}>
                  <Text style={styles.date}>{order.status === 'Cancelled' || order.status === 'Canceled' ? 'Cancelled' : order.is_complete ? 'Completed' : 'Expected'} {formatDate(order.is_complete ? order.completed_at?.slice(0, 10) ?? null : order.expected_completion_date)}</Text>
                  <IconLabel label="VIEW ORDER" name="forward" color={atelier.petrol} style={styles.open} />
                </View>
              </Pressable>
            ))}
          </>
        )}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  attention: { backgroundColor: statusColours.danger.background, borderWidth: 1, borderColor: statusColours.danger.border, borderRadius: 20, padding: 18, marginBottom: 16 },
  attentionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  attentionIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: atelier.white, alignItems: 'center', justifyContent: 'center' },
  attentionHeading: { flex: 1 },
  attentionTitle: { color: statusColours.danger.ink, fontFamily: atelier.body, fontWeight: '700', fontSize: 19, lineHeight: 25 },
  attentionCopy: { color: statusColours.danger.ink, fontFamily: atelier.body, fontSize: 13, lineHeight: 19, marginTop: 3 },
  attentionCount: { minWidth: 30, borderRadius: 15, backgroundColor: statusColours.danger.ink, color: atelier.white, overflow: 'hidden', fontFamily: atelier.body, fontWeight: '700', fontSize: 16, lineHeight: 30, textAlign: 'center' },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: statusColours.danger.border, paddingTop: 14, marginTop: 16, minHeight: 52 },
  attentionRowTitle: { color: statusColours.danger.ink, fontFamily: atelier.body, fontWeight: '700', fontSize: 14 },
  updatesBanner: { backgroundColor: statusColours.info.background, borderColor: statusColours.info.border, borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  updatesBannerTitle: { color: statusColours.info.ink, fontFamily: atelier.body, fontSize: 16, fontWeight: '700' },
  updatesBannerCopy: { color: statusColours.info.ink, fontFamily: atelier.body, fontSize: 12, marginTop: 4 },
  orderAction: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: statusColours.danger.background, borderRadius: 10, padding: 12, marginTop: 12 },
  orderActionText: { flex: 1, color: statusColours.danger.ink, fontFamily: atelier.body, fontSize: 13, lineHeight: 19 },
  updateDate: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, marginTop: 12 },
  updateLink: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 12, fontWeight: '700', marginTop: 12 },
  markRead: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 13, textAlign: 'right', marginBottom: 16, textDecorationLine: 'underline' },
  updateCard: { borderRadius: 16, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white, padding: 20, marginBottom: 12 },
  updateUnread: { borderLeftWidth: 4, borderColor: statusColours.info.border, borderLeftColor: statusColours.info.ink, backgroundColor: statusColours.info.background },
  updateTitle: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 17, lineHeight: 24, marginVertical: 10 },
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 130 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brand: { color: atelier.petrol, fontFamily: atelier.body, letterSpacing: 3.7, fontSize: 16, fontWeight: '700' },
  eyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 39, marginBottom: 8 },
  subtitle: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15, lineHeight: 22, marginBottom: 28 },
  switcher: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: atelier.line, marginBottom: 18 },
  switchButton: { paddingHorizontal: 12, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  switchButtonActive: { borderBottomColor: atelier.petrol },
  switchText: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14 },
  switchTextActive: { color: atelier.petrol, fontWeight: '700' },
  consultations: { gap: 12 },
  consultationNote: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 20 },
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
