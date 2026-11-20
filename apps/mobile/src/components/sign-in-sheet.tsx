import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { NyIcon } from '@/components/ny-icon';
import { NyMark } from '@/components/ny-mark';
import { ShopActionIcon } from '@/components/shop-action-icon';
import type { Customer, SignInChallenge, SignInChannel } from '@/lib/customer-auth';
import { PasskeyCancelledError } from '@/lib/passkeys';

export type SignInReason = 'checkout' | 'orders' | 'account' | 'booking' | 'link';

const reasonCopy: Record<SignInReason, { title: string; text: string }> = {
  checkout: { title: 'Sign in to check out', text: 'We use your email or phone to link this order to you and keep you updated.' },
  orders: { title: 'Sign in to see your orders', text: 'Follow every piece from first step to final handover.' },
  account: { title: 'Sign in to NY Atelier', text: 'No password needed. We send you a one-time code.' },
  booking: { title: 'Sign in to book', text: 'We link your consultation to your account so you can follow it here.' },
  link: { title: 'Signing you in', text: 'Confirming your sign-in link.' },
};

type Props = {
  reason: SignInReason;
  link?: { challengeId: string; token: string };
  start: (channel: SignInChannel, destination: string) => Promise<SignInChallenge>;
  verify: (challengeId: string, proof: { code: string } | { token: string }, name?: string) => Promise<Customer>;
  /** Present only when this phone can use passkeys. */
  passkey?: () => Promise<Customer>;
  onSignedIn: () => void;
  onClose: () => void;
};

