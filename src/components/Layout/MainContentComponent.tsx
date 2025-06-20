// src/components/Layout/MainContentComponent.tsx
// 功能：2号组件 - 主内容区，管理所有模块间的通信和交互
// 依赖：模块类型定义, 各模块组件
// 被使用：MainContainer

import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import SimpleTerminal from '../Terminal/SimpleTerminal';
import SimpleFileManager from '../File/SimpleFileManager';
import SimpleEditor from '../Editor/SimpleEditor';
import SimpleForward from '../Forward/SimpleForward';

export type ModuleType = 'file' | 'editor' | 'forward' | 'terminal';

interface MainContentComponentProps {
  activeModule: ModuleType;
  height: number;
  width: number;
  onModuleAction?: (action: string, data?: any) => void;
  onModuleSwitch?: (module: ModuleType) => void;
  onOpenFileInEditor?: (filePath: string, fileName: string) => void;
  onSaveFileFromEditor?: (content: string, fileName?: string, currentPath?: string) => void;
}

const MainContentComponent = forwardRef<any, MainContentComponentProps>(({
  activeModule,
  height,
  width,
  onModuleAction,
  onModuleSwitch,
  onOpenFileInEditor,
  onSaveFileFromEditor,
}, ref) => {
  const fileManagerRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const forwardRef = useRef<any>(null);
  const terminalRef = useRef<any>(null);

  // 判断是否是文本文件
  const isTextFile = useCallback((fileName: string): boolean => {
    const textExtensions = [
      'txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 
      'css', 'html', 'htm', 'json', 'xml', 'yml', 'yaml', 'sh', 'bash',
      'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sql', 'r', 'pl',
      'lua', 'vim', 'conf', 'cfg', 'ini', 'log'
    ];
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    return textExtensions.includes(ext || '');
  }, []);

  // 文件管理器打开文件处理
  const handleFileManagerOpenFile = useCallback((filePath: string, fileName: string) => {
    console.log('文件管理器请求打开文件:', fileName, filePath);
    
    if (isTextFile(fileName)) {
      // 文本文件用编辑器打开
      if (onOpenFileInEditor) {
        onOpenFileInEditor(filePath, fileName);
      }
    } else {
      // 非文本文件提示
      Alert.alert(
        '文件类型', 
        `文件 "${fileName}" 不是文本文件，无法在编辑器中打开。`,
        [
          { text: '确定', style: 'default' }
        ]
      );
    }
  }, [isTextFile, onOpenFileInEditor]);

  // 编辑器打开文件管理器
  const handleEditorOpenFileManager = useCallback(() => {
    console.log('编辑器请求打开文件管理器');
    if (onModuleSwitch) {
      onModuleSwitch('file');
    }
  }, [onModuleSwitch]);

  // 编辑器保存到文件管理器
  const handleEditorSaveToFileManager = useCallback((content: string, fileName?: string) => {
    console.log('编辑器请求保存文件:', fileName);
    if (onSaveFileFromEditor) {
      onSaveFileFromEditor(content, fileName);
    }
  }, [onSaveFileFromEditor]);

  // 编辑器文件保存后刷新文件管理器
  const handleEditorFileSaved = useCallback((filePath: string) => {
    console.log('编辑器文件已保存，刷新文件管理器:', filePath);
    
    // 如果当前在文件管理模块，刷新列表
    if (activeModule === 'file' && fileManagerRef.current && fileManagerRef.current.refresh) {
      fileManagerRef.current.refresh();
    }
  }, [activeModule]);

  // 🔥 处理快捷工具命令 - 安全版本
  const handleQuickToolCommand = useCallback((command: string) => {
    console.log('处理快捷工具命令:', command);
    
    try {
      switch (activeModule) {
        case 'file':
          handleFileCommand(command);
          break;
        case 'editor':
          handleEditorCommand(command);
          break;
        case 'forward':
          handleForwardCommand(command);
          break;
        case 'terminal':
          handleTerminalCommand(command);
          break;
        default:
          console.warn('未知模块命令:', command);
      }
    } catch (error) {
      console.error('执行命令失败:', error);
      Alert.alert('错误', `命令执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [activeModule]);

  // 🔥 处理输入栏命令/输入 - 安全版本
  const handleInputBarCommand = useCallback((input: string) => {
    console.log('处理输入:', input, '模块:', activeModule);
    
    try {
      switch (activeModule) {
        case 'file':
          // 文件模块：执行Linux命令、搜索或路径跳转
          if (fileManagerRef.current?.executeCommand) {
            fileManagerRef.current.executeCommand(input);
          } else {
            console.warn('文件管理器不支持命令执行');
          }
          break;
        case 'editor':
          // 编辑器模块：插入文本
          if (editorRef.current?.insertText) {
            editorRef.current.insertText(input);
          } else {
            console.warn('编辑器不支持文本插入');
          }
          break;
        case 'forward':
          // 转发模块：导航到URL
          if (forwardRef.current?.navigate) {
            forwardRef.current.navigate(input);
          } else {
            console.warn('转发模块不支持导航');
          }
          break;
        case 'terminal':
          // 终端模块：执行命令
          if (terminalRef.current?.executeCommand) {
            terminalRef.current.executeCommand(input);
          } else {
            console.warn('终端不支持命令执行');
          }
          break;
        default:
          console.warn('未知模块输入:', input);
      }
    } catch (error) {
      console.error('处理输入失败:', error);
      Alert.alert('错误', `输入处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [activeModule]);

  // 🔥 处理文件管理器命令 - 完整版本
  const handleFileCommand = useCallback((command: string) => {
    if (!fileManagerRef.current) {
      console.warn('文件管理器引用不可用');
      return;
    }

    try {
      switch (command) {
        case 'toggleView':
          fileManagerRef.current.toggleView?.();
          break;
        case 'refresh':
          fileManagerRef.current.refresh?.();
          break;
        case 'copy':
          fileManagerRef.current.copy?.();
          break;
        case 'cut':
          fileManagerRef.current.cut?.();
          break;
        case 'paste':
          fileManagerRef.current.paste?.();
          break;
        case 'delete':
          fileManagerRef.current.delete?.();
          break;
        case 'new_file':
          fileManagerRef.current.newFile?.();
          break;
        case 'new_dir':
          fileManagerRef.current.newDir?.();
          break;
        case 'rename':
          fileManagerRef.current.renameSelected?.();
          break;
        case 'select_all':
          fileManagerRef.current.selectAll?.();
          break;
        
        // 🔥 解压命令处理
        case 'extract_here':
        case 'extract':
          fileManagerRef.current.extract_here?.();
          break;
        case 'extract_named':
        case 'extract_folder':
          fileManagerRef.current.extract_named?.();
          break;
        case 'extract_custom':
        case 'extract_to':
          fileManagerRef.current.extract_custom?.();
          break;
          
        default:
          console.log('未知文件命令:', command);
          Alert.alert('提示', `文件命令 "${command}" 即将实现`);
      }
    } catch (error) {
      console.error('文件命令执行失败:', error);
      Alert.alert('错误', `文件操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, []);

  // 🔥 处理编辑器命令 - 完整版本
  const handleEditorCommand = useCallback((command: string) => {
    if (!editorRef.current) {
      console.warn('编辑器引用不可用');
      return;
    }

    try {
      switch (command) {
        case 'save':
          editorRef.current.save?.();
          break;
        case 'new_file':
          editorRef.current.newFile?.();
          break;
        case 'open_file':
          // 切换到文件管理器
          handleEditorOpenFileManager();
          break;
        case 'undo':
          editorRef.current.undo?.();
          break;
        case 'redo':
          editorRef.current.redo?.();
          break;
        case 'copy':
          editorRef.current.copy?.();
          break;
        case 'paste':
          editorRef.current.paste?.();
          break;
        case 'cut':
          editorRef.current.cut?.();
          break;
        case 'indent':
          editorRef.current.indent?.();
          break;
        case 'find':
          Alert.alert('查找', '查找功能即将实现');
          break;
        default:
          console.log('未知编辑器命令:', command);
          Alert.alert('提示', `编辑器命令 "${command}" 即将实现`);
      }
    } catch (error) {
      console.error('编辑器命令执行失败:', error);
      Alert.alert('错误', `编辑器操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [handleEditorOpenFileManager]);

  // 🔥 处理转发模块命令 - 完整版本
  const handleForwardCommand = useCallback((command: string) => {
    if (!forwardRef.current) {
      console.warn('转发模块引用不可用');
      return;
    }

    try {
      switch (command) {
        case 'back':
          forwardRef.current.goBack?.();
          break;
        case 'forward':
          forwardRef.current.goForward?.();
          break;
        case 'refresh':
          forwardRef.current.refresh?.();
          break;
        case 'stop':
          forwardRef.current.stop?.();
          break;
        case 'bookmark':
          forwardRef.current.bookmark?.();
          break;
        case 'screenshot':
          forwardRef.current.screenshot?.();
          break;
        default:
          console.log('未知转发命令:', command);
          Alert.alert('提示', `转发命令 "${command}" 即将实现`);
      }
    } catch (error) {
      console.error('转发命令执行失败:', error);
      Alert.alert('错误', `转发操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, []);

  // 🔥 处理终端命令 - 完整版本
  const handleTerminalCommand = useCallback((command: string) => {
    if (!terminalRef.current) {
      console.warn('终端引用不可用');
      return;
    }

    try {
      switch (command) {
        case 'clear':
          terminalRef.current.clearTerminal?.();
          break;
        case 'interrupt':
          Alert.alert('中断', '中断功能即将实现');
          break;
        case 'history':
          Alert.alert('历史', '历史功能即将实现');
          break;
        case 'copy':
          Alert.alert('复制', '终端复制功能即将实现');
          break;
        case 'paste':
          Alert.alert('粘贴', '终端粘贴功能即将实现');
          break;
        default:
          console.log('未知终端命令:', command);
          Alert.alert('提示', `终端命令 "${command}" 即将实现`);
      }
    } catch (error) {
      console.error('终端命令执行失败:', error);
      Alert.alert('错误', `终端操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, []);

  // 🔥 暴露各模块的方法给父组件 - 完整版本
  useImperativeHandle(ref, () => ({
    // 🔥 核心处理方法
    handleQuickToolCommand,
    handleInputBarCommand,
    
    // 🔥 文件管理器方法 - 完整版本
    refresh: () => fileManagerRef.current?.refresh?.(),
    toggleView: () => fileManagerRef.current?.toggleView?.(),
    getViewMode: () => fileManagerRef.current?.getViewMode?.() || 'list',
    navigateBack: () => fileManagerRef.current?.navigateBack?.(),
    canNavigateBack: () => fileManagerRef.current?.canNavigateBack?.() || false,
    
    // 获取选中文件信息
    getSelectedFiles: () => fileManagerRef.current?.getSelectedFiles?.() || [],
    getSelectedArchiveFiles: () => fileManagerRef.current?.getSelectedArchiveFiles?.() || [],
    
    // 简化的文件管理器方法名（用于QuickTool调用）
    copy: () => fileManagerRef.current?.copy?.(),
    paste: () => fileManagerRef.current?.paste?.(),
    cut: () => fileManagerRef.current?.cut?.(),
    delete: () => fileManagerRef.current?.delete?.(),
    newFile: () => fileManagerRef.current?.newFile?.(),
    newDir: () => fileManagerRef.current?.newDir?.(),
    selectAll: () => fileManagerRef.current?.selectAll?.(),
    clearSelection: () => fileManagerRef.current?.clearSelection?.(),
    getSelectedCount: () => fileManagerRef.current?.getSelectedCount?.() || 0,
    executeCommand: (cmd: string) => fileManagerRef.current?.executeCommand?.(cmd),
    getCurrentPath: () => fileManagerRef.current?.getCurrentPath?.() || '',
    search: (query: string) => fileManagerRef.current?.search?.(query),
    navigateToPath: (path: string) => fileManagerRef.current?.navigateToPath?.(path),
    
    // 解压方法
    extract_here: () => fileManagerRef.current?.extract_here?.(),
    extract_named: () => fileManagerRef.current?.extract_named?.(),
    extract_custom: () => fileManagerRef.current?.extract_custom?.(),
    
    // 🔥 编辑器方法 - 完整版本
    editor: {
      save: () => editorRef.current?.save?.(),
      openFile: (filePath: string, fileName: string) => editorRef.current?.openFile?.(filePath, fileName),
      newFile: (fileName?: string) => editorRef.current?.newFile?.(fileName),
      insertText: (text: string) => editorRef.current?.insertText?.(text),
      undo: () => editorRef.current?.undo?.(),
      redo: () => editorRef.current?.redo?.(),
      copy: () => editorRef.current?.copy?.(),
      paste: () => editorRef.current?.paste?.(),
      cut: () => editorRef.current?.cut?.(),
      indent: () => editorRef.current?.indent?.(),
      toggleLineNumbers: () => editorRef.current?.toggleLineNumbers?.(),
      hasOpenTabs: () => editorRef.current?.hasOpenTabs?.() || false,
      getCurrentFileName: () => editorRef.current?.getCurrentFileName?.() || '',
      getCurrentFilePath: () => editorRef.current?.getCurrentFilePath?.() || '',
      isModified: () => editorRef.current?.isModified?.() || false,
    },
    
    // 🔥 转发浏览器方法 - 完整版本
    forward: {
      goBack: () => forwardRef.current?.goBack?.(),
      goForward: () => forwardRef.current?.goForward?.(),
      refresh: () => forwardRef.current?.refresh?.(),
      stop: () => forwardRef.current?.stop?.(),
      screenshot: () => forwardRef.current?.screenshot?.(),
      bookmark: () => forwardRef.current?.bookmark?.(),
      navigate: (url: string) => forwardRef.current?.navigate?.(url),
    },
    
    // 🔥 终端方法 - 完整版本
    terminal: {
      clearTerminal: () => terminalRef.current?.clearTerminal?.(),
      executeCommand: (cmd: string) => terminalRef.current?.executeCommand?.(cmd),
    },
    
    // 🔥 模块间通信方法
    switchToEditor: handleFileManagerOpenFile,
    notifyFileSaved: handleEditorFileSaved,
    openFileInEditor: handleFileManagerOpenFile,
    saveFileFromEditor: handleEditorSaveToFileManager,
    
    // 🔥 兼容性方法（保持向后兼容）
    fileManager: {
      refresh: () => fileManagerRef.current?.refresh?.(),
      toggleView: () => fileManagerRef.current?.toggleView?.(),
      getViewMode: () => fileManagerRef.current?.getViewMode?.() || 'list',
      navigateBack: () => fileManagerRef.current?.navigateBack?.(),
      canNavigateBack: () => fileManagerRef.current?.canNavigateBack?.() || false,
      copySelected: () => fileManagerRef.current?.copy?.(),
      cutSelected: () => fileManagerRef.current?.cut?.(),
      paste: () => fileManagerRef.current?.paste?.(),
      deleteSelected: () => fileManagerRef.current?.delete?.(),
      renameSelected: () => fileManagerRef.current?.renameSelected?.(),
      createNewFile: () => fileManagerRef.current?.newFile?.(),
      createNewDir: () => fileManagerRef.current?.newDir?.(),
      selectAll: () => fileManagerRef.current?.selectAll?.(),
      clearSelection: () => fileManagerRef.current?.clearSelection?.(),
      getSelectedCount: () => fileManagerRef.current?.getSelectedCount?.() || 0,
      executeCommand: (cmd: string) => fileManagerRef.current?.executeCommand?.(cmd),
      getCurrentPath: () => fileManagerRef.current?.getCurrentPath?.() || '',
      search: (query: string) => fileManagerRef.current?.search?.(query),
      navigateToPath: (path: string) => fileManagerRef.current?.navigateToPath?.(path),
      getSelectedFiles: () => fileManagerRef.current?.getSelectedFiles?.() || [],
      getSelectedArchiveFiles: () => fileManagerRef.current?.getSelectedArchiveFiles?.() || [],
      extractToCurrentDir: () => fileManagerRef.current?.extract_here?.(),
      extractToNamedDir: () => fileManagerRef.current?.extract_named?.(),
      extractToCustomDir: () => fileManagerRef.current?.extract_custom?.(),
    },
  }), [
    handleQuickToolCommand,
    handleInputBarCommand,
    handleFileManagerOpenFile,
    handleEditorFileSaved,
    handleEditorSaveToFileManager
  ]);
  
  // 🔥 模块内容渲染 - 增强错误处理
  const renderModuleContent = () => {
    try {
      switch (activeModule) {
        case 'file':
          return (
            <View style={styles.moduleContainer}>
              <SimpleFileManager 
                ref={fileManagerRef}
                onSwitchToEditor={handleFileManagerOpenFile}
              />
            </View>
          );
          
        case 'editor':
          return (
            <View style={styles.moduleContainer}>
              <SimpleEditor 
                ref={editorRef}
                onFileSaved={handleEditorFileSaved}
                onOpenFileManager={handleEditorOpenFileManager}
                onSaveToFileManager={handleEditorSaveToFileManager}
              />
            </View>
          );
          
        case 'forward':
          return (
            <View style={styles.moduleContainer}>
              <SimpleForward ref={forwardRef} />
            </View>
          );
          
        case 'terminal':
          return (
            <View style={styles.terminalContainer}>
              <SimpleTerminal ref={terminalRef} />
            </View>
          );
          
        default:
          return (
            <View style={styles.moduleContent}>
              <Text style={styles.moduleTitle}>❓ 未知模块</Text>
              <Text style={styles.moduleDescription}>
                模块 "{activeModule}" 尚未实现
              </Text>
            </View>
          );
      }
    } catch (error) {
      console.error('渲染模块内容失败:', error);
      return (
        <View style={styles.moduleContent}>
          <Text style={styles.moduleTitle}>❌ 模块加载失败</Text>
          <Text style={styles.moduleDescription}>
            模块 "{activeModule}" 加载时出现错误
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={[
      styles.container,
      { height, width },
    ]}>
      {/* 3D效果的内容区域 */}
      <View style={styles.contentArea}>
        {renderModuleContent()}
      </View>
    </View>
  );
});

MainContentComponent.displayName = 'MainContentComponent';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  
  // 3D效果的内容区域
  contentArea: {
    flex: 1,
    margin: 4, // 为3D效果留出空间
    backgroundColor: '#222',
    borderRadius: 8,
    // 3D突起效果
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6, // Android阴影
    // 内部阴影效果（通过边框模拟）
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: '#333',
    borderLeftColor: '#333',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#111',
    borderRightColor: '#111',
    overflow: 'hidden', // 确保子组件不超出边界
  },
  
  // 通用模块容器样式
  moduleContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  
  // 终端容器样式
  terminalContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  
  // 默认模块内容样式（用于未实现的模块）
  moduleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#1a1a1a',
  },
  moduleTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  moduleDescription: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
});

export default MainContentComponent;