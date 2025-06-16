// src/hooks/useSSH.ts
// 功能：简化版SSH连接状态管理
// 依赖：SimpleSSHService, SSHConnection类型, TerminalOutput类型
// 被使用：SSHContext, Terminal组件

import { useState, useEffect, useCallback } from 'react';
import { SSHConnection, TerminalOutput, ConnectionStatus } from '../types/ssh';
import SimpleSSHService from '../services/SimpleSSHService';

export const useSSH = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnecting: false,
    isConnected: false,
  });
  
  const [terminalHistory, setTerminalHistory] = useState<TerminalOutput[]>([]);
  const [currentConnection, setCurrentConnection] = useState<SSHConnection | null>(null);

  // 初始化状态监听
  useEffect(() => {
    const unsubscribeStatus = SimpleSSHService.onStatusChange((status: ConnectionStatus) => {
      setConnectionStatus(status);
    });

    const unsubscribeOutput = SimpleSSHService.onOutput((output: TerminalOutput) => {
      setTerminalHistory(prev => [...prev, output]);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeOutput();
    };
  }, []);

  const connect = useCallback(async (config: SSHConnection): Promise<boolean> => {
    try {
      console.log('Connecting to:', config.name);
      
      const success = await SimpleSSHService.connect(config);
      
      if (success) {
        setCurrentConnection(config);
        console.log('Connection successful');
      } else {
        setCurrentConnection(null);
        console.log('Connection failed');
      }
      
      return success;
    } catch (error) {
      console.error('SSH Connection error:', error);
      setCurrentConnection(null);
      return false;
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      console.log('Disconnecting...');
      await SimpleSSHService.disconnect();
      setCurrentConnection(null);
      console.log('Disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
      setCurrentConnection(null);
    }
  }, []);

  const writeToSSH = useCallback((data: string): void => {
    if (!connectionStatus.isConnected) {
      console.warn('Cannot write to SSH: not connected');
      return;
    }
    
    SimpleSSHService.writeToSSH(data);
  }, [connectionStatus.isConnected]);

  const executeCommand = useCallback(async (command: string): Promise<void> => {
    writeToSSH(command + '\r');
  }, [writeToSSH]);

  const clearHistory = useCallback(() => {
    console.log('Clearing terminal history');
    setTerminalHistory([]);
  }, []);

  return {
    // 状态
    connectionStatus,
    terminalHistory,
    currentConnection,
    
    // 操作方法
    connect,
    disconnect,
    executeCommand,
    writeToSSH,
    clearHistory,
    
    // 便捷状态判断
    isConnected: connectionStatus.isConnected,
    isConnecting: connectionStatus.isConnecting,
    hasError: !!connectionStatus.error,
    error: connectionStatus.error,
    ping: connectionStatus.lastPing,
  };
};