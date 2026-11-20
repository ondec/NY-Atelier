import { router, usePathname } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, View, useWindowDimensions, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import type { BottomTabNavigationOptions } from 'expo-router/js-tabs';
import { customerTabs, swipeTab } from '@/lib/customer-layout';
import { useReducedMotion } from '@/components/use-reduced-motion';

const SwipeContext = createContext<((id: string, blocked: boolean) => void) | null>(null);
const MotionContext = createContext<{ drag: Animated.Value; source: string | null; reduced: boolean } | null>(null);
export const tabTransition = { animation: 'timing' as const, config: { duration: 360, easing: Easing.bezier(0.22, 0.8, 0.25, 1) } };

export function useTabSceneMotion() {
  const motion = useContext(MotionContext);
  const { width } = useWindowDimensions();
  return {
    reduced: motion?.reduced ?? false,
    interpolate: (path: string): NonNullable<BottomTabNavigationOptions['sceneStyleInterpolator']> => ({ current }) => {
      const progress = current.progress;
      // The outgoing page starts at the finger's position. The incoming page
      // starts beside it, then both settle without resetting the drag mid-frame.
      const weight = progress.interpolate({ inputRange: [-1, 0, 1], outputRange: motion?.source === path ? [0, 1, 0] : [1, 0, 1], extrapolate: 'clamp' });
      return { sceneStyle: { transform: [{ translateX: motion ? Animated.add(Animated.multiply(progress, width), Animated.multiply(motion.drag, weight)) : Animated.multiply(progress, width) }] } };
    },
  };
}

export function TabSwipeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [drag] = useState(() => new Animated.Value(0));
  const [source, setSource] = useState<string | null>(null);
  const settling = useRef(false);
  const blocks = useRef(new Set<string>());
  const block = useCallback((id: string, blocked: boolean) => {
    if (blocked) blocks.current.add(id); else blocks.current.delete(id);
  }, []);
  useEffect(() => {
    if (!source || source === pathname) return;
    const timer = setTimeout(() => { drag.setValue(0); setSource(null); settling.current = false; }, reduced ? 0 : 420);
    return () => clearTimeout(timer);
  }, [pathname, source, drag, reduced]);
  const reset = useCallback(() => {
    Animated.spring(drag, { toValue: 0, stiffness: 260, damping: 28, mass: 0.8, useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (finished) { setSource(null); settling.current = false; }
    });
  }, [drag]);
  const shouldCapture = useCallback((_: GestureResponderEvent, gesture: PanResponderGestureState) => !settling.current && blocks.current.size === 0
      && customerTabs.some(tab => tab === pathname)
      && Boolean(customerTabs[customerTabs.findIndex(tab => tab === pathname) + (gesture.dx < 0 ? 1 : -1)])
      && gesture.numberActiveTouches === 1
      && Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2, [pathname]);
  const release = useCallback((_: GestureResponderEvent, gesture: PanResponderGestureState) => {
      const next = swipeTab(pathname, gesture.dx, gesture.dy);
      if (next && blocks.current.size === 0) { settling.current = true; router.navigate(next); }
      else reset();
    }, [pathname, reset]);
  // PanResponder stores these handlers; the blocker ref is read only during a gesture.
  // eslint-disable-next-line react-hooks/refs
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => {
      for (const id of blocks.current) if (id.startsWith('gesture:')) blocks.current.delete(id);
      return false;
    },
    onMoveShouldSetPanResponderCapture: shouldCapture,
    onPanResponderGrant: () => { drag.stopAnimation(); drag.setValue(0); setSource(pathname); },
    onPanResponderMove: (_, gesture) => {
      if (!reduced) drag.setValue(Math.max(-width * 0.65, Math.min(width * 0.65, gesture.dx)));
    },
    onPanResponderRelease: release,
    onPanResponderTerminate: reset,
    onPanResponderTerminationRequest: () => false,
  }), [shouldCapture, release, drag, pathname, reduced, reset, width]);
  return <SwipeContext.Provider value={block}><MotionContext.Provider value={{ drag, source, reduced }}><View style={{ flex: 1, overflow: 'hidden' }} {...responder.panHandlers}>{children}</View></MotionContext.Provider></SwipeContext.Provider>;
}

/** Keep gallery, chip-row and modal gestures local to the open control. */
export function useTabSwipeBlocker(blocked: boolean) {
  const block = useContext(SwipeContext);
  const id = useId();
  useEffect(() => {
    block?.(id, blocked);
    return () => block?.(id, false);
  }, [block, blocked, id]);
}

export function GestureBoundary({ children }: { children: ReactNode }) {
  const block = useContext(SwipeContext);
  const { width } = useWindowDimensions();
  const id = `gesture:${useId()}`;
  useEffect(() => () => block?.(id, false), [block, id]);
  const end = () => { queueMicrotask(() => block?.(id, false)); };
  return <View onStartShouldSetResponderCapture={event => {
    const x = event.nativeEvent.pageX;
    block?.(id, x > 28 && x < width - 28);
    return false;
  }} onTouchEnd={event => { if (event.nativeEvent.touches.length === 0) end(); }} onTouchCancel={end} onPointerUp={end} onPointerCancel={end}>{children}</View>;
}
