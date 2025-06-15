// src/components/Terminal/TerminalDisplay.tsx - 真实终端显示版本
import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { TerminalOutput } from '../../types/ssh';

interface TerminalDisplayProps {
  terminalHistory: TerminalOutput[];
  isConnected: boolean;
  isConnecting: boolean;
  keyboardVisible: boolean;
  currentPrompt: string;
  currentCommand: string;
  showLivePrompt: boolean;
  shouldAutoScroll: boolean;
  onScrollComplete: () => void;
}

const TerminalDisplay: React.FC<TerminalDisplayProps> = ({
  terminalHistory,
  isConnected,
  isConnecting,
  keyboardVisible,
  currentPrompt,
  currentCommand,
  showLivePrompt,
  shouldAutoScroll,
  onScrollComplete,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [showCursor, setShowCursor] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // 光标闪烁效果
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 600);
    
    return () => clearInterval(cursorInterval);
  }, []);

  // 自动滚动逻辑
  useEffect(() => {
    if (shouldAutoScroll && !isUserScrolling && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        setIsAtBottom(true);
        onScrollComplete();
      }, 100);
    }
  }, [shouldAutoScroll, isUserScrolling, terminalHistory.length, keyboardVisible, showLivePrompt, currentCommand, onScrollComplete]);

  // 键盘状态变化时的滚动处理
  useEffect(() => {
    if (keyboardVisible && isAtBottom && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [keyboardVisible, isAtBottom]);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    setIsAtBottom(isBottom);
    
    if (!isBottom) {
      setIsUserScrolling(true);
    } else {
      setIsUserScrolling(false);
    }
  }, []);

  const renderOutput = useCallback((output: TerminalOutput, index: number) => {
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
        key={`${output.id}-${index}`}
        onLongPress={() => {
          Alert.alert(
            '复制内容', 
            output.content, 
            [
              { text: '复制', onPress: () => {} },
              { text: '取消', style: 'cancel' }
            ]
          );
        }}
        activeOpacity={0.8}
      >
        <Text style={getTextStyle()}>{output.content}</Text>
      </TouchableOpacity>
    );
  }, []);

  const renderConnectionStatus = () => {
    if (isConnecting) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.connectingText}>正在连接...</Text>
        </View>
      );
    }
    
    if (!isConnected && terminalHistory.length === 0) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.disconnectedText}>未连接</Text>
          <Text style={styles.hintText}>请点击右上角设置按钮配置SSH连接</Text>
          <TouchableOpacity 
            style={styles.quickConnectButton}
            onPress={() => Alert.alert('提示', '请使用右上角设置按钮进行连接')}
          >
            <Text style={styles.quickConnectText}>快速连接</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };

  // 如果没有连接且没有历史记录，显示连接状态
  if (!isConnected && terminalHistory.length === 0) {
    return <View style={styles.container}>{renderConnectionStatus()}</View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.historyContainer}
        contentContainerStyle={styles.historyContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={100}
        onContentSizeChange={() => {
          if (isAtBottom && !isUserScrolling) {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }
        }}
      >
        {/* 渲染历史输出 */}
        {terminalHistory.map((output, index) => renderOutput(output, index))}
        
        {/* 实时命令行 - 显示当前提示符和正在输入的命令 */}
        {isConnected && showLivePrompt && (
          <View style={styles.livePromptContainer}>
            <Text style={styles.promptText}>{currentPrompt}</Text>
            <Text style={styles.commandText}>{currentCommand}</Text>
            {showCursor && <Text style={styles.cursorText}>|</Text>}
          </View>
        )}
        
        {/* 如果未连接但有历史记录，显示断开状态 */}
        {!isConnected && terminalHistory.length > 0 && (
          <View style={styles.disconnectedPromptContainer}>
            <Text style={styles.disconnectedPromptText}>
              [连接已断开] 请重新连接以继续操作
            </Text>
          </View>
        )}
        
        {/* 底部留白，确保内容不会被遮挡 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    overflow: 'hidden',
  },
  statusContainer: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  connectingText: {
    color: '#ffa500',
    fontSize: 12,
  },
  disconnectedText: {
    color: '#ff6b6b',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hintText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 0,
    textAlign: 'center',
    lineHeight: 20,
  },
  quickConnectButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  quickConnectText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyContainer: {
    flex: 1,
  },
  historyContent: {
    padding: 2,
    paddingBottom: 0,
  },
  outputText: {
    color: '#00ff00',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 1,
    lineHeight: 11,
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
  // 实时命令行样式
  livePromptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  promptText: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: 'bold',
  },
  commandText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cursorText: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: 'bold',
  },
  disconnectedPromptContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  disconnectedPromptText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default TerminalDisplay;