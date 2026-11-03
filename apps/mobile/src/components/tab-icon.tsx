import Svg, { Circle, Path } from 'react-native-svg';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { NyMark } from '@/components/ny-mark';

type TabName = 'home' | 'shop' | 'atelier' | 'orders' | 'account';

type TabIconProps = {
  name: TabName;
  focused: boolean;
  color: ColorValue;
  size: number;
};

export function TabIcon({ name, focused, color, size }: TabIconProps) {
  const line = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <View style={[styles.iconFrame, focused && styles.iconFrameActive]}>
      {name === 'atelier' ? (
        <NyMark color={color} size={size} />
      ) : (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {name === 'home' ? (
            <>
              <Path d="M3.4 10.4 12 3.7l8.6 6.7v8.1c0 1.1-.9 2-2 2H5.4c-1.1 0-2-.9-2-2v-8.1Z" fill={focused ? color : 'none'} {...(focused ? {} : line)} />
              <Path d="M9.2 20.5v-6h5.6v6" fill={focused ? '#FFFFFF' : 'none'} {...(focused ? {} : line)} />
            </>
          ) : null}

          {name === 'shop' ? (
            <>
              <Path d="M5.7 8.5h12.6l.9 10.4c.1 1-.7 1.9-1.7 1.9h-11c-1 0-1.8-.9-1.7-1.9l.9-10.4Z" fill={focused ? color : 'none'} {...(focused ? {} : line)} />
              <Path d="M9 9V7.2a3 3 0 0 1 6 0V9" stroke={focused ? '#FFFFFF' : color} strokeWidth="1.8" strokeLinecap="round" />
            </>
          ) : null}

          {name === 'orders' ? (
            <>
              <Path d="M6 3.2h12c.7 0 1.2.5 1.2 1.2v15.9l-2.4-1.4-2.4 1.4-2.4-1.4-2.4 1.4-2.4-1.4-2.4 1.4V4.4c0-.7.5-1.2 1.2-1.2Z" fill={focused ? color : 'none'} {...(focused ? {} : line)} />
              <Path d="M8.3 8.1h7.4M8.3 12h7.4M8.3 15.8h4.7" stroke={focused ? '#FFFFFF' : color} strokeWidth="1.6" strokeLinecap="round" />
            </>
          ) : null}

          {name === 'account' ? (
            <>
              <Circle cx="12" cy="7.7" r="3.2" fill={focused ? color : 'none'} {...(focused ? {} : line)} />
              <Path d="M5 20v-1.2c0-3.1 3.1-5.5 7-5.5s7 2.4 7 5.5V20H5Z" fill={focused ? color : 'none'} {...(focused ? {} : line)} />
            </>
          ) : null}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconFrame: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  iconFrameActive: { backgroundColor: 'rgba(18,60,69,0.12)' },
});
