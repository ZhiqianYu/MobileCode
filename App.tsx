// App.tsx
// 功能：应用根组件，使用新的MainContainer布局框架
// 依赖：SafeAreaProvider, MainContainer
// 渲染：MainContainer（新的4组件布局）

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConnectionProvider } from './src/contexts/ConnectionContext';
import { SSHProvider } from './src/contexts/SSHContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import MainContainer from './src/components/Layout/MainContainer';

// 主应用组件
export default function App() {
  console.log('App starting with new MainContainer...');
  
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ConnectionProvider>
          <SSHProvider>
            <MainContainer />
          </SSHProvider>
        </ConnectionProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}