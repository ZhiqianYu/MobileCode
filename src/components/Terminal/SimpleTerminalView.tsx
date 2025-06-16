// src/components/Terminal/SimpleTerminalView.tsx
// 功能：简化版终端显示组件，使用ScrollView显示文本
// 依赖：React Native基础组件
// 被使用：SimpleTerminal组件

import React, { useRef, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

interface SimpleTerminalViewProps {
  onTerminalReady: () => void;
  onInput: (data: string) => void;
  isConnected: boolean;
  terminalHistory: string[];
}

const SimpleTerminalView = React.forwardRef<any, SimpleTerminalViewProps>(({
  onTerminalReady,
  onInput,
  isConnected,
  terminalHistory,
}, ref) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // 组件挂载时通知准备就绪
  useEffect(() => {
    onTerminalReady();
  }, [onTerminalReady]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [terminalHistory]);

  // 向终端写入数据的方法
  const writeToTerminal = useCallback((data: string) => {
    // 这个方法由父组件调用，但在简化版中我们通过props传递历史记录
    console.log('Terminal received:', data);
  }, []);

  // 清空终端
  const clearTerminal = useCallback(() => {
    console.log('Terminal cleared');
    // 实际清空逻辑由父组件处理
  }, []);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    writeToTerminal,
    clearTerminal,
  }));

  return (
    <View style={styles.container}>
      {/* 终端输出区域 */}
      <View style={styles.outputContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 欢迎信息 */}
          <Text style={styles.welcomeText}>
            ╔══════════════════════════════════════╗{'\n'}
            ║          Simple Terminal             ║{'\n'}
            ║        Ready for SSH connection      ║{'\n'}
            ╚══════════════════════════════════════╝{'\n'}
          </Text>
          
          {/* 历史输出 */}
          {terminalHistory.map((line, index) => (
            <Text key={index} style={styles.outputText}>
              {line}
            </Text>
          ))}
          
          {/* 连接状态提示 */}
          {!isConnected && (
            <Text style={styles.disconnectedText}>
              ⚠️  Not connected to SSH{'\n'}
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
});

// 设置display name用于调试
SimpleTerminalView.displayName = 'SimpleTerminalView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  outputContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  welcomeText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  outputText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  disconnectedText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 8,
  },
});

export default SimpleTerminalView;