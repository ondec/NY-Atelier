import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { atelier } from '@/atelier-theme';
import { NyIcon } from '@/components/ny-icon';
import type { SignInReason } from '@/components/sign-in-sheet';
import { useCustomerAuth } from '@/lib/customer-auth';

const promptCopy: Partial<Record<SignInReason, { title: string; text: string }>> = {
  orders: { title: 'Your orders live here', text: 'Sign in with your email or phone to follow your pieces, alterations and consultations.' },
  account: { title: 'Sign in to your account', text: 'Keep your details, addresses and measurements with you. No password needed.' },
};

/** Shown in place of a signed-in screen. Browsing elsewhere in the app never needs an account. */
export function SignInPrompt({ reason }: { reason: 'orders' | 'account' }) {
  const { state, requireSignIn } = useCustomerAuth();
  const copy = promptCopy[reason]!;
  if (state.status === 'loading') return <ActivityIndicator color={atelier.petrol} style={styles.loading} />;
  return <View style={styles.card}>
    <View style={styles.icon}><NyIcon name={reason === 'orders' ? 'order' : 'user'} color={atelier.petrol} size={26} /></View>
    <Text style={styles.title}>{copy.title}</Text>
    <Text style={styles.text}>{copy.text}</Text>
    <Pressable accessibilityRole="button" onPress={() => { void requireSignIn(reason); }} style={styles.primary}><Text style={styles.primaryText}>SIGN IN</Text></Pressable>
    <Text style={styles.hint}>New to NY Atelier? The same step creates your account.</Text>
  </View>;
}

const styles = StyleSheet.create({
  loading: { marginTop: 40 },
  card: { marginTop: 26, padding: 24, borderRadius: 24, backgroundColor: atelier.white, borderWidth: 1, borderColor: atelier.line, alignItems: 'flex-start' },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: atelier.alabaster, marginBottom: 16 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 22, lineHeight: 28, marginBottom: 8 },
  text: { color: atelier.muted, fontFamily: atelier.body, fontSize: 15, lineHeight: 22, marginBottom: 20 },
  primary: { alignSelf: 'stretch', minHeight: 52, borderRadius: atelier.buttonRadius, backgroundColor: atelier.petrol, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 14, letterSpacing: 1.4 },
  hint: { color: atelier.muted, fontFamily: atelier.body, fontSize: 13, lineHeight: 19, marginTop: 14 },
});
