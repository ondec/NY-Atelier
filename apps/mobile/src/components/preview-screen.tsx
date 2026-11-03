import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';

type PreviewScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: '/orders' | '/shop' | '/atelier';
};

export function PreviewScreen({ eyebrow, title, description, actionLabel, actionRoute }: PreviewScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>NY ATELIER</Text>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {actionLabel && actionRoute ? (
            <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.push(actionRoute)}>
              <Text style={styles.buttonText}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.note}>
          <Text style={styles.noteLabel}>TEAM PREVIEW</Text>
          <Text style={styles.noteText}>The Orders area uses fictional records shared with the staff portal. Other journeys will be added in the next build slices.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { padding: 28, paddingBottom: 56, gap: 32 },
  brand: { color: atelier.petrol, letterSpacing: 5, fontSize: 13, fontWeight: '700', marginTop: 12 },
  hero: { backgroundColor: atelier.petrol, padding: 30, minHeight: 370, justifyContent: 'center' },
  eyebrow: { color: atelier.brass, letterSpacing: 3, fontSize: 11, fontWeight: '700', marginBottom: 18 },
  title: { color: atelier.white, fontFamily: 'Georgia', fontSize: 42, lineHeight: 48, marginBottom: 18 },
  description: { color: '#E3EAE5', fontSize: 15, lineHeight: 24, marginBottom: 24 },
  button: { backgroundColor: atelier.alabaster, alignSelf: 'flex-start', paddingHorizontal: 21, paddingVertical: 14 },
  buttonText: { color: atelier.petrol, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  note: { borderTopWidth: 1, borderColor: atelier.line, paddingTop: 20 },
  noteLabel: { color: atelier.cognac, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 9 },
  noteText: { color: atelier.muted, fontSize: 13, lineHeight: 20 },
});
