// src/components/Layout/InputBarComponent.tsx
// 功能：4号组件 - 输入栏，输入命令或文字，支持隐藏
// 依赖：模块类型定义
// 被使用：MainContainer

import React from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import { SizeConfig, ModuleType } from './MainContainer';

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
  const [input, setInput] = React.useState('');

  const handleSend = () => {
    if (input.trim()) {
      onSendInput(input);
      setInput('');
    }
  };

  // 根据sizeConfig确定样式
  const getInputStyles = () => {
    // 根据sizeConfig返回适当的样式
    const sizes = {
      small: { fontSize: 14, paddingVertical: 8 },
      medium: { fontSize: 16, paddingVertical: 10 },
      large: { fontSize: 18, paddingVertical: 12 },
    };
    return sizes[sizeConfig];
  };

  const inputStyles = getInputStyles();

  return (
    <View style={styles.container}>
      {/* 隐藏按钮 */}
      <TouchableOpacity 
        style={styles.hideButton}
        onPress={onToggleVisibility}
      >
        <Text style={styles.hideArrow}>V</Text>
      </TouchableOpacity>
      
      <TextInput
        style={[
          styles.input, 
          { 
            fontSize: inputStyles.fontSize,
            // 确保文本输入框不会导致容器高度超出预期
            height: '100%', 
            paddingVertical: 0, // 移除垂直内边距，使用flex布局居中内容
            textAlignVertical: 'center'
          }
        ]}
        value={input}
        onChangeText={setInput}
        placeholder="输入命令..."
        placeholderTextColor="#666"
      />
      
      <TouchableOpacity style={styles.button} onPress={handleSend}>
        <Text style={styles.buttonText}>发送</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center', // 垂直居中所有元素
    paddingHorizontal: 10,
    backgroundColor: '#2a2a2a',
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  button: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
  },

  hideButton: {
    marginTop: 0,
  },
  hideArrow: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InputBarComponent;