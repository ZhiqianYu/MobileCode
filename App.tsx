// App.tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConnectionProvider } from './src/contexts/ConnectionContext';
import { SSHProvider } from './src/contexts/SSHContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { FolderProvider } from './src/contexts/FolderContext';
import MainContainer from './src/components/Layout/MainContainer';
import { CrossModuleProvider } from './src/contexts/CrossModuleContext';

// 主应用组件
export default function App() {
  console.log('App starting with new MainContainer...');
  
  return (
    <SafeAreaProvider>
      <CrossModuleProvider>
        <SettingsProvider>
          <ConnectionProvider>
            <SSHProvider>
              <FolderProvider>
                <MainContainer />
              </FolderProvider>
            </SSHProvider>
          </ConnectionProvider>
        </SettingsProvider>
      </CrossModuleProvider>
    </SafeAreaProvider>
  );
}