// src/components/Terminal/QuickCommands.tsx - 快捷命令组件
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';

interface QuickCommandsProps {
  onCommandSelect: (command: string) => void;
  onHide: () => void;
  currentCommand: string; // 新增：当前输入框的命令
  onAddCommand: (command: string) => void; // 新增：添加命令的回调
}

const QuickCommands: React.FC<QuickCommandsProps> = ({
  onCommandSelect,
  onHide,
  currentCommand,
  onAddCommand,
}) => {
  const [customCommands, setCustomCommands] = useState<string[]>([]);

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

  const allCommands = [...customCommands, ...quickCommands];

  const handleAddCommand = () => {
    if (currentCommand && currentCommand.trim()) {
      const newCommand = currentCommand.trim();
      if (!allCommands.includes(newCommand)) {
        setCustomCommands(prev => [...prev, newCommand]);
        onAddCommand(newCommand); // 通知父组件
      }
    }
  };

  const handleLongPress = (command: string, index: number) => {
    if (index <= quickCommands.length) {
      Alert.alert(
        '删除命令',
        `确定要删除命令 "${command}" 吗？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: () => {
              const customIndex = index - quickCommands.length;
              setCustomCommands(prev => prev.filter((_, i) => i !== customIndex));
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>快捷命令</Text>
        <TouchableOpacity onPress={onHide} style={styles.hideButton}>
          <Text style={styles.hideButtonText}>隐藏</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
      >
        {/* 添加命令按钮 - 只有当输入框有内容时才显示 */}
        {currentCommand.trim() && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddCommand}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}

        {allCommands.map((cmd, index) => (
          <TouchableOpacity
            key={`quick-${cmd}-${index}`}
            style={styles.commandButton}
            onPress={() => onCommandSelect(cmd)}
            onLongPress={() => handleLongPress(cmd, index)}
          >
            <Text style={styles.commandText}>{cmd}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  title: {
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
  scroll: {
    paddingHorizontal: 8,
  },
  commandButton: {
    backgroundColor: '#333',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  commandText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRadius: 4,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default QuickCommands;