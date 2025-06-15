// src/screens/MainScreen.tsx - 带Modal设置弹窗版本
import React, { useEffect, useState } from 'react';
import Settings from '../components/Settings/Settings';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  Text,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useAppState } from '../hooks/useAppState';
import { useSSHContext } from '../contexts/SSHContext';
import TopBar from '../components/Layout/TopBar';
import MainContent from '../components/Layout/MainContent';

const MainScreen: React.FC = () => {
  const { 
    state, 
    setCurrentView, 
    toggleSidebar, 
    toggleSettings,
  } = useAppState();
  
  const { 
    currentConnection, 
    isConnected, 
    isConnecting, 
    ping, 
    error,
    connect,
    disconnect,
  } = useSSHContext();

  // 监听连接错误
  useEffect(() => {
    if (error && !isConnecting) {
      console.warn('SSH Connection Error:', error);
    }
  }, [error, isConnecting]);

  const handleMenuPress = () => {
    toggleSidebar();
    Alert.alert(
      '连接管理', 
      '功能开发中...\n\n将来这里会显示:\n• 保存的连接列表\n• 快速切换连接\n• 连接历史记录',
      [{ text: '知道了' }]
    );
  };

  const handleSettingsPress = () => {
    toggleSettings();
  };

  // TopBar快捷按钮处理 - 普通切换，不隐藏底部栏
  const handleQuickViewChange = (view: typeof state.currentView) => {
    setCurrentView(view);
  };

  const getDisplayUser = (): string => {
    // 只有在连接时才显示用户名
    return (isConnected && currentConnection?.username) || 'user';
  };

  const getDisplayHost = (): string => {
    console.log('getDisplayHost check:', { 
      isConnecting, 
      isConnected, // 添加这个检查
      currentConnection: currentConnection?.host || 'null',
      connectionId: currentConnection?.id || 'no-id'
    });
    
    if (isConnecting) {
      return '连接中...';
    }
    
    // 只有在连接时才显示主机名
    return (isConnected && currentConnection?.host) || '未连接';
  };

  const getDisplayPing = (): number => {
    console.log('Ping check:', { isConnected, ping });
    // 只有在连接时才显示延迟
    return (isConnected && ping) ? ping : 0;
  };

  const getConnectionStatus = (): boolean => {
    return isConnected && !isConnecting;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* TopBar 层 */}
        <TopBar
          user={getDisplayUser()}
          host={getDisplayHost()}
          ping={getDisplayPing()}
          isConnected={getConnectionStatus()}
          onMenuPress={handleMenuPress}
          onSettingsPress={handleSettingsPress}
          onQuickViewChange={handleQuickViewChange}
        />

        {/* 主要内容层 - 占用剩余空间 */}
        <MainContent currentView={state.currentView} />
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

      {/* Settings组件 */}
      <Settings
        visible={state.settingsVisible}
        onClose={toggleSettings}
        onViewChange={setCurrentView}
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