import { StyleSheet, Text, View } from 'react-native';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
});
