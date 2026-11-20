import { StyleSheet, Text, View } from 'react-native';
import { atelier } from '@/atelier-theme';
import { customerStatusTone, statusColours, type StatusTone } from '@/lib/customer-status';
import { NyIcon } from './ny-icon';

export function StatusLabel({ status, tone }: { status: string; tone?: StatusTone }) {
  const resolved = tone ?? customerStatusTone(status);
  const colours = statusColours[resolved];
  const icon = resolved === 'success' ? 'check' : resolved === 'danger' ? 'warning' : resolved === 'progress' ? 'progress' : resolved === 'warning' ? 'clock' : 'dot';
  return <View style={[styles.badge, { backgroundColor: colours.background, borderColor: colours.border }]}>
    <NyIcon name={icon} color={colours.ink} size={14} />
    <Text style={[styles.text, { color: colours.ink }]}>{status}</Text>
  </View>;
}
const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12, maxWidth: '100%' },
  text: { fontFamily: atelier.body, fontWeight: '700', fontSize: 12, lineHeight: 17, flexShrink: 1 },
});
