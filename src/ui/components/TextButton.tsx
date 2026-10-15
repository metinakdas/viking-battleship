import { useState } from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { colors } from '../theme';
import { AppText } from './AppText';

export type TextButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  /** Önündeki düz metin, ör. "Hesabın yok mu?" */
  prefix?: string;
  /** Koyu sahne üstünde altın tonlu bağlantı. */
  light?: boolean;
};

/** Bağlantı görünümlü metin butonu ("Kayıt ol", "← Geri"). */
export function TextButton({ label, prefix, disabled, light = false, ...rest }: TextButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={prefix ? `${prefix} ${label}` : label}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      hitSlop={8}
      {...rest}
    >
      <AppText variant="label" tone={light ? 'onSceneMuted' : 'muted'} align="center">
        {prefix ? `${prefix} ` : ''}
        <AppText
          variant="label"
          style={{
            color: disabled ? colors.textDisabled : light ? colors.horizonGlow : colors.accent,
            textDecorationLine: hovered ? 'underline' : 'none',
          }}
        >
          {label}
        </AppText>
      </AppText>
    </Pressable>
  );
}
