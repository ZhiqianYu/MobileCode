// src/contexts/ConnectionContext.tsx
// 功能：管理保存的SSH连接列表，提供增删改查和AsyncStorage持久化存储
// 依赖：AsyncStorage, SSHConnection类型
// 被使用：ConnectionManager, ConnectionList, AddConnectionForm

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SSHConnection } from '../types/ssh';

const CONNECTIONS_STORAGE_KEY = '@ssh_connections';

interface ConnectionContextState {
  savedConnections: SSHConnection[];
  addConnection: (connection: SSHConnection) => Promise<void>;
  updateConnection: (id: string, connection: Partial<SSHConnection>) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  getConnection: (id: string) => SSHConnection | undefined;
  isLoading: boolean;
  refreshConnections: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextState | null>(null);

export const ConnectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [savedConnections, setSavedConnections] = useState<SSHConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 保存连接到AsyncStorage
  const saveConnectionsToStorage = async (connections: SSHConnection[]) => {
    try {
      const jsonValue = JSON.stringify(connections);
      await AsyncStorage.setItem(CONNECTIONS_STORAGE_KEY, jsonValue);
      console.log('✓ Connections saved to storage:', connections.length);
    } catch (error) {
      console.error('✗ Failed to save connections:', error);
      throw error;
    }
  };

  // 从AsyncStorage加载连接
  const loadConnectionsFromStorage = async () => {
    try {
      setIsLoading(true);
      console.log('Loading connections from storage...');
      
      const jsonValue = await AsyncStorage.getItem(CONNECTIONS_STORAGE_KEY);
      
      if (jsonValue != null) {
        const connections: SSHConnection[] = JSON.parse(jsonValue);
        console.log('Raw loaded connections:', connections.length);
        
        // 恢复Date对象
        const restoredConnections = connections.map(conn => ({
          ...conn,
          lastUsed: new Date(conn.lastUsed),
          createdAt: new Date(conn.createdAt),
        }));
        
        setSavedConnections(restoredConnections);
        console.log('✓ Loaded connections from storage:', restoredConnections.length);
        console.log('Connection names:', restoredConnections.map(c => c.name));
      } else {
        console.log('No stored connections found');
        setSavedConnections([]);
      }
    } catch (error) {
      console.error('✗ Failed to load connections:', error);
      setSavedConnections([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加连接
  const addConnection = async (connection: SSHConnection) => {
    try {
      console.log('Adding connection:', connection.name);
      const newConnections = [...savedConnections, connection];
      setSavedConnections(newConnections);
      await saveConnectionsToStorage(newConnections);
      console.log('✓ Added new connection:', connection.name);
    } catch (error) {
      console.error('✗ Failed to add connection:', error);
      throw error;
    }
  };

  // 更新连接
  const updateConnection = async (id: string, updates: Partial<SSHConnection>) => {
    try {
      console.log('Updating connection:', id);
      const newConnections = savedConnections.map(conn => 
        conn.id === id 
          ? { ...conn, ...updates, lastUsed: new Date() }
          : conn
      );
      setSavedConnections(newConnections);
      await saveConnectionsToStorage(newConnections);
      console.log('✓ Updated connection:', id);
    } catch (error) {
      console.error('✗ Failed to update connection:', error);
      throw error;
    }
  };

  // 删除连接
  const deleteConnection = async (id: string) => {
    try {
      console.log('Deleting connection:', id);
      const newConnections = savedConnections.filter(conn => conn.id !== id);
      setSavedConnections(newConnections);
      await saveConnectionsToStorage(newConnections);
      console.log('✓ Deleted connection:', id);
    } catch (error) {
      console.error('✗ Failed to delete connection:', error);
      throw error;
    }
  };

  // 获取单个连接
  const getConnection = (id: string) => {
    return savedConnections.find(conn => conn.id === id);
  };

  // 刷新连接列表
  const refreshConnections = async () => {
    await loadConnectionsFromStorage();
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadConnectionsFromStorage();
  }, []);

  // 调试：监听连接列表变化
  useEffect(() => {
    console.log('Connections state updated:', savedConnections.length);
  }, [savedConnections]);

  return (
    <ConnectionContext.Provider value={{
      savedConnections,
      addConnection,
      updateConnection,
      deleteConnection,
      getConnection,
      isLoading,
      refreshConnections,
    }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnections = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnections must be used within ConnectionProvider');
  }
  return context;
};