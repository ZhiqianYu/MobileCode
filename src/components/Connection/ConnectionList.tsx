// src/components/Connection/ConnectionList.tsx
// 功能：显示保存的SSH连接列表，支持连接、编辑、删除操作
// 依赖：ConnectionContext, SSHContext, NavigationContext, ConnectionItem组件
// 被使用：ConnectionManager

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useConnections } from '../../contexts/ConnectionContext';
import { useSSHContext } from '../../contexts/SSHContext';
import ConnectionItem from './ConnectionItem';

const ConnectionList: React.FC = () => {
  const { savedConnections } = useConnections();
  const { connect, currentConnection, isConnecting } = useSSHContext();

  console.log('ConnectionList render - connections:', savedConnections.length);

  const handleConnect = async (connection: any) => {
    try {
      console.log('Connecting to:', connection.name);
      const success = await connect(connection);
      if (success) {
        console.log('Connection successful');
        // 连接成功，让父组件处理导航
        // 不再直接导航，由抽屉管理组件处理
      } else {
        Alert.alert('连接失败', '无法连接到服务器，请检查连接信息');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      Alert.alert('连接错误', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleEdit = (connection: any) => {
    // TODO: 实现编辑功能，可以打开编辑Modal或跳转到编辑页面
    Alert.alert('编辑连接', `编辑 "${connection.name}" 的功能即将实现`);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔗</Text>
      <Text style={styles.emptyTitle}>还没有保存的连接</Text>
      <Text style={styles.emptyText}>
        点击 + 添加新连接 按钮{'\n'}添加你的第一个SSH连接
      </Text>
    </View>
  );

  const renderConnection = ({ item }: { item: any }) => (
    <ConnectionItem
      connection={item}
      isConnecting={isConnecting && currentConnection?.id === item.id}
      isConnected={currentConnection?.id === item.id}
      onConnect={() => handleConnect(item)}
      onEdit={handleEdit}
    />
  );

  if (savedConnections.length === 0) {
    return renderEmptyState();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={savedConnections}
        renderItem={renderConnection}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshing={false}
        onRefresh={() => {
          console.log('Refreshing connection list');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  helpButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  helpButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ConnectionList;