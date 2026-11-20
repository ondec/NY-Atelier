import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { NyMark } from '@/components/ny-mark';
import { ShopActionIcon } from '@/components/shop-action-icon';
import type { Customer } from '@/lib/customer-auth';
import { PasskeyCancelledError } from '@/lib/passkeys';

const snoozeDays = 3;
const snoozeKey = (customerId: number) => `ny-atelier-passkey-snooze-v1:${customerId}`;
// "My phone can't do this" hides the required prompt until the app is next opened.
let skippedThisSession = false;

type Props = { customer: Customer; addPasskey: () => Promise<Customer> };

/** Invites a signed-in customer to add a passkey. Only rendered on phones that support passkeys. */
export function PasskeyPrompt({ customer, addPasskey }: Props) {
  const insets = useSafeAreaInsets();
  const status = customer.passkey.status;
  const [dismissed, setDismissed] = useState(false);
  const [snooze, setSnooze] = useState<{ customerId: number; snoozed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // An offer can be snoozed for a few days; read that choice before showing the sheet.
  useEffect(() => {
    if (status !== 'offer') return;
    let active = true;
    void AsyncStorage.getItem(snoozeKey(customer.id))
      .then(until => { if (active) setSnooze({ customerId: customer.id, snoozed: Boolean(until) && Number(until) > Date.now() }); })
      .catch(() => { if (active) setSnooze({ customerId: customer.id, snoozed: false }); });
    return () => { active = false; };
  }, [status, customer.id]);

  const visible = !dismissed && (status === 'required'
    ? !skippedThisSession
    : status === 'offer' && snooze?.customerId === customer.id && !snooze.snoozed);
  if (!visible) return null;
  const required = status === 'required';

  async function setUp() {
    if (busy) return;
    setBusy(true); setError('');
    try { await addPasskey(); setDismissed(true); }
    catch (failure) { if (!(failure instanceof PasskeyCancelledError)) setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  function notNow() {
    if (busy) return;
    setDismissed(true);
    void AsyncStorage.setItem(snoozeKey(customer.id), String(Date.now() + snoozeDays * 24 * 60 * 60 * 1000)).catch(() => {});
  }

  function cannot() {
    if (busy) return;
    skippedThisSession = true;
    setDismissed(true);
  }

  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={() => { if (!required) notNow(); }}>
    <View style={[styles.frame, { paddingTop: insets.top }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={required ? undefined : 'Not now'} disabled={required} onPress={notNow} style={styles.scrim} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.top}>
          <View style={styles.brand}><NyMark color={atelier.petrol} size={24} /><Text style={styles.brandText}>NY ATELIER</Text></View>
          {required ? null : <Pressable accessibilityRole="button" accessibilityLabel="Not now" disabled={busy} onPress={notNow} style={styles.close}><ShopActionIcon name="close" color={atelier.petrol} /></Pressable>}
        </View>
        <Text style={styles.title}>Sign in faster next time</Text>
        <Text style={styles.copy}>{required
          ? 'Set up a passkey to keep signing in. Face ID, Touch ID or your phone unlock will sign you in, with no code to wait for.'
          : 'Use Face ID, Touch ID or your phone unlock to sign in. No code to wait for, and nothing to remember.'}</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void setUp(); }} style={[styles.primary, busy && styles.disabled]}>
          <Text style={styles.primaryText}>{busy ? 'SETTING UP…' : 'SET UP PASSKEY'}</Text>
        </Pressable>
        {required ? null : <Pressable accessibilityRole="button" disabled={busy} onPress={notNow} style={styles.outlined}><Text style={styles.outlinedText}>NOT NOW</Text></Pressable>}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {required ? <Pressable accessibilityRole="button" disabled={busy} onPress={cannot} style={styles.linkWrap}>
          <Text style={styles.link}>My phone can&apos;t do this</Text>
        </Pressable> : null}
        {required ? <Text style={styles.hint}>You can still sign in with a code sent to your email or phone.</Text> : null}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,28,30,0.43)' },
  sheet: { backgroundColor: atelier.alabaster, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 24, paddingTop: 22 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, minHeight: 44 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 13, letterSpacing: 2.2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: atelier.white },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 26, lineHeight: 32, marginBottom: 8 },
  copy: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15, lineHeight: 22, marginBottom: 22 },
  primary: { minHeight: 52, borderRadius: atelier.buttonRadius, backgroundColor: atelier.petrol, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  primaryText: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 14, letterSpacing: 1.4 },
  outlined: { minHeight: 52, borderRadius: atelier.buttonRadius, borderWidth: 1.5, borderColor: atelier.petrol, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, marginTop: 12 },
  outlinedText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 14, letterSpacing: 1.4 },
  disabled: { opacity: 0.55 },
  linkWrap: { alignSelf: 'center', marginTop: 14 },
  link: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 14, textDecorationLine: 'underline', paddingVertical: 8 },
  hint: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4 },
  error: { color: '#A23B2A', fontFamily: atelier.body, fontSize: 14, lineHeight: 20, marginTop: 14 },
});
