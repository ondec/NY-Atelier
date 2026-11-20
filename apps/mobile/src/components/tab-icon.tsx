import { StyleSheet, View, type ColorValue } from 'react-native';
import { NyMark } from '@/components/ny-mark';
import { NyIcon } from '@/components/ny-icon';
const icons = { home: 'home', shop: 'bag', orders: 'order', account: 'user' } as const;
type TabName = keyof typeof icons | 'atelier';
export function TabIcon({ name, focused, color, size }: { name: TabName; focused: boolean; color: ColorValue; size: number }) {
  return <View style={styles.iconFrame}>{name === 'atelier' ? <NyMark color={color} size={size} /> : <NyIcon name={focused ? `${icons[name]}-filled` : icons[name]} color={color} size={size} />}</View>;
}
const styles = StyleSheet.create({ iconFrame: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' } });
