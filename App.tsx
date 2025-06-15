// App.tsx
// 功能：应用根组件，简化导航，主要显示MainScreen，由MainScreen管理抽屉
// 依赖：SafeAreaProvider, SSH上下文, 连接管理上下文
// 渲染：MainScreen（包含抽屉功能）

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConnectionProvider } from './src/contexts/ConnectionContext';
import { SSHProvider } from './src/contexts/SSHContext';
import MainScreen from './src/screens/MainScreen';

// 主应用组件
export default function App() {
  console.log('App starting...');
  
  return (
    <SafeAreaProvider>
      <ConnectionProvider>
        <SSHProvider>
          <MainScreen />
        </SSHProvider>
      </ConnectionProvider>
    </SafeAreaProvider>
  );
}