// src/components/Connection/CleanConnectionItem.tsx
// 功能：简洁版连接项组件
// 依赖：SSHConnection类型, ConnectionContext
// 被使用：CleanConnectionList组件

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SSHConnection } from '../../types/ssh';
import { useConnections } from '../../contexts/ConnectionContext';

interface CleanConnectionItemProps {
  connection: SSHConnection;
  isConnecting: boolean;
  isConnected: boolean;
  onConnect: () => void;
  onEdit?: () => void;
}

const CleanConnectionItem: React.FC<CleanConnectionItemProps> = ({
  connection,
  isConnecting,
  isConnected,
  onConnect,
  onEdit,
}) => {
  const { deleteConnection } = useConnections();
  const [showActions, setShowActions] = useState(false);

  const handleLongPress = () => {
    setShowActions(!showActions);
  };

  const handleEdit = () => {
    setShowActions(false);
    if (onEdit) {
      onEdit();
    }
  };

  const handleDelete = () => {
    setShowActions(false);
    Alert.alert(
      '删除连接',
      `确定要删除连接 "${connection.name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConnection(connection.id);
            } catch (error) {
              Alert.alert('删除失败', '无法删除连接');
            }
          },
        },
      ]
    );
  };

  const handleQuickConnect = () => {
    if (isConnecting) return;
    setShowActions(false);
    onConnect();
  };

  const getStatusColor = () => {
    if (isConnecting) return '#ffa500';
    if (isConnected) return '#4CAF50';
    return '#999';
  };

  const getStatusText = () => {
    if (isConnecting) return '连接中...';
    if (isConnected) return '已连接';
    return '未连接';
  };

  const formatLastUsed = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isConnected && styles.connectedContainer,
        showActions && styles.expandedContainer,
      ]}
      onPress={handleQuickConnect}
      onLongPress={handleLongPress}
      disabled={isConnecting}
    >
      {/* 主要连接信息 */}
      <View style={styles.header}>
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionName}>{connection.name}</Text>
          <Text style={styles.connectionDetails}>
            {connection.username}@{connection.host}:{connection.port}
          </Text>
          <Text style={styles.lastUsed}>
            上次使用: {formatLastUsed(connection.lastUsed)}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          {isConnecting ? (
            <ActivityIndicator size="small" color="#ffa500" />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          )}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {/* 认证信息指示 */}
      <View style={styles.authInfo}>
        <Text style={styles.authType}>
          {connection.privateKey ? '🗝️ 密钥认证' : '🔑 密码认证'}
        </Text>
        {connection.password && (
          <Text style={styles.passwordSaved}>💾 已保存密码</Text>
        )}
      </View>

      {/* 扩展操作按钮 */}
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEdit}
          >
            <Text style={styles.actionButtonText}>编辑</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={styles.actionButtonText}>删除</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.connectButton]}
            onPress={handleQuickConnect}
            disabled={isConnecting}
          >
            <Text style={styles.actionButtonText}>
              {isConnected ? '重连' : '连接'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  connectedContainer: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a2e1a',
  },
  expandedContainer: {
    borderColor: '#2196F3',
  },
  
  // 内容区域
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  connectionDetails: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  lastUsed: {
    color: '#999',
    fontSize: 12,
  },
  statusContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  authInfo: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  authType: {
    color: '#ccc',
    fontSize: 12,
    marginRight: 16,
  },
  passwordSaved: {
    color: '#4CAF50',
    fontSize: 12,
  },
  
  // 操作按钮区域
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#555',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CleanConnectionItem;