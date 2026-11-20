import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { atelier } from '@/atelier-theme';
import { useCustomerAttention } from '@/lib/customer-attention';
import { statusColours } from '@/lib/customer-status';
import { useReducedMotion } from '@/components/use-reduced-motion';

const duration = 280;
const easing = Easing.bezier(0.22, 0.8, 0.25, 1);
const captionWidths: Record<string, number> = { Home: 38, Shop: 34, Atelier: 46, Orders: 46, Account: 55 };

type TabButtonProps = {
  focused: boolean;
  label: string;
  icon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
  baseWidth: number;
  activeWidth: number;
  measured: boolean;
  reducedMotion: boolean;
  captionScale: number;
  selectionIndex: number;
  badge: number;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress: () => void;
};

function TabButton({ focused, label, icon, baseWidth, activeWidth, measured, reducedMotion, captionScale, selectionIndex, badge, accessibilityLabel, onPress, onLongPress }: TabButtonProps) {
  const [expansion] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(expansion, { toValue: focused ? 1 : 0, duration: reducedMotion ? 0 : duration, easing, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [focused, expansion, reducedMotion, selectionIndex]);
  const captionWidth = (captionWidths[label] ?? 55) * captionScale;
  const color = focused ? atelier.petrol : atelier.muted;
  return <Animated.View style={measured ? { width: expansion.interpolate({ inputRange: [0, 1], outputRange: [baseWidth, activeWidth] }) } : { flex: focused ? 1.7 : 1 }}>
    <Pressable accessibilityRole="tab" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected: focused }} onPress={onPress} onLongPress={onLongPress} style={styles.tab}>
      <View style={styles.icon}>
        {icon?.({ focused, color, size: 25 })}
        {badge > 0 ? <View style={styles.badge}><Text allowFontScaling={false} style={[styles.badgeNumber, badge > 99 && styles.badgeOverflow]}>{badge > 99 ? '99+' : badge}</Text></View> : null}
      </View>
      <Animated.View pointerEvents="none" style={{ width: expansion.interpolate({ inputRange: [0, 1], outputRange: [0, captionWidth] }), marginLeft: expansion.interpolate({ inputRange: [0, 1], outputRange: [0, 7] }), opacity: expansion, overflow: 'hidden' }}>
        {focused ? <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.label}>{label}</Text> : null}
      </Animated.View>
    </Pressable>
  </Animated.View>;
}

export function CustomerTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const { badgeCount, actionCount, unread } = useCustomerAttention();
  const reducedMotion = useReducedMotion();
  const [innerWidth, setInnerWidth] = useState(0);
  const [indicatorX] = useState(() => new Animated.Value(0));
  const previousWidth = useRef(0);
  const activeWidth = Math.min(innerWidth, Math.max(104, Math.min(132, innerWidth * 0.31)));
  const baseWidth = (innerWidth - activeWidth) / Math.max(1, state.routes.length - 1);

  useEffect(() => {
    const target = state.index * baseWidth;
    if (previousWidth.current !== innerWidth || reducedMotion) {
      previousWidth.current = innerWidth;
      indicatorX.setValue(target);
      return;
    }
    const animation = Animated.timing(indicatorX, { toValue: target, duration, easing, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [state.index, innerWidth, baseWidth, indicatorX, reducedMotion]);

  return <View pointerEvents="box-none" style={[styles.position, { bottom: Math.max(insets.bottom - 6, 10) }]}>
    <View style={styles.frame} onLayout={event => setInnerWidth(Math.max(0, event.nativeEvent.layout.width - 14))}>
      <BlurView intensity={Platform.OS === 'web' ? 75 : 65} tint="light" blurMethod={Platform.OS === 'android' ? 'none' : undefined} style={styles.glass}>
        <Animated.View pointerEvents="none" style={[styles.selection, { width: activeWidth, opacity: innerWidth > 0 ? 1 : 0, transform: [{ translateX: indicatorX }] }]} />
        <View role="tablist" style={styles.items}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const options = descriptors[route.key].options;
            const label = options.title || route.name;
            const isOrders = route.name === 'orders';
            return <TabButton key={route.key} focused={focused} label={label} icon={options.tabBarIcon} baseWidth={baseWidth} activeWidth={activeWidth} measured={innerWidth > 0} reducedMotion={reducedMotion} captionScale={Math.min(fontScale, 1.2)} selectionIndex={state.index} badge={isOrders ? badgeCount : 0}
              accessibilityLabel={isOrders && badgeCount ? `${label}, ${actionCount} actions needed, ${unread} unread updates` : label}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })} />;
          })}
        </View>
      </BlurView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  position: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 12 },
  frame: { width: '100%', maxWidth: 520, height: 66, borderRadius: 33, backgroundColor: 'rgba(246,243,236,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', shadowColor: atelier.slate, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.13, shadowRadius: 22, elevation: 12 },
  glass: { flex: 1, borderRadius: 32, overflow: 'hidden', backgroundColor: 'rgba(246,243,236,0.4)' },
  selection: { position: 'absolute', top: 6, bottom: 6, left: 6, borderRadius: 26, backgroundColor: 'rgba(18,60,69,0.10)', borderWidth: 1, borderColor: 'rgba(18,60,69,0.04)' },
  items: { flex: 1, padding: 6, flexDirection: 'row', alignItems: 'center' },
  tab: { height: 52, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
  icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  label: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  badge: { position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: statusColours.danger.ink, alignItems: 'center', justifyContent: 'center' },
  badgeNumber: { color: atelier.white, fontWeight: '700', fontSize: 10, lineHeight: 12, textAlign: 'center', includeFontPadding: false, fontVariant: ['tabular-nums'] },
  badgeOverflow: { fontSize: 8 },
});
