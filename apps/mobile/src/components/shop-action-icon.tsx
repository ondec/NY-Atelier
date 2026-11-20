import { StyleSheet, Text, View, type ColorValue, type StyleProp, type TextStyle } from 'react-native';
import { NyIcon } from '@/components/ny-icon';
const icons = { heart: 'heart', bag: 'bag', filter: 'filter', back: 'chevron-left', forward: 'chevron-right', 'arrow-up-right': 'arrow-up-right', 'arrow-right': 'arrow-right', close: 'close', plus: 'plus', minus: 'minus' } as const;
export function ShopActionIcon({ name, color, size = 20 }: { name: keyof typeof icons; color: ColorValue; filled?: boolean; size?: number }) {
  return <NyIcon name={icons[name]} color={color} size={size} />;
}
export function IconLabel({ label, name, color, style }: { label: string; name: 'arrow-up-right' | 'arrow-right' | 'back' | 'forward'; color: ColorValue; style?: StyleProp<TextStyle> }) {
  const icon = <ShopActionIcon name={name} color={color} size={13} />;
  return <View style={styles.label}>{name === 'back' ? icon : null}<Text style={[style, styles.labelText]}>{label}</Text>{name !== 'back' ? icon : null}</View>;
}
const styles = StyleSheet.create({ label: { flexDirection: 'row', alignItems: 'center', gap: 5 }, labelText: { flexShrink: 1 } });
