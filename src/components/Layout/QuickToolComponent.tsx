// src/components/Layout/QuickToolComponent.tsx
// 快捷工具栏组件 - 提供当前模块的快捷操作功能
//
// 主要功能：
// 1. 根据当前活跃模块动态显示对应的工具按钮
// 2. 文件管理器模式：复制粘贴、新建文件/文件夹、视图切换等
// 3. 编辑器模式：保存、撤销重做、新建文件等（去除系统级复制粘贴）
// 4. 终端模式：常用命令快捷按钮
// 5. 转发模式：浏览器控制按钮
//
// 跨模块集成：
// - 新文件创建直接集成编辑器
// - 文件操作调用文件管理器方法
// - 支持压缩文件的解压操作
// - 智能按钮显示/隐藏逻辑
//
// 工具按钮特性：
// - 响应式按钮大小适配
// - 按钮状态管理（禁用/启用）
// - 操作反馈和错误处理
// - 自定义命令支持

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useCrossModule } from '../../contexts/CrossModuleContext';

// ================================
// 类型定义部分
// ================================

export type ModuleType = 'file' | 'editor' | 'forward' | 'terminal';
export type SizeConfig = 'small' | 'medium' | 'large';

// 组件属性接口
interface QuickToolComponentProps {
  activeModule: ModuleType;                                    // 当前活跃模块
  sizeConfig: SizeConfig;                                      // 尺寸配置
  onToggleVisibility: () => void;                              // 切换可见性回调
  onInputCommand: (command: string) => void;                   // 命令执行回调
  mainContentRef?: React.RefObject<any>;                       // 主内容组件引用
}

// 工具按钮数据结构
interface ToolButton {
  id: string;                    // 唯一标识
  label: string;                 // 显示标签
  command: string;               // 执行命令
  icon: string;                  // 显示图标
  color: string;                 // 按钮颜色
  action?: () => void;           // 自定义操作函数
  disabled?: boolean;            // 是否禁用
  tooltip?: string;              // 提示信息
}

// ================================
// 主组件实现
// ================================

