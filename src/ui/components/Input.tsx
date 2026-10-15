import { useId, useState, type Ref } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { withAlpha } from '../color';
import { colors, radii, spacing, typography } from '../theme';
import { AppText } from './AppText';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string;
  /** Sağ altta "12/200" sayacı; maxLength ile birlikte kullan. */
  showCount?: boolean;
  ref?: Ref<TextInput>;
  style?: StyleProp<ViewStyle>;
};

export function Input({
  label,
  error,
  showCount = false,
  ref,
  style,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const ring = error ? colors.danger : focused ? colors.gold : null;

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <AppText variant="label" tone="secondary" nativeID={id}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        accessibilityLabelledBy={label ? id : undefined}
        aria-label={label}
        editable={editable}
        placeholderTextColor={colors.textDisabled}
        selectionColor={colors.gold}
        cursorColor={colors.goldDeep}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          // macOS odak halkası: kenar + dışa yumuşak halka.
          ring && { borderColor: ring, boxShadow: `0 0 0 3px ${withAlpha(ring, 0.25)}` },
          !editable && styles.disabled,
        ]}
        {...rest}
      />
      {error || (showCount && rest.maxLength) ? (
        <View style={styles.footer}>
          <AppText variant="caption" style={styles.error} accessibilityLiveRegion="polite">
            {error ?? ''}
          </AppText>
          {showCount && rest.maxLength ? (
            <AppText variant="caption" tone="disabled">
              {(rest.value ?? '').length}/{rest.maxLength}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2, alignSelf: 'stretch' },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.input,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    // Web'de tarayıcının varsayılan odak çerçevesini kaldır; odak halkası yukarıda çiziliyor.
    outlineWidth: 0,
  },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
});
