import { ScrollView, Platform, StyleSheet, type ScrollViewProps } from 'react-native';
import { Screen } from 'react-native-screens';

/** Disable iOS's automatic top scroll-edge fade over full-bleed hero images. */
export function HeroScrollView(props: ScrollViewProps) {
  const scrollView = <ScrollView {...props} style={Platform.OS === 'ios' ? [styles.fill, props.style] : props.style} />;

  if (Platform.OS !== 'ios') return scrollView;

  return (
    <Screen style={styles.fill} scrollEdgeEffects={{ top: 'hidden', bottom: 'automatic', left: 'automatic', right: 'automatic' }}>
      {scrollView}
    </Screen>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
