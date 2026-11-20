import { MaskedView } from '@expo/ui/community/masked-view';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { HomeCardGlassProps } from './home-card-glass';

export function HomeCardGlass({ image }: HomeCardGlassProps) {
  const [height, setHeight] = useState(330);
  const start = Math.max(0, Math.min(48, 100 - 220 / height * 100));
  const end = start + (100 - start) * 0.2;

  // Blur a matching full-size photo, then fade it in through a native alpha mask.
  // A cropped live BlurView starts abruptly on iOS and cannot use the CSS mask.
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={event => setHeight(Math.max(1, event.nativeEvent.layout.height))}>
    <MaskedView style={StyleSheet.absoluteFill} maskElement={<View style={[StyleSheet.absoluteFill, { backgroundImage: `linear-gradient(to bottom, transparent ${start}%, black ${end}%)` }]} />}>
      <Image source={image} contentFit="cover" blurRadius={18} style={StyleSheet.absoluteFill} />
    </MaskedView>
    <View style={[StyleSheet.absoluteFill, { backgroundImage: `linear-gradient(to bottom, rgba(18,60,69,0) ${start}%, rgba(18,60,69,0.34) ${start + (100 - start) * 0.35}%, rgba(6,20,24,0.72))` }]} />
  </View>;
}
