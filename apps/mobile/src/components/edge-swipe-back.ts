import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, useWindowDimensions } from 'react-native';
import { useReducedMotion } from '@/components/use-reduced-motion';

export function useEdgeSwipeBack(onBack: () => void, visible: boolean, resetKey: unknown = visible) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [translation] = useState(() => new Animated.Value(0));
  const closing = useRef(false);
  useEffect(() => {
    if (visible) {
      closing.current = false;
      translation.stopAnimation();
      translation.setValue(0);
    }
  }, [visible, resetKey, width, translation]);

  // PanResponder stores these callbacks; it does not invoke them during render.
  /* eslint-disable react-hooks/refs */
  const panHandlers = useMemo(() => {
    if (Platform.OS === 'web') return {};
    let edge = false;
    const reset = () => Animated.spring(translation, { toValue: 0, stiffness: 260, damping: 28, mass: 0.8, useNativeDriver: true }).start();
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: ({ nativeEvent }) => {
        edge = visible && !closing.current && nativeEvent.touches.length === 1 && nativeEvent.pageX <= 28;
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => edge && gesture.numberActiveTouches === 1 && gesture.dx > 12 && gesture.dx > Math.abs(gesture.dy) * 1.7,
      onPanResponderGrant: () => translation.stopAnimation(),
      onPanResponderMove: (_, gesture) => { if (!reduced) translation.setValue(Math.max(0, Math.min(width, gesture.dx))); },
      onPanResponderRelease: (_, gesture) => {
        edge = false;
        const commit = gesture.dx > Math.min(96, width * 0.25) || (gesture.dx > 24 && gesture.vx > 0.65);
        if (!commit) { reset(); return; }
        closing.current = true;
        if (reduced) { onBack(); return; }
        Animated.timing(translation, { toValue: width, duration: Math.max(150, 290 * (1 - Math.min(gesture.dx, width) / width)), easing: Easing.bezier(0.22, 0.8, 0.25, 1), useNativeDriver: true }).start(({ finished }) => { if (finished) onBack(); });
      },
      onPanResponderTerminate: () => { edge = false; reset(); },
      onPanResponderTerminationRequest: () => false,
    }).panHandlers;
  }, [onBack, width, reduced, translation, visible]);
  /* eslint-enable react-hooks/refs */

  return { panHandlers, animatedStyle: { transform: [{ translateX: translation }] } };
}
