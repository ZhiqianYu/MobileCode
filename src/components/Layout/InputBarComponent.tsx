// src/components/Layout/InputBarComponent.tsx
// 功能：4号组件 - 输入栏，输入命令或文字，支持隐藏
// 依赖：模块类型定义
// 被使用：MainContainer

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export type ModuleType = 'file' | 'editor' | 'forward' | 'terminal';
export type SizeConfig = 'small' | 'medium' | 'large';

interface InputBarComponentProps {
  activeModule: ModuleType;
  sizeConfig: SizeConfig;
  onToggleVisibility: () => void;
  onSendInput: (input: string) => void;
}

const InputBarComponent: React.FC<InputBarComponentProps> = ({
  activeModule,
  sizeConfig,
  onToggleVisibility,
  onSendInput,
}) => {
  const [inputText, setInputText] = useState('');

  // 根据模块获取占位符文本
  const getPlaceholder = (): string => {
    switch (activeModule) {
      case 'file':
        return '输入文件名或路径...';
      case 'editor':
        return '查找文本或输入代码...';
      case 'forward':
        return '输入URL地址...';
      case 'terminal':
        return '输入命令...';
      default:
        return '输入内容...';
    }
  };

  // 根据尺寸配置获取输入框高度
  const getInputHeight = () => {
    const heights = {
      small: 32,
      medium: 38,
      large: 44,
    };
    return heights[sizeConfig];
  };

  // 处理发送
  const handleSend = () => {
    if (inputText.trim()) {
      onSendInput(inputText.trim());
      setInputText(''); // 清空输入框
    }
  };

  // 处理回车键
  const handleSubmitEditing = () => {
    handleSend();
  };

  // 根据模块获取发送按钮样式和文本
  const getSendButtonConfig = () => {
    switch (activeModule) {
      case 'file':
        return { icon: '🔍', color: '#4CAF50', label: '搜索' };
      case 'editor':
        return { icon: '✏️', color: '#2196F3', label: '插入' };
      case 'forward':
        return { icon: '🌐', color: '#FF9800', label: '访问' };
      case 'terminal':
        return { icon: '⚡', color: '#4CAF50', label: '执行' };
      default:
        return { icon: '📤', color: '#666', label: '发送' };
    }
  };

  const sendConfig = getSendButtonConfig();
  const inputHeight = getInputHeight();

  return (
    <View style={styles.container}>
      
      {/* 输入区域 */}
      <View style={styles.inputContainer}>
        
        {/* 隐藏按钮 */}
        <TouchableOpacity 
          style={styles.hideButton}
          onPress={onToggleVisibility}
        >
          <Text style={styles.hideButtonText}>隐藏</Text>
        </TouchableOpacity>

        {/* 输入框 */}
        <TextInput
          style={[
            styles.textInput,
            { height: inputHeight }
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={getPlaceholder()}
          placeholderTextColor="#666"
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSubmitEditing}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* 发送按钮 */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            { 
              backgroundColor: sendConfig.color,
              height: inputHeight,
            }
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendIcon}>{sendConfig.icon}</Text>
          <Text style={styles.sendLabel}>{sendConfig.label}</Text>
        </TouchableOpacity>
      </View>

      {/* 功能按钮行（根据模块显示不同功能） */}
      <View style={styles.functionRow}>
        {activeModule === 'terminal' && (
          <>
            <TouchableOpacity 
              style={styles.functionButton}
              onPress={() => setInputText(prev => prev + ' | ')}
            >
              <Text style={styles.functionButtonText}>管道 |</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.functionButton}
              onPress={() => setInputText(prev => prev + ' && ')}
            >
              <Text style={styles.functionButtonText}>且 &&</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.functionButton}
              onPress={() => setInputText(prev => prev + ' > ')}
            >
              <Text style={styles.functionButtonText}>重定向 ></Text>
            </TouchableOpacity>
          </>
        )}
        
        {activeModule === 'editor' && (
          <>
            <TouchableOpacity 
              style={styles.functionButton}
              onPress={() => setInputText('{')}
            >
              <Text style={styles.functionButtonText}>{ }</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.functionButton}
              onPress={() => setInputText('[')}
            >
              <Text style={styles.functionButtonText}>[ ]</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.functionButton}
              onPress={() => setInputText('(')}
            >
              <Text style={styles.functionButtonText}>( )</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.spacer} />
        
        {/* 清空按钮 */}
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={() => setInputText('')}
        >
          <Text style={styles.clearButtonText}>清空</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  
  // 主输入区域
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  hideButton: {
    backgroundColor: '#555',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  hideButtonText: {
    color: '#fff',
    fontSize: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#3d3d3d',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 6,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  sendLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // 功能按钮行
  functionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  functionButton: {
    backgroundColor: '#444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
  },
  functionButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  spacer: {
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#666',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default InputBarComponent;