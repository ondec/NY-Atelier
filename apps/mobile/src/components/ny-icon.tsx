import { SvgXml } from 'react-native-svg';
import type { ColorValue } from 'react-native';
import { ICON_STROKE_WIDTH, iconSvg, type IconName } from '@/data/ny-icons';

export function NyIcon({ name, color, size = 24, strokeWidth = ICON_STROKE_WIDTH, accessibilityLabel }: {
  name: IconName; color: ColorValue; size?: number; strokeWidth?: number; accessibilityLabel?: string;
}) {
  return <SvgXml xml={iconSvg(name, strokeWidth)} color={color} width={size} height={size} accessibilityLabel={accessibilityLabel} />;
}
