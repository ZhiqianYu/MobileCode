// src/hooks/useSSH.ts - 改进的历史记录恢复版本
import { useState, useEffect, useCallback, useRef } from 'react';
import { SSHConnection, TerminalOutput, ConnectionStatus } from '../types/ssh';
import SSHService from '../services/SSHService';

export const useSSH = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnecting: false,
    isConnected: false,
  });
  const [terminalHistory, setTerminalHistory] = useState<TerminalOutput[]>([]);
  const [currentConnection, setCurrentConnection] = useState<SSHConnection | null>(null);
  
  const outputUnsubscribe = useRef<(() => void) | null>(null);
  const statusUnsubscribe = useRef<(() => void) | null>(null);
  const isInitialized = useRef<boolean>(false);

  // 初始化监听器
  useEffect(() => {
    // 清理旧的监听器
    if (outputUnsubscribe.current) {
      outputUnsubscribe.current();
    }
    if (statusUnsubscribe.current) {
      statusUnsubscribe.current();
    }

    // 首次挂载时，从服务恢复完整历史记录
    if (!isInitialized.current) {
      const fullHistory = SSHService.getFullHistory();
      setTerminalHistory(fullHistory);
      isInitialized.current = true;
    }

    // 设置输出监听器
    outputUnsubscribe.current = SSHService.onOutput((output: TerminalOutput) => {
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

    // 设置状态监听器
    statusUnsubscribe.current = SSHService.onStatusChange((status: ConnectionStatus) => {
      setConnectionStatus(status);
    });

    return () => {
      if (outputUnsubscribe.current) {
        outputUnsubscribe.current();
      }
      if (statusUnsubscribe.current) {
        statusUnsubscribe.current();
      }
    };
  }, []); // 只在组件挂载时执行一次

  const connect = useCallback(async (config: SSHConnection): Promise<boolean> => {
    try {
      console.log('useSSH connect called with:', config.host); // 添加调试
      console.log('useSSH instance ID:', Math.random()); // 添加这行，看是否有多个实例
      const success = await SSHService.connect(config);
      console.log('SSHService.connect returned:', success); // 添加调试
      if (success) {
        console.log('Setting currentConnection to:', config); // 添加调试
        setCurrentConnection(config);
        // 连接成功后，重新同步历史记录
        console.log('currentConnection set completed'); // 添加这行
        const fullHistory = SSHService.getFullHistory();
        setTerminalHistory(fullHistory);
      }
      return success;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      console.log('disconnect called, setting currentConnection to null');
      await SSHService.disconnect();
      setCurrentConnection(null); // 确保这行存在
      // 断开连接后，保留历史记录显示
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }, []);

  const executeCommand = useCallback(async (command: string): Promise<void> => {
    if (!connectionStatus.isConnected) {
      throw new Error('Not connected to SSH server');
    }

    try {
      await SSHService.executeCommand(command);
    } catch (error) {
      console.error('Command execution failed:', error);
      throw error;
    }
  }, [connectionStatus.isConnected]);

  const clearHistory = useCallback(() => {
    // 使用服务的清空方法，确保状态同步
    SSHService.clearHistory();
  }, []);

  const getRecentOutput = useCallback((count: number = 50): TerminalOutput[] => {
    return terminalHistory.slice(-count);
  }, [terminalHistory]);

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