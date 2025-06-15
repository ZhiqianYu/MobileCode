// src/components/Drawer/DrawerConnectionManager.tsx
// 功能：抽屉式SSH连接管理，从左侧滑出的连接管理界面
// 依赖：ConnectionContext, SSHContext, Modal, Animated
// 被使用：MainScreen

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSSHContext } from '../../contexts/SSHContext';
import { useConnections } from '../../contexts/ConnectionContext';
import ConnectionList from '../Connection/ConnectionList';
import AddConnectionForm from '../Connection/AddConnectionForm';

interface DrawerConnectionManagerProps {
  visible: boolean;
  onClose: () => void;
  onConnectionSuccess: () => void; // 连接成功后的回调
}

const DRAWER_WIDTH = Dimensions.get('window').width * 0.85; // 抽屉宽度为屏幕的85%

const DrawerConnectionManager: React.FC<DrawerConnectionManagerProps> = ({
  visible,
  onClose,
  onConnectionSuccess,
}) => {
  const { 
    currentConnection, 
    isConnected, 
    isConnecting,
    connect,
    disconnect 
  } = useSSHContext();
  
  const { isLoading } = useConnections();
  const [showAddForm, setShowAddForm] = useState(false);
  
  // 动画值
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // 处理抽屉显示/隐藏动画
  useEffect(() => {
    if (visible) {
      // 显示动画
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 隐藏动画
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  const handleDisconnect = async () => {
    Alert.alert(
      '断开连接',
      `确定要断开与 "${currentConnection?.name}" 的连接吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '断开',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnect();
              Alert.alert('已断开', '连接已成功断开');
            } catch (error) {
              Alert.alert('错误', '断开连接时出错');
            }
          },
        },
      ]
    );
  };

  // 处理连接成功
  const handleConnectionAdded = (connection: any) => {
    console.log('New connection added:', connection.name);
    Alert.alert(
      '连接已保存', 
      `连接 "${connection.name}" 已成功添加`,
      [
        { text: '知道了' },
        {
          text: '立即连接',
          onPress: async () => {
            try {
              const success = await connect(connection);
              if (success) {
                onConnectionSuccess(); // 连接成功后关闭抽屉
              }
            } catch (error) {
              Alert.alert('连接失败', '无法连接到服务器');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" translucent />
        
        {/* 遮罩层 */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View 
            style={[
              styles.overlay,
              { opacity: opacityAnim }
            ]} 
          />
        </TouchableWithoutFeedback>

        {/* 抽屉内容 */}
        <Animated.View 
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          {/* 抽屉头部 */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>SSH 连接</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 连接状态栏 */}
          {(isConnected || isConnecting) && (
            <View style={styles.statusBar}>
              <View style={styles.statusLeft}>
                {isConnecting && (
                  <ActivityIndicator size="small" color="#ffa500" style={styles.statusSpinner} />
                )}
                <Text style={styles.statusText}>
                  {isConnecting ? '正在连接...' : `已连接: ${currentConnection?.name}`}
                </Text>
              </View>
              {isConnected && (
                <TouchableOpacity 
                  style={styles.disconnectButton}
                  onPress={handleDisconnect}
                >
                  <Text style={styles.disconnectButtonText}>断开</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 主要内容区域 */}
          <View style={styles.drawerContent}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>加载连接列表...</Text>
              </View>
            ) : (
                <ConnectionList />
            )}
          </View>

          {/* 底部操作栏 */}
          <View style={styles.bottomActions}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddForm(true)}
            >
              <Text style={styles.addButtonText}>+ 添加新连接</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* 添加连接表单 */}
        <AddConnectionForm
          visible={showAddForm}
          onClose={() => setShowAddForm(false)}
          onConnectionAdded={handleConnectionAdded}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#1a1a1a',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: (StatusBar.currentHeight || 0) + 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1e1e1e',
    borderTopRightRadius: 16,
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#999',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d4d2d',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF50',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusSpinner: {
    marginRight: 8,
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  disconnectButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  drawerContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
    marginTop: 12,
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1e1e1e',
    borderBottomRightRadius: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DrawerConnectionManager;