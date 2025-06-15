// src/components/Terminal/Terminal.tsx - 完整实现版本
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSSH } from '../../hooks/useSSH';
import { TerminalOutput } from '../../types/ssh';

const Terminal: React.FC = () => {
  const [command, setCommand] = useState('');
  const [showQuickCommands, setShowQuickCommands] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  
  const {
    terminalHistory,
    executeCommand,
    clearHistory,
    isConnected,
    isConnecting,
    error,
    canExecuteCommands,
  } = useSSH();

  const quickCommands = [
    'ls -la',
    'pwd',
    'whoami',
    'ps aux',
    'df -h',
    'free -m',
    'uptime',
    'clear',
  ];

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [terminalHistory]);

  const handleExecuteCommand = async () => {
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
  };

  const handleQuickCommand = (cmd: string) => {
    if (cmd === 'clear') {
      clearHistory();
      return;
    }
    
    setCommand(cmd);
    setTimeout(() => {
      handleExecuteCommand();
    }, 100);
  };

  const renderOutput = (output: TerminalOutput) => {
    const getTextStyle = () => {
      switch (output.type) {
        case 'input':
          return [styles.outputText, styles.inputText];
        case 'error':
          return [styles.outputText, styles.errorText];
        case 'system':
          return [styles.outputText, styles.systemText];
        default:
          return styles.outputText;
      }
    };

    return (
      <TouchableOpacity
        key={output.id}
        onLongPress={() => {
          Alert.alert('复制', '复制功能待实现');
        }}
      >
        <Text style={getTextStyle()}>{output.content}</Text>
      </TouchableOpacity>
    );
  };

  const renderConnectionStatus = () => {
    if (isConnecting) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.connectingText}>正在连接...</Text>
        </View>
      );
    }
    
    if (!isConnected) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.disconnectedText}>未连接</Text>
          <Text style={styles.hintText}>请点击右上角设置按钮配置SSH连接</Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderConnectionStatus()}
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.historyContainer}
        showsVerticalScrollIndicator={false}
      >
        {terminalHistory.map(renderOutput)}
        {isConnected && (
          <View style={styles.promptContainer}>
            <Text style={styles.promptText}>$ </Text>
            <Text style={styles.cursorText}>█</Text>
          </View>
        )}
      </ScrollView>

      {showQuickCommands && isConnected && (
        <View style={styles.quickCommandsContainer}>
          <View style={styles.quickCommandsHeader}>
            <Text style={styles.quickCommandsTitle}>快捷命令</Text>
            <TouchableOpacity
              onPress={() => setShowQuickCommands(false)}
              style={styles.hideButton}
            >
              <Text style={styles.hideButtonText}>隐藏</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickCommandsScroll}
          >
            {quickCommands.map((cmd, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickCommandButton}
                onPress={() => handleQuickCommand(cmd)}
              >
                <Text style={styles.quickCommandText}>{cmd}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isConnected && (
        <View style={styles.inputContainer}>
          {!showQuickCommands && (
            <TouchableOpacity
              onPress={() => setShowQuickCommands(true)}
              style={styles.showQuickButton}
            >
              <Text style={styles.showQuickButtonText}>⬆</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.inputRow}>
            <Text style={styles.promptText}>$ </Text>
            <TextInput
              ref={textInputRef}
              style={styles.commandInput}
              value={command}
              onChangeText={setCommand}
              onSubmitEditing={handleExecuteCommand}
              placeholder="输入命令..."
              placeholderTextColor="#666"
              editable={canExecuteCommands}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !canExecuteCommands && styles.sendButtonDisabled
              ]}
              onPress={handleExecuteCommand}
              disabled={!canExecuteCommands}
            >
              <Text style={styles.sendButtonText}>发送</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  statusContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  connectingText: {
    color: '#ffa500',
    fontSize: 16,
  },
  disconnectedText: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hintText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  historyContainer: {
    flex: 1,
    padding: 16,
  },
  outputText: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  inputText: {
    color: '#fff',
  },
  errorText: {
    color: '#ff6b6b',
  },
  systemText: {
    color: '#ffa500',
  },
  promptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptText: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: 'bold',
  },
  cursorText: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  quickCommandsContainer: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 8,
  },
  quickCommandsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  quickCommandsTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hideButton: {
    padding: 4,
  },
  hideButtonText: {
    color: '#666',
    fontSize: 12,
  },
  quickCommandsScroll: {
    paddingHorizontal: 16,
  },
  quickCommandButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  quickCommandText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputContainer: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  showQuickButton: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  showQuickButtonText: {
    color: '#666',
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  commandInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginLeft: 8,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Terminal;