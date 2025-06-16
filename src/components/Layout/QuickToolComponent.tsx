// src/components/Layout/QuickToolComponent.tsx
// 功能：3号组件 - 完整功能的快捷工具栏，真正执行模块操作
// 依赖：模块类型定义，MainContentComponent引用
// 被使用：MainContainer

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

export type ModuleType = 'file' | 'editor' | 'forward' | 'terminal';
export type SizeConfig = 'small' | 'medium' | 'large';

interface QuickToolComponentProps {
  activeModule: ModuleType;
  sizeConfig: SizeConfig;
  onToggleVisibility: () => void;
  onInputCommand: (command: string) => void;
  // 新增：对 MainContentComponent 的引用
  mainContentRef?: React.RefObject<any>;
}

// 工具按钮接口
interface ToolButton {
  id: string;
  label: string;
  command: string;
  icon: string;
  color: string;
  action?: () => void; // 新增：直接执行的动作
}

const QuickToolComponent: React.FC<QuickToolComponentProps> = ({
  activeModule,
  sizeConfig,
  onToggleVisibility,
  onInputCommand,
  mainContentRef,
}) => {
  
  // 执行文件管理器操作
  const executeFileManagerAction = (command: string) => {
    const fileManager = mainContentRef?.current?.fileManager;
    if (!fileManager) {
      Alert.alert('错误', '文件管理器不可用');
      return;
    }

    switch (command) {
      case 'copy':
        fileManager.copy();
        break;
      case 'paste':
        fileManager.paste();
        break;
      case 'cut':
        fileManager.cut();
        break;
      case 'delete':
        fileManager.delete();
        break;
      case 'new_file':
        fileManager.newFile();
        break;
      case 'new_dir':
        fileManager.newDir();
        break;
      case 'refresh':
        fileManager.refresh();
        break;
      default:
        Alert.alert('未知操作', `命令: ${command}`);
    }
  };

  // 执行编辑器操作
  const executeEditorAction = (command: string) => {
    const editor = mainContentRef?.current?.editor;
    if (!editor) {
      Alert.alert('错误', '编辑器不可用');
      return;
    }

    switch (command) {
      case 'save':
        editor.save();
        break;
      case 'copy':
        editor.copy();
        break;
      case 'paste':
        editor.paste();
        break;
      case 'cut':
        editor.cut();
        break;
      case 'undo':
        editor.undo();
        break;
      case 'indent':
        editor.indent();
        break;
      case 'toggle_line_numbers':
        editor.toggleLineNumbers();
        break;
      case 'new_file':
        editor.newFile();
        break;
      case 'backspace':
        // 发送退格键到编辑器
        editor.insertText('\b');
        break;
      case 'delete':
        // 发送删除键到编辑器
        editor.insertText('\x7f');
        break;
      default:
        Alert.alert('未知操作', `命令: ${command}`);
    }
  };

  // 执行转发浏览器操作
  const executeForwardAction = (command: string) => {
    const forward = mainContentRef?.current?.forward;
    if (!forward) {
      Alert.alert('错误', '转发浏览器不可用');
      return;
    }

    switch (command) {
      case 'back':
        forward.goBack();
        break;
      case 'forward':
        forward.goForward();
        break;
      case 'refresh':
        forward.refresh();
        break;
      case 'stop':
        forward.stop();
        break;
      case 'screenshot':
        forward.screenshot();
        break;
      case 'bookmark':
        forward.bookmark();
        break;
      default:
        Alert.alert('未知操作', `命令: ${command}`);
    }
  };

  // 执行终端操作
  const executeTerminalAction = (command: string) => {
    if (command === 'clear') {
      const terminal = mainContentRef?.current?.terminal;
      if (terminal && terminal.clearTerminal) {
        terminal.clearTerminal();
      } else {
        Alert.alert('错误', '终端清屏功能不可用');
      }
    } else {
      // 其他命令通过 onInputCommand 发送到终端
      onInputCommand(command);
    }
  };

  // 根据模块获取工具按钮
  const getToolButtons = (): ToolButton[] => {
    switch (activeModule) {
      case 'file':
        return [
          { 
            id: 'copy', 
            label: '复制', 
            command: 'copy', 
            icon: '📋', 
            color: '#4CAF50',
            action: () => executeFileManagerAction('copy')
          },
          { 
            id: 'paste', 
            label: '粘贴', 
            command: 'paste', 
            icon: '📄', 
            color: '#2196F3',
            action: () => executeFileManagerAction('paste')
          },
          { 
            id: 'cut', 
            label: '剪切', 
            command: 'cut', 
            icon: '✂️', 
            color: '#FF9800',
            action: () => executeFileManagerAction('cut')
          },
          { 
            id: 'delete', 
            label: '删除', 
            command: 'delete', 
            icon: '🗑️', 
            color: '#F44336',
            action: () => executeFileManagerAction('delete')
          },
          { 
            id: 'newFile', 
            label: '新文件', 
            command: 'new_file', 
            icon: '📄', 
            color: '#9C27B0',
            action: () => executeFileManagerAction('new_file')
          },
          { 
            id: 'newDir', 
            label: '新目录', 
            command: 'new_dir', 
            icon: '📁', 
            color: '#607D8B',
            action: () => executeFileManagerAction('new_dir')
          },
          { 
            id: 'refresh', 
            label: '刷新', 
            command: 'refresh', 
            icon: '🔄', 
            color: '#00BCD4',
            action: () => executeFileManagerAction('refresh')
          },
        ];
        
      case 'editor':
        return [
          { 
            id: 'save', 
            label: '保存', 
            command: 'save', 
            icon: '💾', 
            color: '#4CAF50',
            action: () => executeEditorAction('save')
          },
          { 
            id: 'copy', 
            label: '复制', 
            command: 'copy', 
            icon: '📋', 
            color: '#2196F3',
            action: () => executeEditorAction('copy')
          },
          { 
            id: 'paste', 
            label: '粘贴', 
            command: 'paste', 
            icon: '📄', 
            color: '#FF9800',
            action: () => executeEditorAction('paste')
          },
          { 
            id: 'cut', 
            label: '剪切', 
            command: 'cut', 
            icon: '✂️', 
            color: '#F44336',
            action: () => executeEditorAction('cut')
          },
          { 
            id: 'undo', 
            label: '撤销', 
            command: 'undo', 
            icon: '↶', 
            color: '#607D8B',
            action: () => executeEditorAction('undo')
          },
          { 
            id: 'indent', 
            label: '缩进', 
            command: 'indent', 
            icon: '→', 
            color: '#9C27B0',
            action: () => executeEditorAction('indent')
          },
          { 
            id: 'newFile', 
            label: '新文件', 
            command: 'new_file', 
            icon: '📄', 
            color: '#4CAF50',
            action: () => executeEditorAction('new_file')
          },
          { 
            id: 'lineNumbers', 
            label: '行号', 
            command: 'toggle_line_numbers', 
            icon: '#', 
            color: '#00BCD4',
            action: () => executeEditorAction('toggle_line_numbers')
          },
        ];
        
      case 'forward':
        return [
          { 
            id: 'back', 
            label: '后退', 
            command: 'back', 
            icon: '←', 
            color: '#607D8B',
            action: () => executeForwardAction('back')
          },
          { 
            id: 'forward', 
            label: '前进', 
            command: 'forward', 
            icon: '→', 
            color: '#607D8B',
            action: () => executeForwardAction('forward')
          },
          { 
            id: 'refresh', 
            label: '刷新', 
            command: 'refresh', 
            icon: '🔄', 
            color: '#4CAF50',
            action: () => executeForwardAction('refresh')
          },
          { 
            id: 'stop', 
            label: '停止', 
            command: 'stop', 
            icon: '⏹️', 
            color: '#F44336',
            action: () => executeForwardAction('stop')
          },
          { 
            id: 'screenshot', 
            label: '截图', 
            command: 'screenshot', 
            icon: '📷', 
            color: '#9C27B0',
            action: () => executeForwardAction('screenshot')
          },
          { 
            id: 'bookmark', 
            label: '收藏', 
            command: 'bookmark', 
            icon: '⭐', 
            color: '#FF9800',
            action: () => executeForwardAction('bookmark')
          },
        ];
        
      case 'terminal':
        return [
          { 
            id: 'ls', 
            label: 'ls', 
            command: 'ls -la', 
            icon: '📋', 
            color: '#4CAF50',
            action: () => executeTerminalAction('ls -la')
          },
          { 
            id: 'pwd', 
            label: 'pwd', 
            command: 'pwd', 
            icon: '📍', 
            color: '#2196F3',
            action: () => executeTerminalAction('pwd')
          },
          { 
            id: 'clear', 
            label: 'clear', 
            command: 'clear', 
            icon: '🧹', 
            color: '#FF9800',
            action: () => executeTerminalAction('clear')
          },
          { 
            id: 'top', 
            label: 'top', 
            command: 'top', 
            icon: '📊', 
            color: '#9C27B0',
            action: () => executeTerminalAction('top')
          },
          { 
            id: 'ps', 
            label: 'ps', 
            command: 'ps aux', 
            icon: '⚙️', 
            color: '#607D8B',
            action: () => executeTerminalAction('ps aux')
          },
          { 
            id: 'df', 
            label: 'df', 
            command: 'df -h', 
            icon: '💾', 
            color: '#F44336',
            action: () => executeTerminalAction('df -h')
          },
          { 
            id: 'history', 
            label: 'history', 
            command: 'history', 
            icon: '📜', 
            color: '#795548',
            action: () => executeTerminalAction('history')
          },
          { 
            id: 'nano', 
            label: 'nano', 
            command: 'nano', 
            icon: '📝', 
            color: '#00BCD4',
            action: () => executeTerminalAction('nano')
          },
        ];
        
      default:
        return [];
    }
  };

  const toolButtons = getToolButtons();

  // 处理工具按钮点击
  const handleToolClick = (tool: ToolButton) => {
    console.log('执行快捷操作:', tool.command);
    
    if (tool.action) {
      // 执行直接动作
      try {
        tool.action();
      } catch (error) {
        console.error('Tool action error:', error);
        Alert.alert('操作失败', `执行 "${tool.label}" 时出错`);
      }
    } else {
      // 回退到命令模式
      onInputCommand(tool.command);
    }
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

  // 获取模块显示名称
  const getModuleName = () => {
    switch (activeModule) {
      case 'file': return '文件管理';
      case 'editor': return '编辑器';
      case 'forward': return '转发浏览';
      case 'terminal': return '终端';
      default: return '未知模块';
    }
  };

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
        <Text style={styles.title}>{getModuleName()} - 快捷工具</Text>
      </View>

      {/* 快捷按钮区域 */}
      <View style={styles.buttonsArea}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.buttonsScroll}
          contentContainerStyle={styles.buttonsContent}
        >
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
          
          {/* 自定义命令按钮（终端模块特有） */}
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
                Alert.prompt(
                  '自定义命令',
                  '输入要执行的命令:',
                  (command) => {
                    if (command && command.trim()) {
                      executeTerminalAction(command.trim());
                    }
                  },
                  'plain-text',
                  '',
                  'default'
                );
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
                自定义
              </Text>
            </TouchableOpacity>
          )}
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