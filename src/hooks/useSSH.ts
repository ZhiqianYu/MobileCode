// src/hooks/useSSH.ts
// 功能：SSH连接状态管理，暂时使用EnhancedMockSSHService进行终端测试
// 依赖：EnhancedMockSSHService, SSHConnection类型, TerminalOutput类型
// 被使用：SSHContext, Terminal组件

import { useState, useEffect, useCallback, useRef } from 'react';
import { SSHConnection, TerminalOutput, ConnectionStatus } from '../types/ssh';
import EnhancedMockSSHService from '../services/EnhancedMockSSHService';

export const useSSH = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnecting: false,
    isConnected: false,
  });
  const [terminalHistory, setTerminalHistory] = useState<TerminalOutput[]>([]);
  const [currentConnection, setCurrentConnection] = useState<SSHConnection | null>(null);
  
  const outputUnsubscribe = useRef<(() => void) | null>(null);
  const isInitialized = useRef<boolean>(false);

  // 初始化输出监听器
  useEffect(() => {
    if (outputUnsubscribe.current) {
      outputUnsubscribe.current();
    }

    // 设置输出监听器
    outputUnsubscribe.current = EnhancedMockSSHService.onOutput((output: TerminalOutput) => {
      console.log('Received SSH output:', output.content);
      
      // 处理特殊的清空信号
      if (output.content === '__CLEAR_HISTORY__') {
        setTerminalHistory([]);
        return;
      }
      
      setTerminalHistory(prev => {
        // 确保不会添加重复的记录
        const isDuplicate = prev.some(item => item.id === output.id);
        if (isDuplicate) {
          return prev;
        }
        return [...prev, output];
      });
    });

    return () => {
      if (outputUnsubscribe.current) {
        outputUnsubscribe.current();
      }
    };
  }, []);

  const connect = useCallback(async (config: SSHConnection): Promise<boolean> => {
    try {
      console.log('=== SSH Connect Start ===');
      console.log('Connecting to:', config.name, config.host);
      
      // 设置连接中状态
      setConnectionStatus({
        isConnecting: true,
        isConnected: false,
        error: undefined,
      });

      // 使用EnhancedMockSSHService进行连接
      const success = await EnhancedMockSSHService.connect(config);
      console.log('Connection result:', success);

      if (success) {
        // 连接成功
        setCurrentConnection(config);
        setConnectionStatus({
          isConnecting: false,
          isConnected: true,
          error: undefined,
          lastPing: 42, // 模拟延迟
        });
        
        console.log('✓ Connection successful');
        console.log('✓ Current connection set to:', config.name);
        console.log('✓ Connection status: isConnected = true');
      } else {
        // 连接失败
        setCurrentConnection(null);
        setConnectionStatus({
          isConnecting: false,
          isConnected: false,
          error: '连接失败',
        });
        console.log('✗ Connection failed');
      }

      console.log('=== SSH Connect End ===');
      return success;
    } catch (error) {
      console.error('SSH Connection error:', error);
      setCurrentConnection(null);
      setConnectionStatus({
        isConnecting: false,
        isConnected: false,
        error: error instanceof Error ? error.message : '连接错误',
      });
      return false;
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      console.log('=== SSH Disconnect Start ===');
      await EnhancedMockSSHService.disconnect();
      
      setCurrentConnection(null);
      setConnectionStatus({
        isConnecting: false,
        isConnected: false,
        error: undefined,
      });
      
      console.log('✓ Disconnected successfully');
      console.log('=== SSH Disconnect End ===');
    } catch (error) {
      console.error('Disconnect error:', error);
      // 强制重置状态
      setCurrentConnection(null);
      setConnectionStatus({
        isConnecting: false,
        isConnected: false,
        error: undefined,
      });
    }
  }, []);

  const writeToSSH = useCallback((data: string): void => {
    if (!connectionStatus.isConnected) {
      console.warn('Cannot write to SSH: not connected');
      return;
    }

    try {
      console.log('Writing to SSH:', data);
      EnhancedMockSSHService.writeToSSH(data);
    } catch (error) {
      console.error('Failed to write to SSH:', error);
    }
  }, [connectionStatus.isConnected]);

  const executeCommand = useCallback(async (command: string): Promise<void> => {
    // 对于Enhanced Mock SSH，我们直接写入命令，让它处理
    writeToSSH(command + '\r');
  }, [writeToSSH]);

  const clearHistory = useCallback(() => {
    console.log('Clearing terminal history');
    setTerminalHistory([]);
  }, []);

  const getRecentOutput = useCallback((count: number = 50): TerminalOutput[] => {
    return terminalHistory.slice(-count);
  }, [terminalHistory]);

  // 调试：监听状态变化
  useEffect(() => {
    console.log('SSH Status updated:', {
      isConnected: connectionStatus.isConnected,
      isConnecting: connectionStatus.isConnecting,
      currentConnection: currentConnection?.name || 'none',
      historyLength: terminalHistory.length,
    });
  }, [connectionStatus, currentConnection, terminalHistory.length]);

  const canExecuteCommands = connectionStatus.isConnected && !connectionStatus.isConnecting;

  return {
    // 状态
    connectionStatus,
    terminalHistory,
    currentConnection,
    canExecuteCommands,
    
    // 操作方法
    connect,
    disconnect,
    executeCommand,
    writeToSSH,
    clearHistory,
    getRecentOutput,
    
    // 便捷状态判断
    isConnected: connectionStatus.isConnected,
    isConnecting: connectionStatus.isConnecting,
    hasError: !!connectionStatus.error,
    error: connectionStatus.error,
    ping: connectionStatus.lastPing,
  };
};