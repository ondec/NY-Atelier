import Svg, { Path } from 'react-native-svg';
import type { ColorValue } from 'react-native';

type ShopActionIconProps = {
  name: 'heart' | 'bag' | 'filter';
  color: ColorValue;
  filled?: boolean;
  size?: number;
};

export function ShopActionIcon({ name, color, filled = false, size = 20 }: ShopActionIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'heart' ? (
        <Path
          d="M20.2 5.8a4.4 4.4 0 0 0-6.2 0L12 7.7l-2-1.9a4.4 4.4 0 0 0-6.2 6.2L12 20.2l8.2-8.2a4.4 4.4 0 0 0 0-6.2Z"
          fill={filled ? color : 'none'}
          stroke={color}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === 'bag' ? (
        <>
          <Path d="M5.2 8.6h13.6l-.8 10.2c-.1 1-1 1.8-2 1.8H8c-1 0-1.9-.8-2-1.8L5.2 8.6Z" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M9 9V7a3 3 0 0 1 6 0v2" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : null}
      {name === 'filter' ? (
        <>
          <Path d="M3.5 6.5h17M6.5 12h11M9.5 17.5h5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
    </Svg>
  );
}
