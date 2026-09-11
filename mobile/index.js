// ========================================================================
// CRITICAL: This file MUST be the entry point for the app.
// TaskManager.defineTask() calls MUST execute at the top level of the
// entry file BEFORE registerRootComponent() is called.
// When Android restarts the app headlessly for a geofence/location event,
// it runs ONLY this entry file — if tasks aren't defined here, the
// background service silently fails and auto-punch doesn't work.
// ========================================================================

// 1. Register all background tasks & shift alarm managers FIRST (before React loads)
import './src/utils/shiftAlarmManager';
import './src/utils/geofence';

// 2. Now register the React root component with RootErrorBoundary
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('RootErrorBoundary caught crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 42, marginBottom: 12 }}>🛡️</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8, textAlign: 'center' }}>
            Keltron MPP EMS
          </Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, textAlign: 'center' }}>
            {this.state.error?.message || 'A startup issue was detected and safely intercepted.'}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#0284c7', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>🔄 Restart Application</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function Root() {
  return (
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}

registerRootComponent(Root);
