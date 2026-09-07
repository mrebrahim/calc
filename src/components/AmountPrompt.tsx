import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './ui';
import { parseAmount, toMajor } from '../lib/money';
import { t } from '../i18n/ar';
import { colors, radius, spacing } from '../theme';

/**
 * `Alert.prompt` is iOS-only, and Android is the primary platform here — so
 * amount entry gets a real cross-platform sheet.
 */
export function AmountPrompt({
  visible,
  title,
  initial,
  currency,
  onCancel,
  onSubmit,
  onClear,
}: {
  visible: boolean;
  title: string;
  /** Minor units, or null for an empty field. */
  initial: number | null;
  currency: string;
  onCancel: () => void;
  onSubmit: (minor: number) => void;
  onClear?: () => void;
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (visible) setValue(initial ? String(toMajor(initial)) : '');
  }, [visible, initial]);

  const amount = parseAmount(value);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.inputRow}>
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoFocus
            />
            <Text style={styles.currency}>{currency}</Text>
          </View>

          <Button label={t.save} onPress={() => onSubmit(amount)} disabled={amount <= 0} />

          {onClear ? (
            <Pressable onPress={onClear} style={styles.clear}>
              <Text style={styles.clearText}>{t.noLimit}</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={onCancel} style={styles.clear}>
            <Text style={styles.cancelText}>{t.cancel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 20, 28, 0.45)',
    justifyContent: 'center',
    padding: spacing(6),
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing(5),
    gap: spacing(3),
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'right' },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing(2),
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: spacing(2),
  },
  input: {
    flex: 1,
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  currency: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  clear: { alignSelf: 'center', padding: spacing(2) },
  clearText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  cancelText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
});
