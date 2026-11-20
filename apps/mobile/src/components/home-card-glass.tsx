import { BlurView } from 'expo-blur';
import { StyleSheet, View, type ViewStyle } from 'react-native';

export type HomeCardGlassProps = { image: number };

// The web mask belongs to the glass only; text is rendered separately above it.
export function HomeCardGlass(_props: HomeCardGlassProps) {
  return <View pointerEvents="none" style={styles.glass}>
    <BlurView intensity={65} tint="systemUltraThinMaterialDark" style={[StyleSheet.absoluteFill, styles.mask]} />
    <View style={[StyleSheet.absoluteFill, styles.shade]} />
  </View>;
}

const styles = StyleSheet.create({
  glass: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '52%', minHeight: 220 },
  mask: { maskImage: 'linear-gradient(to bottom, transparent, black 20%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%)' } as ViewStyle,
  shade: { backgroundImage: 'linear-gradient(to bottom, rgba(18,60,69,0), rgba(18,60,69,0.34) 35%, rgba(6,20,24,0.72))' },
});
