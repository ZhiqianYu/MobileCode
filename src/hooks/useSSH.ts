// src/hooks/useSSH.ts - 完整实现版本
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

  // 初始化监听器
  useEffect(() => {
    outputUnsubscribe.current = SSHService.onOutput((output: TerminalOutput) => {
      setTerminalHistory(prev => [...prev, output]);
    });

    statusUnsubscribe.current = SSHService.onStatusChange((status: ConnectionStatus) => {
      setConnectionStatus(status);
    });

    return () => {
      outputUnsubscribe.current?.();
      statusUnsubscribe.current?.();
    };
  }, []);

  const connect = useCallback(async (config: SSHConnection): Promise<boolean> => {
    try {
      const success = await SSHService.connect(config);
      if (success) {
        setCurrentConnection(config);
        setTerminalHistory([]);
      }
      return success;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await SSHService.disconnect();
      setCurrentConnection(null);
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
    setTerminalHistory([]);
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