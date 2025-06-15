// src/components/Settings/Settings.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSSHContext } from '../../contexts/SSHContext';
import { SSHConnection } from '../../types/ssh';
import AddConnectionModal from './AddConnectionModal';

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
  onViewChange: (view: 'terminal' | 'file' | 'editor' | 'forward') => void;
}

const Settings: React.FC<SettingsProps> = ({
  visible,
  onClose,
  onViewChange,
}) => {
  const {
    currentConnection,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  } = useSSHContext();

  const [showAddConnection, setShowAddConnection] = useState(false);

  const handleConnectionAction = (action: string) => {
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
        setShowAddConnection(true);
        break;
    }
  };

  const testConnect = async () => {
    if (isConnecting) {
      Alert.alert('提示', '正在连接中，请稍候...');
      return;
    }

    const testConnection: SSHConnection = {
        id: `test-${Date.now()}`,
        name: '我的电脑',
        host: '100.69.24.29',          // 你的Tailscale IP
        port: 22,
        username: 'zhiqian',     // 替换为你的Ubuntu用户名
        password: '1234qazx',     // 替换为你的Ubuntu密码
        isConnected: false,
        lastUsed: new Date(),
        createdAt: new Date(),
    };

    try {
      const success = await connect(testConnection);
      if (success) {
        onClose(); // 关闭设置
        Alert.alert(
          '连接成功! 🎉',
          `已连接到 ${testConnection.username}@${testConnection.host}`,
          [
            {
              text: '去终端',
              onPress: () => onViewChange('terminal'),
            },
            { text: '好的' },
          ]
        );
      } else {
        Alert.alert(
          '连接失败',
          '无法连接到测试服务器\n\n可能的原因:\n• 网络连接问题\n• 服务器地址错误\n• 认证信息错误',
          [
            { text: '重试', onPress: () => testConnect() },
            { text: '取消' }
          ]
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
        onClose(); // 关闭设置
        Alert.alert('重连成功', '已重新连接到服务器');
        onViewChange('terminal');
      } else {
        Alert.alert('重连失败', '无法重新连接到服务器');
      }
    } catch (error) {
      Alert.alert('重连错误', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleDisconnect = async () => {
    console.log('handleDisconnect called'); // 添加调试
    if (!isConnected && !isConnecting) {
      Alert.alert('提示', '当前没有活动连接');
      return;
    }

    try {
        console.log('Calling disconnect...'); // 添加调试
      await disconnect();
      console.log('Disconnect completed'); // 添加调试
      Alert.alert('已断开', '连接已成功断开');
    } catch (error) {
        console.error('Disconnect error:', error); // 添加调试
      Alert.alert('错误', '断开连接时出错');
    }
  };

  const handleConnectionCreated = async (connection: SSHConnection) => {
    setShowAddConnection(false); // 关闭添加连接Modal
    
    // 询问是否立即连接
    Alert.alert(
      '连接创建成功',
      `连接信息：\n主机：${connection.host}:${connection.port}\n用户：${connection.username}\n\n是否立即连接？`,
      [
        { text: '稍后连接' },
        {
          text: '立即连接',
          onPress: async () => {
            try {
              const success = await connect(connection);
              if (success) {
                onClose(); // 关闭设置
                Alert.alert('连接成功！', '已连接到服务器', [
                  {
                    text: '去终端',
                    onPress: () => onViewChange('terminal'),
                  },
                ]);
              }
            } catch (error) {
              Alert.alert('连接失败', error instanceof Error ? error.message : '未知错误');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      {/* 主设置Modal */}
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>MobileCode 设置</Text>
                <Text style={styles.modalSubtitle}>连接管理</Text>
                
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
                  onPress={onClose}
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

      {/* 添加连接Modal */}
      <AddConnectionModal
        visible={showAddConnection}
        onClose={() => setShowAddConnection(false)}
        onConnectionCreated={handleConnectionCreated}
      />
    </>
  );
};

const styles = StyleSheet.create({
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

export default Settings;