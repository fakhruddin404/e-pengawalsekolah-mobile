import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { palette, radii, shadows, spacing } from '../theme/ui';

type SelectModalDropdownProps<T extends string> = {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  disabled?: boolean;
  title: string;
  accessibilityLabel: string;
  inputBackgroundColor?: string;
  activeBackgroundColor?: string;
  activeBorderColor?: string;
  activeTextColor?: string;
};

export function SelectModalDropdown<T extends string>({
  value,
  options,
  onChange,
  disabled,
  title,
  accessibilityLabel,
  inputBackgroundColor = '#F8FAFC',
  activeBackgroundColor = '#FFF7ED',
  activeBorderColor = '#FED7AA',
  activeTextColor = '#9A3412',
}: SelectModalDropdownProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={disabled ? 'opacity-70' : 'opacity-100'}
        style={{
          height: 52,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          backgroundColor: inputBackgroundColor,
          borderWidth: 1,
          borderColor: palette.border,
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <AppText variant="body" style={{ color: palette.text }}>
          {value}
        </AppText>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1"
          style={{ backgroundColor: 'rgba(15,23,42,0.35)', padding: spacing.lg, justifyContent: 'center' }}
        >
          <Pressable
            onPress={() => {}}
            className="bg-white"
            style={{
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: '#F3F4F6',
              padding: spacing.lg,
              ...shadows.card,
            }}
          >
            <AppText variant="h3" style={{ color: palette.primary }}>
              {title}
            </AppText>
            <View style={{ height: spacing.sm }} />

            {options.map((opt) => {
              const active = opt === value;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: radii.md,
                    backgroundColor: active ? activeBackgroundColor : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? activeBorderColor : 'transparent',
                    marginTop: 8,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Pilih ${opt}`}
                >
                  <AppText
                    variant="body"
                    style={{
                      fontWeight: active ? '800' : '600',
                      color: active ? activeTextColor : palette.text,
                    }}
                  >
                    {opt}
                  </AppText>
                </Pressable>
              );
            })}

            <View style={{ height: spacing.md }} />
            <Pressable
              onPress={() => setOpen(false)}
              className="items-center justify-center"
              style={{ height: 48, borderRadius: radii.pill, backgroundColor: '#E2E8F0' }}
              accessibilityRole="button"
              accessibilityLabel="Tutup"
            >
              <AppText variant="bodySm" style={{ fontWeight: '700', color: palette.text }}>
                Tutup
              </AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
