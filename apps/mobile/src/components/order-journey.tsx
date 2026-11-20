import { StyleSheet, Text, View } from 'react-native';
import { atelier } from '@/atelier-theme';
import type { DemoOrder } from '@/lib/orders';
import { customerStatusTone, statusColours } from '@/lib/customer-status';
import { NyIcon } from './ny-icon';
import { StatusLabel } from './status-label';

const dateTime = (value: string) => new Date(value).toLocaleString('en-GH', { timeZone: 'Africa/Accra', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function OrderJourney({ order }: { order: DemoOrder }) {
  const steps = order.workflow?.steps ?? [];
  const phases = [...new Set(steps.map(step => step.phase ?? 'Your order'))];
  return <View style={styles.section}>
    <Text style={styles.heading}>Your order journey</Text>
    {order.workflow?.current === 'cancelled' ? <Text style={styles.note}>This order was cancelled. Its recorded history is kept below.</Text> : null}
    {phases.map(phase => <View key={phase} style={styles.phase}>
      <Text style={styles.phaseTitle}>{phase}</Text>
      {steps.filter(step => (step.phase ?? 'Your order') === phase).map((step, index, group) => {
        const recorded = step.state === 'recorded';
        const skipped = step.state === 'skipped';
        const tone = step.is_current ? customerStatusTone(step.label) : recorded ? 'success' : 'neutral';
        const colours = statusColours[tone];
        return <View key={step.key} style={styles.milestone}>
          <View style={styles.markerColumn}><View style={[styles.marker, { backgroundColor: colours.background, borderColor: colours.border }]}><NyIcon name={recorded ? 'check' : skipped ? 'minus' : step.is_current ? 'progress' : 'dot'} color={colours.ink} size={15} /></View>{index < group.length - 1 ? <View style={styles.connector} /> : null}</View>
          <View style={[styles.stepBody, step.is_current && styles.currentStep]}>
            <View style={styles.stepTitleRow}><Text style={[styles.stepTitle, !recorded && !step.is_current && styles.upcoming]}>{step.label}</Text>{step.is_current ? <Text style={styles.currentLabel}>{order.workflow?.closed ? 'FINAL STAGE' : 'CURRENT'}</Text> : null}</View>
            <Text style={styles.note}>{step.recorded_at ? `${skipped ? 'Skipped · ' : ''}${dateTime(step.recorded_at)}` : step.is_current ? 'Current stage · time not recorded' : step.state === 'unrecorded' ? 'Time not recorded' : order.workflow?.current === 'cancelled' ? 'Not reached' : order.workflow?.closed ? 'Not recorded' : 'Upcoming'}</Text>
            {step.is_current && !order.workflow?.closed ? <Text style={styles.stepHelp}>{step.help}</Text> : null}
          </View>
        </View>;
      })}
    </View>)}
  </View>;
}

export function OrderHistory({ order }: { order: DemoOrder }) {
  const groups = new Map<string, DemoOrder['timeline']>();
  [...order.timeline].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at) || (b.id ?? 0) - (a.id ?? 0)).forEach(event => {
    const date = new Date(event.occurred_at).toLocaleDateString('en-GH', { timeZone: 'Africa/Accra', day: 'numeric', month: 'long', year: 'numeric' });
    groups.set(date, [...(groups.get(date) ?? []), event]);
  });
  return <View style={styles.section}>
    <Text style={styles.heading}>Order history</Text><Text style={styles.reference}>{order.reference} · Times in Accra</Text>
    {!groups.size ? <Text style={styles.note}>Updates from the team will appear here.</Text> : [...groups].map(([date, events]) => <View key={date} style={styles.historyGroup}>
      <Text style={styles.day}>{date}</Text>
      {events.map((event, index) => <View key={event.id ?? `${event.occurred_at}:${index}`} style={styles.historyRow}>
        <Text style={styles.time}>{new Date(event.occurred_at).toLocaleTimeString('en-GH', { timeZone: 'Africa/Accra', hour: 'numeric', minute: '2-digit' })}</Text>
        <View style={styles.historyBody}><StatusLabel status={event.title} />{event.explanation ? <Text style={styles.stepHelp}>{event.explanation}</Text> : null}</View>
      </View>)}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, borderTopColor: atelier.line, paddingTop: 24, marginBottom: 30 },
  heading: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 21, lineHeight: 29, marginBottom: 12 },
  phase: { marginTop: 10 },
  phaseTitle: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 },
  milestone: { flexDirection: 'row', gap: 12, minHeight: 78 },
  markerColumn: { alignItems: 'center', width: 30 },
  marker: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  connector: { flex: 1, width: 1, backgroundColor: atelier.line, minHeight: 16 },
  stepBody: { flex: 1, paddingTop: 2, paddingBottom: 22 },
  currentStep: { backgroundColor: atelier.white, borderRadius: 14, padding: 14, marginBottom: 16 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 5 },
  stepTitle: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  upcoming: { color: atelier.muted },
  currentLabel: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  note: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18 },
  stepHelp: { color: atelier.slate, fontFamily: atelier.body, fontSize: 14, lineHeight: 21, marginTop: 7 },
  reference: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, marginBottom: 8 },
  historyGroup: { marginTop: 20 },
  day: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: atelier.line },
  time: { color: atelier.muted, fontFamily: atelier.body, fontSize: 11, lineHeight: 18, width: 60, paddingTop: 7 },
  historyBody: { flex: 1 },
});
