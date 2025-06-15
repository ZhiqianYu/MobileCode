// src/screens/MainScreen.tsx - 带Modal设置弹窗版本
import React, { useEffect, useState } from 'react';
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
import { useSSH } from '../hooks/useSSH';
import TopBar from '../components/Layout/TopBar';
import MainContent from '../components/Layout/MainContent';
import { SSHConnection } from '../types/ssh';

const MainScreen: React.FC = () => {
  const { 
    state, 
    setCurrentView, 
    toggleSidebar, 
  } = useAppState();
  
  const { 
    currentConnection, 
    isConnected, 
    isConnecting, 
    ping, 
    error,
    connect,
    disconnect
  } = useSSH();

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // 监听连接错误
  useEffect(() => {
    if (error && !isConnecting) {
      console.warn('SSH Connection Error:', error);
    }
  }, [error, isConnecting]);

  const handleMenuPress = () => {
    toggleSidebar();
    console.log('Menu pressed, sidebar:', !state.sidebarVisible);
    Alert.alert(
      '连接管理', 
      '功能开发中...\n\n将来这里会显示:\n• 保存的连接列表\n• 快速切换连接\n• 连接历史记录',
      [{ text: '知道了' }]
    );
  };

  const handleSettingsPress = () => {
    setShowSettingsModal(true);
  };

  // 添加关闭modal的函数
  const handleCloseSettings = () => {
    setShowSettingsModal(false);
  };

  const handleConnectionAction = (action: string) => {
    setShowSettingsModal(false); // 先关闭modal
    
    switch(action) {
      case 'test':
        testConnect();
        break;
      case 'reconnect':
        reconnect();
        break;
      case 'disconnect':
        handleDisconnect();
        break;
      case 'add':
        showAddConnectionDialog();
        break;
    }
  };

  const showAddConnectionDialog = () => {
    Alert.alert(
      '添加新连接', 
      '连接管理功能开发中...\n\n将来这里会有:\n• SSH连接配置表单\n• 密钥文件管理\n• 连接测试功能\n• 连接信息保存',
      [{ text: '期待中...' }]
    );
  };

  const testConnect = async () => {
    if (isConnecting) {
      Alert.alert('提示', '正在连接中，请稍候...');
      return;
    }

    const testConnection: SSHConnection = {
      id: `test-${Date.now()}`,
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
          `已连接到 ${testConnection.username}@${testConnection.host}\n\n现在可以:\n• 切换到终端标签\n• 输入命令测试\n• 使用快捷命令按钮`,
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
        Alert.alert(
          '连接失败', 
          '无法连接到测试服务器\n\n可能的原因:\n• 网络连接问题\n• 服务器地址错误\n• 认证信息错误',
          [{ text: '重试', onPress: () => testConnect() }, { text: '取消' }]
        );
      }
    } catch (error) {
      Alert.alert('连接错误', error instanceof Error ? error.message : '未知错误');
    }
  };

  const reconnect = async () => {
    if (!currentConnection) {
      Alert.alert('提示', '没有可重连的连接，请先建立新连接');
      return;
    }

    if (isConnecting) {
      Alert.alert('提示', '正在连接中，请稍候...');
      return;
    }

    try {
      if (isConnected) {
        await disconnect();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const success = await connect(currentConnection);
      if (success) {
        Alert.alert('重连成功', '已重新连接到服务器');
        setCurrentView('terminal');
      } else {
        Alert.alert('重连失败', '无法重新连接到服务器');
      }
    } catch (error) {
      Alert.alert('重连错误', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleDisconnect = async () => {
    if (!isConnected && !isConnecting) {
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

  // TopBar快捷按钮处理 - 普通切换，不隐藏底部栏
  const handleQuickViewChange = (view: typeof state.currentView) => {
    setCurrentView(view);
  };

  const getDisplayUser = (): string => {
    return currentConnection?.username || 'user';
  };

  const getDisplayHost = (): string => {
    if (isConnecting) {
      return '连接中...';
    }
    return currentConnection?.host || '未连接';
  };

  const getDisplayPing = (): number => {
    return isConnected ? (ping || 0) : 0;
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

      {/* 设置Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseSettings}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseSettings}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>MobileCode 设置</Text>
                
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => handleConnectionAction('test')}
                >
                  <Text style={styles.modalButtonText}>连接测试服务器</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, !isConnected && styles.modalButtonDisabled]}
                  onPress={() => handleConnectionAction('reconnect')}
                >
                  <Text style={[styles.modalButtonText, !isConnected && styles.modalButtonTextDisabled]}>
                    重新连接
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonDestructive]}
                  onPress={() => handleConnectionAction('disconnect')}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextDestructive]}>
                    断开连接
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => handleConnectionAction('add')}
                >
                  <Text style={styles.modalButtonText}>添加新连接</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={handleCloseSettings}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>
                    取消
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  // Modal 样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: '#444',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#3d3d3d',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#555',
  },
  modalButtonDisabled: {
    backgroundColor: '#2a2a2a',
    borderColor: '#333',
  },
  modalButtonDestructive: {
    backgroundColor: '#4d2d2d',
    borderColor: '#666',
  },
  modalButtonCancel: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalButtonTextDisabled: {
    color: '#666',
  },
  modalButtonTextDestructive: {
    color: '#ff6b6b',
  },
  modalButtonTextCancel: {
    color: '#999',
  },
});

export default MainScreen;