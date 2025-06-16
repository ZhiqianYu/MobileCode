// src/components/Terminal/SimpleTerminal.tsx
// 功能：简化版终端组件，使用SimpleTerminalView显示
// 依赖：SimpleTerminalView, useSSHContext, React Native
// 被使用：MainScreen

import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useSSHContext } from '../../contexts/SSHContext';
import SimpleTerminalView from './SimpleTerminalView';

const SimpleTerminal = React.forwardRef<any, {}>((props, ref) => {
  const {
    terminalHistory,
    writeToSSH,
    isConnected,
    isConnecting,
    currentConnection,
  } = useSSHContext();

  const [terminalReady, setTerminalReady] = useState(false);
  const [displayHistory, setDisplayHistory] = useState<string[]>([]);
  const terminalRef = useRef<any>(null);

  // 终端准备就绪
  const handleTerminalReady = useCallback(() => {
    console.log('Simple terminal ready');
    setTerminalReady(true);
  }, []);

  // 处理终端输入
  const handleTerminalInput = useCallback((data: string) => {
    console.log('Terminal input received:', JSON.stringify(data));
    
    if (isConnected && writeToSSH) {
      writeToSSH(data);
    } else {
      console.warn('Not connected to SSH, ignoring input');
    }
  }, [isConnected, writeToSSH]);

  // 将SSH输出转换为显示历史
  useEffect(() => {
    if (!terminalReady) return;

    const newHistory = terminalHistory.map(output => output.content);
    setDisplayHistory(newHistory);
  }, [terminalHistory, terminalReady]);

  // 连接状态变化时的处理
  useEffect(() => {
    if (!terminalReady) return;

    if (isConnected && currentConnection) {
      console.log('SSH connected, terminal ready for input');
    } else if (!isConnecting && !isConnected) {
      // 连接断开时显示提示
      setDisplayHistory(prev => [...prev, '\r\n✗ SSH connection lost\r\n']);
    }
  }, [isConnected, isConnecting, currentConnection, terminalReady]);

  // 清空终端
  const handleClearTerminal = useCallback(() => {
    setDisplayHistory([]);
    console.log('Terminal history cleared');
  }, []);

  // 执行命令
  const handleExecuteCommand = useCallback((command: string) => {
    console.log('执行终端命令:', command);
    if (isConnected && writeToSSH) {
      writeToSSH(command + '\r'); // 添加回车符执行命令
    } else {
      console.warn('终端未连接，无法执行命令');
    }
  }, [isConnected, writeToSSH]);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    clearTerminal: handleClearTerminal,
    executeCommand: handleExecuteCommand,
  }));

  return (
    <View style={styles.container}>
      <SimpleTerminalView
        ref={terminalRef}
        onTerminalReady={handleTerminalReady}
        onInput={handleTerminalInput}
        isConnected={isConnected}
        terminalHistory={displayHistory}
      />
    </View>
  );
});

// 设置display name用于调试
SimpleTerminal.displayName = 'SimpleTerminal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
});

export default SimpleTerminal;