export function SignInSheet({ reason, link, start, verify, passkey, onSignedIn, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [channel, setChannel] = useState<SignInChannel>('email');
  const [destination, setDestination] = useState('');
  const [name, setName] = useState('');
  const [challenge, setChallenge] = useState<SignInChallenge | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(Boolean(link));
  const [error, setError] = useState('');
  const handledLink = useRef<string | null>(null);

  // The sheet is remounted for each new link, so each link is verified once.
  useEffect(() => {
    if (!link || handledLink.current === link.token) return;
    handledLink.current = link.token;
    verify(link.challengeId, { token: link.token })
      .then(() => onSignedIn())
      .catch((failure: Error) => setError(failure.message))
      .finally(() => setBusy(false));
  }, [link, verify, onSignedIn]);

  async function send() {
    if (busy) return;
    const value = destination.trim();
    if (!value) { setError(channel === 'email' ? 'Enter your email address.' : 'Enter your phone number.'); return; }
    setBusy(true); setError('');
    try { setChallenge(await start(channel, value)); setCode(''); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  async function signInWithPasskey() {
    if (busy || !passkey) return;
    setBusy(true); setError('');
    try { await passkey(); onSignedIn(); }
    catch (failure) { if (!(failure instanceof PasskeyCancelledError)) setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  async function confirm(value = code) {
    if (busy || !challenge) return;
    if (!/^\d{6}$/.test(value)) { setError('Enter the 6-digit code.'); return; }
    setBusy(true); setError('');
    try { await verify(challenge.challengeId, { code: value }, reason === 'checkout' ? name : undefined); onSignedIn(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  const copy = link && !challenge ? reasonCopy.link : reasonCopy[reason];
  const linkOnly = Boolean(link) && !challenge && (busy || !error);

  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.frame, { paddingTop: insets.top }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close sign-in" onPress={() => { if (!busy) onClose(); }} style={styles.scrim} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.top}>
          <View style={styles.brand}><NyMark color={atelier.petrol} size={24} /><Text style={styles.brandText}>NY ATELIER</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close sign-in" disabled={busy} onPress={onClose} style={styles.close}><ShopActionIcon name="close" color={atelier.petrol} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.copy}>{copy.text}</Text>

          {linkOnly ? <ActivityIndicator color={atelier.petrol} style={styles.spinner} /> : !challenge ? <>
            {passkey ? <>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void signInWithPasskey(); }} style={[styles.outlined, busy && styles.disabled]}>
                <Text style={styles.outlinedText}>SIGN IN WITH PASSKEY</Text>
              </Pressable>
              <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or use a code</Text><View style={styles.dividerLine} /></View>
            </> : null}
            <View style={styles.segment} accessibilityRole="tablist">
              {(['email', 'phone'] as const).map(option => <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: channel === option }} onPress={() => { setChannel(option); setDestination(''); setError(''); }} style={[styles.segmentItem, channel === option && styles.segmentActive]}>
                <Text style={[styles.segmentText, channel === option && styles.segmentTextActive]}>{option === 'email' ? 'Email' : 'Phone'}</Text>
              </Pressable>)}
            </View>
            {reason === 'checkout' ? <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" /> : null}
            <Field
              label={channel === 'email' ? 'Email address' : 'Phone number'}
              value={destination}
              onChangeText={setDestination}
              keyboardType={channel === 'email' ? 'email-address' : 'phone-pad'}
              autoComplete={channel === 'email' ? 'email' : 'tel'}
              textContentType={channel === 'email' ? 'emailAddress' : 'telephoneNumber'}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={channel === 'email' ? 'you@example.com' : '024 123 4567'}
              returnKeyType="send"
              onSubmitEditing={() => { void send(); }}
            />
            <Text style={styles.hint}>{channel === 'email' ? 'We will email you a sign-in link and a 6-digit code.' : 'We will text you a 6-digit code. Ghana numbers can start with 0.'}</Text>
            <Primary label={busy ? 'SENDING…' : 'SEND CODE'} disabled={busy} onPress={() => { void send(); }} />
          </> : <>
            <View style={styles.sentTo}><NyIcon name="send" color={atelier.petrol} size={20} /><Text style={styles.sentText}>Code sent to {challenge.destination}</Text></View>
            <Field
              label="6-digit code"
              value={code}
              onChangeText={value => { const digits = value.replace(/\D/g, '').slice(0, 6); setCode(digits); if (digits.length === 6) void confirm(digits); }}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
              style={styles.codeInput}
            />
            <Text style={styles.hint}>{channel === 'email' ? 'Or tap the sign-in link in the email on this phone.' : 'The code expires in 15 minutes.'}</Text>
            <Primary label={busy ? 'SIGNING IN…' : 'SIGN IN'} disabled={busy} onPress={() => { void confirm(); }} />
            <View style={styles.links}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void send(); }}><Text style={styles.link}>Send a new code</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setChallenge(null); setCode(''); setError(''); }}><Text style={styles.link}>{channel === 'email' ? 'Use a different email' : 'Use a different number'}</Text></Pressable>
            </View>
          </>}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {link && error && !challenge ? <Primary label="SIGN IN ANOTHER WAY" onPress={() => setError('')} /> : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

function Field({ label, style, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={atelier.muted} maxLength={254} {...props} style={[styles.input, style]} /></View>;
}

function Primary({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.primary, disabled && styles.disabled]}><Text style={styles.primaryText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,28,30,0.43)' },
  sheet: { maxHeight: '92%', backgroundColor: atelier.alabaster, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 24, paddingTop: 22 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 13, letterSpacing: 2.2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: atelier.white },
  body: { paddingBottom: 8 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 26, lineHeight: 32, marginBottom: 8 },
  copy: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15, lineHeight: 22, marginBottom: 22 },
  spinner: { marginVertical: 30 },
  segment: { flexDirection: 'row', backgroundColor: atelier.white, borderRadius: atelier.buttonRadius, padding: 4, marginBottom: 18, borderWidth: 1, borderColor: atelier.line },
  segmentItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: atelier.buttonRadius },
  segmentActive: { backgroundColor: atelier.petrol },
  segmentText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: atelier.white },
  field: { marginBottom: 12 },
  fieldLabel: { color: atelier.slate, fontFamily: atelier.body, fontWeight: '700', fontSize: 13, marginBottom: 7 },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: atelier.line, backgroundColor: atelier.white, paddingHorizontal: 16, color: atelier.slate, fontFamily: atelier.body, fontSize: 16 },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  hint: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 19, marginBottom: 18 },
  sentTo: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: '#E9F0ED', marginBottom: 16 },
  sentText: { flex: 1, color: atelier.petrol, fontFamily: atelier.body, fontSize: 14 },
  primary: { minHeight: 52, borderRadius: atelier.buttonRadius, backgroundColor: atelier.petrol, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, marginTop: 4 },
  primaryText: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 14, letterSpacing: 1.4 },
  disabled: { opacity: 0.55 },
  outlined: { minHeight: 52, borderRadius: atelier.buttonRadius, borderWidth: 1.5, borderColor: atelier.petrol, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  outlinedText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 14, letterSpacing: 1.4 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: atelier.line },
  dividerText: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13 },
  links: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  link: { color: atelier.cognac, fontFamily: atelier.body, fontSize: 14, textDecorationLine: 'underline', paddingVertical: 8 },
  error: { color: '#A23B2A', fontFamily: atelier.body, fontSize: 14, lineHeight: 20, marginTop: 14 },
});
