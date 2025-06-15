// src/components/Terminal/Terminal.tsx - 真实终端行为版本
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';
import { useSSH } from '../../hooks/useSSH';
import TerminalDisplay from './TerminalDisplay';
import QuickCommands from './QuickCommands';
import CommandInput from './CommandInput';

const Terminal: React.FC = () => {
  const [command, setCommand] = useState('');
  const [showQuickCommands, setShowQuickCommands] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // 真实终端状态
  const [currentPrompt, setCurrentPrompt] = useState('$ ');
  const [showLivePrompt, setShowLivePrompt] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
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
      () => {
        setKeyboardVisible(true);
        setShouldAutoScroll(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // 监听终端输出和提示符更新
  useEffect(() => {
    let filteredHistory = terminalHistory.filter(output => {
      // 处理提示符更新事件
      if (output.content.startsWith('__PROMPT_UPDATE__')) {
        const prompt = output.content.replace('__PROMPT_UPDATE__', '');
        setCurrentPrompt(prompt + ' ');
        setShowLivePrompt(true);
        setShouldAutoScroll(true);
        return false; // 不显示在历史记录中
      }
      
      // 过滤掉清空历史记录的信号
      if (output.content === '__CLEAR_HISTORY__') {
        setShowLivePrompt(false);
        return false;
      }
      
      return true;
    });

    // 如果有新输出，自动滚动到底部
    if (filteredHistory.length > 0) {
      setShouldAutoScroll(true);
    }
  }, [terminalHistory]);

  const handleExecuteCommand = useCallback(async () => {
    if (!command.trim()) return;
    
    const cmd = command.trim();
    setCommand('');
    setShouldAutoScroll(true); // 执行命令时自动滚动
    
    if (cmd === 'clear') {
      clearHistory();
      setShowLivePrompt(false);
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
      setShowLivePrompt(false);
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
    // 添加新快捷命令的反馈
  }, []);

  const handleCommandChange = useCallback((newCommand: string) => {
    setCommand(newCommand);
    // 输入时也可以触发轻微滚动调整
    if (newCommand.length > 0) {
      setShouldAutoScroll(true);
    }
  }, []);

  // 过滤历史记录，移除特殊控制信号
  const filteredHistory = terminalHistory.filter(output => 
    !output.content.startsWith('__PROMPT_UPDATE__') && 
    output.content !== '__CLEAR_HISTORY__'
  );

  return (
    <View style={styles.container}>
      {/* Terminal 显示区域 */}
      <View style={[
        styles.terminalContainer,
        // 连接时为底部组件预留空间
        isConnected && {
          paddingBottom: keyboardVisible 
            ? keyboardVisible + (showQuickCommands ? 100 : 60)
            : (showQuickCommands ? 100 : 60)
        }
      ]}>
        <TerminalDisplay
          terminalHistory={filteredHistory}
          isConnected={isConnected}
          isConnecting={isConnecting}
          keyboardVisible={keyboardVisible}
          currentPrompt={currentPrompt}
          currentCommand={command}
          showLivePrompt={showLivePrompt}
          shouldAutoScroll={shouldAutoScroll}
          onScrollComplete={() => setShouldAutoScroll(false)}
        />
      </View>

      {/* 底部组件区域 - 只在连接时显示 */}
      {isConnected && (
        <View style={[
          styles.bottomArea,
          {
            position: 'absolute',
            bottom: keyboardVisible ? keyboardVisible : 0,
            left: 0,
            right: 0,
          }
        ]}>
          {/* 快捷命令层 */}
          {showQuickCommands && (
            <QuickCommands
              onCommandSelect={handleQuickCommand}
              onHide={handleHideQuickCommands}
              currentCommand={command}
              onAddCommand={handleAddCommand}
            />
          )}

          {/* 命令输入层 */}
          <CommandInput
            command={command}
            onCommandChange={handleCommandChange}
            onExecuteCommand={handleExecuteCommand}
            canExecuteCommands={canExecuteCommands}
            showQuickCommands={showQuickCommands}
            onShowQuickCommands={handleShowQuickCommands}
            placeholder={showLivePrompt ? '' : '输入命令...'}
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