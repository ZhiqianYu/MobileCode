// src/screens/MainScreen.tsx
// 功能：应用主界面，管理抽屉式连接管理和设置
// 依赖：SSHContext, TopBar, MainContent, DrawerConnectionManager, DrawerSettings
// 被使用：App.tsx

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useSSHContext } from '../contexts/SSHContext';
import { ViewMode } from '../types/ui';
import TopBar from '../components/Layout/TopBar';
import MainContent from '../components/Layout/MainContent';
import DrawerConnectionManager from '../components/Drawer/DrawerConnectionManager';
import DrawerSettings from '../components/Drawer/DrawerSettings';

const MainScreen: React.FC = () => {
  const { 
    currentConnection, 
    isConnected, 
    isConnecting, 
    ping, 
    error,
  } = useSSHContext();

  // 当前选择的功能视图
  const [currentView, setCurrentView] = useState<ViewMode>('terminal');
  
  // 抽屉状态
  const [connectionDrawerVisible, setConnectionDrawerVisible] = useState(false);
  const [settingsDrawerVisible, setSettingsDrawerVisible] = useState(false);
  
  // 终端引用，用于将来的功能扩展
  const terminalRef = useRef<any>(null);

  // 监听连接错误
  useEffect(() => {
    if (error && !isConnecting) {
      console.warn('SSH Connection Error:', error);
    }
  }, [error, isConnecting]);

  // 处理菜单按钮 - 打开连接抽屉
  const handleMenuPress = useCallback(() => {
    setConnectionDrawerVisible(true);
  }, []);

  // 处理设置按钮 - 打开设置抽屉
  const handleSettingsPress = useCallback(() => {
    setSettingsDrawerVisible(true);
  }, []);

  // 处理快速视图切换
  const handleQuickViewChange = useCallback((view: ViewMode) => {
    setCurrentView(view);
  }, []);

  // 连接成功后的回调 - 关闭连接抽屉
  const handleConnectionSuccess = useCallback(() => {
    setConnectionDrawerVisible(false);
  }, []);

  // 获取显示信息
  const getDisplayUser = (): string => {
    return (isConnected && currentConnection?.username) || 'user';
  };

  const getDisplayHost = (): string => {
    console.log('getDisplayHost check:', { 
      isConnecting, 
      isConnected,
      currentConnection: currentConnection?.host || 'null',
      connectionId: currentConnection?.id || 'no-id'
    });
    
    if (isConnecting) {
      return '连接中...';
    }
    
    return (isConnected && currentConnection?.host) || '未连接';
  };

  const getDisplayPing = (): number => {
    console.log('Ping check:', { isConnected, ping });
    return (isConnected && ping) ? ping : 0;
  };

  const getConnectionStatus = (): boolean => {
    return isConnected && !isConnecting;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1a1a1a" barStyle="light-content" hidden={true} />
      
      <View style={styles.content}>
        {/* TopBar 层 - 包含所有快捷功能按钮 */}
        <TopBar
          user={getDisplayUser()}
          host={getDisplayHost()}
          ping={getDisplayPing()}
          isConnected={getConnectionStatus()}
          onMenuPress={handleMenuPress}
          onSettingsPress={handleSettingsPress}
          onQuickViewChange={handleQuickViewChange}
        />

        {/* 主要内容层 - 根据当前视图显示不同功能 */}
        <MainContent 
          currentView={currentView} 
          terminalRef={terminalRef}
          isConnected={isConnected}
          isConnecting={isConnecting}
          currentConnection={currentConnection}
        />
      </View>

      {/* 连接状态覆盖层 */}
      {isConnecting && (
        <View style={styles.overlay}>
          <View style={styles.connectingIndicator}>
            <Text style={styles.connectingText}>正在连接...</Text>
            <Text style={styles.connectingSubText}>
              {currentConnection?.host || '服务器'}
            </Text>
            <View style={styles.loadingDots}>
              <Text style={styles.dot}>●</Text>
              <Text style={styles.dot}>●</Text>
              <Text style={styles.dot}>●</Text>
            </View>
          </View>
        </View>
      )}

      {/* 抽屉式连接管理 */}
      <DrawerConnectionManager
        visible={connectionDrawerVisible}
        onClose={() => setConnectionDrawerVisible(false)}
        onConnectionSuccess={handleConnectionSuccess}
      />

      {/* 抽屉式设置 */}
      <DrawerSettings
        visible={settingsDrawerVisible}
        onClose={() => setSettingsDrawerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingIndicator: {
    backgroundColor: '#2d2d2d',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  connectingText: {
    color: '#ffa500',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  connectingSubText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 16,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    color: '#4CAF50',
    fontSize: 20,
    marginHorizontal: 2,
  },
});

export default MainScreen;