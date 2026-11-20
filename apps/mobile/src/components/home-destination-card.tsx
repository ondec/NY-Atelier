import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import { atelier } from '@/atelier-theme';
import { ShopActionIcon } from '@/components/shop-action-icon';
import { HomeCardGlass } from '@/components/home-card-glass';

type Props = {
  image: number;
  tag: string;
  title: string;
  description: string;
  action: string;
  accessibilityLabel: string;
  onPress: () => void;
};

export function HomeDestinationCard({ image, tag, title, description, action, accessibilityLabel, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.card}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ImageBackground source={image} resizeMode="cover" imageStyle={styles.image} style={StyleSheet.absoluteFill} />
      </View>
      <HomeCardGlass image={image} />
      <View pointerEvents="none" style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
      <View pointerEvents="none" style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.foot}>
          <Text style={styles.action}>{action}</Text>
          <View style={styles.arrow}><ShopActionIcon name="arrow-up-right" color={atelier.white} size={19} /></View>
        </View>
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, aspectRatio: 3 / 4, minHeight: 330, maxHeight: 600, backgroundColor: atelier.petrol, borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden', justifyContent: 'space-between' },
  image: { width: '100%', height: '100%' },
  edge: { borderRadius: 24, borderCurve: 'continuous', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  tag: { margin: 14, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, alignSelf: 'flex-start', backgroundColor: 'rgba(246,243,236,0.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  tagText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 8, fontWeight: '700', letterSpacing: 0.7 },
  content: { padding: 16, paddingTop: 20 },
  title: { color: atelier.white, fontFamily: atelier.display, fontSize: 19, lineHeight: 27 },
  description: { color: 'rgba(255,255,255,0.88)', fontFamily: atelier.body, fontSize: 13, lineHeight: 18, marginTop: 6 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)' },
  action: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 8, letterSpacing: 0.7, flexShrink: 1 },
  arrow: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
});
