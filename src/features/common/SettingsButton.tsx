import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { t } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { Button, Card, colors, spacing, Toggle } from '@/ui';

/** Üst çubuktaki dişli: ses ve hareket ayarları. */
export function SettingsButton({ light = false }: { light?: boolean }) {
  const ink = light ? colors.onScene : colors.textSecondary;
  const [open, setOpen] = useState(false);
  const { sound, reduceMotion, setSound, setReduceMotion } = useSettingsStore();
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('common.settings')}
        hitSlop={8}
        style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" aria-hidden>
          <Path
            d="M12 2.5l1.6 2.3 2.8-.5.7 2.7 2.6 1.2-.9 2.7 1.7 2.2-2.2 1.7.3 2.8-2.8.5-1.2 2.6-2.6-1-2.6 1-1.2-2.6-2.8-.5.3-2.8-2.2-1.7 1.7-2.2-.9-2.7 2.6-1.2.7-2.7 2.8.5z"
            fill="none"
            stroke={ink}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="12" r="3.2" fill="none" stroke={ink} strokeWidth={1.5} />
        </Svg>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel={t('common.close')}
        >
          <Pressable onPress={() => undefined} style={styles.sheet}>
            <Card highlighted title={t('settings.title').toLocaleUpperCase('tr')}>
              <View style={styles.stack}>
                <Toggle
                  label={t('settings.sound')}
                  hint={t('settings.soundHint')}
                  value={sound}
                  onChange={setSound}
                />
                <Toggle
                  label={t('settings.reduceMotion')}
                  hint={t('settings.reduceMotionHint')}
                  value={reduceMotion}
                  onChange={setReduceMotion}
                />
                <Button
                  label={t('common.close')}
                  variant="secondary"
                  fullWidth
                  onPress={() => setOpen(false)}
                />
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  icon: { padding: spacing.xs, borderRadius: 999 },
  pressed: { opacity: 0.6 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 32, 43, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: { width: '100%', maxWidth: 400 },
  stack: { gap: spacing.md },
});
