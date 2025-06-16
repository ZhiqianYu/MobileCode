// src/components/Drawer/CleanDrawerConnection.tsx
// 功能：简洁版连接抽屉，70%屏幕高度，上下居中，左边贴边
// 依赖：ConnectionContext, SSHContext, CleanConnectionList
// 被使用：MainContainer

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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSSHContext } from '../../contexts/SSHContext';
import { useConnections } from '../../contexts/ConnectionContext';
import { SSHConnection } from '../../types/ssh';
import CleanConnectionList from '../Connection/CleanConnectionList';
import AddConnectionForm from '../Connection/AddConnectionForm';

interface CleanDrawerConnectionProps {
  visible: boolean;
  onClose: () => void;
  onConnectionSuccess: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.7; // 70% 屏幕高度
const DRAWER_WIDTH = SCREEN_WIDTH * 0.72; // 72% 屏幕宽度
const VERTICAL_MARGIN = (SCREEN_HEIGHT - DRAWER_HEIGHT) / 2; // 上下居中

const CleanDrawerConnection: React.FC<CleanDrawerConnectionProps> = ({
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
  const [editConnection, setEditConnection] = useState<SSHConnection | null>(null);
  
  // 动画值
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // 重置动画值
  const resetAnimations = () => {
    slideAnim.setValue(-DRAWER_WIDTH);
    opacityAnim.setValue(0);
  };

  // 动画处理
  useEffect(() => {
    if (visible) {
      resetAnimations();
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
      ]).start(() => {
        if (!visible) resetAnimations();
      });
    }
  }, [visible]);

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

  const handleConnectionAdded = (connection: SSHConnection) => {
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
                onConnectionSuccess();
              }
            } catch (error) {
              Alert.alert('连接失败', '无法连接到服务器');
            }
          },
        },
      ]
    );
  };

  const handleEditConnection = (connection: SSHConnection) => {
    setEditConnection(connection);
    setShowAddForm(true);
  };

  const handleAddNewConnection = () => {
    setEditConnection(null);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditConnection(null);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 背景遮罩 */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>

        {/* 0号容器 - 抽屉主体 */}
        <Animated.View 
          style={[
            styles.drawerContainer,
            {
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          {/* 1号 - 标题栏 */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>SSH 连接</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 连接状态栏（可选显示） */}
          {(isConnected || isConnecting) && (
            <View style={styles.statusContainer}>
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

          {/* 2号 - 列表区域 */}
          <View style={styles.listContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>加载连接列表...</Text>
              </View>
            ) : (
              <CleanConnectionList onEditConnection={handleEditConnection} />
            )}
          </View>

          {/* 3号 - 添加按钮 */}
          <View style={styles.addContainer}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddNewConnection}
            >
              <Text style={styles.addButtonText}>+ 添加新连接</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* 添加/编辑连接表单 */}
        <AddConnectionForm
          visible={showAddForm}
          onClose={handleCloseForm}
          onConnectionAdded={handleConnectionAdded}
          editConnection={editConnection}
          onConnectionUpdated={(connection) => console.log('Updated:', connection.name)}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  
  // 0号容器 - 抽屉主体
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: VERTICAL_MARGIN,
    width: DRAWER_WIDTH,
    height: DRAWER_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  
  // 1号 - 标题栏（固定高度）
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 0,
    backgroundColor: '#2d2d2d',
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#ccc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // 连接状态栏（可选，固定高度）
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 0,
    backgroundColor: '#1a2e1a',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#164618',
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
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // 2号 - 列表区域（可伸缩）
  listContainer: {
    flex: 1,
    backgroundColor: '#222',
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
  
  // 3号 - 添加按钮（固定高度）
  addContainer: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    backgroundColor: '#2d2d2d',
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButtonText: {
    marginTop: -3,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CleanDrawerConnection;