const QuickToolComponent: React.FC<QuickToolComponentProps> = ({
  activeModule,
  sizeConfig,
  onToggleVisibility,
  onInputCommand,
  mainContentRef,
}) => {

  // ================================
  // Context和状态管理
  // ================================
  
  // 跨模块状态管理
  const { 
    state: crossModuleState, 
    setMode, 
    setPendingSave,
    startOpenFile,
    startSaveFile 
  } = useCrossModule();

  // 当前视图模式状态
  const [currentViewMode, setCurrentViewMode] = useState<'list' | 'grid'>('list');

  // 压缩文件检测状态
  const [hasArchiveFiles, setHasArchiveFiles] = useState(false);
  const [archiveFileCount, setArchiveFileCount] = useState(0);

  // ================================
  // 状态监听和更新
  // ================================
  
  // 监听文件管理器的视图模式变化
  useEffect(() => {
    if (activeModule === 'file' && mainContentRef?.current?.getViewMode) {
      try {
        const viewMode = mainContentRef.current.getViewMode();
        setCurrentViewMode(viewMode);
      } catch (error) {
        console.warn('获取视图模式失败:', error);
      }
    }
  }, [activeModule, mainContentRef]);

  // 监听选中项变化，检测压缩文件
  useEffect(() => {
    if (activeModule === 'file' && mainContentRef?.current?.getSelectedFiles) {
      try {
        const selectedFiles = mainContentRef.current.getSelectedFiles() || [];
        const archiveFiles = selectedFiles.filter((file: any) => {
          const fileName = file.name || '';
          const ext = fileName.split('.').pop()?.toLowerCase();
          const archiveExtensions = ['zip', '7z', 'rar', 'tar', 'gz', 'bz2', 'xz'];
          
          // 处理复合扩展名
          const lowerName = fileName.toLowerCase();
          if (lowerName.endsWith('.tar.gz') || lowerName.endsWith('.tar.bz2') || lowerName.endsWith('.tar.xz')) {
            return true;
          }
          
          return archiveExtensions.includes(ext || '');
        });
        
        setHasArchiveFiles(archiveFiles.length > 0);
        setArchiveFileCount(archiveFiles.length);
      } catch (error) {
        setHasArchiveFiles(false);
        setArchiveFileCount(0);
      }
    } else {
      setHasArchiveFiles(false);
      setArchiveFileCount(0);
    }
  }, [activeModule, mainContentRef]);

  // ================================
  // 核心操作函数部分
  // ================================
  
  // 处理粘贴功能（完善版本）
  const handlePaste = () => {
    if (mainContentRef?.current?.paste) {
      mainContentRef.current.paste();
    } else {
      Alert.alert('提示', '粘贴功能暂时不可用');
    }
  };

  // 处理新文件功能（跨模块集成版本）
  const handleNewFile = () => {
    // 直接启动跨模块文件创建流程
    const defaultFileName = 'new file';
    
    // 创建待保存文件信息
    const newFileInfo = {
      content: '',
      fileName: defaultFileName,
      tabId: `new-${Date.now()}`,
    };
    
    console.log('启动新文件创建流程:', defaultFileName);
    
    // 设置跨模块保存状态
    startSaveFile(newFileInfo, 'editor');
    
    // 切换到编辑器并创建新标签页
    if (mainContentRef?.current?.editor?.newFile) {
      mainContentRef.current.editor.newFile(defaultFileName);
    }
    
    console.log('新文件创建流程已启动，等待在文件管理器中选择保存位置');
  };

  // 处理编辑器保存功能
  const handleEditorSave = () => {
    if (mainContentRef?.current?.editor?.save) {
      mainContentRef.current.editor.save();
    } else {
      Alert.alert('提示', '保存功能暂时不可用');
    }
  };

  // 处理编辑器打开文件功能（跨模块集成版本）
  const handleEditorOpenFile = () => {
    console.log('编辑器请求打开文件，启动跨模块选择流程');
    
    // 启动跨模块打开文件流程
    startOpenFile('editor');
    
    console.log('文件选择流程已启动，等待在文件管理器中选择文件');
  };

  // ================================
  // 解压功能处理部分
  // ================================
  
  // 解压到当前目录
  const handleExtractHere = () => {
    if (mainContentRef?.current?.extract_here) {
      mainContentRef.current.extract_here();
    } else {
      Alert.alert('提示', '解压功能暂时不可用');
    }
  };

  // 解压到文件名目录
  const handleExtractNamed = () => {
    if (mainContentRef?.current?.extract_named) {
      mainContentRef.current.extract_named();
    } else {
      Alert.alert('提示', '解压到文件夹功能暂时不可用');
    }
  };

  // 解压到自定义目录
  const handleExtractCustom = () => {
    if (mainContentRef?.current?.extract_custom) {
      mainContentRef.current.extract_custom();
    } else {
      Alert.alert('提示', '自定义解压功能暂时不可用');
    }
  };

  // ================================
  // 工具按钮配置部分
  // ================================

  // 获取工具按钮配置（优化版本）
  const getToolButtons = (): ToolButton[] => {
    switch (activeModule) {
      case 'file':
        // 文件管理器工具按钮
        const fileButtons: ToolButton[] = [
          { 
            id: 'toggleView', 
            label: currentViewMode === 'list' ? '网格' : '列表', 
            command: 'toggleView', 
            icon: currentViewMode === 'list' ? '⚏' : '📋', 
            color: '#2196F3',
            action: () => {
              onInputCommand('toggleView');
              setCurrentViewMode(prev => prev === 'list' ? 'grid' : 'list');
            }
          },
          { 
            id: 'refresh', 
            label: '刷新', 
            command: 'refresh', 
            icon: '🔄', 
            color: '#00BCD4',
            action: () => onInputCommand('refresh')
          },
          { 
            id: 'copy', 
            label: '复制', 
            command: 'copy', 
            icon: '📋', 
            color: '#FF9800',
            action: () => onInputCommand('copy')
          },
          { 
            id: 'paste', 
            label: '粘贴', 
            command: 'paste', 
            icon: '📄', 
            color: '#9C27B0',
            action: () => handlePaste()
          },
          { 
            id: 'cut', 
            label: '剪切', 
            command: 'cut', 
            icon: '✂️', 
            color: '#FF5722',
            action: () => onInputCommand('cut')
          },
          { 
            id: 'delete', 
            label: '删除', 
            command: 'delete', 
            icon: '🗑️', 
            color: '#F44336',
            action: () => onInputCommand('delete')
          },
          { 
            id: 'newFile', 
            label: '新文件', 
            command: 'new_file', 
            icon: '📄', 
            color: '#4CAF50',
            action: () => handleNewFile()
          },
          { 
            id: 'newDir', 
            label: '新目录', 
            command: 'new_dir', 
            icon: '📁', 
            color: '#607D8B',
            action: () => onInputCommand('new_dir')
          },
        ];

        // 根据选中的压缩文件动态添加解压按钮
        if (hasArchiveFiles) {
          fileButtons.push(
            { 
              id: 'extractHere', 
              label: '解压这里', 
              command: 'extract_here', 
              icon: '📦', 
              color: '#E91E63',
              action: () => handleExtractHere(),
              tooltip: `解压 ${archiveFileCount} 个压缩文件到当前目录`
            },
            { 
              id: 'extractNamed', 
              label: '解压到文件夹', 
              command: 'extract_named', 
              icon: '📁', 
              color: '#E91E63',
              action: () => handleExtractNamed(),
              tooltip: '解压到以文件名命名的新文件夹'
            },
            { 
              id: 'extractCustom', 
              label: '解压到...', 
              command: 'extract_custom', 
              icon: '📂', 
              color: '#E91E63',
              action: () => handleExtractCustom(),
              tooltip: '解压到自定义目录'
            }
          );
        }

        return fileButtons;
        
      case 'editor':
        // 编辑器工具按钮（移除系统级复制粘贴）
        return [
          { 
            id: 'save', 
            label: '保存', 
            command: 'save', 
            icon: '💾', 
            color: '#4CAF50',
            action: () => handleEditorSave()
          },
          { 
            id: 'newFile', 
            label: '新文件', 
            command: 'new_file', 
            icon: '📄', 
            color: '#2196F3',
            action: () => onInputCommand('new_file')
          },
          { 
            id: 'openFile', 
            label: '打开', 
            command: 'open_file', 
            icon: '📂', 
            color: '#FF9800',
            action: () => handleEditorOpenFile()
          },
          { 
            id: 'undo', 
            label: '撤销', 
            command: 'undo', 
            icon: '↶', 
            color: '#607D8B',
            action: () => onInputCommand('undo')
          },
          { 
            id: 'redo', 
            label: '重做', 
            command: 'redo', 
            icon: '↷', 
            color: '#607D8B',
            action: () => onInputCommand('redo')
          },
          // 注意：移除了copy、paste、cut按钮，因为用户可以直接使用系统的文本选择功能
        ];
        
      case 'forward':
        // 端口转发/浏览器工具按钮
        return [
          { 
            id: 'back', 
            label: '后退', 
            command: 'back', 
            icon: '←', 
            color: '#607D8B',
            action: () => onInputCommand('back')
          },
          { 
            id: 'forward', 
            label: '前进', 
            command: 'forward', 
            icon: '→', 
            color: '#607D8B',
            action: () => onInputCommand('forward')
          },
          { 
            id: 'refresh', 
            label: '刷新', 
            command: 'refresh', 
            icon: '🔄', 
            color: '#4CAF50',
            action: () => onInputCommand('refresh')
          },
          { 
            id: 'stop', 
            label: '停止', 
            command: 'stop', 
            icon: '⏹️', 
            color: '#F44336',
            action: () => onInputCommand('stop')
          },
          { 
            id: 'bookmark', 
            label: '收藏', 
            command: 'bookmark', 
            icon: '⭐', 
            color: '#FF9800',
            action: () => onInputCommand('bookmark')
          },
          { 
            id: 'screenshot', 
            label: '截图', 
            command: 'screenshot', 
            icon: '📷', 
            color: '#9C27B0',
            action: () => onInputCommand('screenshot')
          },
        ];
        
      case 'terminal':
        // 终端工具按钮
        return [
          { 
            id: 'clear', 
            label: 'clear', 
            command: 'clear', 
            icon: '🧹', 
            color: '#FF9800',
            action: () => onInputCommand('clear')
          },
          { 
            id: 'ls', 
            label: 'ls', 
            command: 'ls -la', 
            icon: '📋', 
            color: '#4CAF50',
            action: () => onInputCommand('ls -la')
          },
          { 
            id: 'pwd', 
            label: 'pwd', 
            command: 'pwd', 
            icon: '📍', 
            color: '#2196F3',
            action: () => onInputCommand('pwd')
          },
          { 
            id: 'top', 
            label: 'top', 
            command: 'top', 
            icon: '📊', 
            color: '#9C27B0',
            action: () => onInputCommand('top')
          },
          { 
            id: 'ps', 
            label: 'ps', 
            command: 'ps aux', 
            icon: '⚙️', 
            color: '#607D8B',
            action: () => onInputCommand('ps aux')
          },
          { 
            id: 'df', 
            label: 'df', 
            command: 'df -h', 
            icon: '💾', 
            color: '#F44336',
            action: () => onInputCommand('df -h')
          },
          { 
            id: 'history', 
            label: 'history', 
            command: 'history', 
            icon: '📜', 
            color: '#795548',
            action: () => onInputCommand('history')
          },
          { 
            id: 'nano', 
            label: 'nano', 
            command: 'nano', 
            icon: '📝', 
            color: '#00BCD4',
            action: () => onInputCommand('nano')
          },
        ];
        
      default:
        return [];
    }
  };

  // ================================
  // 事件处理部分
  // ================================

  // 处理工具按钮点击
  const handleToolClick = (tool: ToolButton) => {
    console.log('执行快捷操作:', tool.command);
    
    // 检查按钮是否被禁用
    if (tool.disabled) {
      console.warn('按钮已禁用:', tool.label);
      return;
    }
    
    if (tool.action) {
      try {
        tool.action();
      } catch (error) {
        console.error('工具操作失败:', error);
        Alert.alert('操作失败', `执行 "${tool.label}" 时出错: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    } else {
      onInputCommand(tool.command);
    }
  };

  // ================================
  // UI配置部分
  // ================================

  // 根据尺寸配置获取按钮大小
  const getButtonSize = () => {
    const sizes = {
      small: { width: 45, height: 32, fontSize: 9, iconSize: 12 },
      medium: { width: 55, height: 38, fontSize: 10, iconSize: 14 },
      large: { width: 65, height: 44, fontSize: 11, iconSize: 16 },
    };
    return sizes[sizeConfig];
  };

  // 获取模块显示名称
  const getModuleName = () => {
    switch (activeModule) {
      case 'file': 
        if (hasArchiveFiles && archiveFileCount > 0) {
          return `文件管理 (${archiveFileCount}个压缩文件)`;
        }
        return '文件管理';
      case 'editor': 
        return '编辑器';
      case 'forward': 
        return '转发浏览';
      case 'terminal': 
        return '终端';
      default: 
        return '未知模块';
    }
  };

  // ================================
  // 渲染逻辑部分
  // ================================

  const toolButtons = getToolButtons();
  const buttonSize = getButtonSize();

  return (
    <View style={styles.container}>
      
      {/* ================================ */}
      {/* 顶部控制栏 */}
      {/* ================================ */}
      <View style={styles.topBar}>
        {/* 左上角隐藏按钮 */}
        <TouchableOpacity 
          style={styles.hideButton}
          onPress={onToggleVisibility}
        >
          <Text style={styles.hideArrow}>隐藏</Text>
        </TouchableOpacity>
        
        {/* 右上角标题 */}
        <Text style={styles.title}>{getModuleName()} - 快捷工具</Text>
      </View>

      {/* ================================ */}
      {/* 快捷按钮区域 */}
      {/* ================================ */}
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
                  opacity: tool.disabled ? 0.5 : 1,
                }
              ]}
              onPress={() => handleToolClick(tool)}
              disabled={tool.disabled}
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
          
          {/* 自定义命令按钮（终端模块专用） */}
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
                      onInputCommand(command.trim());
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

// ================================
// 样式定义部分
// ================================

const styles = StyleSheet.create({
  // 主容器样式
  container: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  
  // ================================
  // 顶部控制栏样式
  // ================================
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
  
  // 隐藏按钮样式
  hideButton: {
    marginTop: -3,
  },
  hideArrow: {
    color: '#999',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // 标题样式
  title: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // ================================
  // 按钮区域样式
  // ================================
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
  
  // ================================
  // 工具按钮样式
  // ================================
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
    // 添加边框效果
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toolIcon: {
    marginBottom: 2,
  },
  toolLabel: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // ================================
  // 添加按钮样式
  // ================================
  addButton: {
    backgroundColor: '#666',
    borderWidth: 1,
    borderColor: '#888',
    borderStyle: 'dashed',
  },
});

export default QuickToolComponent;