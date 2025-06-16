// src/components/Layout/QuickToolComponent.tsx
// 功能：3号组件 - 快捷工具栏，根据模块显示不同工具，支持隐藏和悬浮
// 依赖：模块类型定义
// 被使用：MainContainer

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

export type ModuleType = 'file' | 'editor' | 'forward' | 'terminal';
export type SizeConfig = 'small' | 'medium' | 'large';

interface QuickToolComponentProps {
  activeModule: ModuleType;
  sizeConfig: SizeConfig;
  onToggleVisibility: () => void;
  onInputCommand: (command: string) => void;
}

// 工具按钮接口
interface ToolButton {
  id: string;
  label: string;
  command: string;
  icon: string;
  color: string;
}

const QuickToolComponent: React.FC<QuickToolComponentProps> = ({
  activeModule,
  sizeConfig,
  onToggleVisibility,
  onInputCommand,
}) => {
  
  // 根据模块获取工具按钮
  const getToolButtons = (): ToolButton[] => {
    switch (activeModule) {
      case 'file':
        return [
          { id: 'copy', label: '复制', command: 'copy', icon: '📋', color: '#4CAF50' },
          { id: 'paste', label: '粘贴', command: 'paste', icon: '📄', color: '#2196F3' },
          { id: 'cut', label: '剪切', command: 'cut', icon: '✂️', color: '#FF9800' },
          { id: 'delete', label: '删除', command: 'delete', icon: '🗑️', color: '#F44336' },
          { id: 'newFile', label: '新文件', command: 'new_file', icon: '📄', color: '#9C27B0' },
          { id: 'newDir', label: '新目录', command: 'new_dir', icon: '📁', color: '#607D8B' },
          { id: 'refresh', label: '刷新', command: 'refresh', icon: '🔄', color: '#00BCD4' },
        ];
        
      case 'editor':
        return [
          { id: 'copy', label: '复制', command: 'copy', icon: '📋', color: '#4CAF50' },
          { id: 'paste', label: '粘贴', command: 'paste', icon: '📄', color: '#2196F3' },
          { id: 'cut', label: '剪切', command: 'cut', icon: '✂️', color: '#FF9800' },
          { id: 'backspace', label: '退格', command: 'backspace', icon: '⌫', color: '#F44336' },
          { id: 'delete', label: '删除', command: 'delete', icon: '⌦', color: '#E91E63' },
          { id: 'indent', label: '缩进', command: 'indent', icon: '→', color: '#9C27B0' },
          { id: 'save', label: '保存', command: 'save', icon: '💾', color: '#4CAF50' },
          { id: 'undo', label: '撤销', command: 'undo', icon: '↶', color: '#607D8B' },
        ];
        
      case 'forward':
        return [
          { id: 'back', label: '后退', command: 'back', icon: '←', color: '#607D8B' },
          { id: 'forward', label: '前进', command: 'forward', icon: '→', color: '#607D8B' },
          { id: 'refresh', label: '刷新', command: 'refresh', icon: '🔄', color: '#4CAF50' },
          { id: 'stop', label: '停止', command: 'stop', icon: '⏹️', color: '#F44336' },
          { id: 'screenshot', label: '截图', command: 'screenshot', icon: '📷', color: '#9C27B0' },
          { id: 'bookmark', label: '收藏', command: 'bookmark', icon: '⭐', color: '#FF9800' },
        ];
        
      case 'terminal':
        return [
          { id: 'ls', label: 'ls', command: 'ls -la', icon: '📋', color: '#4CAF50' },
          { id: 'pwd', label: 'pwd', command: 'pwd', icon: '📍', color: '#2196F3' },
          { id: 'clear', label: 'clear', command: 'clear', icon: '🧹', color: '#FF9800' },
          { id: 'top', label: 'top', command: 'top', icon: '📊', color: '#9C27B0' },
          { id: 'ps', label: 'ps', command: 'ps aux', icon: '⚙️', color: '#607D8B' },
          { id: 'df', label: 'df', command: 'df -h', icon: '💾', color: '#F44336' },
          { id: 'history', label: 'history', command: 'history', icon: '📜', color: '#795548' },
          { id: 'exit', label: 'exit', command: 'exit', icon: '🚪', color: '#E91E63' },
        ];
        
      default:
        return [];
    }
  };

  const toolButtons = getToolButtons();

  // 处理工具按钮点击
  const handleToolClick = (tool: ToolButton) => {
    console.log('执行快捷命令:', tool.command);
    onInputCommand(tool.command);
  };

  // 根据尺寸配置获取按钮大小
  const getButtonSize = () => {
    const sizes = {
      small: { width: 45, height: 32, fontSize: 9, iconSize: 12 },
      medium: { width: 55, height: 38, fontSize: 10, iconSize: 14 },
      large: { width: 65, height: 44, fontSize: 11, iconSize: 16 },
    };
    return sizes[sizeConfig];
  };

  const buttonSize = getButtonSize();

  return (
    <View style={styles.container}>
      
      {/* 顶部控制栏 */}
      <View style={styles.topBar}>
        {/* 左上角：隐藏按钮 */}
        <TouchableOpacity 
          style={styles.hideButton}
          onPress={onToggleVisibility}
        >
          <Text style={styles.hideArrow}>隐藏</Text>
        </TouchableOpacity>
        
        {/* 右上角：快捷工具标题 */}
        <Text style={styles.title}>快捷工具</Text>
      </View>

      {/* 快捷按钮区域 */}
      <View style={styles.buttonsArea}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.buttonsScroll}
          contentContainerStyle={styles.buttonsContent}
        >
          {/* 添加自定义工具按钮（终端模块特有） */}
          {activeModule === 'terminal' && (
            <TouchableOpacity
              style={[
                styles.toolButton,
                styles.addButton,
                {
                  width: buttonSize.width,
                  height: buttonSize.height,
                }
              ]}
              onPress={() => {
                // TODO: 将来实现添加自定义命令功能
                console.log('添加自定义命令（待实现）');
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.toolIcon,
                { fontSize: buttonSize.iconSize }
              ]}>
                ➕
              </Text>
              <Text style={[
                styles.toolLabel,
                { fontSize: buttonSize.fontSize }
              ]}>
                添加
              </Text>
            </TouchableOpacity>
          )}
          {toolButtons.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={[
                styles.toolButton,
                {
                  width: buttonSize.width,
                  height: buttonSize.height,
                  backgroundColor: tool.color,
                }
              ]}
              onPress={() => handleToolClick(tool)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.toolIcon,
                { fontSize: buttonSize.iconSize }
              ]}>
                {tool.icon}
              </Text>
              <Text style={[
                styles.toolLabel,
                { fontSize: buttonSize.fontSize }
              ]}>
                {tool.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  
  // 顶部控制栏
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  
  // 左上角隐藏按钮
  hideButton: {
    marginTop: -3,
  },
  hideArrow: {
    color: '#999',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // 右上角标题
  title: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // 按钮区域
  buttonsArea: {
    flex: 1,
    paddingVertical: 4,
  },
  buttonsScroll: {
    flex: 1,
  },
  buttonsContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  
  // 工具按钮样式
  toolButton: {
    borderRadius: 6,
    marginHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toolIcon: {
    marginBottom: 2,
  },
  toolLabel: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // 添加按钮样式
  addButton: {
    backgroundColor: '#666',
    borderWidth: 1,
    borderColor: '#888',
    borderStyle: 'dashed',
  },
});

export default QuickToolComponent;