import { Component } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable style={styles.retryBtn} onPress={this.handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  icon: { fontSize: 48, marginBottom: spacing.lg },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: 'white', fontWeight: '600', fontSize: 15 },
});
