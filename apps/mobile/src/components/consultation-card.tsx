import { IconLabel } from '@/components/shop-action-icon';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { atelier } from '@/atelier-theme';
import { formatConsultationTime, type ConsultationRequest } from '@/lib/consultations';
import { useDemoCustomer } from '@/lib/demo-customer';
import { formatDate } from '@/lib/orders';
import { StatusLabel } from './status-label';
import { statusColours } from '@/lib/customer-status';

const statusLabel: Record<ConsultationRequest['status'], string> = {
  'awaiting-confirmation': 'Awaiting confirmation',
  'awaiting-customer': 'New times proposed',
  'needs-alternatives': 'Waiting for new times',
  confirmed: 'Confirmed',
  'local-draft': 'Saved on this device',
};

export function ConsultationCard({ request, summary = false }: { request: ConsultationRequest; summary?: boolean }) {
  const { respondToRequest } = useDemoCustomer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirmed = request.status === 'confirmed';
  const orderReference = request.order_reference;

  async function respond(option?: number) {
    setBusy(true);
    setError('');
    try {
      await respondToRequest(request, option);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not update your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, request.status === 'awaiting-customer' && styles.replyCard]}>
      <Text style={styles.label}>{summary ? 'LATEST CONSULTATION REQUEST' : 'CONSULTATION REQUEST'}</Text>
      <Text style={styles.title}>{request.purpose}</Text>
      <View style={styles.status}><StatusLabel status={statusLabel[request.status]} />
        {request.status === 'awaiting-customer' ? <Text style={styles.replyLabel}>YOUR REPLY NEEDED</Text> : null}
      </View>
      <Text style={styles.detail}>{request.method === 'in-person' ? 'In person' : 'Virtual'}</Text>
      <Text style={styles.detail}>
        {confirmed ? 'Confirmed for' : 'Requested for'} {formatDate(confirmed ? request.confirmedDate : request.preferredDate)} · {formatConsultationTime((confirmed ? request.confirmedTime : request.preferredTime) ?? '')}
      </Text>
      {!summary && request.notes ? <Text style={styles.detail}>{request.notes}</Text> : null}
      {!summary && request.status === 'local-draft' ? <Text style={styles.detail}>This earlier preview request stayed on this device. Book again from Atelier to send a request to the staff portal.</Text> : null}
      {!summary && request.status === 'awaiting-customer' ? (
        <View style={styles.options}>
          <Text style={styles.detail}>Choose one of these times in Accra.</Text>
          {request.options.map((slot, index) => (
            <Pressable key={`${slot.date}-${slot.time}`} accessibilityRole="button" disabled={busy} onPress={() => { void respond(index); }} style={styles.option}>
              <Text style={styles.optionText}>Accept {formatDate(slot.date)} · {formatConsultationTime(slot.time)}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void respond(); }} style={styles.option}>
            <Text style={styles.optionText}>Ask for other times</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {summary ? <View style={styles.orderLink}><IconLabel label="VIEW CONSULTATIONS" name="forward" color={atelier.petrol} style={styles.footer} /></View> : orderReference ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`View order ${orderReference}`}
          onPress={() => router.push({ pathname: '/orders/[reference]', params: { reference: orderReference } })} style={[styles.option, styles.orderLink]}>
          <IconLabel label={`View order · ${orderReference}`} name="forward" color={atelier.petrol} style={styles.optionText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white, padding: 20 },
  replyCard: { borderColor: statusColours.warning.border, borderLeftWidth: 4 },
  replyLabel: { color: statusColours.warning.ink, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 10 },
  label: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 20, lineHeight: 26 },
  status: { marginVertical: 12 },
  detail: { color: atelier.slate, fontFamily: atelier.body, fontSize: 14, lineHeight: 21 },
  options: { gap: 8, marginTop: 10 },
  option: { borderWidth: 1, borderColor: '#B9CCCA', borderRadius: 22, padding: 12, backgroundColor: atelier.white },
  orderLink: { marginTop: 12 },
  optionText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700' },
  error: { color: atelier.cognac, fontFamily: atelier.body, marginTop: 8 },
  footer: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
});
