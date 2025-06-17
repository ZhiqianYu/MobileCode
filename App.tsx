// App.tsx - 修改后的版本
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConnectionProvider } from './src/contexts/ConnectionContext';
import { SSHProvider } from './src/contexts/SSHContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { FolderProvider } from './src/contexts/FolderContext'; // 新增
import MainContainer from './src/components/Layout/MainContainer';

// 主应用组件
export default function App() {
  console.log('App starting with new MainContainer...');
  
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ConnectionProvider>
          <SSHProvider>
            <FolderProvider>
              <MainContainer />
            </FolderProvider>
          </SSHProvider>
        </ConnectionProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}