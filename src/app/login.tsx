import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>SRS001 — Login (PIC A)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: Palette.background,
    flex: 1,
    justifyContent: 'center',
  },
  text: {
    color: Palette.textSecondary,
    fontSize: 14,
  },
});
