// src/components/Layout/InputBarComponent.tsx
// 功能：4号组件 - 简化的输入栏，只包含输入框和发送功能，支持隐藏和缩入侧边
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
  moduleRefs: React.RefObject<any>; // 新增：模块访问权限
}

const InputBarComponent: React.FC<InputBarComponentProps> = ({
  activeModule,
  sizeConfig,
  onToggleVisibility,
  moduleRefs,
}) => {
  const [inputText, setInputText] = useState('');

  // 根据模块获取占位符文本
  const getPlaceholder = (): string => {
    switch (activeModule) {
      case 'file':
        return '输入文件名或路径...';
      case 'editor':
        return '输入代码或文本...';
      case 'forward':
        return '输入URL地址...';
      case 'terminal':
        return '输入终端命令...';
      default:
        return '输入内容...';
    }
  };

  // 根据尺寸配置获取样式
  const getSizeStyles = () => {
    const configs = {
      small: {
        inputHeight: 28,
        fontSize: 14,
        buttonWidth: 50,
        hideButtonSize: 20,
      },
      medium: {
        inputHeight: 32,
        fontSize: 16,
        buttonWidth: 60,
        hideButtonSize: 24,
      },
      large: {
        inputHeight: 36,
        fontSize: 18,
        buttonWidth: 70,
        hideButtonSize: 28,
      },
    };
    return configs[sizeConfig];
  };

  // 处理发送 - 实现真正功能
  const handleSend = () => {
    if (!inputText.trim()) return;
    
    if (!moduleRefs?.current) {
      console.warn('Module refs not available');
      return;
    }

    const input = inputText.trim();
    console.log('发送输入到', activeModule, ':', input);

    try {
      switch (activeModule) {
        case 'file':
          console.log('文件管理输入:', input);
          break;
          
        case 'editor':
          // 编辑器：将输入插入到当前光标位置
          moduleRefs.current.editor?.insertText(input);
          // 重新聚焦编辑器
          setTimeout(() => {
            moduleRefs.current.editor?.refocus();
          }, 100);
          break;
          
        case 'forward':
          moduleRefs.current.forward?.navigate(input);
          break;
          
        case 'terminal':
          moduleRefs.current.terminal?.executeCommand?.(input);
          break;
          
        default:
          console.warn('Unknown module:', activeModule);
      }
      
      setInputText(''); // 清空输入框
    } catch (error) {
      console.error('Failed to send input:', error);
    }
  };

  // 处理回车键
  const handleSubmitEditing = () => {
    handleSend();
  };

  // 根据模块获取发送按钮配置
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
  const sizeStyles = getSizeStyles();

  return (
    <View style={styles.container}>
      
      {/* 主输入区域 - 填满整个容器 */}
      <View style={styles.inputContainer}>
        
        {/* 左上角：隐藏按钮（箭头样式，无背景） */}
        <TouchableOpacity 
          style={[
            styles.hideButton,
            { 
              width: sizeStyles.hideButtonSize,
              height: sizeStyles.hideButtonSize 
            }
          ]}
          onPress={onToggleVisibility}
        >
          <Text style={[
            styles.hideArrow,
            { fontSize: sizeStyles.hideButtonSize * 0.9 }
          ]}>
            ⌄
          </Text>
        </TouchableOpacity>

        {/* 输入框容器 */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.textInput,
              { 
                height: sizeStyles.inputHeight,
                fontSize: sizeStyles.fontSize 
              }
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
          
          {/* 清空按钮 - 仅在有内容时显示 */}
          {inputText.length > 0 && (
            <TouchableOpacity
              style={[
                styles.clearInputButton,
                { 
                  right: 8, 
                  top: '50%',
                  marginTop: -10, // 清空按钮高度的一半，实现垂直居中
                }
              ]}
              onPress={() => setInputText('')}
            >
              <Text style={styles.clearInputIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 发送按钮 */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            { 
              backgroundColor: sendConfig.color,
              height: sizeStyles.inputHeight,
              width: sizeStyles.buttonWidth,
            }
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.sendIcon,
            { fontSize: sizeStyles.fontSize * 0.9 }
          ]}>
            {sendConfig.icon}
          </Text>
          <Text style={[
            styles.sendLabel,
            { fontSize: sizeStyles.fontSize * 0.7 }
          ]}>
            {sendConfig.label}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // 确保填满整个分配的空间
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingHorizontal: 8,
    paddingVertical: 8, // 增加一点垂直padding确保内容垂直居中
    justifyContent: 'center', // 垂直居中
  },
  
  // 主输入区域
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%', // 填满容器高度
  },
  
  // 左上角隐藏按钮
  hideButton: {
    position: 'absolute',
    top: 2, // 调整位置，确保在容器内
    left: 2,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    // 无背景色，无边框
  },
  hideArrow: {
    color: '#999',
    fontWeight: 'bold',
  },
  
  // 输入框容器
  inputWrapper: {
    flex: 1,
    position: 'relative',
    marginRight: 8,
    height: '100%', // 使用容器的90%高度
    justifyContent: 'center',
  },
  
  // 输入框
  textInput: {
    backgroundColor: '#3d3d3d',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingLeft: 30, // 为左上角隐藏按钮留出空间
    paddingRight: 25, // 为右侧清空按钮留出空间
    color: '#fff',
    flex: 1, // 填满inputWrapper的高度
  },
  
  // 输入框内的清空按钮
  clearInputButton: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(153, 153, 153, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  clearInputIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // 发送按钮
  sendButton: {
    flexDirection: 'row',
    borderRadius: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendIcon: {
    marginBottom: 2,
  },
  sendLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default InputBarComponent;