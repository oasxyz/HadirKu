import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard, Illustration, PrimaryButton } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { Logger } from '@/utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.error('UI', 'ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <GlassCard style={styles.card}>
          <Illustration icon="refresh-circle-outline" />
          <Text style={styles.title}>
            {this.props.fallbackTitle ?? 'Komponen Gagal Dimuat'}
          </Text>
          <Text style={styles.subtitle}>
            Terjadi kendala saat memuat tampilan ini. Tekan tombol di bawah untuk memuat ulang.
          </Text>
          <View style={styles.buttonWrap}>
            <PrimaryButton
              label="Muat Ulang Layar"
              icon="refresh"
              onPress={this.handleReset}
            />
          </View>
        </GlassCard>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  title: {
    color: Palette.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  buttonWrap: {
    marginTop: 8,
    width: '100%',
  },
});