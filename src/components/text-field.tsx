import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Palette } from '@/constants/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  isPassword?: boolean;
}

export function TextField({
  label,
  error,
  isPassword = false,
  style,
  multiline,
  ...props
}: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          multiline ? styles.inputWrapperMultiline : styles.inputWrapperSingle,
          error ? styles.inputError : null,
        ]}>
        <TextInput
          style={[
            styles.input,
            multiline ? styles.inputMultiline : styles.inputSingle,
            isPassword ? styles.inputWithIcon : null,
            style,
          ]}
          placeholderTextColor={Palette.textMuted}
          secureTextEntry={isPassword && !showPassword}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Palette.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    width: '100%',
  },
  label: {
    color: Palette.textMuted,
    fontSize: 12,
    fontWeight: '500',
    paddingLeft: 4,
  },
  inputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: Palette.border,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapperSingle: {
    borderRadius: 999,
    height: 52,
    paddingHorizontal: 18,
  },
  inputWrapperMultiline: {
    borderRadius: 18,
    minHeight: 110,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: Palette.danger,
  },
  input: {
    color: Palette.text,
    fontSize: 15,
    flex: 1,
    padding: 0,
  },
  inputSingle: {
    height: '100%',
  },
  inputMultiline: {
    minHeight: 86,
  },
  inputWithIcon: {
    paddingRight: 8,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: Palette.danger,
    fontSize: 12,
    paddingLeft: 4,
  },
});