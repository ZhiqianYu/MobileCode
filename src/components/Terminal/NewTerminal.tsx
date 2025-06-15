// src/components/Terminal/NewTerminal.tsx
// 功能：集成XTermWebView和真正SSH服务的终端组件
// 依赖：XTermWebView, useSSHContext, React Native
// 被使用：MainScreen

import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useSSHContext } from '../../contexts/SSHContext';
import XTermWebView from './XTermWebView';

const NewTerminal = React.forwardRef<any, {}>((props, ref) => {
  const {
    terminalHistory,
    writeToSSH,
    isConnected,
    isConnecting,
    currentConnection,
    disconnect,
  } = useSSHContext();

  const [terminalReady, setTerminalReady] = useState(false);
  const xtermRef = useRef<any>(null);

  // 终端准备就绪
  const handleTerminalReady = useCallback(() => {
    console.log('XTerm terminal ready');
    setTerminalReady(true);
  }, []);

  // 处理终端输入
  const handleTerminalInput = useCallback((data: string) => {
    console.log('Terminal input received:', JSON.stringify(data));
    
    if (isConnected && writeToSSH) {
      // 直接发送输入到SSH
      writeToSSH(data);
    } else {
      console.warn('Not connected to SSH, ignoring input');
    }
  }, [isConnected, writeToSSH]);

  // 监听SSH输出并写入终端
  useEffect(() => {
    if (!terminalReady || !xtermRef.current) {
      return;
    }

    // 监听terminalHistory变化，将新输出写入终端
    const lastOutput = terminalHistory[terminalHistory.length - 1];
    if (lastOutput) {
      console.log('Writing SSH output to terminal:', lastOutput.content);
      xtermRef.current.writeToTerminal(lastOutput.content);
    }
  }, [terminalHistory, terminalReady]);

  // 连接状态变化时的处理
  useEffect(() => {
    if (!terminalReady || !xtermRef.current) {
      return;
    }

    if (isConnected && currentConnection) {
      console.log('SSH connected, terminal ready for input');
    } else if (!isConnecting && !isConnected) {
      // 连接断开时显示提示
      xtermRef.current.writeToTerminal('\r\n\x1b[31m✗ SSH connection lost\x1b[0m\r\n');
    }
  }, [isConnected, isConnecting, currentConnection, terminalReady]);

  // 清空终端
  const handleClearTerminal = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clearTerminal();
    }
  }, []);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    clearTerminal: handleClearTerminal,
  }));

  return (
    <View style={styles.container}>
      {/* XTerm 终端 - 直接占满全屏 */}
      <View style={styles.terminalContainer}>
        <XTermWebView
          ref={xtermRef}
          onTerminalReady={handleTerminalReady}
          onInput={handleTerminalInput}
          isConnected={isConnected}
        />
      </View>
    </View>
  );
});

// 设置display name用于调试
NewTerminal.displayName = 'NewTerminal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  terminalContainer: {
    flex: 1,
  },
});

export default NewTerminal;