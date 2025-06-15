// src/screens/MainScreen.tsx - 完整实现版本
import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  Text,
} from 'react-native';
import { useAppState } from '../hooks/useAppState';
import { useSSH } from '../hooks/useSSH';
import TopBar from '../components/Layout/TopBar';
import MainContent from '../components/Layout/MainContent';
import BottomTabs from '../components/Layout/BottomTabs';
import { SSHConnection } from '../types/ssh';

const MainScreen: React.FC = () => {
  const { state, setCurrentView, toggleSidebar } = useAppState();
  const { 
    currentConnection, 
    isConnected, 
    isConnecting, 
    ping, 
    error,
    connect,
    disconnect
  } = useSSH();

  const handleMenuPress = () => {
    toggleSidebar();
    console.log('Menu pressed, sidebar:', !state.sidebarVisible);
    // TODO: 显示连接列表侧边栏
    Alert.alert('菜单', '连接列表功能开发中...');
  };

  const handleSettingsPress = () => {
    showTestConnectionDialog();
  };

  const showTestConnectionDialog = () => {
    Alert.alert(
      'MobileCode 设置',
      '选择操作',
      [
        {
          text: '连接测试服务器',
          onPress: () => testConnect(),
        },
        {
          text: '断开连接',
          onPress: () => handleDisconnect(),
          style: 'destructive',
        },
        {
          text: '添加新连接',
          onPress: () => showAddConnectionDialog(),
        },
        {
          text: '取消',
          style: 'cancel',
        },
      ]
    );
  };

  const showAddConnectionDialog = () => {
    Alert.alert('添加连接', '连接管理功能开发中...\n\n将来这里会有完整的连接配置界面');
  };

  const testConnect = async () => {
    const testConnection: SSHConnection = {
      id: 'test-1',
      name: '测试服务器',
      host: '192.168.1.100',
      port: 22,
      username: 'developer',
      password: 'password123',
      isConnected: false,
      lastUsed: new Date(),
      createdAt: new Date(),
    };

    try {
      const success = await connect(testConnection);
      if (success) {
        Alert.alert(
          '连接成功! 🎉', 
          '已连接到测试服务器\n\n现在可以:\n• 切换到终端标签\n• 输入命令测试\n• 使用快捷命令',
          [
            {
              text: '去终端',
              onPress: () => setCurrentView('terminal'),
            },
            {
              text: '好的',
              style: 'default',
            }
          ]
        );
      } else {
        Alert.alert('连接失败', '无法连接到服务器，请检查网络连接');
      }
    } catch (error) {
      Alert.alert('错误', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleDisconnect = async () => {
    if (!isConnected) {
      Alert.alert('提示', '当前没有活动连接');
      return;
    }

    try {
      await disconnect();
      Alert.alert('已断开', '连接已成功断开');
    } catch (error) {
      Alert.alert('错误', '断开连接时出错');
    }
  };

  const handleQuickViewChange = (view: typeof state.currentView) => {
    setCurrentView(view);
  };

  const handleViewChange = (view: typeof state.currentView) => {
    setCurrentView(view);
  };

  const getDisplayUser = (): string => {
    return currentConnection?.username || 'user';
  };

  const getDisplayHost = (): string => {
    return currentConnection?.host || '未连接';
  };

  const getDisplayPing = (): number => {
    return ping || 0;
  };

  const getConnectionStatus = (): boolean => {
    return isConnected;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TopBar
          user={getDisplayUser()}
          host={getDisplayHost()}
          ping={getDisplayPing()}
          isConnected={getConnectionStatus()}
          onMenuPress={handleMenuPress}
          onSettingsPress={handleSettingsPress}
          onQuickViewChange={handleQuickViewChange}
        />

        <MainContent currentView={state.currentView} />

        <BottomTabs
          currentView={state.currentView}
          onViewChange={handleViewChange}
        />
      </View>

      {isConnecting && (
        <View style={styles.overlay}>
          <View style={styles.connectingIndicator}>
            <Text style={styles.connectingText}>正在连接...</Text>
            <Text style={styles.connectingSubText}>请稍候</Text>
          </View>
        </View>
      )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingIndicator: {
    backgroundColor: '#2d2d2d',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectingText: {
    color: '#ffa500',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectingSubText: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
});

export default MainScreen;