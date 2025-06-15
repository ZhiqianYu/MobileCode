// src/components/Terminal/TerminalDisplay.tsx - 纯终端显示组件
import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import { TerminalOutput } from '../../types/ssh';

interface TerminalDisplayProps {
  terminalHistory: TerminalOutput[];
  isConnected: boolean;
  isConnecting: boolean;
  keyboardVisible: boolean;
}

const TerminalDisplay: React.FC<TerminalDisplayProps> = ({
  terminalHistory,
  isConnected,
  isConnecting,
  keyboardVisible,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const previousHistoryLength = useRef<number>(0);
  const hasScrolledToEnd = useRef<boolean>(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // 自动滚动逻辑
  useEffect(() => {
    if (terminalHistory.length > 0 && !hasScrolledToEnd.current) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: false });
          hasScrolledToEnd.current = true;
        }
      }, 100);
    }
  }, [terminalHistory.length]);

  useEffect(() => {
    if (terminalHistory.length > previousHistoryLength.current) {
      previousHistoryLength.current = terminalHistory.length;
      
      // 只有在底部或用户没有手动滚动时才自动滚动
      if (isAtBottom || !isUserScrolling) {
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
            setIsAtBottom(true);
            setIsUserScrolling(false);
          }
        }, 100);
      }
    }
  }, [terminalHistory.length, isAtBottom, isUserScrolling]);

  useEffect(() => {
    // 键盘状态变化时滚动到底部
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        setIsAtBottom(true);
        setIsUserScrolling(false);
      }, 200); // 稍微延迟确保布局更新完成
    }
  }, [keyboardVisible]);

  // 处理容器大小变化事件
  const handleLayoutChange = useCallback(() => {
    if (isAtBottom && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [isAtBottom]);

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
    <View 
      style={styles.container}
      onLayout={handleLayoutChange}
    >
      <View style={styles.scrollContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.historyContainer}
          contentContainerStyle={styles.historyContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          onLayout={handleLayoutChange}
          onContentSizeChange={() => {
            if (isAtBottom && !isUserScrolling) {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
            setIsAtBottom(isBottom);
            
            // 检测用户是否在手动滚动
            if (!isBottom) {
              setIsUserScrolling(true);
            } else {
              setIsUserScrolling(false);
            }
          }}
          scrollEventThrottle={100}
        >
          {terminalHistory.map((output, index) => renderOutput(output, index))}
          
          {/* 如果未连接但有历史记录，显示断开状态 */}
          {!isConnected && terminalHistory.length > 0 && (
            <View style={styles.disconnectedPromptContainer}>
              <Text style={styles.disconnectedPromptText}>
                [连接已断开] 请重新连接以继续操作
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    overflow: 'hidden',
  },
  scrollContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  statusContainer: {
    padding: 32,
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hintText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 24,
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
    padding: 16,
    paddingBottom: 24, // 确保底部有足够间距
  },
  outputText: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
    lineHeight: 18,
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
});

export default TerminalDisplay;