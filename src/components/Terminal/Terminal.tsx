// src/components/Terminal/Terminal.tsx - 简化版本，移除底部导航栏隐藏机制
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useSSH } from '../../hooks/useSSH';
import TerminalDisplay from './TerminalDisplay';
import QuickCommands from './QuickCommands';
import CommandInput from './CommandInput';

const Terminal: React.FC = () => {
  const [command, setCommand] = useState('');
  const [showQuickCommands, setShowQuickCommands] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const {
    terminalHistory,
    executeCommand,
    clearHistory,
    isConnected,
    isConnecting,
    canExecuteCommands,
  } = useSSH();

  // 监听键盘显示/隐藏事件
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        console.log('键盘高度:', event.endCoordinates.height); // 添加这行调试
        console.log('屏幕高度:', Dimensions.get('window').height); // 添加这行
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        console.log('键盘隐藏'); // 添加这行调试
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleExecuteCommand = useCallback(async () => {
    if (!command.trim()) return;
    
    const cmd = command.trim();
    setCommand('');
    
    if (cmd === 'clear') {
      clearHistory();
      return;
    }
    
    try {
      await executeCommand(cmd);
    } catch (error) {
      Alert.alert('执行失败', error instanceof Error ? error.message : '未知错误');
    }
  }, [command, executeCommand, clearHistory]);

  const handleQuickCommand = useCallback((cmd: string) => {
    if (cmd === 'clear') {
      clearHistory();
      return;
    }
    
    setCommand(cmd);
    // 立即执行快捷命令
    setTimeout(() => {
      handleExecuteCommand();
    }, 0);
  }, [clearHistory, handleExecuteCommand]);

  const handleShowQuickCommands = () => {
    setShowQuickCommands(true);
  };

  const handleHideQuickCommands = () => {
    setShowQuickCommands(false);
  };

  const handleAddCommand = useCallback((newCommand: string) => {
    console.log('Added new command:', newCommand);
  }, []);

  return (
    <View style={styles.container}>
      {/* Terminal 显示区域 - 根据键盘调整高度 */}
      <View style={[
        styles.terminalContainer,
        isConnected && {
          paddingBottom: keyboardHeight > 0 
            ? keyboardHeight + (showQuickCommands ? 100 : 60) // 有键盘：键盘高度 + 底部组件高度
            : (showQuickCommands ? 100 : 60) // 无键盘：只预留底部组件高度
        }
      ]}>
        <TerminalDisplay
          terminalHistory={terminalHistory}
          isConnected={isConnected}
          isConnecting={isConnecting}
          keyboardVisible={keyboardVisible}
        />
      </View>

      {/* 底部组件区域 - 绝对定位 */}
      {isConnected && (
        <View style={[
          styles.bottomArea,
          {
            position: 'absolute',
            bottom: keyboardHeight,
            left: 0,
            right: 0,
          }
        ]}>
          {/* 快捷命令层 - 可选显示 */}
          {showQuickCommands && (
            <QuickCommands
              onCommandSelect={handleQuickCommand}
              onHide={handleHideQuickCommands}
              currentCommand={command}
              onAddCommand={handleAddCommand}
            />
          )}

          {/* 命令输入层 - 始终显示 */}
          <CommandInput
            command={command}
            onCommandChange={setCommand}
            onExecuteCommand={handleExecuteCommand}
            canExecuteCommands={canExecuteCommands}
            showQuickCommands={showQuickCommands}
            onShowQuickCommands={handleShowQuickCommands}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  terminalContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  bottomArea: {
    backgroundColor: '#0c0c0c',
    flexShrink: 0,
  },
});

export default Terminal;