// src/components/Connection/CleanConnectionList.tsx
// 功能：简洁版连接列表组件
// 依赖：ConnectionContext, SSHContext, CleanConnectionItem
// 被使用：CleanDrawerConnection

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useConnections } from '../../contexts/ConnectionContext';
import { useSSHContext } from '../../contexts/SSHContext';
import { SSHConnection } from '../../types/ssh';
import CleanConnectionItem from './CleanConnectionItem';

interface CleanConnectionListProps {
  onEditConnection?: (connection: SSHConnection) => void;
}

const CleanConnectionList: React.FC<CleanConnectionListProps> = ({ 
  onEditConnection,
}) => {
  const { savedConnections } = useConnections();
  const { connect, currentConnection, isConnecting } = useSSHContext();

  console.log('CleanConnectionList render - connections:', savedConnections.length);

  const handleConnect = async (connection: SSHConnection) => {
    try {
      console.log('Connecting to:', connection.name);
      const success = await connect(connection);
      if (success) {
        console.log('Connection successful');
      } else {
        Alert.alert('连接失败', '无法连接到服务器，请检查连接信息');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      Alert.alert('连接错误', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleEdit = (connection: SSHConnection) => {
    if (onEditConnection) {
      onEditConnection(connection);
    } else {
      Alert.alert('编辑连接', `编辑 "${connection.name}" 的功能即将实现`);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔗</Text>
      <Text style={styles.emptyTitle}>还没有保存的连接</Text>
      <Text style={styles.emptyText}>
        点击下方的 + 添加新连接 按钮{'\n'}添加你的第一个SSH连接
      </Text>
    </View>
  );

  const renderConnection = ({ item }: { item: SSHConnection }) => (
    <CleanConnectionItem
      connection={item}
      isConnecting={isConnecting && currentConnection?.id === item.id}
      isConnected={currentConnection?.id === item.id}
      onConnect={() => handleConnect(item)}
      onEdit={() => handleEdit(item)}
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
    paddingVertical: 8,
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
});

export default CleanConnectionList;