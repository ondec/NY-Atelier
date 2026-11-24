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
/** code: email or phone code · password: email + password · create: new account · reset: forgot password */
type Mode = 'code' | 'password' | 'create' | 'reset';

const modeCopy: Partial<Record<Mode, { title: string; text: string }>> = {
  create: { title: 'Create your account', text: 'Choose a password. We email you a code to confirm the address first.' },
  reset: { title: 'Set a new password', text: 'Choose a new password. We email you a code to confirm it is you. Other phones will be signed out.' },
};
const passwordHint = 'At least 8 characters, with letters and numbers.';

const reasonCopy: Record<SignInReason, { title: string; text: string }> = {
  checkout: { title: 'Sign in to check out', text: 'We use your email or phone to link this order to you and keep you updated.' },
  orders: { title: 'Sign in to see your orders', text: 'Follow every piece from first step to final handover.' },
  account: { title: 'Sign in to NY Atelier', text: 'Use your email and password, or we can send you a one-time code.' },
  booking: { title: 'Sign in to book', text: 'We link your consultation to your account so you can follow it here.' },
  link: { title: 'Signing you in', text: 'Confirming your sign-in link.' },
};

type Props = {
  reason: SignInReason;
  link?: { challengeId: string; token: string };
  start: (channel: SignInChannel, destination: string, password?: string) => Promise<SignInChallenge>;
  verify: (challengeId: string, proof: { code: string } | { token: string }, name?: string) => Promise<Customer>;
  signInWithPassword: (email: string, password: string) => Promise<Customer>;
  /** Present only when this phone can use passkeys. */
  passkey?: () => Promise<Customer>;
  onSignedIn: () => void;
  onClose: () => void;
};

export function SignInSheet({ reason, link, start, verify, signInWithPassword, passkey, onSignedIn, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [channel, setChannel] = useState<SignInChannel>('email');
  const [mode, setMode] = useState<Mode>(reason === 'account' ? 'password' : 'code');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    const settingPassword = mode === 'create' || mode === 'reset';
    if (settingPassword && !(password.length >= 8 && /[a-z]/i.test(password) && /\d/.test(password))) { setError(passwordHint); return; }
    setBusy(true); setError('');
    try { setChallenge(await start(channel, value, settingPassword ? password : undefined)); setCode(''); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  async function passwordSignIn() {
    if (busy) return;
    const email = destination.trim();
    if (!email || !password) { setError('Enter your email address and password.'); return; }
    setBusy(true); setError('');
    try { await signInWithPassword(email, password); onSignedIn(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  function switchMode(next: Mode) {
    setMode(next); setPassword(''); setShowPassword(false); setError('');
    if (next !== 'code') setChannel('email');
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
    try { await verify(challenge.challengeId, { code: value }, reason === 'checkout' || mode === 'create' ? name : undefined); onSignedIn(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  const copy = link && !challenge ? reasonCopy.link : modeCopy[mode] ?? reasonCopy[reason];
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
            {mode === 'code' ? <View style={styles.segment} accessibilityRole="tablist">
              {(['email', 'phone'] as const).map(option => <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: channel === option }} onPress={() => { setChannel(option); setDestination(''); setError(''); }} style={[styles.segmentItem, channel === option && styles.segmentActive]}>
                <Text style={[styles.segmentText, channel === option && styles.segmentTextActive]}>{option === 'email' ? 'Email' : 'Phone'}</Text>
              </Pressable>)}
            </View> : null}
            {reason === 'checkout' || mode === 'create' ? <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" /> : null}
            <Field
              label={channel === 'email' ? 'Email address' : 'Phone number'}
              value={destination}
              onChangeText={setDestination}
              keyboardType={channel === 'email' ? 'email-address' : 'phone-pad'}
              autoComplete={channel === 'email' ? 'email' : 'tel'}
              textContentType={channel === 'email' ? (mode === 'password' ? 'username' : 'emailAddress') : 'telephoneNumber'}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={channel === 'email' ? 'you@example.com' : '024 123 4567'}
              returnKeyType={mode === 'code' ? 'send' : 'next'}
              onSubmitEditing={() => { if (mode === 'code') void send(); }}
            />
            {mode !== 'code' ? <View style={styles.field}>
              <Text style={styles.fieldLabel}>{mode === 'password' ? 'Password' : mode === 'create' ? 'Choose a password' : 'New password'}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  accessibilityLabel={mode === 'password' ? 'Password' : 'New password'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete={mode === 'password' ? 'current-password' : 'new-password'}
                  textContentType={mode === 'password' ? 'password' : 'newPassword'}
                  passwordRules="minlength: 8; required: lower; required: digit;"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={128}
                  returnKeyType="go"
                  onSubmitEditing={() => { void (mode === 'password' ? passwordSignIn() : send()); }}
                  style={[styles.input, styles.passwordInput]}
                />
                <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(value => !value)} style={styles.showButton}>
                  <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View> : null}
            <Text style={styles.hint}>{mode === 'password' ? 'Signing in on a new phone? You can also use an email code.' : mode !== 'code' ? passwordHint : channel === 'email' ? 'We will email you a sign-in link and a 6-digit code.' : 'We will text you a 6-digit code. Ghana numbers can start with 0.'}</Text>
            {mode === 'password'
              ? <Primary label={busy ? 'SIGNING IN…' : 'SIGN IN'} disabled={busy} onPress={() => { void passwordSignIn(); }} />
              : <Primary label={busy ? 'SENDING…' : mode === 'create' ? 'CREATE ACCOUNT' : 'SEND CODE'} disabled={busy} onPress={() => { void send(); }} />}
            <View style={styles.links}>
              {mode === 'password' ? <>
                <TextLink label="Forgot password?" disabled={busy} onPress={() => switchMode('reset')} />
                <TextLink label="Email me a code instead" disabled={busy} onPress={() => switchMode('code')} />
              </> : <TextLink label={mode === 'code' ? 'Sign in with a password' : 'Back to sign in'} disabled={busy} onPress={() => switchMode('password')} />}
              {mode !== 'create' ? <TextLink label="Create an account" disabled={busy} onPress={() => switchMode('create')} /> : null}
            </View>
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
            <Text style={styles.hint}>{mode === 'create' || mode === 'reset' ? 'Your password is saved once you confirm this code, or tap the link in the email on this phone.' : channel === 'email' ? 'Or tap the sign-in link in the email on this phone.' : 'The code expires in 15 minutes.'}</Text>
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

function TextLink({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}><Text style={styles.link}>{label}</Text></Pressable>;
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
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, paddingRight: 72 },
  showButton: { position: 'absolute', right: 6, minHeight: 40, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: atelier.buttonRadius },
  showText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 13 },
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
