// App.tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SSHProvider } from './src/contexts/SSHContext';
import MainScreen from './src/screens/MainScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <SSHProvider>
        <MainScreen />
      </SSHProvider>
    </SafeAreaProvider>
  );
}